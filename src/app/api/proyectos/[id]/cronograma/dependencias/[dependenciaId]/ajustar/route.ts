// POST /api/proyectos/[id]/cronograma/dependencias/[dependenciaId]/ajustar
// "Ajustar sucesora": mueve la tarea sucesora a donde la pone la dependencia
// (tipo + desfase), conservando su duración en horas laborables. GYS trabaja en
// modo manual como MS Project: las dependencias no mueven fechas solas.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronogramaPorTarea } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { obtenerCalendarioProyecto } from '@/lib/services/cronogramaDesplazamiento'
import { horasLaborablesEntre } from '@/lib/services/cronogramaHoras'
import { fechasRequeridas } from '@/lib/services/cronogramaDependencias'
import { recalcularFechasPadresDeTarea } from '@/lib/services/cronogramaRollupFechas'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: proyectoId, dependenciaId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const fechas = { fechaInicio: true, fechaFin: true, esHito: true, proyectoCronogramaId: true }
    const dep = await prisma.proyectoDependenciasTarea.findFirst({
      where: { id: dependenciaId, tareaOrigen: { proyectoEdt: { proyectoId } } },
      include: { tareaOrigen: { select: fechas }, tareaDependiente: { select: { id: true, ...fechas } } },
    })
    if (!dep) {
      return NextResponse.json({ error: 'Dependencia no encontrada o no pertenece a este proyecto' }, { status: 404 })
    }
    const permiso = await validarPermisoCronogramaPorTarea(dep.tareaDependienteId)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(dep.tareaDependiente.proyectoCronogramaId)) return cronogramaBloqueadoResponse()

    const cal = await obtenerCalendarioProyecto(proyectoId)
    const suc = dep.tareaDependiente
    const duracion = suc.esHito ? 0 : horasLaborablesEntre(cal, suc.fechaInicio, suc.fechaFin)
    const req = fechasRequeridas(
      cal,
      dep,
      { inicio: dep.tareaOrigen.fechaInicio, fin: dep.tareaOrigen.fechaFin },
      duracion,
    )

    await prisma.proyectoTarea.update({
      where: { id: suc.id },
      data: { fechaInicio: req.inicio, fechaFin: req.fin, updatedAt: new Date() },
    })
    await recalcularFechasPadresDeTarea(suc.id)

    return NextResponse.json({ success: true, data: { fechaInicio: req.inicio, fechaFin: req.fin } })
  } catch (error) {
    logger.error('❌ Error ajustando sucesora:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
