/**
 * Buscar una operación de factoring por su N° en la lista de Cuentas por
 * Cobrar. Es la única forma de ver juntas las facturas que van en una misma
 * operación: pueden ser de proyectos y hasta de clientes distintos, así que
 * ningún otro filtro las agrupa.
 *
 * Requiere el dev server en localhost:3000.
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-buscar-por-operacion.ts
 */
import { chromium } from 'playwright'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const BASE = 'http://localhost:3000'
const SUF = String(Date.now()).slice(-5)
const MARCA = `TEST-BUS-${Date.now()}`
const OP = `OP${SUF}`
let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}

// Tres facturas en una operación, como la 52104 real
const FACTURAS = [
  { doc: `A1${SUF}`, monto: 9386.04 },
  { doc: `A2${SUF}`, monto: 18840.77 },
  { doc: `A3${SUF}`, monto: 5540.87 },
]
// Y una cuarta que NO es de la operación, para comprobar que no se cuela
const AJENA = { doc: `Z9${SUF}`, monto: 1000 }

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ select: { id: true, clienteId: true } })
  const now = new Date()

  const crear = async (doc: string, monto: number, numero: number, conOperacion: boolean) => {
    const val = await prisma.valorizacion.create({
      data: {
        proyectoId: proyecto.id, numero, codigo: `${MARCA}-${doc}`,
        periodoInicio: now, periodoFin: now, presupuestoContractual: monto,
        montoValorizacion: monto, netoARecibir: monto, moneda: 'USD',
        estado: 'facturada', updatedAt: now,
      },
    })
    await prisma.cuentaPorCobrar.create({
      data: {
        proyectoId: proyecto.id, clienteId: proyecto.clienteId, valorizacionId: val.id,
        numeroDocumento: `E001-${doc}`, monto, saldoPendiente: monto,
        moneda: 'USD', fechaEmision: now, fechaVencimiento: now, estado: 'vencida', updatedAt: now,
      },
    })
    if (conOperacion) {
      await prisma.cobroValorizacion.create({
        data: {
          valorizacionId: val.id, tipo: 'factoring', financiera: 'BANPRO',
          numeroOperacion: OP, numeroDocumentos: 3, estado: 'desembolsada',
          fechaDesembolso: now, updatedAt: now,
        },
      })
    }
  }
  for (const [i, f] of FACTURAS.entries()) await crear(f.doc, f.monto, 9910 + i, true)
  await crear(AJENA.doc, AJENA.monto, 9919, false)

  const passwordHash = await bcrypt.hash('Test1234!', 10)
  await prisma.user.upsert({
    where: { email: 'uitest.bus@gyscontrol.com' },
    update: { password: passwordHash, role: 'admin' },
    create: { email: 'uitest.bus@gyscontrol.com', name: 'UI Test Bus', password: passwordHash, role: 'admin' },
  })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill('uitest.bus@gyscontrol.com')
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => {})

    await page.goto(`${BASE}/administracion/cuentas-cobrar`)
    const buscador = page.locator('input[placeholder*="Buscar"]')
    await buscador.waitFor({ timeout: 60000 })

    console.log('\n[1] el buscador anuncia que acepta el N° de operación')
    assert(/operaci/i.test(await buscador.getAttribute('placeholder') ?? ''),
      `el placeholder lo menciona: "${await buscador.getAttribute('placeholder')}"`)

    // Se cuentan FILAS, no el texto del body: el body arrastra desplegables de
    // filtro y otros elementos, y afirmar sobre él da falsos negativos.
    const filas = () => page.locator('tbody tr')
    const filaCon = (doc: string) => page.locator('tbody tr', { hasText: `E001-${doc}` })

    console.log('\n[2] buscar por N° de operación trae las 3 facturas')
    await buscador.fill(OP)
    await page.waitForTimeout(1500)
    for (const f of FACTURAS) {
      assert(await filaCon(f.doc).count() === 1, `aparece E001-${f.doc}`)
    }
    assert(await filaCon(AJENA.doc).count() === 0, 'y no la factura ajena a la operación')
    assert(await filas().count() === FACTURAS.length, `la tabla queda con ${FACTURAS.length} filas (fue ${await filas().count()})`)

    console.log('\n[3] sigue funcionando la búsqueda por N° de factura')
    await buscador.fill(`E001-${FACTURAS[1].doc}`)
    await page.waitForTimeout(1500)
    assert(await filaCon(FACTURAS[1].doc).count() === 1, 'encuentra la factura buscada')
    assert(await filaCon(FACTURAS[0].doc).count() === 0, 'y filtra las demás')
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    const vals = await prisma.valorizacion.findMany({ where: { codigo: { startsWith: 'TEST-BUS-' } }, select: { id: true } })
    for (const v of vals) {
      const c = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: v.id } })
      if (c) {
        await prisma.abonoValorizacion.deleteMany({ where: { cobroId: c.id } })
        await prisma.cobroValorizacion.delete({ where: { id: c.id } })
      }
    }
    for (const d of [...FACTURAS.map(f => f.doc), AJENA.doc]) {
      await prisma.pagoCobro.deleteMany({ where: { cuentaPorCobrar: { numeroDocumento: `E001-${d}` } } })
      await prisma.cuentaPorCobrar.deleteMany({ where: { numeroDocumento: `E001-${d}` } })
    }
    await prisma.valorizacion.deleteMany({ where: { codigo: { startsWith: 'TEST-BUS-' } } })
    const u = await prisma.user.findUnique({ where: { email: 'uitest.bus@gyscontrol.com' }, select: { id: true } })
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
