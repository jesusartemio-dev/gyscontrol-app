import { prisma } from '@/lib/prisma'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { validarPreRequisitos } from '@/lib/iperc/validarPreRequisitos'
import type { IpercContexto } from '@/types/iperc'

export async function cargarContextoIperc(
  proyectoId: string
): Promise<IpercContexto | null> {
  const [proyecto, iperc, iaHabilitada] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        cliente: { select: { nombre: true } },
      },
    }),
    prisma.iperc.findUnique({
      where: { proyectoId },
      include: {
        filas: { orderBy: { numero: 'asc' } },
        generaciones: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    }),
    isIAFeatureEnabled('iperc'),
  ])

  if (!proyecto) return null

  const preRequisitos = await validarPreRequisitos(proyectoId)

  const generacionActiva =
    iperc?.generaciones.find(g => {
      if (g.estado !== 'en_progreso') return false
      const age = Date.now() - new Date(g.createdAt).getTime()
      return age < 10 * 60 * 1000
    }) ?? null

  const ultimaGeneracion =
    iperc?.generaciones.find(g => g.estado === 'completada') ?? null

  return {
    proyecto: {
      id: proyecto.id,
      codigo: proyecto.codigo ?? '',
      nombre: proyecto.nombre,
      clienteNombre: proyecto.cliente?.nombre ?? '',
    },
    iperc: iperc ?? null,
    preRequisitos,
    generacionActiva,
    iaHabilitada,
    ultimaGeneracion,
  }
}
