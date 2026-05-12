import { prisma } from '@/lib/prisma'

export interface PreRequisitoResultado {
  cumple: boolean
  faltantes: string[]
}

export async function validarPreRequisitos(
  proyectoId: string
): Promise<PreRequisitoResultado> {
  const faltantes: string[] = []

  // 1. Proyecto existe
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true },
  })

  if (!proyecto) {
    return { cumple: false, faltantes: ['El proyecto no existe'] }
  }

  // 2. Proyecto tiene PlanTrabajo asociado
  const planTrabajo = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
    select: { id: true },
  })

  if (!planTrabajo) {
    faltantes.push(
      'El proyecto no tiene Plan de Trabajo generado. Generalo primero antes de crear el IPERC.'
    )
  }

  // 3. Cronograma de planificación con al menos 1 ProyectoTarea
  const tareasCount = await prisma.proyectoTarea.count({
    where: {
      proyectoCronograma: {
        proyectoId,
        tipo: 'planificacion',
      },
    },
  })

  if (tareasCount === 0) {
    faltantes.push(
      'El cronograma de planificación del proyecto debe tener al menos una Tarea poblada.'
    )
  }

  return { cumple: faltantes.length === 0, faltantes }
}
