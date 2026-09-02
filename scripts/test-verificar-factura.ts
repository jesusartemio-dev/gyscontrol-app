/**
 * Verifica el modo "Verificar contra la factura": leer el PDF, comparar con lo
 * guardado en la CxC, y aplicar solo los campos elegidos.
 *
 * Reproduce el caso real: una CxC vieja cargada a mano, sin detracción, y con
 * un N° de factura mal tecleado.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env.local -e .env -o -- npx tsx scripts/test-verificar-factura.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-VERIF-${Date.now()}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number, tol = 0.5) => a != null && Math.abs(a - b) <= tol

// Factura QRM15 real: total en USD, detracción impresa en soles.
const FACTURA = `
<div style="font-family:Arial;font-size:11px;padding:18px">
  <b>G Y S CONTROL INDUSTRIAL SOCIEDAD ANONIMA CERRADA</b> — RUC 20545610672
  <div style="border:1px solid #000;padding:6px;text-align:center;width:220px;float:right">
    <b>FACTURA ELECTRONICA</b><br>RUC: 20545610672<br><b>E001-1719</b>
  </div>
  <p style="clear:both">Fecha de Emisión : 02/03/2026<br>Tipo de Moneda : <b>DOLAR AMERICANO</b></p>
  <table cellpadding="3">
    <tr><td>Sub Total Ventas</td><td align="right">$ 29,937.66</td></tr>
    <tr><td>IGV</td><td align="right">$ 5,388.78</td></tr>
    <tr><td><b>Importe Total</b></td><td align="right"><b>$ 35,326.44</b></td></tr>
  </table>
  <div style="border:1px solid #000;padding:6px;margin-top:8px">
    <b>Información de la detracción</b><br>
    Bien o Servicio: 037 Demás servicios gravados con el IGV<br>
    Porcentaje de detracción: 12.00 &nbsp; <b>Monto detracción: S/ 14,248.00</b>
  </div>
  <div style="border:1px solid #000;padding:6px;margin-top:6px">
    Monto neto pendiente de pago : <b>$ 31,087.27</b>
  </div>
</div>`

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const val = await prisma.valorizacion.create({
    data: {
      proyectoId: proyecto.id, numero: 9101, codigo: `${MARCA}-V`,
      periodoInicio: now, periodoFin: now, presupuestoContractual: 35326.44,
      montoValorizacion: 35326.44, netoARecibir: 35326.44, moneda: 'USD',
      estado: 'facturada', updatedAt: now,
    },
  })
  // CxC "vieja": N° mal tecleado, fecha correcta, sin detracción cargada.
  const cxc = await prisma.cuentaPorCobrar.create({
    data: {
      proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
      numeroDocumento: 'E001-1799', // ← distinto del real (E001-1719)
      monto: 35326.44, saldoPendiente: 35326.44, moneda: 'USD',
      fechaEmision: new Date('2026-03-02'), fechaVencimiento: new Date('2026-06-30'),
      estado: 'vencida', updatedAt: now,
    },
  })
  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.verif@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.verif@gyscontrol.com', name: 'UI Test Verif', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent(FACTURA)
    const b64 = Buffer.from(await page.pdf({ format: 'A4' })).toString('base64')

    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.verif@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})
    assert(page.url() === BASE + '/', 'login exitoso')

    // 1) Leer la factura (lo que hace el botón "Verificar factura")
    const leido: any = await page.evaluate(async ({ b64 }) => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const fd = new FormData()
      fd.append('file', new File([bytes], 'factura.pdf', { type: 'application/pdf' }))
      fd.append('tipo', 'factura')
      const res = await fetch('/api/administracion/documentos-cobro', { method: 'POST', body: fd })
      return { status: res.status, body: await res.json() }
    }, { b64 })
    assert(leido.status === 200, `el lector responde 200 (fue ${leido.status})`)
    const d = leido.body?.extraccion?.datos
    console.log('   leído:', JSON.stringify(d))

    // 2) La comparación que hace la UI
    console.log('\n[comparación]')
    assert(d.numeroDocumento === 'E001-1719' && cxc.numeroDocumento !== d.numeroDocumento,
      `detecta el N° distinto: guardado ${cxc.numeroDocumento}, factura ${d.numeroDocumento}`)
    assert(cerca(d.importeTotal, cxc.monto, 0.01), 'el importe total coincide con el monto de la CxC')
    assert(d.fechaEmision === '2026-03-02', `la fecha de emisión coincide (${d.fechaEmision})`)
    assert(cxc.detraccionPct == null && d.detraccionPct === 12, 'detecta que falta la Detracción % (guardado vacío, factura 12)')
    assert(cxc.detraccionMonto == null && cerca(d.detraccionMonto, 4239.17),
      `detecta que falta la Detracción y la lee EN USD: ${d.detraccionMonto}`)
    assert(cerca(d.detraccionMontoPEN, 14248), `y el depósito al BN aparte: S/ ${d.detraccionMontoPEN}`)

    // 3) Aplicar solo lo seleccionado — los que faltan, NO el N° que difiere
    console.log('\n[aplicar solo lo marcado]')
    const aplicado = await page.evaluate(async ({ id, body }) => {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return { status: res.status }
    }, {
      id: cxc.id,
      body: {
        detraccionPct: String(d.detraccionPct),
        detraccionMonto: String(d.detraccionMonto),
        detraccionMontoPEN: String(d.detraccionMontoPEN),
      },
    })
    assert(aplicado.status === 200, `aplicar responde 200 (fue ${aplicado.status})`)

    const despues = await prisma.cuentaPorCobrar.findUnique({ where: { id: cxc.id } })
    assert(cerca(despues?.detraccionPct, 12, 0.01), `detraccionPct quedó en 12 (fue ${despues?.detraccionPct})`)
    assert(cerca(despues?.detraccionMonto, 4239.17), `detraccionMonto quedó en USD 4239.17 (fue ${despues?.detraccionMonto})`)
    assert(cerca(despues?.detraccionMontoPEN, 14248), `detraccionMontoPEN quedó en 14248 (fue ${despues?.detraccionMontoPEN})`)
    assert(despues?.numeroDocumento === 'E001-1799',
      `el N° NO se tocó, porque no se marcó (sigue en ${despues?.numeroDocumento})`)
    assert(cerca(despues?.monto, 35326.44, 0.01) && cerca(despues?.saldoPendiente, 35326.44, 0.01),
      'monto y saldo intactos: el verificador no toca plata')
    assert(despues?.estado === 'vencida', 'el estado tampoco cambió')

    const neto = (despues?.monto ?? 0) - (despues?.detraccionMonto ?? 0)
    assert(cerca(neto, 31087.27, 0.5), `monto − detracción = 31087.27, el neto que declara la factura (fue ${neto.toFixed(2)})`)
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    await prisma.cuentaPorCobrar.deleteMany({ where: { valorizacion: { codigo: { startsWith: 'TEST-VERIF-' } } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-VERIF-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.verif@gyscontrol.com' }, select: { id: true } })
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
