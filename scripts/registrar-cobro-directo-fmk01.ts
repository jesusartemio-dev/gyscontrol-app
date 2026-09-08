/**
 * Registra el cobro directo de FMK01 (E001-1761), que quedó sin cargar después
 * de la limpieza. FLUEMATIK pagó por transferencia, sin financiera:
 *
 *   Factura            USD 4,250.51
 *   − Detracción 12%   USD   509.98   → pendiente, se deposita en el BN
 *   = Neto a cobrar    USD 3,740.53   → ya recibido (voucher Interbank)
 *
 * Usa el mismo camino que la app: crea el CobroValorizacion y llama a
 * procesarRegistroCobroDirecto, que genera el PagoCobro del neto y deja la
 * detracción como evento pendiente del Cronograma.
 *
 * SIMULACRO POR DEFECTO:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/registrar-cobro-directo-fmk01.ts [--ejecutar]
 */
import { prisma } from '../src/lib/prisma'
import { procesarRegistroCobroDirecto } from '../src/lib/services/factoringCobro'

const EJECUTAR = process.argv.includes('--ejecutar')
const NUMERO_DOCUMENTO = 'E001-1761'
const FECHA_COBRO = '2026-07-13'   // fecha de la transferencia
const DETRACCION_PCT = 12
const DETRACCION_MONTO = 509.98
const DETRACCION_CODIGO = '037'

const m = (n: number | null | undefined) => n == null ? '—' : n.toFixed(2)

async function main() {
  const url = process.env.DATABASE_URL || ''
  console.log(`ENTORNO: ${/neon\.tech|ep-[a-z0-9-]+/.test(url) ? '*** PRODUCCION ***' : 'local/dev'}`)
  console.log(`MODO   : ${EJECUTAR ? '*** EJECUTAR ***' : 'SIMULACRO (no escribe nada)'}\n`)

  const cxc = await prisma.cuentaPorCobrar.findFirst({
    where: { numeroDocumento: NUMERO_DOCUMENTO },
    include: {
      proyecto: { select: { codigo: true } }, cliente: { select: { nombre: true } },
      valorizacion: { select: { id: true, codigo: true, cobro: { select: { id: true, tipo: true } } } },
    },
  })
  if (!cxc) { console.log(`${NUMERO_DOCUMENTO}: NO EXISTE`); return }
  if (!cxc.valorizacion) { console.log(`${NUMERO_DOCUMENTO}: sin valorización`); return }
  if (cxc.valorizacion.cobro) {
    console.log(`${NUMERO_DOCUMENTO}: YA tiene cobro (${cxc.valorizacion.cobro.tipo}) — no se toca`)
    return
  }

  const neto = Math.round((cxc.monto - DETRACCION_MONTO) * 100) / 100

  console.log(`### ${cxc.numeroDocumento} — ${cxc.proyecto?.codigo} — ${cxc.cliente?.nombre}`)
  console.log(`  AHORA: ${cxc.moneda} ${m(cxc.monto)} | pagado ${m(cxc.montoPagado)} | saldo ${m(cxc.saldoPendiente)} | ${cxc.estado}`)
  console.log(`\n  Factura           ${m(cxc.monto).padStart(10)}`)
  console.log(`  − Detracción 12%  ${m(DETRACCION_MONTO).padStart(10)}   → pendiente (depósito al BN)`)
  console.log(`  = Neto a cobrar   ${m(neto).padStart(10)}   → recibido por transferencia`)
  console.log(`\n  Va a crear: cobro directo + PagoCobro del neto ${m(neto)}`)
  console.log(`              y el evento pendiente de detracción ${m(DETRACCION_MONTO)}`)
  console.log(`  QUEDA: pagado ${m(neto)} | saldo ${m(DETRACCION_MONTO)}\n`)

  if (!EJECUTAR) {
    console.log('SIMULACRO — no se escribió nada. Agrega --ejecutar para registrarlo.')
    return
  }

  await prisma.$transaction(async tx => {
    const cobro = await tx.cobroValorizacion.create({
      data: {
        valorizacionId: cxc.valorizacion!.id,
        tipo: 'directo',
        fechaDesembolso: new Date(FECHA_COBRO),
        detraccionPct: DETRACCION_PCT,
        detraccionMonto: DETRACCION_MONTO,
        montoNetoDirecto: neto,
        observaciones: 'Transferencia Interbank — neto tras detracción 12%',
        updatedAt: new Date(),
      },
    })
    // Mismo servicio que usa el formulario.
    await procesarRegistroCobroDirecto(cobro.id, null, tx)
    // La detracción es dato de la factura: se refleja también en la CxC.
    // El importe en soles del depósito no lo tenemos, lo carga Administración.
    await tx.cuentaPorCobrar.update({
      where: { id: cxc.id },
      data: {
        detraccionPct: DETRACCION_PCT,
        detraccionMonto: DETRACCION_MONTO,
        detraccionCodigo: DETRACCION_CODIGO,
        updatedAt: new Date(),
      },
    })
  })

  const d = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: cxc.id } })
  console.log(`REGISTRADO -> pagado ${m(d.montoPagado)} | saldo ${m(d.saldoPendiente)} | ${d.estado}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
