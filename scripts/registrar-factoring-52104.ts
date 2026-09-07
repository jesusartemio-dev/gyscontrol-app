/**
 * Registra los dos factoring que faltan de la operación 52104 (E001-1738 y
 * E001-1739). Los valores salen del Detalle de Liquidación de BANPRO y del
 * reparto de costos que hizo Administración.
 *
 * Usa el MISMO camino que la app: upsert del CobroValorizacion +
 * procesarDesembolsoFactoring, así que crea el PagoCobro del adelanto, el del
 * costo de financiamiento y los eventos pendientes del Cronograma igual que
 * si se hubiera cargado por pantalla. Nada se escribe a mano.
 *
 * SIMULACRO POR DEFECTO: sin --ejecutar no escribe nada.
 *   npx dotenv -e .env.production -o -- npx tsx scripts/registrar-factoring-52104.ts [--ejecutar]
 */
import { prisma } from '../src/lib/prisma'
import { procesarDesembolsoFactoring } from '../src/lib/services/factoringCobro'

const EJECUTAR = process.argv.includes('--ejecutar')
const OPERACION = '52104'

const money = (n: number | null | undefined) => n == null ? '—' : n.toFixed(2)

// Del Detalle de Liquidación BANPRO op 52104 (fec. curse 30-04-2026) y del
// reparto de comisión/gastos/adelanto que hace Administración.
const REGISTROS = [
  {
    numeroDocumento: 'E001-1738',
    fechaVencimiento: '2026-08-27', dias: 119,
    detraccionPct: 12, detraccionMonto: 2260.89,   // neto 16,579.88
    excedentePct: 1, excedenteMonto: 165.80,
    valorAFinanciar: 16414.08, interesMonto: 898.51,
    comision: 152.58, gastos: 15.00, igvGastos: 30.16,
    adelanto: 14832.53,
  },
  {
    numeroDocumento: 'E001-1739',
    fechaVencimiento: '2026-07-07', dias: 68,
    detraccionPct: 12, detraccionMonto: 664.90,    // neto 4,875.97
    excedentePct: 1, excedenteMonto: 48.76,
    valorAFinanciar: 4827.21, interesMonto: 151.00,
    comision: 40.00, gastos: 5.00, igvGastos: 8.10,
    adelanto: 4470.35,
  },
]

const FECHA_DESEMBOLSO = '2026-04-30'
const r2 = (n: number) => Math.round(n * 100) / 100

async function main() {
  const url = process.env.DATABASE_URL || ''
  console.log(`BASE   : ${url.replace(/:[^:@]+@/, ':***@').slice(0, 62)}`)
  console.log(`ENTORNO: ${/neon\.tech|ep-[a-z0-9-]+/.test(url) ? '*** PRODUCCION ***' : 'local/dev'}`)
  console.log(`MODO   : ${EJECUTAR ? '*** EJECUTAR ***' : 'SIMULACRO (no escribe nada)'}\n`)

  for (const reg of REGISTROS) {
    const cxc = await prisma.cuentaPorCobrar.findFirst({
      where: { numeroDocumento: reg.numeroDocumento },
      include: {
        proyecto: { select: { codigo: true } },
        cliente: { select: { nombre: true } },
        valorizacion: { select: { id: true, codigo: true, cobro: { select: { id: true, numeroOperacion: true } } } },
      },
    })
    if (!cxc) { console.log(`### ${reg.numeroDocumento}: NO EXISTE — se omite\n`); continue }
    if (!cxc.valorizacion) { console.log(`### ${reg.numeroDocumento}: sin valorización — se omite\n`); continue }
    if (cxc.valorizacion.cobro) {
      console.log(`### ${reg.numeroDocumento}: YA tiene cobro (op ${cxc.valorizacion.cobro.numeroOperacion}) — se omite para no pisarlo\n`)
      continue
    }

    const totalCostos = r2(reg.interesMonto + reg.comision + reg.gastos + reg.igvGastos)
    const montoADesembolsar = r2(reg.valorAFinanciar - totalCostos)
    const saldoAGirar = r2(montoADesembolsar - reg.adelanto)
    const valorNeto = r2(cxc.monto - reg.detraccionMonto)

    console.log(`### ${reg.numeroDocumento} — ${cxc.proyecto?.codigo} — ${cxc.cliente?.nombre}`)
    console.log(`  CxC ${cxc.id} | ${cxc.moneda} ${money(cxc.monto)} | saldo ahora ${money(cxc.saldoPendiente)} | estado ${cxc.estado}`)
    console.log(`  Base factura      ${money(cxc.monto).padStart(11)}`)
    console.log(`  − Detracción 12%  ${money(reg.detraccionMonto).padStart(11)}   → Valor Neto ${money(valorNeto)}`)
    console.log(`  − Excedente 1%    ${money(reg.excedenteMonto).padStart(11)}   → Valor a Financiar ${money(reg.valorAFinanciar)}`)
    console.log(`  − Interés         ${money(reg.interesMonto).padStart(11)}`)
    console.log(`  − Comisión        ${money(reg.comision).padStart(11)}`)
    console.log(`  − Gastos          ${money(reg.gastos).padStart(11)}`)
    console.log(`  − IGV Gastos      ${money(reg.igvGastos).padStart(11)}   → A Desembolsar ${money(montoADesembolsar)}`)
    console.log(`  − Adelanto        ${money(reg.adelanto).padStart(11)}   → Saldo a Girar ${money(saldoAGirar)}`)
    console.log(`  Va a crear: PagoCobro adelanto ${money(reg.adelanto)} + costo financiamiento ${money(totalCostos)}`)
    console.log(`              y eventos pendientes: saldo a girar ${money(saldoAGirar)}, detracción ${money(reg.detraccionMonto)}, excedente ${money(reg.excedenteMonto)}`)
    const saldoPrevisto = r2(cxc.monto - reg.adelanto - totalCostos)
    console.log(`  QUEDA: pagado ${money(r2(reg.adelanto + totalCostos))} | saldo ${money(saldoPrevisto)}`)
    console.log('')

    if (!EJECUTAR) continue

    await prisma.$transaction(async tx => {
      const cobro = await tx.cobroValorizacion.create({
        data: {
          valorizacionId: cxc.valorizacion!.id,
          tipo: 'factoring',
          financiera: 'BANPRO',
          numeroOperacion: OPERACION,
          numeroDocumentos: 3,
          fechaDesembolso: new Date(FECHA_DESEMBOLSO),
          fechaVencimiento: new Date(reg.fechaVencimiento),
          diasFinanciamiento: reg.dias,
          detraccionPct: reg.detraccionPct,
          detraccionMonto: reg.detraccionMonto,
          excedentePct: reg.excedentePct,
          excedenteMonto: reg.excedenteMonto,
          valorAFinanciar: reg.valorAFinanciar,
          interesMonto: reg.interesMonto,
          comisionEstructuracion: reg.comision,
          gastosAdicionales: reg.gastos,
          igvGastos: reg.igvGastos,
          montoADesembolsar,
          adelantoBanpro: reg.adelanto,
          saldoAGirar,
          updatedAt: new Date(),
        },
      })
      // Mismo servicio que usa la app: crea pagos y eventos del Cronograma.
      await procesarDesembolsoFactoring(cobro.id, tx)
      // La detracción es dato de la factura: se refleja también en la CxC.
      await tx.cuentaPorCobrar.update({
        where: { id: cxc.id },
        data: { detraccionPct: reg.detraccionPct, detraccionMonto: reg.detraccionMonto, updatedAt: new Date() },
      })
    })

    const despues = await prisma.cuentaPorCobrar.findUnique({ where: { id: cxc.id } })
    console.log(`  REGISTRADO -> pagado ${money(despues?.montoPagado)} | saldo ${money(despues?.saldoPendiente)} | estado ${despues?.estado}\n`)
  }

  // La factura que ya estaba cargada no sabía que la operación tiene 3
  // documentos — sin eso, la app no puede avisar cuando falten.
  const yaCargada = await prisma.cobroValorizacion.findFirst({
    where: { numeroOperacion: OPERACION, numeroDocumentos: null },
  })
  if (yaCargada) {
    console.log(`Falta marcar numeroDocumentos=3 en el cobro ${yaCargada.id} (E001-1737)`)
    if (EJECUTAR) {
      await prisma.cobroValorizacion.update({ where: { id: yaCargada.id }, data: { numeroDocumentos: 3 } })
      console.log('  hecho')
    }
  }

  if (!EJECUTAR) console.log('\nSIMULACRO — no se escribió nada. Agrega --ejecutar para registrarlo.')
  await prisma.$disconnect()
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
