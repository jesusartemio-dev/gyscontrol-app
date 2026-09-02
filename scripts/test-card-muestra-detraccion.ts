/**
 * El card de solo lectura del cobro NO mostraba la detracción cuando el cobro
 * era factoring (solo en directo). Esta prueba abre la página de verdad y mira
 * el DOM, que es donde se notó el problema.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-card-muestra-detraccion.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-CARD-${Date.now()}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const val = await prisma.valorizacion.create({
    data: {
      proyectoId: proyecto.id, numero: 9301, codigo: `${MARCA}-V`,
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
      detraccionPct: 12, detraccionMonto: 4239.17, detraccionMontoPEN: 14248,
      fechaEmision: new Date('2026-03-02'), fechaVencimiento: new Date('2026-06-30'),
      estado: 'vencida', updatedAt: now,
    },
  })
  await prisma.cobroValorizacion.create({
    data: {
      valorizacionId: val.id, tipo: 'factoring', financiera: 'BANPRO', numeroOperacion: '48507',
      estado: 'desembolsada', fechaDesembolso: new Date('2026-03-02'),
      detraccionPct: 12, detraccionMonto: 4239.17,
      valorAFinanciar: 30776.40, excedenteMonto: 310.87, adelantoBanpro: 27800,
      saldoAGirar: 936.24, montoADesembolsar: 28736.24, updatedAt: now,
    },
  })

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.card@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.card@gyscontrol.com', name: 'UI Test Card', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.card@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    await page.goto(`${BASE}/administracion/cuentas-cobrar/${cxc.id}`)
    await page.waitForSelector('text=BANPRO', { timeout: 20000 })
    const texto = await page.locator('body').innerText()

    assert(texto.includes('Factoring'), 'la página muestra el cobro de factoring')
    assert(/Detracci[oó]n/i.test(texto), 'el card muestra la fila Detracción (antes faltaba en factoring)')
    assert(texto.includes('4,239.17'), 'muestra el importe en USD que descuenta: 4,239.17')
    assert(texto.includes('14,248.00') || texto.includes('14248.00'), 'muestra el depósito al Banco de la Nación: S/ 14,248.00')
    assert(/TC\s*3\.361/.test(texto), 'muestra el tipo de cambio 3.361')
    assert(texto.includes('(12%)'), 'muestra el porcentaje de detracción')

    const filaDet = await page.locator('text=/Detracci[oó]n/').first().locator('xpath=..').innerText().catch(() => '')
    console.log(`   fila Detracción: ${filaDet.replace(/\n/g, ' | ')}`)
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
  } finally {
    await browser.close()
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-CARD-' } }, select: { id: true } })
    for (const v of vals) {
      const co = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (co) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: co.id } })
        await prisma.cobroValorizacion.delete({ where: { id: co.id } })
      }
    }
    await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: { startsWith: 'TEST-CARD-' } } } })
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: 'TEST-CARD-' } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-CARD-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.card@gyscontrol.com' }, select: { id: true } })
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
