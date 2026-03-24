/**
 * Script: sync-progreso-campo.ts
 *
 * Sincroniza porcentajeFinal de RegistroHorasCampoTarea → ProyectoTarea.porcentajeCompletado
 * para todas las jornadas aprobadas. Si la tarea está en cronograma "planificacion",
 * también actualiza su espejo en el cronograma "ejecucion" (que es lo que ve supervision/tareas).
 *
 * Uso: npx dotenv -e .env.production -- npx tsx scripts/sync-progreso-campo.ts
 */

import { prisma } from '@/lib/prisma'

async function findEjecucionMirror(tareaId: string, nombre: string, proyectoId: string): Promise<string | null> {
  const mirror = await prisma.proyectoTarea.findFirst({
    where: {
      nombre,
      proyectoEdt: {
        proyectoId,
        proyectoCronograma: { tipo: 'ejecucion' }
      }
    },
    select: { id: true }
  })
  return mirror?.id ?? null
}

async function main() {
  console.log('🔍 Buscando jornadas aprobadas con porcentajeFinal > 0...\n')

  const tareasCampo = await prisma.registroHorasCampoTarea.findMany({
    where: {
      porcentajeFinal: { gt: 0 },
      proyectoTareaId: { not: null },
      registroCampo: { estado: 'aprobado' }
    },
    include: {
      proyectoTarea: {
        include: {
          proyectoEdt: {
            include: {
              proyectoCronograma: { select: { tipo: true } },
              proyecto: { select: { id: true, codigo: true } }
            }
          }
        }
      },
      registroCampo: { select: { id: true, fechaTrabajo: true } }
    },
    orderBy: { registroCampo: { fechaTrabajo: 'asc' } }
  })

  console.log(`📋 Registros de campo con porcentajeFinal > 0: ${tareasCampo.length}\n`)

  if (tareasCampo.length === 0) {
    console.log('✅ Nada que actualizar.')
    await prisma.$disconnect()
    return
  }

  // Agrupar por proyectoTareaId tomando el máximo porcentajeFinal
  const mapaMaxProgreso = new Map<string, {
    porcentajeFinal: number
    nombre: string
    actual: number
    proyectoId: string
    codigoProyecto: string
    cronograma: string
  }>()

  for (const t of tareasCampo) {
    if (!t.proyectoTareaId || !t.proyectoTarea) continue
    const existing = mapaMaxProgreso.get(t.proyectoTareaId)
    const pFinal = t.porcentajeFinal!
    if (!existing || pFinal > existing.porcentajeFinal) {
      mapaMaxProgreso.set(t.proyectoTareaId, {
        porcentajeFinal: pFinal,
        nombre: t.proyectoTarea.nombre,
        actual: t.proyectoTarea.porcentajeCompletado ?? 0,
        proyectoId: t.proyectoTarea.proyectoEdt?.proyecto?.id ?? '',
        codigoProyecto: t.proyectoTarea.proyectoEdt?.proyecto?.codigo ?? '?',
        cronograma: t.proyectoTarea.proyectoEdt?.proyectoCronograma?.tipo ?? '?'
      })
    }
  }

  let actualizadas = 0
  let omitidas = 0

  for (const [tareaId, { porcentajeFinal, nombre, actual, proyectoId, codigoProyecto, cronograma }] of mapaMaxProgreso.entries()) {
    const nuevo = Math.max(actual, porcentajeFinal)
    const updateData = {
      porcentajeCompletado: nuevo,
      ...(nuevo >= 100 ? { estado: 'completada' as const, fechaFinReal: new Date() } : {}),
      updatedAt: new Date()
    }

    if (nuevo > actual) {
      await prisma.proyectoTarea.update({ where: { id: tareaId }, data: updateData })
      console.log(`  ✅ [${codigoProyecto}/${cronograma}] "${nombre}" — ${actual}% → ${nuevo}%`)
      actualizadas++
    } else {
      console.log(`  ⏭️  [${codigoProyecto}/${cronograma}] "${nombre}" — ya tiene ${actual}% (campo: ${porcentajeFinal}%)`)
      omitidas++
    }

    // Si la tarea está en planificacion, sincronizar también la de ejecucion
    if (cronograma !== 'ejecucion' && proyectoId) {
      const mirrorId = await findEjecucionMirror(tareaId, nombre, proyectoId)
      if (mirrorId) {
        const mirror = await prisma.proyectoTarea.findUnique({ where: { id: mirrorId }, select: { porcentajeCompletado: true } })
        const actualMirror = mirror?.porcentajeCompletado ?? 0
        const nuevoMirror = Math.max(actualMirror, porcentajeFinal)
        if (nuevoMirror > actualMirror) {
          await prisma.proyectoTarea.update({ where: { id: mirrorId }, data: { ...updateData, porcentajeCompletado: nuevoMirror } })
          console.log(`     🔄 espejo ejecucion: ${actualMirror}% → ${nuevoMirror}%`)
          actualizadas++
        } else {
          console.log(`     ⏭️  espejo ejecucion: ya tiene ${actualMirror}%`)
        }
      } else {
        console.log(`     ℹ️  sin espejo ejecucion encontrado`)
      }
    }
  }

  console.log(`\n📊 Resumen: ${actualizadas} actualizadas, ${omitidas} sin cambio`)
  await prisma.$disconnect()
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1) })
