/**
 * Script: backfill-horas-reales-campo.ts
 *
 * Sincroniza horasReales en ProyectoTarea de ejecucion
 * a partir de las horas reales registradas en RegistroHorasCampoMiembro
 * para jornadas aprobadas.
 *
 * Uso: npx dotenv -e .env.production -- npx tsx scripts/backfill-horas-reales-campo.ts
 */

import { prisma } from '@/lib/prisma'

async function main() {
  console.log('🔍 Calculando horasReales desde campo para tareas de ejecucion...\n')

  // Obtener todas las tareas de campo con proyectoTareaId de jornadas aprobadas
  const campoTareas = await prisma.registroHorasCampoTarea.findMany({
    where: {
      proyectoTareaId: { not: null },
      registroCampo: { estado: 'aprobado' }
    },
    include: {
      miembros: { select: { horas: true } },
      proyectoTarea: {
        include: {
          proyectoEdt: {
            include: {
              proyectoCronograma: { select: { tipo: true } },
              proyecto: { select: { id: true, codigo: true } }
            }
          }
        }
      }
    }
  })

  console.log(`📋 Registros de campo con tarea vinculada: ${campoTareas.length}\n`)

  // Acumular horas por proyectoTareaId (solo ejecucion)
  // Para planificacion, buscar el espejo en ejecucion
  const horasPorTareaEjecucion = new Map<string, { horas: number; nombre: string; codigo: string }>()

  for (const ct of campoTareas) {
    if (!ct.proyectoTareaId || !ct.proyectoTarea) continue
    const tipo = ct.proyectoTarea.proyectoEdt?.proyectoCronograma?.tipo
    const horas = ct.miembros.reduce((s, m) => s + m.horas, 0)
    if (horas <= 0) continue

    if (tipo === 'ejecucion') {
      const existing = horasPorTareaEjecucion.get(ct.proyectoTareaId)
      horasPorTareaEjecucion.set(ct.proyectoTareaId, {
        horas: (existing?.horas ?? 0) + horas,
        nombre: ct.proyectoTarea.nombre,
        codigo: ct.proyectoTarea.proyectoEdt?.proyecto?.codigo ?? '?'
      })
    } else {
      // planificacion → buscar espejo ejecucion
      const proyectoId = ct.proyectoTarea.proyectoEdt?.proyecto?.id
      if (!proyectoId) continue
      const mirror = await prisma.proyectoTarea.findFirst({
        where: {
          nombre: ct.proyectoTarea.nombre,
          proyectoEdt: {
            proyectoId,
            proyectoCronograma: { tipo: 'ejecucion' }
          }
        },
        select: { id: true }
      })
      if (mirror) {
        const existing = horasPorTareaEjecucion.get(mirror.id)
        horasPorTareaEjecucion.set(mirror.id, {
          horas: (existing?.horas ?? 0) + horas,
          nombre: ct.proyectoTarea.nombre,
          codigo: ct.proyectoTarea.proyectoEdt?.proyecto?.codigo ?? '?'
        })
      }
    }
  }

  console.log(`📊 Tareas de ejecucion a actualizar: ${horasPorTareaEjecucion.size}\n`)

  let actualizadas = 0
  for (const [tareaId, { horas, nombre, codigo }] of horasPorTareaEjecucion.entries()) {
    const tarea = await prisma.proyectoTarea.findUnique({
      where: { id: tareaId },
      select: { horasReales: true }
    })
    const actual = Number(tarea?.horasReales ?? 0)
    // Solo actualizar si el valor calculado es mayor (evitar reducir horas ya correctas)
    if (horas > actual) {
      await prisma.proyectoTarea.update({
        where: { id: tareaId },
        data: { horasReales: horas, updatedAt: new Date() }
      })
      console.log(`  ✅ [${codigo}] "${nombre}" — ${actual}h → ${horas}h`)
      actualizadas++
    } else {
      console.log(`  ⏭️  [${codigo}] "${nombre}" — ya tiene ${actual}h (campo: ${horas}h)`)
    }
  }

  console.log(`\n📊 Resumen: ${actualizadas} actualizadas`)
  await prisma.$disconnect()
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1) })
