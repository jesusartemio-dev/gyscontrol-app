// ===================================================
// 📁 recalcular-valorizaciones.ts
// 📌 Recalcula los acumulados (acumuladoAnterior, acumuladoActual,
//    saldoPorValorizar, porcentajeAvance) y montos derivados de TODAS las
//    valorizaciones existentes, usando el filtro CORRECTO numero < N.
//
//    Histórico: la lógica original sumaba "todas las otras" (incluyendo
//    posteriores), lo que infló los acumulados de valorizaciones intermedias
//    cada vez que se editaban después de existir las posteriores.
//
// 📌 Uso:
//    Local (DB local, .env):           npx tsx scripts/recalcular-valorizaciones.ts
//    Producción (.env.production):     npx dotenv -e .env.production -- npx tsx scripts/recalcular-valorizaciones.ts
//
//    Modo dry-run (no escribe):        agregar flag --dry-run
//    Solo un proyecto:                 agregar --proyectoId=<id>
// ===================================================

import { PrismaClient } from '@prisma/client'
import { recalcularValorizacionPorId } from '../src/lib/utils/valorizacionAcumulado'

const prisma = new PrismaClient()

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const proyectoIdArg = args.find(a => a.startsWith('--proyectoId='))
const FILTRO_PROYECTO_ID = proyectoIdArg?.split('=')[1]

const round2 = (n: number) => Math.round(n * 100) / 100

async function main() {
  console.log(`\n🔄 Recalculando valorizaciones${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  // Agrupar por proyecto, ordenar por número
  const proyectos = await prisma.proyecto.findMany({
    where: FILTRO_PROYECTO_ID ? { id: FILTRO_PROYECTO_ID } : undefined,
    select: { id: true, codigo: true, nombre: true },
  })

  let totalActualizadas = 0
  let totalSinCambios = 0
  let totalConDiferencias = 0
  const diferencias: Array<{
    proyecto: string
    codigo: string
    campo: string
    antes: number
    despues: number
    diff: number
  }> = []

  for (const proy of proyectos) {
    const valorizaciones = await prisma.valorizacion.findMany({
      where: { proyectoId: proy.id },
      orderBy: { numero: 'asc' },
    })

    if (valorizaciones.length === 0) continue

    console.log(`📁 ${proy.codigo} — ${proy.nombre} (${valorizaciones.length} valorizaciones)`)

    for (const val of valorizaciones) {
      const antes = {
        acumuladoAnterior: val.acumuladoAnterior,
        acumuladoActual: val.acumuladoActual,
        saldoPorValorizar: val.saldoPorValorizar,
        porcentajeAvance: val.porcentajeAvance,
        netoARecibir: val.netoARecibir,
      }

      let despues = antes
      if (DRY_RUN) {
        // Calcular sin escribir
        const agg = await prisma.valorizacion.aggregate({
          where: {
            proyectoId: val.proyectoId,
            estado: { not: 'anulada' },
            numero: { lt: val.numero },
          },
          _sum: { montoValorizacion: true },
        })
        const acumuladoAnteriorNuevo = agg._sum.montoValorizacion || 0
        const acumuladoActualNuevo = round2(acumuladoAnteriorNuevo + val.montoValorizacion)
        const saldoPorValorizarNuevo = round2(val.presupuestoContractual - acumuladoActualNuevo)
        const porcentajeAvanceNuevo = val.presupuestoContractual > 0
          ? round2((acumuladoActualNuevo / val.presupuestoContractual) * 100)
          : 0
        despues = {
          acumuladoAnterior: round2(acumuladoAnteriorNuevo),
          acumuladoActual: acumuladoActualNuevo,
          saldoPorValorizar: saldoPorValorizarNuevo,
          porcentajeAvance: porcentajeAvanceNuevo,
          netoARecibir: val.netoARecibir, // sin cambio en dry-run para neto (lo recalcularía recalcularValorizacionPorId)
        }
      } else {
        // Escribir: recalcula desde partidas si tiene, sino mantiene montoValorizacion actual
        const updated = await recalcularValorizacionPorId(prisma, val.id)
        if (updated) {
          despues = {
            acumuladoAnterior: updated.acumuladoAnterior,
            acumuladoActual: updated.acumuladoActual,
            saldoPorValorizar: updated.saldoPorValorizar,
            porcentajeAvance: updated.porcentajeAvance,
            netoARecibir: updated.netoARecibir,
          }
        }
      }

      const cambios: string[] = []
      for (const k of Object.keys(antes) as Array<keyof typeof antes>) {
        const a = antes[k]
        const d = despues[k]
        if (Math.abs(a - d) > 0.005) {
          cambios.push(`${k}: ${a.toFixed(2)} → ${d.toFixed(2)}`)
          diferencias.push({
            proyecto: proy.codigo,
            codigo: val.codigo,
            campo: k,
            antes: a,
            despues: d,
            diff: round2(d - a),
          })
        }
      }

      if (cambios.length > 0) {
        totalActualizadas++
        totalConDiferencias++
        console.log(`   ${val.codigo}: ${cambios.join(', ')}`)
      } else {
        totalSinCambios++
      }
    }
  }

  console.log(`\n📊 Resumen:`)
  console.log(`   Total valorizaciones procesadas: ${totalSinCambios + totalActualizadas}`)
  console.log(`   Sin cambios: ${totalSinCambios}`)
  console.log(`   Actualizadas: ${totalActualizadas}`)
  console.log(`   Total diferencias detectadas: ${diferencias.length}`)

  if (diferencias.length > 0) {
    console.log(`\n   Top 10 diferencias por magnitud:`)
    diferencias
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 10)
      .forEach(d => {
        console.log(`   - ${d.proyecto} / ${d.codigo} / ${d.campo}: ${d.antes.toFixed(2)} → ${d.despues.toFixed(2)} (Δ ${d.diff > 0 ? '+' : ''}${d.diff.toFixed(2)})`)
      })
  }

  if (DRY_RUN) {
    console.log(`\n⚠️  Modo dry-run — no se escribió nada. Quita --dry-run para aplicar.`)
  } else {
    console.log(`\n✅ Recalculación completa.`)
  }
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
