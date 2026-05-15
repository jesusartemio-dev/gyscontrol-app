import { PrismaClient, type ProyectoEstado } from '@prisma/client'
import type { ResolverAprobador1Result } from '@/types/ausencias'

// ─── Minimal interface for testability ───────────────────────────────────────
// Accepts both the full prisma singleton and a $transaction client.

export type PrismaTxForResolver = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// Active project states for approver lookup
const ESTADOS_PROYECTO_ACTIVOS = [
  'creado',
  'en_planificacion',
  'listas_pendientes',
  'listas_aprobadas',
  'pedidos_creados',
  'en_ejecucion',
  'en_cierre',
] as const

// ─── Main function ────────────────────────────────────────────────────────────

export async function resolverAprobador1(
  solicitanteId: string,
  fechaInicio: Date,
  fechaFin: Date,
  tx: PrismaTxForResolver,
): Promise<ResolverAprobador1Result> {
  // ── Nivel 1: Departamento.responsable ──────────────────────────────────────
  const empleado = await tx.empleado.findUnique({
    where: { userId: solicitanteId },
    include: {
      departamento: { select: { responsableId: true } },
    },
  })

  const responsableId = empleado?.departamento?.responsableId
  if (responsableId && responsableId !== solicitanteId) {
    return { aprobador1Id: responsableId, via: 'departamento' }
  }

  // ── Nivel 2: Proyecto.lider via PersonalProyecto ───────────────────────────
  const asignaciones = await tx.personalProyecto.findMany({
    where: {
      userId: solicitanteId,
      activo: true,
      proyecto: {
        estado: { in: ESTADOS_PROYECTO_ACTIVOS as unknown as ProyectoEstado[] },
        deletedAt: null,
      },
    },
    include: {
      proyecto: {
        select: {
          liderId: true,
          fechaInicio: true,
          fechaFin: true,
          createdAt: true,
        },
      },
    },
    orderBy: { proyecto: { createdAt: 'desc' } },
  })

  for (const asignacion of asignaciones) {
    const p = asignacion.proyecto
    const proyectoFin = p.fechaFin ?? new Date('2099-12-31')
    const overlaps = fechaInicio <= proyectoFin && fechaFin >= p.fechaInicio
    if (!overlaps) continue
    if (p.liderId && p.liderId !== solicitanteId) {
      return { aprobador1Id: p.liderId, via: 'proyecto' }
    }
  }

  // ── Nivel 3: Cualquier User con role='administracion' ─────────────────────
  const admin = await tx.user.findFirst({
    where: { role: 'administracion', id: { not: solicitanteId } },
    orderBy: { id: 'asc' },
    select: { id: true },
  })

  if (admin) {
    return { aprobador1Id: admin.id, via: 'administracion' }
  }

  // ── Sin resolución ─────────────────────────────────────────────────────────
  return { aprobador1Id: null, requiereAsignacion: true }
}
