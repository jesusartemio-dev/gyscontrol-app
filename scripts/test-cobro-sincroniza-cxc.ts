/**
 * Al guardar el cobro, la detracción/retención tienen que quedar también en la
 * CxC — son datos de la factura, y antes divergían: el cobro decía una cosa y
 * la CxC otra (o nada). Incluye el depósito en soles al Banco de la Nación.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-cobro-sincroniza-cxc.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-SYNC-${Date.now()}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number, tol = 0.01) => a != null && Math.abs(a - b) <= tol

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const val = await prisma.valorizacion.create({
    data: {
      proyectoId: proyecto.id, numero: 9201, codigo: `${MARCA}-V`,
      periodoInicio: now, periodoFin: now, presupuestoContractual: 35326.44,
      montoValorizacion: 35326.44, netoARecibir: 35326.44, moneda: 'USD',
      estado: 'facturada', updatedAt: now,
    },
  })
  const cxc = await prisma.cuentaPorCobrar.create({
    data: {
      proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
      numeroDocumento: `${MARCA}-F`, monto: 35326.44, saldoPendiente: 35326.44,
      moneda: 'USD', tipoCambio: 3.361,
      fechaEmision: new Date('2026-03-02'), fechaVencimiento: new Date('2026-06-30'),
      estado: 'vencida', updatedAt: now,
    },
  })
  assert(cxc.detraccionMonto == null, 'la CxC arranca sin detracción cargada')

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.sync@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.sync@gyscontrol.com', name: 'UI Test Sync', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.sync@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})
    assert(page.url() === BASE + '/', 'login exitoso')

    // Guardar el cobro tal como lo manda el formulario (caso QRM15)
    const r = await page.evaluate(async ({ proyectoId, valId }) => {
      const res = await fetch(`/api/proyectos/${proyectoId}/valorizaciones/${valId}/cobro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'factoring', financiera: 'BANPRO', numeroOperacion: '48507',
          fechaDesembolso: '2026-03-02', fechaVencimiento: '2026-06-30', diasFinanciamiento: 120,
          detraccionPct: 12, detraccionMonto: 4239.17, detraccionMontoPEN: 14248,
          excedentePct: 1, excedenteMonto: 310.87, valorAFinanciar: 30776.40,
          interesMonto: 1698.86, comisionEstructuracion: 264.24, gastosAdicionales: 25, igvGastos: 52.06,
          adelantoBanpro: 27800, saldoAGirar: 936.24,
        }),
      })
      return { status: res.status, body: await res.json() }
    }, { proyectoId: proyecto.id, valId: val.id })
    assert(r.status === 200, `guardar el cobro responde 200 (fue ${r.status})`)

    // El cobro guarda su foto de la liquidación
    const cobro = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: val.id } })
    assert(cerca(cobro?.detraccionMonto, 4239.17), `el cobro guarda detraccionMonto 4239.17 (fue ${cobro?.detraccionMonto})`)

    // …y la CxC queda con los mismos datos de factura
    const despues = await prisma.cuentaPorCobrar.findUnique({ where: { id: cxc.id } })
    assert(cerca(despues?.detraccionPct, 12), `la CxC quedó con detraccionPct 12 (fue ${despues?.detraccionPct})`)
    assert(cerca(despues?.detraccionMonto, 4239.17), `la CxC quedó con detraccionMonto 4239.17 (fue ${despues?.detraccionMonto})`)
    assert(cerca(despues?.detraccionMontoPEN, 14248), `la CxC guardó el depósito al BN: S/ 14248 (fue ${despues?.detraccionMontoPEN})`)
    assert(despues?.detraccionMonto !== despues?.detraccionMontoPEN, 'el importe en USD y el del depósito son datos distintos')

    // El TC guardado explica la conversión
    const tcImplicito = (despues?.detraccionMontoPEN ?? 0) / (despues?.detraccionMonto ?? 1)
    assert(Math.abs(tcImplicito - (despues?.tipoCambio ?? 0)) < 0.01,
      `el TC implícito (${tcImplicito.toFixed(3)}) cuadra con el tipoCambio de la CxC (${despues?.tipoCambio})`)

    // Un guardado que NO manda esos campos no debe borrarlos
    const r2 = await page.evaluate(async ({ proyectoId, valId }) => {
      const res = await fetch(`/api/proyectos/${proyectoId}/valorizaciones/${valId}/cobro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'factoring', financiera: 'BANPRO', observaciones: 'solo una nota' }),
      })
      return { status: res.status }
    }, { proyectoId: proyecto.id, valId: val.id })
    assert(r2.status === 200, `segundo guardado responde 200 (fue ${r2.status})`)
    const final = await prisma.cuentaPorCobrar.findUnique({ where: { id: cxc.id } })
    assert(cerca(final?.detraccionMonto, 4239.17), 'un guardado sin esos campos NO los borra de la CxC')
    assert(cerca(final?.detraccionMontoPEN, 14248), 'tampoco borra el depósito al BN')
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-SYNC-' } }, select: { id: true } })
    for (const v of vals) {
      const co = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (co) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: co.id } })
        await prisma.cobroValorizacion.delete({ where: { id: co.id } })
      }
    }
    await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: { startsWith: 'TEST-SYNC-' } } } })
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: 'TEST-SYNC-' } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-SYNC-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.sync@gyscontrol.com' }, select: { id: true } })
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
