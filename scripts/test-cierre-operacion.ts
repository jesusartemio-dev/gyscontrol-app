/**
 * Los campos que faltaban en la Hoja de Liquidación: Monto Anticipo, Interés
 * Reliquidación, Líquido a Girar, Mora, Com. Interés, Diferencia, Otros y
 * Total Excedente.
 *
 * Usa los números reales de la operación 48507 (QRM15 E001-1719) y de su
 * Informe de Excedentes, donde el cliente pagó 8 días tarde:
 *
 *   Saldo a Girar 936.24 − Reliquidación 28.31 = Líquido a Girar 907.93
 *   Excedente 310.87 + Mora (−255.44) + Diferencia (−0.04) = Total 55.39
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-cierre-operacion.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-CIERRE-${Date.now()}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number, tol = 0.02) => a != null && Math.abs(a - b) <= tol

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const val = await prisma.valorizacion.create({
    data: {
      proyectoId: proyecto.id, numero: 9701, codigo: `${MARCA}-V`,
      periodoInicio: now, periodoFin: now, presupuestoContractual: 35326.44,
      montoValorizacion: 35326.44, netoARecibir: 35326.44, moneda: 'USD',
      estado: 'facturada', updatedAt: now,
    },
  })
  const cxc = await prisma.cuentaPorCobrar.create({
    data: {
      proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
      numeroDocumento: `${MARCA}-F`, monto: 35326.44, saldoPendiente: 35326.44,
      moneda: 'USD', fechaEmision: now, fechaVencimiento: now, estado: 'vencida', updatedAt: now,
    },
  })

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.cierre@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.cierre@gyscontrol.com', name: 'UI Test Cierre', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.cierre@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})
    assert(page.url() === BASE + '/', 'login exitoso')

    console.log('\n[1] guarda el cierre de la operación')
    const r: any = await page.evaluate(async ({ proyectoId, valId }) => {
      const res = await fetch(`/api/proyectos/${proyectoId}/valorizaciones/${valId}/cobro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'factoring', financiera: 'BANPRO', numeroOperacion: '48507',
          fechaDesembolso: '2026-03-02', fechaVencimiento: '2026-06-30', diasFinanciamiento: 120,
          detraccionPct: 12, detraccionMonto: 4239.17,
          excedentePct: 1, excedenteMonto: 310.87, valorAFinanciar: 30776.40,
          interesMonto: 1698.86, comisionEstructuracion: 264.24, gastosAdicionales: 25, igvGastos: 52.06,
          adelantoBanpro: 27800, saldoAGirar: 936.24,
          // Lo nuevo — del Informe de Excedentes y de la factura de reliquidación
          interesReliquidacion: 28.31, mora: -255.44, comisionInteres: 0, diferencia: -0.04, otros: 0,
          numeroFacturaReliquidacion: 'FR01-00006534', fechaFacturaReliquidacion: '2026-03-16',
        }),
      })
      return { status: res.status, body: await res.json() }
    }, { proyectoId: proyecto.id, valId: val.id })
    assert(r.status === 200, `responde 200 (fue ${r.status})`)

    const cobro = await prisma.cobroValorizacion.findUniqueOrThrow({ where: { valorizacionId: val.id } })
    assert(cerca(cobro.interesReliquidacion, 28.31), `guardó la reliquidación 28.31 (fue ${cobro.interesReliquidacion})`)
    assert(cerca(cobro.mora, -255.44), `guardó la mora NEGATIVA −255.44 (fue ${cobro.mora})`)
    assert(cerca(cobro.diferencia, -0.04), `guardó la diferencia −0.04 (fue ${cobro.diferencia})`)
    assert(cobro.numeroFacturaReliquidacion === 'FR01-00006534', `guardó el N° de factura de la reliquidación (fue ${cobro.numeroFacturaReliquidacion})`)
    assert(cobro.fechaFacturaReliquidacion?.toISOString().slice(0, 10) === '2026-03-16',
      `y su fecha de emisión (fue ${cobro.fechaFacturaReliquidacion?.toISOString().slice(0, 10)})`)

    console.log('\n[2] los derivados cuadran con la hoja de Administración')
    const montoAnticipo = Math.round((30776.40 - 1698.86) * 100) / 100
    const liquidoAGirar = Math.round((936.24 - 28.31) * 100) / 100
    const totalExcedente = Math.round((310.87 + (-255.44) + 0 + (-0.04) + 0) * 100) / 100
    assert(cerca(montoAnticipo, 29077.54), `Monto Anticipo = Valor a Financiar − Interés = 29,077.54 (dio ${montoAnticipo})`)
    assert(cerca(liquidoAGirar, 907.93), `Líquido a Girar = Saldo a Girar − Reliquidación = 907.93 (dio ${liquidoAGirar})`)
    assert(cerca(totalExcedente, 55.39), `Total Excedente = 55.39, el del Informe de Excedentes (dio ${totalExcedente})`)

    console.log('\n[3] se ven en la pantalla')
    await page.goto(`${BASE}/administracion/cuentas-cobrar/${cxc.id}`)
    await page.waitForSelector('text=BANPRO', { timeout: 60000 })
    const resumen = await page.locator('body').innerText()
    assert(/Interés Reliquidación/i.test(resumen), 'el resumen muestra Interés Reliquidación')
    assert(/Mora/i.test(resumen) && resumen.includes('255.44'), 'muestra la mora −255.44')
    assert(/Total Excedente/i.test(resumen) && resumen.includes('55.39'), 'muestra el Total Excedente 55.39')
    assert(resumen.includes('FR01-00006534'), 'muestra la factura de la reliquidación')

    console.log('\n[4] y en la Hoja de Liquidación al editar')
    await page.locator('button:has-text("Editar")').last().click()
    await page.locator('text=Hoja de Liquidación').waitFor({ timeout: 20000 })
    const hoja = await page.locator('table').filter({ hasText: 'Monto a Desembolsar' }).first().innerText()
    assert(/Monto Anticipo/i.test(hoja), 'la hoja tiene la fila Monto Anticipo')
    assert(hoja.includes('29,077.54'), `y muestra 29,077.54 (hoja: ${hoja.includes('29,077.54')})`)
    assert(/Líquido a Girar/i.test(hoja), 'tiene la fila Líquido a Girar')
    assert(hoja.includes('907.93'), 'y muestra 907.93')
    assert(/Total Excedente/i.test(hoja), 'tiene la fila Total Excedente')
    assert(hoja.includes('55.39'), 'y muestra 55.39')
    assert(/Com\. Interés/i.test(hoja) && /Diferencia/i.test(hoja) && /Otros/i.test(hoja),
      'están las filas Com. Interés, Diferencia y Otros')
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-CIERRE-' } }, select: { id: true } })
    for (const v of vals) {
      const co = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (co) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: co.id } })
        await prisma.cobroValorizacion.delete({ where: { id: co.id } })
      }
    }
    await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: { startsWith: 'TEST-CIERRE-' } } } })
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: 'TEST-CIERRE-' } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-CIERRE-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.cierre@gyscontrol.com' }, select: { id: true } })
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
