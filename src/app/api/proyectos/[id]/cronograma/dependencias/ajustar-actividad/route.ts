// POST /api/proyectos/[id]/cronograma/dependencias/ajustar-actividad  { actividadId }
// "Ajustar tareas a sus predecesoras" de una actividad: lo mismo que el ajuste de
// una tarea (ajustar-tarea), pero para todas sus tareas de una vez y en cascada.
// Se recorren en orden de dependencias: cada tarea con predecesoras va a donde la
// exigen TODAS (la más exigente manda, como MS Project) usando las fechas ya
// ajustadas de sus predecesoras, así un cambio en la primera tarea se propaga a
// las demás. Las tareas sin predecesoras no se mueven. Conserva la duración en
// horas laborables. Solo mueve tareas de la actividad (las de otras actividades
// cuentan como predecesoras, pero no se tocan).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronogramaPorTarea } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { obtenerCalendarioProyecto } from '@/lib/services/cronogramaDesplazamiento'
import { horasLaborablesEntre } from '@/lib/services/cronogramaHoras'
import { fechasPorPredecesoras } from '@/lib/services/cronogramaDependencias'
import { recalcularFechasPadresDeTarea } from '@/lib/services/cronogramaRollupFechas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { actividadId } = (await request.json().catch(() => ({}))) as { actividadId?: string }
    if (!actividadId) return NextResponse.json({ error: 'Falta actividadId' }, { status: 400 })

    const actividad = await prisma.proyectoActividad.findFirst({
      where: { id: actividadId, proyectoEdt: { proyectoId } },
      select: {
        id: true, proyectoCronogramaId: true,
        proyectoTarea: {
          orderBy: { orden: 'asc' },
          select: {
            id: true, nombre: true, fechaInicio: true, fechaFin: true, esHito: true,
            dependenciasComoDependiente: {
              select: { tipo: true, lagMinutos: true, tareaOrigenId: true, tareaOrigen: { select: { fechaInicio: true, fechaFin: true } } },
            },
          },
        },
      },
    })
    if (!actividad) return NextResponse.json({ error: 'Actividad no encontrada en este proyecto' }, { status: 404 })
    const tareas = actividad.proyectoTarea
    if (!tareas.length) return NextResponse.json({ error: 'La actividad no tiene tareas' }, { status: 400 })
    if (!tareas.some((t) => t.dependenciasComoDependiente.length)) {
      return NextResponse.json({ error: 'Ninguna tarea de la actividad tiene predecesoras' }, { status: 400 })
    }

    const permiso = await validarPermisoCronogramaPorTarea(tareas[0].id)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(actividad.proyectoCronogramaId)) return cronogramaBloqueadoResponse()

    const cal = await obtenerCalendarioProyecto(proyectoId)
    const propias = new Set(tareas.map((t) => t.id))
    // Fechas vigentes de las tareas de la actividad (se van actualizando en cascada).
    const fechas = new Map(tareas.map((t) => [t.id, { inicio: t.fechaInicio, fin: t.fechaFin }]))
    const cambios: { id: string; inicio: Date; fin: Date }[] = []

    // Orden topológico dentro de la actividad: una tarea se ajusta cuando ya se
    // ajustaron sus predecesoras de la misma actividad.
    const pendientes = [...tareas]
    while (pendientes.length) {
      const i = pendientes.findIndex((t) =>
        t.dependenciasComoDependiente.every((d) => !propias.has(d.tareaOrigenId) || !pendientes.some((p) => p.id === d.tareaOrigenId))
      )
      if (i < 0) return NextResponse.json({ error: 'Hay un ciclo de dependencias entre las tareas de la actividad' }, { status: 400 })
      const t = pendientes.splice(i, 1)[0]
      if (!t.dependenciasComoDependiente.length) continue

      const actual = fechas.get(t.id)!
      const duracion = t.esHito ? 0 : horasLaborablesEntre(cal, actual.inicio, actual.fin)
      const req = fechasPorPredecesoras(
        cal,
        t.dependenciasComoDependiente.map((d) => ({
          tipo: d.tipo,
          lagMinutos: d.lagMinutos,
          pred: fechas.get(d.tareaOrigenId) ?? { inicio: d.tareaOrigen.fechaInicio, fin: d.tareaOrigen.fechaFin },
        })),
        duracion,
      )
      if (req.inicio.getTime() === actual.inicio.getTime() && req.fin.getTime() === actual.fin.getTime()) continue
      fechas.set(t.id, { inicio: req.inicio, fin: req.fin })
      cambios.push({ id: t.id, inicio: req.inicio, fin: req.fin })
    }

    if (cambios.length) {
      const ahora = new Date()
      await prisma.$transaction(cambios.map((c) => prisma.proyectoTarea.update({
        where: { id: c.id },
        data: { fechaInicio: c.inicio, fechaFin: c.fin, updatedAt: ahora },
      })))
      await recalcularFechasPadresDeTarea(cambios[0].id)
    }

    return NextResponse.json({ success: true, data: { tareasAjustadas: cambios.length, totalTareas: tareas.length } })
  } catch (error) {
    logger.error('❌ Error ajustando tareas de la actividad a sus predecesoras:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
