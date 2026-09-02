/**
 * Verifica la cadena nueva: al facturar se guardan en la CxC los descuentos de
 * ley leídos de la factura, y el monto puede salir del importe impreso en vez
 * del Neto a Recibir calculado.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-facturar-con-datos-factura.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-FACT-${Date.now()}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number) => a != null && Math.abs(a - b) < 0.01

/**
 * Deja la valorización lista para facturar: en hes_pendiente y con el adjunto
 * de conformidad, que el endpoint exige antes de dejar facturar (regla real
 * del negocio, no un atajo del test).
 */
async function crearValorizacion(proyectoId: string, numero: number, neto: number) {
  const now = new Date()
  const val = await prisma.valorizacion.create({
    data: {
      proyectoId, numero, codigo: `${MARCA}-${numero}`,
      periodoInicio: now, periodoFin: now,
      presupuestoContractual: neto, montoValorizacion: neto,
      subtotal: neto / 1.18, igvMonto: neto - neto / 1.18, netoARecibir: neto,
      moneda: 'USD', estado: 'hes_pendiente', numeroHES: `HES-${numero}`, updatedAt: now,
    },
  })
  await prisma.valorizacionAdjunto.create({
    data: { valorizacionId: val.id, nombreArchivo: 'hes.pdf', urlArchivo: 'https://example.test/hes.pdf', categoria: 'hes' },
  })
  return val
}

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const passwordHash = await bcrypt.hash('Test1234!', 10)
  const user = await prisma.user.upsert({
    where: { email: 'uitest.fact@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.fact@gyscontrol.com', name: 'UI Test Fact', password: passwordHash, role: 'admin' },
  })

  // Caso QRM15: factura USD 35,326.44, detracción 12% = 4,239.17 (S/ 14,248 el depósito)
  const valA = await crearValorizacion(proyecto.id, 9001, 35326.44)
  // Caso con descuadre: la valorización calculó 10,000 pero la factura dice 10,050
  const valB = await crearValorizacion(proyecto.id, 9002, 10000)

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.fact@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})
    assert(page.url() === BASE + '/', 'login exitoso')

    const facturar = (proyectoId: string, valId: string, body: any) =>
      page.evaluate(async ({ proyectoId, valId, body }) => {
        const res = await fetch(`/api/proyectos/${proyectoId}/valorizaciones/${valId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        return { status: res.status }
      }, { proyectoId, valId, body })

    // ── Caso 1: descuentos de ley + monto por defecto (Neto a Recibir) ──
    console.log('\n[1] Facturar con detracción leída de la factura')
    const r1 = await facturar(proyecto.id, valA.id, {
      estado: 'facturada', crearCuentaCobrar: true,
      numeroDocumento: `${MARCA}-A`, fechaEmision: '2026-03-02', fechaVencimiento: '2026-06-30',
      condicionPago: 'credito', diasCredito: 120,
      detraccionPct: 12, detraccionMonto: 4239.17, detraccionMontoPEN: 14248,
      retencionPct: null, retencionMonto: null,
    })
    assert(r1.status === 200, `respondió 200 (fue ${r1.status})`)

    const cxcA = await prisma.cuentaPorCobrar.findFirst({ where: { valorizacionId: valA.id } })
    assert(cxcA != null, 'se creó la CxC')
    assert(cerca(cxcA?.monto, 35326.44), `monto = Neto a Recibir 35326.44 (fue ${cxcA?.monto})`)
    assert(cerca(cxcA?.detraccionPct, 12), `detraccionPct = 12 (fue ${cxcA?.detraccionPct})`)
    assert(cerca(cxcA?.detraccionMonto, 4239.17), `detraccionMonto = 4239.17 EN USD (fue ${cxcA?.detraccionMonto})`)
    assert(cerca(cxcA?.detraccionMontoPEN, 14248), `detraccionMontoPEN = 14248, el depósito en BN (fue ${cxcA?.detraccionMontoPEN})`)
    assert(cxcA?.retencionMonto == null, 'sin retención, queda null y no en 0')

    // Lo que importa: el Valor Neto que verá el cobro sale correcto
    const neto = (cxcA?.monto ?? 0) - (cxcA?.detraccionMonto ?? 0)
    assert(cerca(neto, 31087.27), `monto − detracción = 31087.27, el neto que declara la factura (fue ${neto.toFixed(2)})`)

    // El detalle de la CxC tiene que devolver los campos nuevos al cliente
    const detalle = await page.evaluate(async (id) => {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${id}`)
      return { status: res.status, body: await res.json() }
    }, cxcA!.id)
    assert(detalle.status === 200, 'el detalle de la CxC responde 200')
    assert(cerca(detalle.body?.detraccionMonto, 4239.17), `el detalle expone detraccionMonto (fue ${detalle.body?.detraccionMonto})`)
    assert(cerca(detalle.body?.detraccionMontoPEN, 14248), `el detalle expone detraccionMontoPEN (fue ${detalle.body?.detraccionMontoPEN})`)

    // ── Caso 2: el importe de la factura manda sobre el calculado ──
    console.log('\n[2] Facturar usando el importe impreso en la factura')
    const r2 = await facturar(proyecto.id, valB.id, {
      estado: 'facturada', crearCuentaCobrar: true,
      numeroDocumento: `${MARCA}-B`, fechaVencimiento: '2026-06-30',
      montoFactura: 10050, detraccionPct: 12, detraccionMonto: 1206,
    })
    assert(r2.status === 200, `respondió 200 (fue ${r2.status})`)
    const cxcB = await prisma.cuentaPorCobrar.findFirst({ where: { valorizacionId: valB.id } })
    assert(cerca(cxcB?.monto, 10050), `monto = 10050 (el de la factura, no el 10000 calculado) — fue ${cxcB?.monto}`)
    assert(cerca(cxcB?.saldoPendiente, 10050), `saldoPendiente arranca igual al monto (fue ${cxcB?.saldoPendiente})`)
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: 'TEST-FACT-' } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-FACT-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.fact@gyscontrol.com' }, select: { id: true } })
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
