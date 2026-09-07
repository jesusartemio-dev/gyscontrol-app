/**
 * Una operación de factoring puede cubrir varias facturas, incluso de clientes
 * distintos (la 52104 real mezcla QROMA y NEXA). El modelo guarda un cobro por
 * factura, así que la operación solo existe como el numeroOperacion repetido.
 *
 * Reproduce la 52104 con sus 3 documentos y verifica que se reconstruya
 * completa, que sume los totales de BANPRO y que delate las facturas que
 * faltan por registrar.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-operacion-factoring.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-OP-${Date.now()}`
const OP = `TESTOP-${Date.now()}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number, tol = 0.01) => a != null && Math.abs(a - b) <= tol

// Los 3 documentos reales de la operación 52104 (Detalle de Liquidación BANPRO)
const DOCS = [
  { doc: '1737', factura: 9386.05, detrac: 1126.33, neto: 8259.72, aFin: 8177.12, exc: 82.60, int: 334.77, com: 60.00, gas: 5.00, igv: 11.70, ade: 7497.12, saldo: 268.54 },
  { doc: '1738', factura: 18840.77, detrac: 2260.89, neto: 16579.88, aFin: 16414.08, exc: 165.80, int: 898.51, com: 152.58, gas: 15.00, igv: 30.16, ade: 14832.53, saldo: 485.29 },
  { doc: '1739', factura: 5540.87, detrac: 664.90, neto: 4875.97, aFin: 4827.21, exc: 48.76, int: 151.00, com: 40.00, gas: 5.00, igv: 8.10, ade: 4470.35, saldo: 152.76 },
]

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const creados: { cxcId: string; doc: string }[] = []

  for (const [i, d] of DOCS.entries()) {
    const val = await prisma.valorizacion.create({
      data: {
        proyectoId: proyecto.id, numero: 9400 + i, codigo: `${MARCA}-${d.doc}`,
        periodoInicio: now, periodoFin: now, presupuestoContractual: d.factura,
        montoValorizacion: d.factura, netoARecibir: d.factura, moneda: 'USD',
        estado: 'facturada', updatedAt: now,
      },
    })
    const cxc = await prisma.cuentaPorCobrar.create({
      data: {
        proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
        numeroDocumento: `${MARCA}-E001-${d.doc}`, monto: d.factura, saldoPendiente: d.factura,
        moneda: 'USD', fechaEmision: now, fechaVencimiento: now, estado: 'vencida', updatedAt: now,
      },
    })
    await prisma.cobroValorizacion.create({
      data: {
        valorizacionId: val.id, tipo: 'factoring', financiera: 'BANPRO',
        numeroOperacion: OP, numeroDocumentos: 3, estado: 'desembolsada',
        fechaDesembolso: now, detraccionPct: 12, detraccionMonto: d.detrac,
        excedentePct: 1, excedenteMonto: d.exc, valorAFinanciar: d.aFin, interesMonto: d.int,
        comisionEstructuracion: d.com, gastosAdicionales: d.gas, igvGastos: d.igv,
        adelantoBanpro: d.ade, saldoAGirar: d.saldo, updatedAt: now,
      },
    })
    creados.push({ cxcId: cxc.id, doc: d.doc })
  }

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.op@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.op@gyscontrol.com', name: 'UI Test Op', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.op@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})
    assert(page.url() === BASE + '/', 'login exitoso')

    const r: any = await page.evaluate(async (op) => {
      const res = await fetch(`/api/administracion/operaciones-factoring/${encodeURIComponent(op)}`)
      return { status: res.status, body: await res.json() }
    }, OP)
    assert(r.status === 200, `la operación responde 200 (fue ${r.status})`)
    const o = r.body

    console.log('\n[la operación se reconstruye completa]')
    assert(o.facturasRegistradas === 3, `agrupa las 3 facturas (fue ${o.facturasRegistradas})`)
    assert(o.documentosDeclarados === 3, `sabe que BANPRO declaró 3 documentos (fue ${o.documentosDeclarados})`)
    assert(o.facturasFaltantes === 0, `no falta ninguna (fue ${o.facturasFaltantes})`)
    assert(o.financiera === 'BANPRO', `la financiera es BANPRO (fue ${o.financiera})`)

    console.log('\n[los totales cuadran con el Detalle de Liquidación de BANPRO]')
    assert(cerca(o.totales.valorAFinanciar, 29418.41), `Valor a Financiar = 29,418.41 (fue ${o.totales.valorAFinanciar})`)
    assert(cerca(o.totales.excedenteMonto, 297.16), `Excedente = 297.16 (fue ${o.totales.excedenteMonto})`)
    assert(cerca(o.totales.interesMonto, 1384.28), `Interés = 1,384.28 (fue ${o.totales.interesMonto})`)
    assert(cerca(o.totales.comisionEstructuracion, 252.58), `Comisión = 252.58 (fue ${o.totales.comisionEstructuracion})`)
    assert(cerca(o.totales.gastosAdicionales, 25.00), `Gastos = 25.00 (fue ${o.totales.gastosAdicionales})`)
    assert(cerca(o.totales.igvGastos, 49.96), `IGV = 49.96 (fue ${o.totales.igvGastos})`)
    assert(cerca(o.totales.adelantoBanpro, 26800.00), `Adelanto = 26,800.00, el depósito único (fue ${o.totales.adelantoBanpro})`)
    assert(cerca(o.totales.saldoAGirar, 906.59, 0.02), `Saldo a Girar ≈ 906.60 (fue ${o.totales.saldoAGirar})`)

    console.log('\n[delata las facturas que faltan por registrar]')
    // Se borra el cobro de una: BANPRO sigue declarando 3, pero quedan 2.
    const cobroBorrar = await prisma.cobroValorizacion.findFirst({
      where: { numeroOperacion: OP, valorizacion: { codigo: `${MARCA}-1739` } },
    })
    await prisma.cobroValorizacion.delete({ where: { id: cobroBorrar!.id } })
    const r2: any = await page.evaluate(async (op) => {
      const res = await fetch(`/api/administracion/operaciones-factoring/${encodeURIComponent(op)}`)
      return await res.json()
    }, OP)
    assert(r2.facturasRegistradas === 2, `ahora hay 2 registradas (fue ${r2.facturasRegistradas})`)
    assert(r2.facturasFaltantes === 1, `avisa que falta 1 (fue ${r2.facturasFaltantes})`)
    assert(!cerca(r2.totales.adelantoBanpro, 26800.00), 'y el adelanto ya no suma el depósito de BANPRO — el descuadre se ve')

    console.log('\n[se ve en la pantalla de la CxC]')
    await page.goto(`${BASE}/administracion/cuentas-cobrar/${creados[0].cxcId}`)
    await page.waitForSelector('text=BANPRO', { timeout: 20000 })
    // El bloque de la operación llega en un fetch posterior al de la CxC, así
    // que hay que esperarlo: sin esto el innerText se captura antes y las
    // aserciones fallan por una carrera, no por un bug.
    const bloqueOperacion = page.locator(`text=Operación ${OP}`)
    await bloqueOperacion.waitFor({ timeout: 20000 }).catch(() => {})
    assert(await bloqueOperacion.count() > 0, 'aparece el bloque de la operación (no solo la fila N° Operación)')

    const texto = await page.locator('body').innerText()
    assert(/Faltan\s*1/i.test(texto), 'avisa en pantalla que falta 1 factura')
    assert(texto.includes(`${MARCA}-E001-1738`), 'lista la factura hermana de la operación')
    // Con la 1739 sin registrar, el total de adelantos baja a 22,329.65 y ya no
    // coincide con los 26,800.00 que depositó BANPRO. Ver ese número distinto
    // en pantalla ES la señal de que falta cargar una factura.
    assert(texto.includes('22329.65') || texto.includes('22,329.65'),
      'el total de adelantos muestra 22,329.65, que ya no cuadra con el depósito de 26,800.00')
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-OP-' } }, select: { id: true } })
    for (const v of vals) {
      const co = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (co) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: co.id } })
        await prisma.cobroValorizacion.delete({ where: { id: co.id } })
      }
    }
    await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: { startsWith: 'TEST-OP-' } } } })
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: 'TEST-OP-' } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-OP-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.op@gyscontrol.com' }, select: { id: true } })
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
