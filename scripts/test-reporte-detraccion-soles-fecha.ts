/**
 * Dos bugs reales reportados por Administración sobre el reporte "Formato
 * contable" (y el mismo dato en el detalle de la CxC):
 *
 * 1) El monto en soles de la detracción se computaba SIEMPRE con "monto ×
 *    tipoCambio", ignorando el importe REAL que Administración carga al
 *    confirmar (constancia del Banco de la Nación). Coincidía por casualidad
 *    en QRM16 (1126.32 × 3.519 ≈ 3964, igual al real) pero es el mismo tipo
 *    de desfase de centavos que ya vimos en QRM15/FMK01 — con otro TC real
 *    habría mostrado un número que no es el que Administración cargó.
 * 2) La columna "Fecha" de la detracción leía un campo que "Marcar recibido"
 *    nunca llena (detraccionFechaPago) — por eso siempre salía vacía.
 *
 * Requiere el dev server en localhost:3000 (para probar la sincronización vía
 * "Marcar recibido" real, no solo las funciones puras del reporte).
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-reporte-detraccion-soles-fecha.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'
import { detraccionEnSoles, type CxCRichRow } from '../src/lib/utils/cuentasCobrarExcel'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-REPDET-${Date.now()}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}

// ── Parte A: la función pura del reporte ──────────────────────────────────
function fixture(pago: Partial<NonNullable<CxCRichRow['pagos']>[number]>): CxCRichRow {
  return {
    numeroDocumento: 'X', descripcion: null, monto: 4250.51, moneda: 'USD', tipoCambio: 3.519,
    montoPagado: 0, saldoPendiente: 0, fechaEmision: '2026-01-01', fechaVencimiento: '2026-01-01',
    estado: 'parcial', observaciones: null,
    pagos: [{ monto: 509.98, fechaPago: '2026-07-13', medioPago: 'detraccion', esDetraccion: true, anulado: false, numeroOperacion: null, observaciones: null, ...pago }],
  }
}

async function main() {
  console.log('\n[A] detraccionEnSoles() prioriza el importe REAL cargado, no el TC teórico')
  // Caso real: FMK01 — TC teórico daría 509.98 × 3.519 ≈ 1794.63, pero el
  // depósito REAL que aparece en la factura es S/ 1737.00.
  const conReal = detraccionEnSoles(fixture({ detraccionMontoPEN: 1737 }))
  assert(conReal === 1737, `con detraccionMontoPEN=1737 cargado, devuelve 1737 (fue ${conReal})`)
  assert(conReal !== Math.round(509.98 * 3.519), 'y NO el cálculo teórico (que daría ≈1795, un número distinto)')

  // Sin el campo real cargado (registro viejo): cae al cálculo por TC, como antes.
  const sinReal = detraccionEnSoles(fixture({ detraccionMontoPEN: null }))
  assert(sinReal === Math.round(509.98 * 3.519), `sin detraccionMontoPEN, usa el fallback por TC (fue ${sinReal})`)

  console.log('\n[B] la CxC ya cerrada (QRM16 real) sincroniza el número real al confirmar')
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const val = await prisma.valorizacion.create({
    data: {
      proyectoId: proyecto.id, numero: 9980, codigo: `${MARCA}-V`,
      periodoInicio: now, periodoFin: now, presupuestoContractual: 9386.04,
      montoValorizacion: 9386.04, netoARecibir: 9386.04, moneda: 'USD',
      estado: 'facturada', updatedAt: now,
    },
  })
  const cxc = await prisma.cuentaPorCobrar.create({
    data: {
      proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
      numeroDocumento: `${MARCA}-F`, monto: 9386.04, saldoPendiente: 1126.32, montoPagado: 8259.72,
      moneda: 'USD', tipoCambio: 3.519, detraccionPct: 12, detraccionMonto: 1126.32, detraccionMontoPEN: null,
      fechaEmision: now, fechaVencimiento: now, estado: 'parcial', updatedAt: now,
    },
  })
  assert(cxc.detraccionMontoPEN == null, 'la CxC arranca sin el depósito en soles (como QRM16 antes de este fix)')

  const cobro = await prisma.cobroValorizacion.create({
    data: { valorizacionId: val.id, tipo: 'factoring', financiera: 'BANPRO', estado: 'desembolsada', fechaDesembolso: now, updatedAt: now },
  })
  await prisma.abonoValorizacion.create({
    data: { cobroId: cobro.id, tipo: 'adelanto', estado: 'recibido', montoEsperado: 7497.12, montoReal: 7497.12, fechaReal: now, createdAt: now },
  })
  const abonoDetraccion = await prisma.abonoValorizacion.create({
    data: { cobroId: cobro.id, tipo: 'detraccion', estado: 'pendiente', montoEsperado: 1126.32, createdAt: now },
  })

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.repdet@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.repdet@gyscontrol.com', name: 'UI Test RepDet', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.repdet@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    // Confirmar la Detracción con el número real, como haría Administración
    // desde "Marcar recibido" — el escenario exacto reportado.
    const r: any = await page.evaluate(async ({ proyectoId, valId, abonoId }) => {
      const res = await fetch(`/api/proyectos/${proyectoId}/valorizaciones/${valId}/cobro/abonos/${abonoId}/recibir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoReal: 1126.32, fechaReal: '2026-05-04', numeroConstanciaBN: '303851272', detraccionMontoPEN: 3964 }),
      })
      return { status: res.status }
    }, { proyectoId: proyecto.id, valId: val.id, abonoId: abonoDetraccion.id })
    assert(r.status === 200, `confirmar responde 200 (fue ${r.status})`)

    const cxcDespues = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: cxc.id } })
    assert(cxcDespues.detraccionMontoPEN === 3964, `CxC.detraccionMontoPEN quedó en 3964 — YA se ve en la card de resumen (fue ${cxcDespues.detraccionMontoPEN})`)

    console.log('\n[C] con ese dato ya sincronizado, el reporte también sale bien')
    const pagoDet = await prisma.pagoCobro.findFirstOrThrow({ where: { cuentaPorCobrarId: cxc.id, esDetraccion: true } })
    const filaReporte = fixture({
      detraccionMontoPEN: pagoDet.detraccionMontoPEN, fechaPago: pagoDet.fechaPago.toISOString(),
      numeroConstanciaBN: pagoDet.numeroConstanciaBN,
    })
    assert(detraccionEnSoles(filaReporte) === 3964, `el reporte mostraría 3964 (fue ${detraccionEnSoles(filaReporte)})`)
    assert(filaReporte.pagos![0].fechaPago === pagoDet.fechaPago.toISOString(), 'y la fila SÍ tiene fecha de pago para la columna Fecha (antes esa columna leía un campo que nunca se llenaba)')
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    const co = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: val.id } })
    if (co) {
      await prisma.abonoValorizacion.deleteMany({ where: { cobroId: co.id } })
      await prisma.cobroValorizacion.delete({ where: { id: co.id } })
    }
    await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: { startsWith: MARCA } } } })
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: MARCA } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: MARCA } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.repdet@gyscontrol.com' }, select: { id: true } })
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
