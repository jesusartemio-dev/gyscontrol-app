/**
 * Lector del Informe de Excedentes: la financiera lo manda al día siguiente de
 * que el cliente paga y liquida el excedente POR FACTURA — un mismo informe
 * cubre operaciones y clientes distintos.
 *
 * Reproduce el informe real del 15/07/2026 (3 filas, 3 operaciones) y verifica
 * que cruce cada fila con su CxC, respete los signos, y guarde el cierre sin
 * marcar el excedente como recibido.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env.local -e .env -o -- npx tsx scripts/test-informe-excedentes.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const SUF = String(Date.now()).slice(-4)
const MARCA = `TEST-EXC-${Date.now()}`
const D = { a: `91${SUF}`, b: `92${SUF}`, c: `93${SUF}` }
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number, tol = 0.02) => a != null && Math.abs(a - b) <= tol

const INFORME = `
<div style="font-family:Arial;font-size:10px;padding:14px">
  <b>BAN'PRO FACTORING</b>
  <div style="text-align:right">FECHA 15/07/2026<br>PAGINA 1 DE 1</div>
  <h3 style="text-align:center"><u>INFORME DE EXCEDENTES</u></h3>
  <p>RUC CLIENTE : 20545610672<br>RAZÓN SOCIAL : G Y S CONTROL INDUSTRIAL SOCIEDAD ANONIMA CERRADA</p>
  <table border="1" cellpadding="3" style="border-collapse:collapse;font-size:9px">
    <tr><th>NOMBRE DEUDOR</th><th>OPERACIÓN</th><th>TIPO DCTO.</th><th>MONEDA</th><th>DOCUMENTO</th>
        <th>FECHA VTO.</th><th>FECHA RECAUDACIÓN</th><th>MONTO NETO</th><th>MONTO ANT.</th><th>MONTO EXC.</th>
        <th>MORA</th><th>COM. INTER.</th><th>DIFERENCIA</th><th>OTROS</th><th>TOTAL</th></tr>
    <tr><td>MINERA YANACOCHA S.R.L.</td><td>54382</td><td>ED</td><td>DOLARES</td><td>${D.a}</td>
        <td>05/07/2026</td><td>01/07/2026</td><td>24,324.26</td><td>24,081.02</td><td>243.24</td>
        <td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td><td>243.24</td></tr>
    <tr><td>NEXA RESOURCES CAJAMARQUILLA S.A.</td><td>52104</td><td>ED</td><td>DOLARES</td><td>${D.b}</td>
        <td>07/07/2026</td><td>02/07/2026</td><td>4,875.97</td><td>4,827.21</td><td>48.76</td>
        <td>0.00</td><td>0.00</td><td>0.12</td><td>0.00</td><td>48.88</td></tr>
    <tr><td>CORPORACION PERUANA DE PRODUCTOS QUIMICOS</td><td>48507</td><td>ED</td><td>DOLARES</td><td>${D.c}</td>
        <td>30/06/2026</td><td>08/07/2026</td><td>31,087.27</td><td>30,776.40</td><td>310.87</td>
        <td>-255.44</td><td>0.00</td><td>-0.04</td><td>0.00</td><td>55.39</td></tr>
  </table>
  <div style="text-align:right;margin-top:4px"><b>347.51</b></div>
</div>`

// Cada factura con su operación y su excedente esperado
const CASOS = [
  { doc: D.a, op: '54382', monto: 27000, exc: 243.24 },
  { doc: D.b, op: '52104', monto: 5540.87, exc: 48.76 },
  { doc: D.c, op: '48507', monto: 35326.44, exc: 310.87 },
]

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()
  const ids: Record<string, string> = {}
  for (const [i, c] of CASOS.entries()) {
    const val = await prisma.valorizacion.create({
      data: {
        proyectoId: proyecto.id, numero: 9800 + i, codigo: `${MARCA}-${c.doc}`,
        periodoInicio: now, periodoFin: now, presupuestoContractual: c.monto,
        montoValorizacion: c.monto, netoARecibir: c.monto, moneda: 'USD',
        estado: 'facturada', updatedAt: now,
      },
    })
    const cxc = await prisma.cuentaPorCobrar.create({
      data: {
        proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
        numeroDocumento: `E001-${c.doc}`, monto: c.monto, saldoPendiente: c.monto,
        moneda: 'USD', fechaEmision: now, fechaVencimiento: now, estado: 'vencida', updatedAt: now,
      },
    })
    // La 3ra queda SIN factoring registrado, para probar que el lector lo detecta
    if (i < 2) {
      await prisma.cobroValorizacion.create({
        data: {
          valorizacionId: val.id, tipo: 'factoring', financiera: 'BANPRO',
          numeroOperacion: c.op, estado: 'desembolsada', fechaDesembolso: now,
          excedentePct: 1, excedenteMonto: c.exc, updatedAt: now,
        },
      })
    }
    ids[c.doc] = cxc.id
  }

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.exc@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.exc@gyscontrol.com', name: 'UI Test Exc', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent(INFORME)
    const b64 = Buffer.from(await page.pdf({ format: 'A4', landscape: true })).toString('base64')

    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.exc@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    console.log('\n[1] lee el informe y cruza cada fila')
    const r: any = await page.evaluate(async ({ b64 }) => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const fd = new FormData()
      fd.append('file', new File([bytes], 'excedentes.pdf', { type: 'application/pdf' }))
      const res = await fetch('/api/administracion/operaciones-factoring/leer-excedentes', { method: 'POST', body: fd })
      return { status: res.status, body: await res.json() }
    }, { b64 })
    assert(r.status === 200, `responde 200 (fue ${r.status})`)
    const co = r.body.coincidencias
    console.log('    filas:', JSON.stringify(co.map((c: any) => [c.numeroDocumento, c.mora, c.diferencia, c.total, c.estado])))
    assert(co.length === 3, `3 filas, sin la del total general (fue ${co.length})`)

    const porDoc: Record<string, any> = Object.fromEntries(co.map((c: any) => [c.numeroDocumento, c]))
    assert(cerca(porDoc[D.c]?.mora, -255.44), `respeta la mora NEGATIVA −255.44 (fue ${porDoc[D.c]?.mora})`)
    assert(cerca(porDoc[D.b]?.diferencia, 0.12), `y la diferencia POSITIVA +0.12 (fue ${porDoc[D.b]?.diferencia})`)
    assert(cerca(porDoc[D.c]?.diferencia, -0.04), `y la negativa −0.04 (fue ${porDoc[D.c]?.diferencia})`)
    assert(cerca(porDoc[D.c]?.total, 55.39), `total 55.39 (fue ${porDoc[D.c]?.total})`)
    assert(co.every((c: any) => c.cuadraTotal), 'las 3 filas cuadran: excedente + descuentos = total')
    assert(porDoc[D.c]?.fechaRecaudacion === '2026-07-08', `lee la fecha de recaudación (fue ${porDoc[D.c]?.fechaRecaudacion})`)
    assert(cerca(r.body.informe.totalGeneral, 347.51), `total general 347.51 (fue ${r.body.informe.totalGeneral})`)

    console.log('\n[2] detecta la factura sin factoring registrado')
    assert(porDoc[D.a]?.estado === 'lista', `${D.a} lista (fue ${porDoc[D.a]?.estado})`)
    assert(porDoc[D.b]?.estado === 'lista', `${D.b} lista (fue ${porDoc[D.b]?.estado})`)
    assert(porDoc[D.c]?.estado === 'sin_cobro', `${D.c} sin factoring: no se aplica (fue ${porDoc[D.c]?.estado})`)

    console.log('\n[3] aplica el cierre')
    const ap: any = await page.evaluate(async (cierres) => {
      const res = await fetch('/api/administracion/operaciones-factoring/aplicar-excedentes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cierres }),
      })
      return { status: res.status, body: await res.json() }
    }, co.filter((c: any) => c.estado === 'lista').map((c: any) => ({
      cobroId: c.cobroId, mora: c.mora, comisionInteres: c.comisionInteres,
      diferencia: c.diferencia, otros: c.otros, fechaRecaudacion: c.fechaRecaudacion,
    })))
    assert(ap.status === 200, `responde 200 (fue ${ap.status})`)
    assert(ap.body.cerradas === 2, `cerró las 2 que tenían factoring (fue ${ap.body.cerradas})`)

    const cobroB = await prisma.cobroValorizacion.findFirstOrThrow({ where: { valorizacion: { codigo: `${MARCA}-${D.b}` } } })
    assert(cerca(cobroB.diferencia, 0.12), `guardó la diferencia +0.12 (fue ${cobroB.diferencia})`)
    assert(cobroB.fechaConfirmacion?.toISOString().slice(0, 10) === '2026-07-02',
      `guardó la fecha en que pagó el cliente (fue ${cobroB.fechaConfirmacion?.toISOString().slice(0, 10)})`)

    console.log('\n[4] NO marca el excedente como recibido ni cambia lo esperado')
    const abonos = await prisma.abonoValorizacion.findMany({ where: { cobroId: cobroB.id } })
    const exc = abonos.find(a => a.tipo === 'excedente')
    assert(abonos.length === 0 || exc?.estado !== 'recibido', 'el evento excedente sigue pendiente: el informe dice cuánto, no que ya llegó')
    assert(cerca(cobroB.excedenteMonto, 48.76), `el excedente esperado no se tocó (fue ${cobroB.excedenteMonto}) — si se pisara con el total, la mora nunca generaría su ajuste`)
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-EXC-' } }, select: { id: true } })
    for (const v of vals) {
      const c = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (c) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: c.id } })
        await prisma.cobroValorizacion.delete({ where: { id: c.id } })
      }
    }
    for (const d of Object.values(D)) {
      await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: `E001-${d}` } } })
      await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: `E001-${d}` } })
    }
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-EXC-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.exc@gyscontrol.com' }, select: { id: true } })
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
