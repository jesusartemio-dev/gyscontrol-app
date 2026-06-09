import { prisma } from '@/lib/prisma'

export interface ResultadoSnapshot {
  snapshotId: string
  tareasCapturadas: number
  progresoGeneral: number
}

/**
 * Toma (o re-toma) el snapshot semanal de avance del cronograma de EJECUCIÓN del proyecto.
 *
 * - Lee todas las ProyectoTarea del cronograma de ejecución vigente con su fase.
 * - Calcula progresoGeneral ponderando porcentajeCompletado por horasEstimadas (mismo
 *   criterio que progresoService; fallback a promedio simple si Σhoras = 0).
 * - Upsert por (proyectoId, semanaIso): re-tomar la misma semana SOBREESCRIBE (borra las
 *   tareas hijas previas y reinserta la foto actual).
 */
export async function tomarSnapshot(
  proyectoId: string,
  semanaIso: string,
  fechaCorte: Date,
  userId: string | null,
): Promise<ResultadoSnapshot> {
  // 1. Cronograma de ejecución vigente del proyecto.
  const cronograma = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId, tipo: 'ejecucion' },
    select: { id: true },
  })
  if (!cronograma) {
    throw new Error('El proyecto no tiene cronograma de ejecución')
  }

  // 2. Tareas del cronograma con su fase (vía edt.proyectoFase.nombre).
  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    select: {
      id: true,
      nombre: true,
      horasEstimadas: true,
      porcentajeCompletado: true,
      proyectoEdt: { select: { proyectoFase: { select: { nombre: true } } } },
    },
  })

  // 3. progresoGeneral ponderado por horasEstimadas (fallback promedio simple si Σh = 0).
  let sumaPeso = 0
  let sumaPond = 0
  for (const t of tareas) {
    const h = Number(t.horasEstimadas ?? 0)
    sumaPeso += h
    sumaPond += t.porcentajeCompletado * h
  }
  const progresoGeneral =
    tareas.length === 0
      ? 0
      : sumaPeso > 0
        ? sumaPond / sumaPeso
        : tareas.reduce((s, t) => s + t.porcentajeCompletado, 0) / tareas.length

  // 4. Upsert del snapshot + reemplazo atómico de las tareas hijas.
  const snapshot = await prisma.$transaction(async (tx) => {
    const snap = await tx.proyectoAvanceSnapshot.upsert({
      where: { proyectoId_semanaIso: { proyectoId, semanaIso } },
      create: {
        proyectoId,
        proyectoCronogramaId: cronograma.id,
        semanaIso,
        fechaCorte,
        tomadoPorId: userId,
        progresoGeneral,
      },
      update: {
        proyectoCronogramaId: cronograma.id,
        fechaCorte,
        tomadoPorId: userId,
        progresoGeneral,
      },
    })

    await tx.proyectoAvanceSnapshotTarea.deleteMany({ where: { snapshotId: snap.id } })
    if (tareas.length > 0) {
      await tx.proyectoAvanceSnapshotTarea.createMany({
        data: tareas.map((t) => ({
          snapshotId: snap.id,
          proyectoTareaId: t.id,
          nombreTarea: t.nombre,
          proyectoFaseNombre: t.proyectoEdt?.proyectoFase?.nombre ?? null,
          horasEstimadas: t.horasEstimadas ?? 0,
          porcentaje: t.porcentajeCompletado,
        })),
      })
    }
    return snap
  })

  return {
    snapshotId: snapshot.id,
    tareasCapturadas: tareas.length,
    progresoGeneral,
  }
}

/**
 * Lista los snapshots de un proyecto ordenados por semanaIso (ascendente) con su
 * progresoGeneral — base para dibujar la Curva S de avance real (bloque 2).
 */
export async function listarSnapshots(proyectoId: string) {
  return prisma.proyectoAvanceSnapshot.findMany({
    where: { proyectoId },
    orderBy: { semanaIso: 'asc' },
    select: {
      id: true,
      semanaIso: true,
      fechaCorte: true,
      progresoGeneral: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}
