/**
 * Bug real: al "Verificar factura" corregir la detracción, solo se
 * actualizaba CuentaPorCobrar.detraccionMonto. Pero una vez que ya hay un
 * cobro registrado, la Hoja de Liquidación lee de CobroValorizacion (que
 * gana sobre la CxC al cargar el formulario) y el Cronograma lee de
 * AbonoValorizacion.montoEsperado — ninguno de los dos se actualizaba, así
 * que la corrección "se perdía" en la pantalla aunque sí quedó guardada.
 *
 * Reproduce el caso exacto de FMK01: cobro directo ya registrado, evento
 * Detracción todavía pendiente.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-sincronizar-detraccion-3-lugares.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-SYNC3-${Date.now()}`
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
      proyectoId: proyecto.id, numero: 9960, codigo: `${MARCA}-V`,
      periodoInicio: now, periodoFin: now, presupuestoContractual: 4250.51,
      montoValorizacion: 4250.51, netoARecibir: 4250.51, moneda: 'USD',
      estado: 'facturada', updatedAt: now,
    },
  })
  const cxc = await prisma.cuentaPorCobrar.create({
    data: {
      proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
      numeroDocumento: `${MARCA}-E001-1761`, monto: 4250.51, saldoPendiente: 509.98, montoPagado: 3740.53,
      moneda: 'USD', detraccionPct: 12, detraccionMonto: 509.98,
      fechaEmision: new Date('2026-07-10'), fechaVencimiento: now, estado: 'parcial', updatedAt: now,
    },
  })
  // Cobro directo YA registrado — mismo estado que FMK01 en producción.
  const cobro = await prisma.cobroValorizacion.create({
    data: {
      valorizacionId: val.id, tipo: 'directo', fechaDesembolso: new Date('2026-07-13'),
      detraccionPct: 12, detraccionMonto: 509.98, montoNetoDirecto: 3740.53, updatedAt: now,
    },
  })
  const pagoNeto = await prisma.pagoCobro.create({
    data: { cuentaPorCobrarId: cxc.id, monto: 3740.53, fechaPago: new Date('2026-07-13'), medioPago: 'transferencia', updatedAt: now },
  })
  await prisma.abonoValorizacion.create({
    data: { cobroId: cobro.id, tipo: 'neto', estado: 'recibido', montoEsperado: 3740.53, montoReal: 3740.53, fechaReal: now, pagoCobroId: pagoNeto.id, createdAt: now },
  })
  const abonoDetraccion = await prisma.abonoValorizacion.create({
    data: { cobroId: cobro.id, tipo: 'detraccion', estado: 'pendiente', montoEsperado: 509.98, createdAt: now },
  })

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.sync3@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.sync3@gyscontrol.com', name: 'UI Test Sync3', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.sync3@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    console.log('\n[1] "Aplicar seleccionados" corrige la CxC (lo que ya funcionaba)')
    const r: any = await page.evaluate(async ({ id, body }) => {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return { status: res.status, body: await res.json() }
    }, { id: cxc.id, body: { detraccionMonto: '510.06' } })
    assert(r.status === 200, `responde 200 (fue ${r.status})`)

    const cxcDespues = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: cxc.id } })
    assert(cerca(cxcDespues.detraccionMonto, 510.06), `CxC.detraccionMonto = 510.06 (fue ${cxcDespues.detraccionMonto})`)

    console.log('\n[2] EL BUG: antes esto se quedaba en 509.98 — ahora tiene que sincronizar')
    const cobroDespues = await prisma.cobroValorizacion.findUniqueOrThrow({ where: { id: cobro.id } })
    assert(cerca(cobroDespues.detraccionMonto, 510.06),
      `CobroValorizacion.detraccionMonto también quedó en 510.06 (fue ${cobroDespues.detraccionMonto}) — esto es lo que lee la Hoja de Liquidación`)

    const abonoDespues = await prisma.abonoValorizacion.findUniqueOrThrow({ where: { id: abonoDetraccion.id } })
    assert(cerca(abonoDespues.montoEsperado, 510.06),
      `AbonoValorizacion.montoEsperado también quedó en 510.06 (fue ${abonoDespues.montoEsperado}) — esto es lo que muestra el Cronograma`)

    console.log('\n[3] se ve correcto en las dos pantallas')
    await page.goto(`${BASE}/administracion/cuentas-cobrar/${cxc.id}`)
    await page.waitForSelector('text=Cronograma de Cobro', { timeout: 60000 })
    const textoCronograma = await page.locator('body').innerText()
    assert(textoCronograma.includes('510.06'), 'el Cronograma muestra 510.06 como esperado')
    if (/509\.98/.test(textoCronograma)) {
      const lineas = textoCronograma.split('\n').filter(l => l.includes('509.98'))
      console.log('    (509.98 aparece en:', JSON.stringify(lineas), ')')
    }

    console.log('\n[4] un evento ya "recibido" no se reescribe (sin regresión)')
    // El evento Neto ya está recibido — su montoEsperado NO debe tocarse
    // por ningún cambio futuro en la CxC, aunque comparta la misma lógica.
    const abonoNeto = await prisma.abonoValorizacion.findFirstOrThrow({ where: { cobroId: cobro.id, tipo: 'neto' } })
    assert(cerca(abonoNeto.montoEsperado, 3740.53), 'el evento Neto (ya recibido) sigue con su esperado original')
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    await prisma.abonoValorizacion.deleteMany({ where: { cobroId: cobro.id } })
    await prisma.cobroValorizacion.delete({ where: { id: cobro.id } })
    await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrarId: cxc.id } })
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: MARCA } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: MARCA } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.sync3@gyscontrol.com' }, select: { id: true } })
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
