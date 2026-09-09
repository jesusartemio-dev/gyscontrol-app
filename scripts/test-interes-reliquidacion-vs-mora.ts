/**
 * Dos correcciones sobre el mismo caso real (QRM15 E001-1719) que señaló
 * Administración:
 *
 * 1) El faltante al confirmar "Saldo a Girar" es interés de reliquidación,
 *    no mora — pero antes se etiquetaba igual que el de "Excedente" (que sí
 *    es mora real), y esa etiqueta alimentaba la tarjeta "Ajuste por mora".
 * 2) "Marcar recibido" de la Detracción no distinguía moneda: el comprobante
 *    en soles del Banco de la Nación se podía escribir directo en el campo
 *    de monto (en la moneda de la CxC), sobrepagando la cuenta.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-interes-reliquidacion-vs-mora.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-INTMORA-${Date.now()}`
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
      proyectoId: proyecto.id, numero: 9999, codigo: `${MARCA}-V`,
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
  const cobro = await prisma.cobroValorizacion.create({
    data: {
      valorizacionId: val.id, tipo: 'factoring', financiera: 'BANPRO', numeroOperacion: '48507',
      estado: 'desembolsada', fechaDesembolso: now,
      detraccionPct: 12, detraccionMonto: 4239.17,
      excedentePct: 1, excedenteMonto: 310.87, valorAFinanciar: 30776.40,
      interesMonto: 1698.86, comisionEstructuracion: 264.24, gastosAdicionales: 25, igvGastos: 52.06,
      adelantoBanpro: 27800, saldoAGirar: 936.24, updatedAt: now,
    },
  })
  const abAdelanto = await prisma.abonoValorizacion.create({
    data: { cobroId: cobro.id, tipo: 'adelanto', estado: 'recibido', montoEsperado: 27800, montoReal: 27800, fechaReal: now, createdAt: now },
  })
  const abSaldo = await prisma.abonoValorizacion.create({
    data: { cobroId: cobro.id, tipo: 'saldo_girar', estado: 'pendiente', montoEsperado: 936.24, createdAt: now },
  })
  const abDetraccion = await prisma.abonoValorizacion.create({
    data: { cobroId: cobro.id, tipo: 'detraccion', estado: 'pendiente', montoEsperado: 4239.17, createdAt: now },
  })
  const abExcedente = await prisma.abonoValorizacion.create({
    data: { cobroId: cobro.id, tipo: 'excedente', estado: 'pendiente', montoEsperado: 310.87, createdAt: now },
  })
  const pagoAdelanto = await prisma.pagoCobro.create({
    data: { cuentaPorCobrarId: cxc.id, monto: 27800, fechaPago: now, medioPago: 'factoring', updatedAt: now },
  })
  await prisma.abonoValorizacion.update({ where: { id: abAdelanto.id }, data: { pagoCobroId: pagoAdelanto.id } })
  // El "costo de financiamiento" que procesarDesembolsoFactoring crea solo:
  // interés (1698.86) + comisión (264.24) + gastos (25) + IGV (52.06) = 2040.16.
  await prisma.pagoCobro.create({
    data: { cuentaPorCobrarId: cxc.id, monto: 2040.16, fechaPago: now, medioPago: 'factoring_costo', esCostoFinanciamiento: true, updatedAt: now },
  })

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.intmora@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.intmora@gyscontrol.com', name: 'UI Test IntMora', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.intmora@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    const recibir = (abonoId: string, body: Record<string, unknown>) => page.evaluate(async ({ proyectoId, valId, abonoId, body }) => {
      const res = await fetch(`/api/proyectos/${proyectoId}/valorizaciones/${valId}/cobro/abonos/${abonoId}/recibir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return { status: res.status, body: await res.json() }
    }, { proyectoId: proyecto.id, valId: val.id, abonoId, body })

    console.log('\n[1] confirmar Saldo a Girar con faltante → interés de reliquidación, no mora')
    const r1: any = await recibir(abSaldo.id, { montoReal: 907.93, fechaReal: '2026-03-31' })
    assert(r1.status === 200, `responde 200 (fue ${r1.status})`)

    const pagoInteres = await prisma.pagoCobro.findFirst({ where: { cuentaPorCobrarId: cxc.id, medioPago: 'factoring_ajuste_interes' } })
    assert(pagoInteres != null, 'crea el PagoCobro con medioPago factoring_ajuste_interes (no mora)')
    assert(cerca(pagoInteres?.monto, 28.31), `por el monto correcto 28.31 (fue ${pagoInteres?.monto}`)
    assert(pagoInteres?.esAjusteMora === true, 'sigue marcado esAjusteMora=true (para que el dashboard de empresa lo siga excluyendo de "cobrado real")')
    const pagoMoraViejo = await prisma.pagoCobro.findFirst({ where: { cuentaPorCobrarId: cxc.id, medioPago: 'factoring_ajuste_mora' } })
    assert(pagoMoraViejo == null, 'NO crea ningún PagoCobro con medioPago factoring_ajuste_mora para este evento')

    const cobroActualizado = await prisma.cobroValorizacion.findUniqueOrThrow({ where: { id: cobro.id } })
    assert(cerca(cobroActualizado.interesReliquidacion, 28.31),
      `se autocompletó cobro.interesReliquidacion=28.31 en la Hoja de Liquidación (fue ${cobroActualizado.interesReliquidacion})`)

    console.log('\n[2] confirmar Excedente con faltante → SIGUE siendo mora (sin cambios)')
    // Antes hay que cerrar Detracción — el orden lo exige el propio servicio.
    await recibir(abDetraccion.id, { montoReal: 4239.17, fechaReal: '2026-03-04', numeroConstanciaBN: '298887985' })
    const r2: any = await recibir(abExcedente.id, { montoReal: 55.39, fechaReal: '2026-07-16' })
    assert(r2.status === 200, `responde 200 (fue ${r2.status})`)
    const pagoMoraExc = await prisma.pagoCobro.findFirst({ where: { cuentaPorCobrarId: cxc.id, medioPago: 'factoring_ajuste_mora' } })
    assert(pagoMoraExc != null, 'el faltante del Excedente SÍ crea medioPago factoring_ajuste_mora')
    assert(cerca(pagoMoraExc?.monto, 255.48), `por 255.48 — mora (fue ${pagoMoraExc?.monto})`)

    console.log('\n[3] las 2 tarjetas resumen separan interés de mora')
    await page.goto(`${BASE}/administracion/cuentas-cobrar/${cxc.id}`)
    await page.waitForSelector('text=Ajuste por mora', { timeout: 60000 })
    const resumen = await page.locator('body').innerText()
    // "Costo de financiamiento" ahora suma el costo original (2040.16) + el
    // interés de reliquidación (28.31) = 2068.47.
    assert(resumen.includes('2,068.47') || resumen.includes('2068.47'),
      `Costo de financiamiento = 2,040.16 + 28.31 = 2,068.47, incluye la reliquidación`)
    // "Ajuste por mora" ahora es SOLO la mora real del excedente (255.48), no
    // 283.79 (que era 28.31+255.48 mezclados).
    assert(resumen.includes('255.48'), 'Ajuste por mora = 255.48, sin el interés mezclado')
    assert(!resumen.includes('283.79'), 'y NO aparece el 283.79 que mezclaba los dos conceptos')

    console.log('\n[4] el Cronograma dice "interés" para Saldo a Girar y "mora" para Excedente')
    const filaSaldo = await page.locator('tr', { hasText: 'Saldo a girar' }).first().innerText().catch(() => '')
    const filaExc = await page.locator('tr', { hasText: 'Excedente' }).first().innerText().catch(() => '')
    assert(/inter[eé]s/i.test(filaSaldo), `fila Saldo a Girar dice "interés": ${filaSaldo.replace(/\n/g, ' | ')}`)
    assert(/mora/i.test(filaExc), `fila Excedente dice "mora": ${filaExc.replace(/\n/g, ' | ')}`)
    assert(!/mora/i.test(filaSaldo), 'fila Saldo a Girar NO dice "mora"')

    console.log('\n[5] "Marcar recibido" de Detracción: el campo PEN queda separado del monto')
    const pagoDet = await prisma.pagoCobro.findFirst({ where: { cuentaPorCobrarId: cxc.id, esDetraccion: true } })
    assert(cerca(pagoDet?.monto, 4239.17), `el monto quedó en USD 4239.17, no en soles (fue ${pagoDet?.monto})`)
    assert(pagoDet?.numeroConstanciaBN === '298887985', `y guardó la constancia BN (fue ${pagoDet?.numeroConstanciaBN}`)

    // Sin regresión: un evento ya recibido no se puede volver a marcar.
    const r5: any = await recibir(abDetraccion.id, { montoReal: 1, fechaReal: '2026-01-01' })
    assert(r5.status !== 200, 'un evento ya recibido no se puede volver a marcar')

    console.log('\n[6] la CxC cierra exacta: 27800 + 907.93 + 4239.17 + 55.39 = 35,326.44')
    const cxcFinal = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: cxc.id } })
    assert(cerca(cxcFinal.montoPagado, 35326.44), `montoPagado = 35,326.44 (fue ${cxcFinal.montoPagado})`)
    assert(cerca(cxcFinal.saldoPendiente, 0), `saldoPendiente = 0 (fue ${cxcFinal.saldoPendiente})`)
    assert(cxcFinal.estado === 'pagada', `estado = pagada (fue ${cxcFinal.estado})`)
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
    const u = await prisma.user.findUnique({ where: { email: 'uitest.intmora@gyscontrol.com' }, select: { id: true } })
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
