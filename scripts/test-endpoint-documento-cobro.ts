/**
 * Prueba end-to-end REAL del endpoint /documento-cobro: sesión autenticada,
 * feature flag y extracción con Claude.
 *
 * El endpoint es un LECTOR: lo importante que se verifica acá es que devuelva
 * los datos leídos y que NO persista nada (ni adjunto, ni archivo en Drive).
 *
 * Requiere el dev server corriendo en localhost:3000.
 * Correr con:  npx dotenv -e .env -o -- npx tsx scripts/test-endpoint-documento-cobro.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
let ok = 0
let fail = 0
function assert(cond: boolean, msg: string) {
  if (cond) { ok++; console.log(`  OK: ${msg}`) }
  else { fail++; console.log(`  FALLA: ${msg}`) }
}

const HTML_LIQUIDACION = `<div style="font-family:Arial;font-size:11px;padding:20px">
  <h3>BANPRO FACTORING — DETALLE LIQUIDACIÓN FACTORING OTORGAMIENTO</h3>
  <p>Cliente: G Y S CONTROL INDUSTRIAL &nbsp; <b>Nro. Operación: 99001</b></p>
  <table border="1" cellpadding="3">
    <tr><th>FEC. CURSE</th><th>DIAS</th><th>MONTO DOCUM.</th><th>% ANT.</th><th>MTO. NOM.ANT.</th><th>MTO. NO ANT.</th><th>MTO.DIF.PRECIO</th></tr>
    <tr><td>01-08-2026</td><td>45</td><td>10,000.00</td><td>99</td><td>9,900.00</td><td>100.00</td><td>250.00</td></tr>
  </table>
  <table cellpadding="3" style="margin-top:10px">
    <tr><td>Adelanto</td><td>9,000.00</td></tr><tr><td>Comisión</td><td>150.00</td></tr>
    <tr><td>Gasto legal</td><td>25.00</td></tr><tr><td>I.G.V</td><td>31.50</td></tr>
  </table></div>`

async function main() {
  // ── Datos de prueba ──
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const codigo = `TEST-ENDPOINT-DOC-${Date.now()}`
  const valorizacion = await prisma.valorizacion.create({
    data: { proyectoId: proyecto.id, numero: 4321, codigo, periodoInicio: now, periodoFin: now, presupuestoContractual: 10000, montoValorizacion: 10000, estado: 'facturada', updatedAt: now },
  })
  const cxc = await prisma.cuentaPorCobrar.create({
    data: { proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: valorizacion.id, numeroDocumento: codigo, monto: 10000, saldoPendiente: 10000, moneda: 'PEN', fechaEmision: now, fechaVencimiento: now, estado: 'pendiente', updatedAt: now },
  })
  const passwordHash = await bcrypt.hash('Test1234!', 10)
  const user = await prisma.user.upsert({
    where: { email: 'uitest.doc@gyscontrol.com' },
    update: { password: passwordHash, role: 'gerente' },
    create: { email: 'uitest.doc@gyscontrol.com', name: 'UI Test Doc', password: passwordHash, role: 'gerente' },
  })

  const adjuntosAntes = await prisma.cxCAdjunto.count()
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()

    // PDF de prueba
    await page.setContent(HTML_LIQUIDACION)
    const pdfBuffer = await page.pdf({ format: 'A4' })
    const base64 = Buffer.from(pdfBuffer).toString('base64')

    // Login real
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.doc@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})
    assert(page.url() === BASE + '/', 'login exitoso')

    // Llamada real al endpoint, con la sesión del navegador
    const resultado = await page.evaluate(async ({ b64 }) => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const file = new File([bytes], 'liquidacion-test.pdf', { type: 'application/pdf' })
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', 'auto')
      const res = await fetch('/api/administracion/documentos-cobro', { method: 'POST', body: fd })
      return { status: res.status, body: await res.json() }
    }, { b64: base64 })

    console.log('  respuesta:', resultado.status, JSON.stringify(resultado.body).slice(0, 400))
    assert(resultado.status === 200, `el endpoint responde 200, fue ${resultado.status}`)
    assert(resultado.body?.extraccion?.tipo === 'liquidacion_factoring', `detectó liquidación, fue "${resultado.body?.extraccion?.tipo}"`)
    assert(resultado.body?.extraccion?.datos?.adelantoBanpro === 9000, `extrajo adelanto = 9000, fue ${resultado.body?.extraccion?.datos?.adelantoBanpro}`)

    // ── Lo que importa acá: es un lector, NO debe persistir nada ──
    assert(resultado.body?.adjunto === undefined, 'la respuesta ya no trae "adjunto"')
    const adjuntoDeEstaCxC = await prisma.cxCAdjunto.findFirst({ where: { cuentaPorCobrarId: cxc.id } })
    assert(adjuntoDeEstaCxC === null, 'no se creó ningún CxCAdjunto para esta CxC')
    const adjuntosDespues = await prisma.cxCAdjunto.count()
    assert(adjuntosDespues === adjuntosAntes, `el total de CxCAdjunto no cambió (${adjuntosAntes} -> ${adjuntosDespues})`)
    const cobro = await prisma.cobroValorizacion.count({ where: { valorizacionId: valorizacion.id } })
    assert(cobro === 0, 'tampoco se creó ningún cobro: los datos solo se devuelven para precargar')
  } catch (e: any) {
    // Sin esto, el process.exit del finally se tragaba cualquier excepción y
    // el test pasaba con menos aserciones de las que tiene.
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
  } finally {
    await browser.close()
    // ── Limpieza: datos y usuario de prueba (no hay nada en Drive que limpiar) ──
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: { startsWith: 'TEST-ENDPOINT-DOC-' } } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-ENDPOINT-DOC-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.doc@gyscontrol.com' }, select: { id: true } })
    if (u) {
      await prisma.agenteUsage.deleteMany({ where: { userId: u.id } })
      await prisma.auditLog.deleteMany({ where: { usuarioId: u.id } })
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
