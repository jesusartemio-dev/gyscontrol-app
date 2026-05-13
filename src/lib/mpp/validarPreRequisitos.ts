import { prisma } from '@/lib/prisma'

export type PreRequisitosResult =
  | { ok: true }
  | { ok: false; error: string; code: 'NO_IPERC' | 'IPERC_SIN_FILAS' }

export async function validarPreRequisitosMpp(proyectoId: string): Promise<PreRequisitosResult> {
  const iperc = await prisma.iperc.findUnique({
    where: { proyectoId },
    include: { _count: { select: { filas: true } } },
  })

  if (!iperc) {
    return { ok: false, error: 'El proyecto no tiene un IPERC creado. Creá el IPERC primero.', code: 'NO_IPERC' }
  }

  if (iperc._count.filas === 0) {
    return { ok: false, error: 'El IPERC no tiene filas. Agregá al menos una fila al IPERC antes de crear el MPP.', code: 'IPERC_SIN_FILAS' }
  }

  return { ok: true }
}
