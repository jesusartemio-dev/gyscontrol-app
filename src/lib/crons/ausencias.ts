import { prisma } from '@/lib/prisma'

// ─── activarAusenciasEnCurso ──────────────────────────────────────────────────
// Transitions approved absences whose start date has arrived to en_curso.
// Designed to run once per day shortly after midnight Lima (≈ 05:05 UTC).
export async function activarAusenciasEnCurso(): Promise<{ activadas: number }> {
  const hoy = startOfToday()

  const candidatas = await prisma.solicitudAusencia.findMany({
    where: {
      estado: 'aprobada',
      fechaInicio: { lte: hoy },
    },
    select: { id: true },
  })

  if (candidatas.length === 0) return { activadas: 0 }

  const ids = candidatas.map((s) => s.id)

  await prisma.$transaction([
    prisma.solicitudAusencia.updateMany({
      where: { id: { in: ids } },
      data: { estado: 'en_curso', updatedAt: new Date() },
    }),
    ...ids.map((solicitudId) =>
      prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA',
          entidadId: solicitudId,
          accion: 'ausencia.activada_cron',
          usuarioId: 'system',
          descripcion: `Activada automáticamente por cron al llegar fechaInicio`,
          cambios: JSON.stringify({ estadoAnterior: 'aprobada', estadoNuevo: 'en_curso' }),
        },
      }),
    ),
  ])

  return { activadas: ids.length }
}

// ─── finalizarAusencias ───────────────────────────────────────────────────────
// Transitions en_curso absences whose end date has passed to finalizada.
// Designed to run once per day shortly before midnight Lima (≈ 23:55 UTC).
export async function finalizarAusencias(): Promise<{ finalizadas: number }> {
  const hoy = startOfToday()

  const candidatas = await prisma.solicitudAusencia.findMany({
    where: {
      estado: 'en_curso',
      fechaFin: { lt: hoy },
    },
    select: { id: true },
  })

  if (candidatas.length === 0) return { finalizadas: 0 }

  const ids = candidatas.map((s) => s.id)

  await prisma.$transaction([
    prisma.solicitudAusencia.updateMany({
      where: { id: { in: ids } },
      data: { estado: 'finalizada', updatedAt: new Date() },
    }),
    ...ids.map((solicitudId) =>
      prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA',
          entidadId: solicitudId,
          accion: 'ausencia.finalizada_cron',
          usuarioId: 'system',
          descripcion: `Finalizada automáticamente por cron al pasar fechaFin`,
          cambios: JSON.stringify({ estadoAnterior: 'en_curso', estadoNuevo: 'finalizada' }),
        },
      }),
    ),
  ])

  return { finalizadas: ids.length }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
