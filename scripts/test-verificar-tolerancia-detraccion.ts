/**
 * Bug real reportado por el usuario: en "Verificar contra la factura", la
 * fila "Detracción (USD)" mostraba 509.98 guardado vs 510.06 de la factura
 * — un desfase real de 8 centavos, exactamente el caso de FMK01 — pero
 * aparecía como "igual" (✓ verde, sin checkbox), porque la tolerancia era
 * 0.5 y 0.08 cae dentro de esa holgura. No había forma de seleccionarla
 * para aplicar el valor correcto.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env.local -e .env -o -- npx tsx scripts/test-verificar-tolerancia-detraccion.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const MARCA = `TEST-TOLDET-${Date.now()}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}

// Factura real de FMK01: USD 4,250.51, 12%, detracción impresa en soles
// S/ 1,737.00 — el 12% exacto en dólares es 510.06.
const FACTURA = `
<div style="font-family:Arial;font-size:11px;padding:20px">
  <b>FLUIDOS Y ELECTROMATIKA S.A.C.</b> — <b>FACTURA ELECTRÓNICA E001-1761</b>
  <p>Fecha de Emisión : 10/07/2026<br>Tipo de Moneda : <b>DOLAR AMERICANO</b></p>
  <table cellpadding="3"><tr><td><b>Importe Total</b></td><td align="right"><b>$ 4,250.51</b></td></tr></table>
  <div style="border:1px solid #000;padding:6px">
    <b>Información de la detracción</b><br>
    Porcentaje de detracción: 12.00 &nbsp; <b>Monto detracción: S/ 1737.00</b>
  </div>
</div>`

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const val = await prisma.valorizacion.create({
    data: {
      proyectoId: proyecto.id, numero: 9950, codigo: `${MARCA}-V`,
      periodoInicio: now, periodoFin: now, presupuestoContractual: 4250.51,
      montoValorizacion: 4250.51, netoARecibir: 4250.51, moneda: 'USD',
      estado: 'facturada', updatedAt: now,
    },
  })
  // La misma situación real: 509.98 ya guardado (back-solved del voucher),
  // la factura real dice 510.06 (12% exacto).
  const cxc = await prisma.cuentaPorCobrar.create({
    data: {
      proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
      numeroDocumento: `${MARCA}-E001-1761`, monto: 4250.51, saldoPendiente: 509.98, montoPagado: 3740.53,
      moneda: 'USD', detraccionPct: 12, detraccionMonto: 509.98,
      fechaEmision: new Date('2026-07-10'), fechaVencimiento: now, estado: 'parcial', updatedAt: now,
    },
  })

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.toldet@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.toldet@gyscontrol.com', name: 'UI Test TolDet', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent(FACTURA)
    const pdfBuffer = await page.pdf({ format: 'A4' })

    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.toldet@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    console.log('\n[1] leer la factura y comparar')
    await page.goto(`${BASE}/administracion/cuentas-cobrar/${cxc.id}`)
    await page.locator('button:has-text("Verificar factura")').waitFor({ timeout: 60000 })
    await page.locator('button:has-text("Verificar factura")').click()

    const fileInput = page.locator('input[type="file"]').last()
    await fileInput.setInputFiles({ name: 'factura.pdf', mimeType: 'application/pdf', buffer: pdfBuffer })
    await page.locator('text=Los que faltan vienen marcados').waitFor({ timeout: 60000 })

    const filaDetraccion = page.locator('tr', { hasText: 'Detracción (USD)' })
    await filaDetraccion.waitFor({ timeout: 10000 })
    const textoFila = await filaDetraccion.innerText()
    console.log('    fila:', textoFila.replace(/\n/g, ' | '))

    assert(textoFila.includes('509.98') && textoFila.includes('510.06'),
      'la fila muestra 509.98 guardado y 510.06 de la factura')

    console.log('\n[2] el bug: antes esto era un ✓ verde de "coincide", ahora tiene que ser un checkbox real')
    const checkboxDetraccion = filaDetraccion.locator('input[type="checkbox"]')
    assert(await checkboxDetraccion.count() === 1, 'la fila tiene un checkbox real (no el ✓ verde de "igual")')
    assert(!(await checkboxDetraccion.isChecked()), 'el checkbox NO viene marcado por defecto — difiere, no falta, pisar es decisión del usuario')

    console.log('\n[3] marcar el checkbox y aplicar corrige el valor guardado')
    await checkboxDetraccion.check()
    await page.locator('button:has-text("Aplicar seleccionados")').click()
    await page.waitForTimeout(1500)

    const cxcDespues = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: cxc.id } })
    assert(Math.abs(cxcDespues.detraccionMonto! - 510.06) < 0.01,
      `detraccionMonto quedó en 510.06 (fue ${cxcDespues.detraccionMonto})`)
    assert(Math.abs(cxcDespues.saldoPendiente - 509.98) < 0.01,
      'el saldo/monto de la CxC NO se tocó desde el verificador (sigue igual)')
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: MARCA } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: MARCA } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.toldet@gyscontrol.com' }, select: { id: true } })
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
