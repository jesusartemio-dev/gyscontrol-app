/**
 * Lector de las facturas que la FINANCIERA le emite a GYS por los cargos de la
 * operación: reliquidación, mora, interés y gastos. Cada una nombra la
 * operación y la factura de GYS a la que aplica.
 *
 * Reproduce la factura real FR01-00006534 ("INTERES RELIQUIDACIÓN OP.48507
 * NRO.DOC.1719", 28.31 inafecto de IGV).
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env.local -e .env -o -- npx tsx scripts/test-factura-financiera.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const SUF = String(Date.now()).slice(-4)
const MARCA = `TEST-FF-${Date.now()}`
const DOC = `17${SUF}`
const OP = `48${SUF}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number, tol = 0.02) => a != null && Math.abs(a - b) <= tol

const FACTURA = (concepto: string, monto: string, numero: string) => `
<div style="font-family:Arial;font-size:11px;padding:20px">
  <table width="100%"><tr>
    <td width="30%"><b>BAN'PRO</b> FACTORING</td>
    <td align="center"><b>BANPRO</b><br>AV. MARISCAL JOSÉ DE LA MAR 1120 OF 302, MIRAFLORES<br>SAN ISIDRO - LIMA - LIMA</td>
    <td style="border:1px solid #000;padding:6px;text-align:center" width="28%">
      <b>R.U.C.: 20604817375</b><br><b>FACTURA ELECTRÓNICA</b><br><b>${numero}</b>
    </td>
  </tr></table>
  <p>SEÑOR(ES) : G Y S CONTROL INDUSTRIAL SOCIEDAD ANONIMA CERRADA<br>
     R.U.C. : 20545610672 &nbsp;&nbsp; FECHA DE EMISIÓN : 16/03/2026<br>
     TIPO DE MONEDA : DÓLARES AMERICANOS<br>
     OBSERVACIONES : NRO. DE OPERACIÓN ${OP}</p>
  <table border="1" cellpadding="4" width="100%" style="border-collapse:collapse">
    <tr><th>ÍTEM</th><th>DESCRIPCIÓN</th><th>UND.</th><th>CANTIDAD</th><th>V. UNITARIO</th><th>P. UNITARIO</th><th>VALOR VENTA</th></tr>
    <tr><td>1</td><td>${concepto} OP.${OP} NRO.DOC.${DOC}</td><td>NIU</td><td>1.00</td><td>${monto}</td><td>${monto}</td><td>${monto}</td></tr>
  </table>
  <table cellpadding="3" align="right" style="margin-top:8px;border:1px solid #000">
    <tr><td>TOTAL ANTICIPOS</td><td align="right">0.00</td></tr>
    <tr><td>OP. GRAVADA</td><td align="right">0.00</td></tr>
    <tr><td>OP. INAFECTA</td><td align="right">${monto}</td></tr>
    <tr><td>I.G.V. 18 %</td><td align="right">0.00</td></tr>
    <tr><td><b>TOTAL</b></td><td align="right"><b>${monto}</b></td></tr>
  </table>
  <p style="clear:both">FORMA DE PAGO : Contado</p>
</div>`

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const val = await prisma.valorizacion.create({
    data: {
      proyectoId: proyecto.id, numero: 9901, codigo: `${MARCA}-V`,
      periodoInicio: now, periodoFin: now, presupuestoContractual: 35326.44,
      montoValorizacion: 35326.44, netoARecibir: 35326.44, moneda: 'USD',
      estado: 'facturada', updatedAt: now,
    },
  })
  const cxc = await prisma.cuentaPorCobrar.create({
    data: {
      proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
      numeroDocumento: `E001-${DOC}`, monto: 35326.44, saldoPendiente: 35326.44,
      moneda: 'USD', fechaEmision: now, fechaVencimiento: now, estado: 'vencida', updatedAt: now,
    },
  })
  const cobro = await prisma.cobroValorizacion.create({
    data: {
      valorizacionId: val.id, tipo: 'factoring', financiera: 'BANPRO',
      numeroOperacion: OP, estado: 'desembolsada', fechaDesembolso: now,
      valorAFinanciar: 30776.40, interesMonto: 1698.86, excedenteMonto: 310.87,
      adelantoBanpro: 27800, saldoAGirar: 936.24, updatedAt: now,
    },
  })

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.ff@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.ff@gyscontrol.com', name: 'UI Test FF', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const pdf = async (html: string) => {
      await page.setContent(html)
      return Buffer.from(await page.pdf({ format: 'A4' })).toString('base64')
    }
    const b64Reliq = await pdf(FACTURA('INTERES RELIQUIDACIÓN', '28.31', 'FR01-00006534'))
    const b64Mora = await pdf(FACTURA('INTERES MORATORIO', '255.44', 'FR01-00006612'))

    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.ff@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    const leer = (b64: string) => page.evaluate(async ({ b64 }) => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const fd = new FormData()
      fd.append('file', new File([bytes], 'factura.pdf', { type: 'application/pdf' }))
      const res = await fetch('/api/administracion/operaciones-factoring/factura-financiera', { method: 'POST', body: fd })
      return { status: res.status, body: await res.json() }
    }, { b64 })

    console.log('\n[1] lee la factura de reliquidación')
    const r: any = await leer(b64Reliq)
    assert(r.status === 200, `responde 200 (fue ${r.status})`)
    const d = r.body.extraccion
    console.log('    leído:', JSON.stringify(d))
    assert(d.numeroFactura === 'FR01-00006534', `N° de factura (fue ${d.numeroFactura})`)
    assert(d.fechaEmision === '2026-03-16', `fecha de emisión (fue ${d.fechaEmision})`)
    assert(d.numeroOperacion === OP, `operación ${OP} desde OBSERVACIONES (fue ${d.numeroOperacion})`)
    assert(d.numeroDocumento === DOC, `documento ${DOC} desde el detalle del ítem (fue ${d.numeroDocumento})`)
    assert(d.concepto === 'reliquidacion', `clasificó el cargo como reliquidación (fue ${d.concepto})`)
    assert(cerca(d.monto, 28.31), `monto 28.31 (fue ${d.monto})`)
    assert(r.body.estado === 'lista', `queda lista para aplicar (fue ${r.body.estado})`)
    assert(r.body.cxc?.numeroDocumento === `E001-${DOC}`, `la atribuyó a E001-${DOC} sin asumir la serie`)
    assert(/Reliquidación/i.test(r.body.destino ?? ''), `sabe dónde guardarla: ${r.body.destino}`)

    console.log('\n[2] la aplica al campo correcto')
    const ap: any = await page.evaluate(async (body) => {
      const res = await fetch('/api/administracion/operaciones-factoring/factura-financiera?aplicar=1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return { status: res.status, body: await res.json() }
    }, { cobroId: cobro.id, concepto: 'reliquidacion', numeroFactura: d.numeroFactura, fechaEmision: d.fechaEmision, monto: d.monto })
    assert(ap.status === 200, `responde 200 (fue ${ap.status})`)

    const c1 = await prisma.cobroValorizacion.findUniqueOrThrow({ where: { id: cobro.id } })
    assert(cerca(c1.interesReliquidacion, 28.31), `guardó el monto en interesReliquidacion (fue ${c1.interesReliquidacion})`)
    assert(c1.numeroFacturaReliquidacion === 'FR01-00006534', `y el N° de factura (fue ${c1.numeroFacturaReliquidacion})`)
    assert(c1.fechaFacturaReliquidacion?.toISOString().slice(0, 10) === '2026-03-16', 'y la fecha de emisión')
    assert(c1.mora == null && c1.numeroFacturaMora == null, 'no tocó los campos de mora')
    const liquidoAGirar = Math.round(((c1.saldoAGirar ?? 0) - (c1.interesReliquidacion ?? 0)) * 100) / 100
    assert(cerca(liquidoAGirar, 907.93), `Líquido a Girar = 936.24 − 28.31 = 907.93 (dio ${liquidoAGirar})`)

    console.log('\n[3] distingue la mora de la reliquidación')
    const rm: any = await leer(b64Mora)
    assert(rm.body.extraccion.concepto === 'mora', `clasificó el otro cargo como mora (fue ${rm.body.extraccion.concepto})`)
    assert(/Mora/i.test(rm.body.destino ?? ''), `y lo manda a otro campo: ${rm.body.destino}`)
    assert(rm.body.extraccion.numeroFactura === 'FR01-00006612', 'con su propio N° de factura')

    const ap2: any = await page.evaluate(async (body) => {
      const res = await fetch('/api/administracion/operaciones-factoring/factura-financiera?aplicar=1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return { status: res.status }
    }, { cobroId: cobro.id, concepto: 'mora', numeroFactura: 'FR01-00006612', fechaEmision: '2026-03-16', monto: 255.44 })
    assert(ap2.status === 200, 'aplica la mora')
    const c2 = await prisma.cobroValorizacion.findUniqueOrThrow({ where: { id: cobro.id } })
    assert(c2.numeroFacturaMora === 'FR01-00006612', `guardó el N° de la factura de mora (fue ${c2.numeroFacturaMora})`)
    assert(cerca(c2.interesReliquidacion, 28.31), 'y NO pisó la reliquidación que ya estaba')
    assert(c2.mora == null, 'el monto de la mora NO se toca acá: viene del Informe de Excedentes con su signo')
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-FF-' } }, select: { id: true } })
    for (const v of vals) {
      const c = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (c) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: c.id } })
        await prisma.cobroValorizacion.delete({ where: { id: c.id } })
      }
    }
    await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: `E001-${DOC}` } } })
    await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: `E001-${DOC}` } })
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-FF-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.ff@gyscontrol.com' }, select: { id: true } })
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
