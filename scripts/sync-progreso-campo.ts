/**
 * Script: sync-progreso-campo.ts
 *
 * Sincroniza porcentajeFinal de RegistroHorasCampoTarea → ProyectoTarea.porcentajeCompletado
 * para todas las jornadas aprobadas que no propagaron su progreso.
 *
 * Uso: npx tsx scripts/sync-progreso-campo.ts
 */

import { prisma } from '@/lib/prisma'

async function main() {
  console.log('🔍 Buscando jornadas aprobadas con porcentajeFinal pendiente de sincronizar...\n')

  // Traer todas las tareas de campo aprobadas que tienen porcentajeFinal > 0
  const tareasCampo = await prisma.registroHorasCampoTarea.findMany({
    where: {
      porcentajeFinal: { gt: 0 },
      proyectoTareaId: { not: null },
      registroCampo: { estado: 'aprobado' }
    },
    include: {
      proyectoTarea: { select: { id: true, nombre: true, porcentajeCompletado: true, estado: true } },
      registroCampo: { select: { id: true, fechaTrabajo: true, proyecto: { select: { codigo: true } } } }
    },
    orderBy: { registroCampo: { fechaTrabajo: 'asc' } }
  })

  console.log(`📋 Tareas de campo con porcentajeFinal > 0: ${tareasCampo.length}\n`)

  if (tareasCampo.length === 0) {
    console.log('✅ Nada que actualizar.')
    await prisma.$disconnect()
    return
  }

  // Agrupar por proyectoTareaId: tomar el porcentajeFinal más alto (última jornada cronológica)
  const mapaMaxProgreso = new Map<string, { porcentajeFinal: number; nombre: string; actual: number; codigoProyecto: string }>()

  for (const t of tareasCampo) {
    if (!t.proyectoTareaId || !t.proyectoTarea) continue
    const existing = mapaMaxProgreso.get(t.proyectoTareaId)
    const pFinal = t.porcentajeFinal!
    if (!existing || pFinal > existing.porcentajeFinal) {
      mapaMaxProgreso.set(t.proyectoTareaId, {
        porcentajeFinal: pFinal,
        nombre: t.proyectoTarea.nombre,
        actual: t.proyectoTarea.porcentajeCompletado ?? 0,
        codigoProyecto: t.registroCampo.proyecto?.codigo ?? '?'
      })
    }
  }

  console.log(`🗂️  Tareas únicas del cronograma a evaluar: ${mapaMaxProgreso.size}\n`)

  let actualizadas = 0
  let omitidas = 0

  for (const [tareaId, { porcentajeFinal, nombre, actual, codigoProyecto }] of mapaMaxProgreso.entries()) {
    const nuevo = Math.max(actual, porcentajeFinal)

    if (nuevo <= actual) {
      console.log(`  ⏭️  [${codigoProyecto}] "${nombre}" — ya tiene ${actual}% (campo: ${porcentajeFinal}%), sin cambio`)
      omitidas++
      continue
    }

    await prisma.proyectoTarea.update({
      where: { id: tareaId },
      data: {
        porcentajeCompletado: nuevo,
        ...(nuevo >= 100 ? { estado: 'completada', fechaFinReal: new Date() } : {}),
        updatedAt: new Date()
      }
    })

    console.log(`  ✅ [${codigoProyecto}] "${nombre}" — ${actual}% → ${nuevo}%${nuevo >= 100 ? ' (marcada completada)' : ''}`)
    actualizadas++
  }

  console.log(`\n📊 Resumen:`)
  console.log(`   Actualizadas: ${actualizadas}`)
  console.log(`   Sin cambio:   ${omitidas}`)
  console.log(`   Total:        ${mapaMaxProgreso.size}`)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error('❌ Error:', e)
  process.exit(1)
})
