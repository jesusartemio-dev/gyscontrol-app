import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Shared rollup calculation functions for cronograma hierarchy.
 * Used by: cronograma/edts, cronograma/actividades, cronograma/tareas routes.
 *
 * Hierarchy: Fase → EDT → Actividad → Tarea
 * Rollup: dates (min/max) and hours (sum) bubble up from children to parents.
 */

/** Recalculate actividad dates & hours from its child tareas */
export async function recalcularActividadPadre(actividadId: string): Promise<void> {
  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoActividadId: actividadId },
    select: {
      fechaInicio: true,
      fechaFin: true,
      horasEstimadas: true
    }
  })

  if (tareas.length === 0) return

  const fechasInicio = tareas.map(t => t.fechaInicio).filter(f => f !== null) as Date[]
  const fechasFin = tareas.map(t => t.fechaFin).filter(f => f !== null) as Date[]

  const fechaInicioMin = fechasInicio.length > 0 ? new Date(Math.min(...fechasInicio.map(d => d.getTime()))) : undefined
  const fechaFinMax = fechasFin.length > 0 ? new Date(Math.max(...fechasFin.map(d => d.getTime()))) : undefined
  const horasTotales = tareas.reduce((sum, tarea) => sum + Number(tarea.horasEstimadas || 0), 0)

  await prisma.proyectoActividad.update({
    where: { id: actividadId },
    data: {
      fechaInicioPlan: fechaInicioMin,
      fechaFinPlan: fechaFinMax,
      horasPlan: horasTotales,
      updatedAt: new Date()
    }
  })
}

/** Recalculate EDT dates & hours from its child actividades */
export async function recalcularEdtPadre(edtId: string): Promise<void> {
  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoEdtId: edtId },
    select: {
      fechaInicioPlan: true,
      fechaFinPlan: true,
      horasPlan: true
    }
  })

  if (actividades.length === 0) return

  const fechasInicio = actividades.map(a => a.fechaInicioPlan).filter(f => f !== null) as Date[]
  const fechasFin = actividades.map(a => a.fechaFinPlan).filter(f => f !== null) as Date[]

  const fechaInicioMin = fechasInicio.length > 0 ? new Date(Math.min(...fechasInicio.map(d => d.getTime()))) : undefined
  const fechaFinMax = fechasFin.length > 0 ? new Date(Math.max(...fechasFin.map(d => d.getTime()))) : undefined
  const horasTotales = actividades.reduce((sum, a) => sum + Number(a.horasPlan || 0), 0)

  await prisma.proyectoEdt.update({
    where: { id: edtId },
    data: {
      fechaInicioPlan: fechaInicioMin,
      fechaFinPlan: fechaFinMax,
      horasPlan: horasTotales,
      updatedAt: new Date()
    }
  })
}

/** Recalculate fase dates from its child EDTs */
export async function recalcularFasePadre(faseId: string): Promise<void> {
  const edts = await prisma.proyectoEdt.findMany({
    where: { proyectoFaseId: faseId },
    select: {
      fechaInicioPlan: true,
      fechaFinPlan: true,
      horasPlan: true
    }
  })

  if (edts.length === 0) return

  const fechasInicio = edts.map(e => e.fechaInicioPlan).filter(f => f !== null) as Date[]
  const fechasFin = edts.map(e => e.fechaFinPlan).filter(f => f !== null) as Date[]

  const fechaInicioMin = fechasInicio.length > 0 ? new Date(Math.min(...fechasInicio.map(d => d.getTime()))) : undefined
  const fechaFinMax = fechasFin.length > 0 ? new Date(Math.max(...fechasFin.map(d => d.getTime()))) : undefined

  await prisma.proyectoFase.update({
    where: { id: faseId },
    data: {
      fechaInicioPlan: fechaInicioMin,
      fechaFinPlan: fechaFinMax,
      updatedAt: new Date()
    }
  })
}

/** Dispatch recalculation to the appropriate parent type */
async function recalcularNodoPadre(parentType: string, parentId: string): Promise<void> {
  try {
    switch (parentType) {
      case 'actividad':
        await recalcularActividadPadre(parentId)
        break
      case 'edt':
        await recalcularEdtPadre(parentId)
        break
      case 'fase':
        await recalcularFasePadre(parentId)
        break
    }
  } catch (error) {
    logger.error(`Error recalculando ${parentType} ${parentId}:`, error)
  }
}

/**
 * Recursively recalculate all ancestors after a node operation.
 * Walks up the tree: tarea → actividad → edt → fase.
 */
export async function recalcularPadresPostOperacion(
  proyectoId: string,
  nodeType: string,
  nodeId: string
): Promise<void> {
  let parentId: string | null = null
  let parentType: string | null = null

  switch (nodeType) {
    case 'tarea': {
      const tarea = await prisma.proyectoTarea.findUnique({
        where: { id: nodeId },
        select: { proyectoActividadId: true }
      })
      if (tarea?.proyectoActividadId) {
        parentId = tarea.proyectoActividadId
        parentType = 'actividad'
      }
      break
    }
    case 'actividad': {
      const actividad = await prisma.proyectoActividad.findUnique({
        where: { id: nodeId },
        select: { proyectoEdtId: true }
      })
      if (actividad?.proyectoEdtId) {
        parentId = actividad.proyectoEdtId
        parentType = 'edt'
      }
      break
    }
    case 'edt': {
      const edt = await prisma.proyectoEdt.findUnique({
        where: { id: nodeId },
        select: { proyectoFaseId: true }
      })
      if (edt?.proyectoFaseId) {
        parentId = edt.proyectoFaseId
        parentType = 'fase'
      }
      break
    }
    case 'fase':
      return
  }

  if (parentId && parentType) {
    await recalcularNodoPadre(parentType, parentId)
    await recalcularPadresPostOperacion(proyectoId, parentType, parentId)
  }
}
