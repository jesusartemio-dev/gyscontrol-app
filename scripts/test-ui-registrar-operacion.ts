/**
 * Prueba la PANTALLA de "Registrar operación": subir el Detalle de
 * Liquidación en el diálogo, ver el reparto sugerido, comprobar que el botón
 * se bloquea si el reparto no cuadra, y registrar las 3 facturas.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env.local -e .env -o -- npx tsx scripts/test-ui-registrar-operacion.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const SUF = String(Date.now()).slice(-4)
const MARCA = `TEST-UI-${Date.now()}`
const DOCS = [`81${SUF}`, `82${SUF}`, `83${SUF}`]
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}

const LIQ = `
<div style="font-family:Arial;font-size:10px;padding:14px">
  <b>BAN'PRO FACTORING</b> — <b>DETALLE LIQUIDACIÓN FACTORING OTORGAMIENTO</b>
  <p>Cliente : G Y S CONTROL INDUSTRIAL &nbsp; Ruc : 20545610672<br><b>Nro. Operación : 52104</b></p>
  <table border="1" cellpadding="3" style="border-collapse:collapse;font-size:9px">
    <tr><th>DEUDOR</th><th>RUC DEUDOR</th><th>FEC. CURSE</th><th>FEC. VTO.NOM.</th><th>DIAS</th>
        <th>NRO. DOC.</th><th>COD. BCO.</th><th>MONTO DOCUM.</th><th>DETRAC.</th><th>% ANT.</th>
        <th>MTO. NOM.ANT.</th><th>MTO. NO ANT.</th><th>MTO.DIF. PRECIO</th><th>MTO.ANT. S/DESCTO</th></tr>
    <tr><td>NEXA RESOURCES CAJAMARQ</td><td>20261677955</td><td>30-04-2026</td><td>07-07-2026</td><td>68</td>
        <td>${DOCS[2]}</td><td>6</td><td>4,875.97</td><td>0.00</td><td>99</td>
        <td>4,827.21</td><td>48.76</td><td>151.00</td><td>4,676.21</td></tr>
    <tr><td>CORPORACION PERUANA DEP</td><td>20100073723</td><td>30-04-2026</td><td>28-07-2026</td><td>89</td>
        <td>${DOCS[0]}</td><td>6</td><td>8,259.72</td><td>0.00</td><td>99</td>
        <td>8,177.12</td><td>82.60</td><td>334.77</td><td>7,842.35</td></tr>
    <tr><td>CORPORACION PERUANA DEP</td><td>20100073723</td><td>30-04-2026</td><td>27-08-2026</td><td>119</td>
        <td>${DOCS[1]}</td><td>6</td><td>16,579.88</td><td>0.00</td><td>99</td>
        <td>16,414.08</td><td>165.80</td><td>898.51</td><td>15,515.57</td></tr>
  </table>
  <div style="text-align:right;margin-top:6px;font-size:9px">
    <b>Adelanto</b> 26,800.00<br><b>Comisión</b> 252.58<br><b>Gasto legal</b> 25.00<br>
    <b>I.G.V</b> 49.96<br><b>Aplicación(es)</b> 0.00<br><b>Saldo liquido a girar</b> 906.60
  </div>
</div>`

const MONTOS = [9386.04, 18840.77, 5540.87]

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const ids: string[] = []
  for (const [i, doc] of DOCS.entries()) {
    const val = await prisma.valorizacion.create({
      data: {
        proyectoId: proyecto.id, numero: 9600 + i, codigo: `${MARCA}-${doc}`,
        periodoInicio: now, periodoFin: now, presupuestoContractual: MONTOS[i],
        montoValorizacion: MONTOS[i], netoARecibir: MONTOS[i], moneda: 'USD',
        estado: 'facturada', updatedAt: now,
      },
    })
    const cxc = await prisma.cuentaPorCobrar.create({
      data: {
        proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
        numeroDocumento: `E001-${doc}`, monto: MONTOS[i], saldoPendiente: MONTOS[i],
        moneda: 'USD', fechaEmision: now, fechaVencimiento: now, estado: 'vencida', updatedAt: now,
      },
    })
    ids.push(cxc.id)
  }

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.uiop@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.uiop@gyscontrol.com', name: 'UI Test UIOp', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  const pdfPath = path.join(os.tmpdir(), `liq-${SUF}.pdf`)
  try {
    const page = await browser.newPage()
    await page.setContent(LIQ)
    fs.writeFileSync(pdfPath, await page.pdf({ format: 'A4', landscape: true }))

    // Sin esto, un fallo del registro se ve solo como "quedaron 0 cobros" y no
    // se sabe si lo rechazó el servidor ni por qué.
    page.on('response', async r => {
      if (r.url().includes('/operaciones-factoring/aplicar')) {
        console.log(`    → aplicar respondió ${r.status()}: ${(await r.text().catch(() => '')).slice(0, 300)}`)
      }
    })

    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.uiop@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    console.log('\n[1] el botón está en la CxC sin cobro')
    await page.goto(`${BASE}/administracion/cuentas-cobrar/${ids[0]}`)
    const boton = page.locator('button:has-text("Registrar operación")')
    await boton.waitFor({ timeout: 60000 }) // en dev la primera carga compila la ruta
    assert(await boton.count() === 1, 'aparece "Registrar operación"')

    console.log('\n[2] sube el documento y arma el reparto sugerido')
    await boton.click()
    await page.locator('input[type="file"]').last().setInputFiles(pdfPath)
    await page.locator('text=Reparto — tiene que sumar el total del documento').waitFor({ timeout: 90000 })
    const texto = await page.locator('body').innerText()
    assert(texto.includes('52104'), 'muestra la operación 52104')
    assert(texto.includes(`E001-${DOCS[0]}`) && texto.includes(`E001-${DOCS[1]}`) && texto.includes(`E001-${DOCS[2]}`),
      'lista las 3 facturas cruzadas con sus CxC')
    assert(/1,?126\.32/.test(texto), 'muestra la detracción deducida 1,126.32')
    assert(/8177\.12|8,177\.12/.test(texto), 'muestra el valor a financiar 8,177.12')

    const inputs = page.locator('table input[type="number"]')
    const n = await inputs.count()
    assert(n === 12, `hay 12 casillas de reparto (3 facturas × 4 importes) — fue ${n}`)
    const sugerido = await inputs.nth(3).inputValue()
    assert(parseFloat(sugerido) > 0, `el adelanto viene sugerido, no vacío (fue "${sugerido}")`)

    const registrar = page.locator('button:has-text("Registrar 3 factura")')
    assert(await registrar.isEnabled(), 'con el reparto sugerido el botón está habilitado')

    console.log('\n[3] si el reparto deja de cuadrar, el botón se bloquea')
    await inputs.nth(3).fill('1')   // adelanto de la 1ra factura
    await page.waitForTimeout(300)
    assert(!(await registrar.isEnabled()), 'con el reparto descuadrado el botón se deshabilita')
    const textoMal = await page.locator('tfoot').innerText()
    assert(textoMal.includes('26800.00') || textoMal.includes('de 26800'), 'el pie sigue mostrando el total a alcanzar')

    console.log('\n[4] restaurado el reparto, registra las 3')
    await inputs.nth(3).fill('7497.12')
    await inputs.nth(7).fill('14832.53')
    await inputs.nth(11).fill('4470.35')
    await page.waitForTimeout(300)
    assert(await registrar.isEnabled(), 'vuelve a habilitarse')
    const espera = page.waitForRequest(r => r.url().includes('/operaciones-factoring/aplicar'), { timeout: 20000 })
      .then(() => true).catch(() => false)
    await registrar.click()
    const seLlamo = await espera
    assert(seLlamo, 'el click dispara la llamada a /aplicar')
    if (!seLlamo) {
      console.log('    diagnóstico — texto del botón:', JSON.stringify(await registrar.innerText().catch(() => '?')))
      console.log('    diagnóstico — toast:', JSON.stringify((await page.locator('body').innerText()).match(/[^\n]*(rror|cuadr|regist)[^\n]*/gi)?.slice(0, 5)))
    }
    await page.waitForTimeout(4000)

    const cobros = await prisma.cobroValorizacion.count({
      where: { valorizacion: { codigo: { startsWith: MARCA } } },
    })
    assert(cobros === 3, `quedaron 3 cobros creados desde la pantalla (fue ${cobros})`)
    const suma = await prisma.cobroValorizacion.aggregate({
      where: { valorizacion: { codigo: { startsWith: MARCA } } },
      _sum: { adelantoBanpro: true, comisionEstructuracion: true },
    })
    assert(Math.abs((suma._sum.adelantoBanpro ?? 0) - 26800) < 0.02, `Σ adelanto = 26,800 (fue ${suma._sum.adelantoBanpro})`)
    assert(Math.abs((suma._sum.comisionEstructuracion ?? 0) - 252.58) < 0.02, `Σ comisión = 252.58 (fue ${suma._sum.comisionEstructuracion})`)
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    try { fs.unlinkSync(pdfPath) } catch { /* ya no está */ }
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-UI-' } }, select: { id: true } })
    for (const v of vals) {
      const co = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (co) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: co.id } })
        await prisma.cobroValorizacion.delete({ where: { id: co.id } })
      }
    }
    for (const d of DOCS) {
      await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: `E001-${d}` } } })
      await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: `E001-${d}` } })
    }
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-UI-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.uiop@gyscontrol.com' }, select: { id: true } })
    if (u) {
      await prisma.auditLog.deleteMany({ where: { usuarioId: u.id } })
      await prisma.eventoTrazabilidad.deleteMany({ where: { usuarioId: u.id } })
      await prisma.session.deleteMany({ where: { userId: u.id } })
      await prisma.account.deleteMany({ where: { userId: u.id } })
      await prisma.user.delete({ where: { id: u.id } })
    }
    console.log(`\n=== RESULTADO: ${ok} OK, ${fail} FALLAS ===`)
    await prisma.$disconnect()
    process.exit(fail > 0 ? 1 : 0)
  }
}

main().catch(e => { console.error('ERROR INESPERADO:', e); process.exit(1) })
