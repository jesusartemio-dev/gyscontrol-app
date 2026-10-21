/**
 * Recalcula el monto de valorizaciones cuya suma de partidas cambió por la
 * regla de redondeo (Σ contractual × % sin redondear cada partida, ver
 * src/lib/utils/valorizacionPartidas.ts). Vista previa lista TODAS las que
 * difieren; --aplicar --codigo=QRM18-VAL-001 recalcula solo esa (con respaldo).
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-redondeo-valorizaciones.ts [--aplicar --codigo=...]
 */
import fs from 'fs'
import { prisma } from '../src/lib/prisma'
import { montoTotalPartidas } from '../src/lib/utils/valorizacionPartidas'
import { recalcularValorizacionPorId } from '../src/lib/utils/valorizacionAcumulado'

const args = process.argv.slice(2)
const APLICAR = args.includes('--aplicar')
const CODIGO = args.find(a => a.startsWith('--codigo='))?.split('=')[1]

async function main() {
  const vals = await prisma.valorizacion.findMany({
    where: CODIGO ? { codigo: CODIGO } : { partidas: { some: {} } },
    select: {
      id: true, codigo: true, estado: true, moneda: true, montoValorizacion: true, subtotal: true, igvMonto: true, netoARecibir: true,
      partidas: { select: { montoContractual: true, porcentajeAvance: true, montoAvance: true } },
      _count: { select: { cuentasPorCobrar: true } },
    },
    orderBy: { codigo: 'asc' },
  })
  const difieren = vals.filter(v => v.partidas.length > 0 && montoTotalPartidas(v.partidas) !== v.montoValorizacion)
  console.log(`Valorizaciones con partidas: ${vals.length} · difieren: ${difieren.length}`)
  for (const v of difieren) {
    console.log(`  ${v.codigo} [${v.estado}] ${v.moneda} ${v.montoValorizacion} → ${montoTotalPartidas(v.partidas)}  (CxC: ${v._count.cuentasPorCobrar})`)
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar a una: --aplicar --codigo=XXX'); return }
  if (!CODIGO) throw new Error('--aplicar requiere --codigo=')
  const v = difieren[0]
  if (!v) { console.log('Nada que cambiar.'); return }
  fs.writeFileSync(`scripts/respaldo-redondeo-${CODIGO}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(v, null, 2))
  await recalcularValorizacionPorId(prisma, v.id)
  const d = await prisma.valorizacion.findUniqueOrThrow({ where: { id: v.id }, select: { montoValorizacion: true, subtotal: true, igvMonto: true, netoARecibir: true, acumuladoActual: true } })
  console.log('\nAplicado:', d)
}
main().finally(() => prisma.$disconnect())
