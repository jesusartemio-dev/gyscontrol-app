// POST /api/proyectos/[id]/cronograma/dependencias/ajustar-tarea  { tareaId }
// "Ajustar a sus predecesoras": mueve la tarea a donde la exigen TODAS sus
// predecesoras a la vez (la más exigente manda, como MS Project), conservando su
// duración en horas laborables. Reemplaza el ajuste por una sola dependencia,
// que con 2+ predecesoras podía dejar en rojo a las demás.

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

    const { tareaId } = (await request.json().catch(() => ({}))) as { tareaId?: string }
    if (!tareaId) return NextResponse.json({ error: 'Falta tareaId' }, { status: 400 })

    const tarea = await prisma.proyectoTarea.findFirst({
      where: { id: tareaId, proyectoEdt: { proyectoId } },
      select: {
        id: true, fechaInicio: true, fechaFin: true, esHito: true, proyectoCronogramaId: true,
        dependenciasComoDependiente: {
          select: { id: true, tipo: true, lagMinutos: true, tareaOrigen: { select: { nombre: true, fechaInicio: true, fechaFin: true } } },
        },
      },
    })
    if (!tarea) return NextResponse.json({ error: 'Tarea no encontrada en este proyecto' }, { status: 404 })
    if (!tarea.dependenciasComoDependiente.length) return NextResponse.json({ error: 'La tarea no tiene predecesoras' }, { status: 400 })

    const permiso = await validarPermisoCronogramaPorTarea(tarea.id)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(tarea.proyectoCronogramaId)) return cronogramaBloqueadoResponse()

    const cal = await obtenerCalendarioProyecto(proyectoId)
    const duracion = tarea.esHito ? 0 : horasLaborablesEntre(cal, tarea.fechaInicio, tarea.fechaFin)
    const deps = tarea.dependenciasComoDependiente
    const req = fechasPorPredecesoras(
      cal,
      deps.map(d => ({ tipo: d.tipo, lagMinutos: d.lagMinutos, pred: { inicio: d.tareaOrigen.fechaInicio, fin: d.tareaOrigen.fechaFin } })),
      duracion,
    )

    await prisma.proyectoTarea.update({
      where: { id: tarea.id },
      data: { fechaInicio: req.inicio, fechaFin: req.fin, updatedAt: new Date() },
    })
    await recalcularFechasPadresDeTarea(tarea.id)

    const determinante = deps[req.determinante]
    return NextResponse.json({
      success: true,
      data: { fechaInicio: req.inicio, fechaFin: req.fin, determinanteId: determinante.id, determinanteNombre: determinante.tareaOrigen.nombre },
    })
  } catch (error) {
    logger.error('❌ Error ajustando tarea a sus predecesoras:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
