/**
 * Cadena completa de la Fase 2: leer el Detalle de Liquidación de una
 * operación con varias facturas, cruzar cada fila con su CxC, y registrarlas
 * todas de una vez.
 *
 * Reproduce la operación 52104 real (3 facturas, 2 deudores) — la misma que en
 * producción quedó con 2 de 3 sin registrar.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env.local -e .env -o -- npx tsx scripts/test-aplicar-liquidacion-operacion.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const SUF = String(Date.now()).slice(-4)
const MARCA = `TEST-APL-${Date.now()}`
// Números de documento únicos para no chocar con las facturas reales de dev
const DOCS = { d1: `71${SUF}`, d2: `72${SUF}`, d3: `73${SUF}` }
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number, tol = 0.02) => a != null && Math.abs(a - b) <= tol

const LIQUIDACION = `
<div style="font-family:Arial;font-size:10px;padding:14px">
  <b>BAN'PRO FACTORING</b> — <b>DETALLE LIQUIDACIÓN FACTORING OTORGAMIENTO</b>
  <p>Cliente : G Y S CONTROL INDUSTRIAL &nbsp; Ruc : 20545610672<br><b>Nro. Operación : 52104</b></p>
  <table border="1" cellpadding="3" style="border-collapse:collapse;font-size:9px">
    <tr><th>DEUDOR</th><th>RUC DEUDOR</th><th>FEC. CURSE</th><th>FEC. VTO.NOM.</th><th>DIAS</th>
        <th>NRO. DOC.</th><th>COD. BCO.</th><th>MONTO DOCUM.</th><th>DETRAC.</th><th>% ANT.</th>
        <th>MTO. NOM.ANT.</th><th>MTO. NO ANT.</th><th>MTO.DIF. PRECIO</th><th>MTO.ANT. S/DESCTO</th></tr>
    <tr><td>NEXA RESOURCES CAJAMARQ</td><td>20261677955</td><td>30-04-2026</td><td>07-07-2026</td><td>68</td>
        <td>${DOCS.d3}</td><td>6</td><td>4,875.97</td><td>0.00</td><td>99</td>
        <td>4,827.21</td><td>48.76</td><td>151.00</td><td>4,676.21</td></tr>
    <tr><td>CORPORACION PERUANA DEP</td><td>20100073723</td><td>30-04-2026</td><td>28-07-2026</td><td>89</td>
        <td>${DOCS.d1}</td><td>6</td><td>8,259.72</td><td>0.00</td><td>99</td>
        <td>8,177.12</td><td>82.60</td><td>334.77</td><td>7,842.35</td></tr>
    <tr><td>CORPORACION PERUANA DEP</td><td>20100073723</td><td>30-04-2026</td><td>27-08-2026</td><td>119</td>
        <td>${DOCS.d2}</td><td>6</td><td>16,579.88</td><td>0.00</td><td>99</td>
        <td>16,414.08</td><td>165.80</td><td>898.51</td><td>15,515.57</td></tr>
    <tr><td colspan="7"><b>TOTAL</b></td><td>29,715.57</td><td>0.00</td><td></td>
        <td>29,418.41</td><td>297.16</td><td>1,384.28</td><td>28,034.13</td></tr>
  </table>
  <div style="text-align:right;margin-top:6px;font-size:9px">
    <b>Adelanto</b> 26,800.00<br><b>Comisión</b> 252.58<br><b>Gasto legal</b> 25.00<br>
    <b>I.G.V</b> 49.96<br><b>Aplicación(es)</b> 0.00<br><b>Saldo liquido a girar</b> 906.60
  </div>
</div>`

// Facturas: el monto bruto (la liquidación trae el neto de detracción)
const FACTURAS = [
  { doc: DOCS.d1, monto: 9386.04, neto: 8259.72 },
  { doc: DOCS.d2, monto: 18840.77, neto: 16579.88 },
  { doc: DOCS.d3, monto: 5540.87, neto: 4875.97 },
]

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  for (const [i, f] of FACTURAS.entries()) {
    const val = await prisma.valorizacion.create({
      data: {
        proyectoId: proyecto.id, numero: 9500 + i, codigo: `${MARCA}-${f.doc}`,
        periodoInicio: now, periodoFin: now, presupuestoContractual: f.monto,
        montoValorizacion: f.monto, netoARecibir: f.monto, moneda: 'USD',
        estado: 'facturada', updatedAt: now,
      },
    })
    await prisma.cuentaPorCobrar.create({
      data: {
        proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
        numeroDocumento: `E001-${f.doc}`, monto: f.monto, saldoPendiente: f.monto,
        moneda: 'USD', fechaEmision: now, fechaVencimiento: now, estado: 'vencida', updatedAt: now,
      },
    })
  }

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.apl@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.apl@gyscontrol.com', name: 'UI Test Apl', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent(LIQUIDACION)
    const b64 = Buffer.from(await page.pdf({ format: 'A4', landscape: true })).toString('base64')

    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.apl@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})
    assert(page.url() === BASE + '/', 'login exitoso')

    // ── 1) Leer y cruzar ──
    console.log('\n[1] lee el documento y cruza cada fila con su CxC')
    const r: any = await page.evaluate(async ({ b64 }) => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const fd = new FormData()
      fd.append('file', new File([bytes], 'liquidacion.pdf', { type: 'application/pdf' }))
      const res = await fetch('/api/administracion/operaciones-factoring/leer', { method: 'POST', body: fd })
      return { status: res.status, body: await res.json() }
    }, { b64 })
    assert(r.status === 200, `responde 200 (fue ${r.status})`)
    const { operacion, coincidencias } = r.body
    assert(operacion.numeroOperacion === '52104', `operación 52104 (fue ${operacion.numeroOperacion})`)
    assert(coincidencias.length === 3, `3 filas (fue ${coincidencias.length})`)
    assert(coincidencias.every((c: any) => c.estado === 'lista'), `las 3 encontraron su CxC (${coincidencias.map((c: any) => c.estado).join(',')})`)

    const porDoc: Record<string, any> = Object.fromEntries(coincidencias.map((c: any) => [c.numeroDocumento, c]))
    assert(porDoc[DOCS.d1]?.cxc?.numeroDocumento === `E001-${DOCS.d1}`, `${DOCS.d1} cruzó con E001-${DOCS.d1} sin asumir la serie`)
    assert(cerca(porDoc[DOCS.d1]?.detraccionCalculada, 1126.32), `deduce la detracción de ${DOCS.d1}: 1,126.32 (fue ${porDoc[DOCS.d1]?.detraccionCalculada})`)
    assert(cerca(porDoc[DOCS.d1]?.detraccionPct, 12, 0.05), `y el porcentaje: 12% (fue ${porDoc[DOCS.d1]?.detraccionPct})`)
    assert(cerca(porDoc[DOCS.d2]?.detraccionCalculada, 2260.89), `detracción de ${DOCS.d2}: 2,260.89 (fue ${porDoc[DOCS.d2]?.detraccionCalculada})`)
    assert(cerca(porDoc[DOCS.d3]?.detraccionCalculada, 664.90), `detracción de ${DOCS.d3}: 664.90 (fue ${porDoc[DOCS.d3]?.detraccionCalculada})`)
    assert(cerca(operacion.adelantoBanpro, 26800), `adelanto de la operación 26,800 (fue ${operacion.adelantoBanpro})`)

    // ── 2) Un reparto que no cuadra tiene que ser rechazado ──
    console.log('\n[2] rechaza un reparto que no suma los totales del documento')
    const cuerpo = (comisiones: number[], adelantos: number[]) => ({
      numeroOperacion: '52104', financiera: 'BANPRO', fechaDesembolso: '2026-04-30',
      totales: { comisionEstructuracion: 252.58, gastosAdicionales: 25, igvGastos: 49.96, adelantoBanpro: 26800 },
      facturas: [DOCS.d1, DOCS.d2, DOCS.d3].map((d, i) => ({
        cuentaPorCobrarId: porDoc[d].cxc.id,
        detraccionPct: 12, detraccionMonto: porDoc[d].detraccionCalculada,
        excedentePct: 1, excedenteMonto: porDoc[d].excedenteMonto,
        valorAFinanciar: porDoc[d].valorAFinanciar, interesMonto: porDoc[d].interesMonto,
        diasFinanciamiento: porDoc[d].diasFinanciamiento, fechaVencimiento: porDoc[d].fechaVencimiento,
        comisionEstructuracion: comisiones[i], gastosAdicionales: [5, 15, 5][i], igvGastos: [11.70, 30.16, 8.10][i],
        adelantoBanpro: adelantos[i],
      })),
    })
    const malo: any = await page.evaluate(async (body) => {
      const res = await fetch('/api/administracion/operaciones-factoring/aplicar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return { status: res.status, body: await res.json() }
    }, cuerpo([60, 152.58, 40], [7497.12, 14832.53, 4000]) as any)  // adelanto 470.35 de menos
    assert(malo.status === 400, `lo rechaza con 400 (fue ${malo.status})`)
    assert(/Adelanto/i.test(JSON.stringify(malo.body?.descuadres ?? '')), `y dice cuál descuadra: ${JSON.stringify(malo.body?.descuadres)}`)
    const sinCrear = await prisma.cobroValorizacion.count({ where: { numeroOperacion: '52104', valorizacion: { codigo: { startsWith: MARCA } } } })
    assert(sinCrear === 0, 'no creó ningún cobro: o entran todas o ninguna')

    // ── 3) El reparto correcto las registra todas ──
    console.log('\n[3] aplica las 3 facturas de una vez')
    const bueno: any = await page.evaluate(async (body) => {
      const res = await fetch('/api/administracion/operaciones-factoring/aplicar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return { status: res.status, body: await res.json() }
    }, cuerpo([60, 152.58, 40], [7497.12, 14832.53, 4470.35]) as any)
    assert(bueno.status === 200, `responde 200 (fue ${bueno.status}) ${JSON.stringify(bueno.body?.descuadres ?? '')}`)
    assert(bueno.body?.registradas === 3, `registró las 3 (fue ${bueno.body?.registradas})`)

    console.log('\n[4] cada factura queda con su cobro y su Cronograma')
    for (const [d, esperado] of [[DOCS.d1, { ade: 7497.12, saldo: 268.53, det: 1126.32, exc: 82.60 }],
                                 [DOCS.d2, { ade: 14832.53, saldo: 485.30, det: 2260.89, exc: 165.80 }],
                                 [DOCS.d3, { ade: 4470.35, saldo: 152.76, det: 664.90, exc: 48.76 }]] as const) {
      const cxc = await prisma.cuentaPorCobrar.findFirst({
        where: { numeroDocumento: `E001-${d}` },
        include: { valorizacion: { select: { id: true, cobro: true } } },
      })
      const cobro = cxc?.valorizacion?.cobro
      const abonos = cobro ? await prisma.abonoValorizacion.findMany({ where: { cobroId: cobro.id } }) : []
      const tipos = abonos.map(a => a.tipo).sort().join(',')
      assert(cobro != null, `${d}: tiene cobro`)
      assert(cerca(cobro?.adelantoBanpro, esperado.ade), `${d}: adelanto ${esperado.ade} (fue ${cobro?.adelantoBanpro})`)
      assert(cerca(cobro?.saldoAGirar, esperado.saldo), `${d}: saldo a girar ${esperado.saldo} (fue ${cobro?.saldoAGirar})`)
      assert(tipos === 'adelanto,detraccion,excedente,saldo_girar', `${d}: los 4 eventos del Cronograma (fue ${tipos})`)
      assert(cerca(cxc?.detraccionMonto, esperado.det), `${d}: la detracción quedó en la CxC (fue ${cxc?.detraccionMonto})`)
    }

    console.log('\n[5] el botón desaparece cuando la CxC ya tiene cobro')
    const cxcYa = await prisma.cuentaPorCobrar.findFirstOrThrow({ where: { numeroDocumento: `E001-${DOCS.d1}` } })
    await page.goto(`${BASE}/administracion/cuentas-cobrar/${cxcYa.id}`)
    await page.waitForSelector('text=BANPRO', { timeout: 20000 })
    const botonesYa = await page.locator('button:has-text("Registrar operación")').count()
    assert(botonesYa === 0, `ya registrada: no ofrece "Registrar operación" (había ${botonesYa})`)

    console.log('\n[6] la operación cuadra contra BANPRO')
    const vista: any = await page.evaluate(async () => {
      const res = await fetch('/api/administracion/operaciones-factoring/52104')
      return await res.json()
    })
    const propias = vista.facturas.filter((f: any) => f.numeroDocumento?.startsWith('E001-7'))
    assert(propias.length === 3, `la vista de operación agrupa las 3 (fue ${propias.length})`)
    const sum = (k: string) => Math.round(propias.reduce((a: number, f: any) => a + (f[k] ?? 0), 0) * 100) / 100
    assert(cerca(sum('valorAFinanciar'), 29418.41), `Σ valor a financiar = 29,418.41 (fue ${sum('valorAFinanciar')})`)
    assert(cerca(sum('adelantoBanpro'), 26800), `Σ adelanto = 26,800.00, el depósito único (fue ${sum('adelantoBanpro')})`)
    assert(cerca(sum('comisionEstructuracion'), 252.58), `Σ comisión = 252.58 (fue ${sum('comisionEstructuracion')})`)
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-APL-' } }, select: { id: true } })
    for (const v of vals) {
      const co = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (co) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: co.id } })
        await prisma.cobroValorizacion.delete({ where: { id: co.id } })
      }
    }
    for (const d of Object.values(DOCS)) {
      await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: `E001-${d}` } } })
      await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: `E001-${d}` } })
    }
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-APL-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.apl@gyscontrol.com' }, select: { id: true } })
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
