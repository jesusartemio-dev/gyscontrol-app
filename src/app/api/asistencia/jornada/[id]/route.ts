import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Roles con permiso para eliminar CUALQUIER asistencia (incluidas pasadas/cerradas).
const ROLES_ADMIN = ['admin', 'gerente']

// DELETE /api/asistencia/jornada/[id]
// Elimina una asistencia de campo (JornadaAsistencia) y SUS MARCAJES asociados.
// La jornada de trabajo (RegistroHorasCampo) NO se borra: solo se desvincula
// (queda disponible para procesarse/eliminarse aparte desde Mi Jornada).
//
// Permisos:
// - El creador solo puede eliminar su asistencia ACTIVA (p. ej. abierta por error,
//   antes de reabrir). No puede borrar sus asistencias pasadas/cerradas.
// - admin/gerente pueden eliminar cualquiera (activa o cerrada).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const jornada = await prisma.jornadaAsistencia.findUnique({
    where: { id },
    select: { id: true, supervisorId: true, activa: true, registroHorasCampoId: true, _count: { select: { asistencias: true } } },
  })
  if (!jornada) {
    return NextResponse.json({ error: 'Asistencia no encontrada' }, { status: 404 })
  }

  const esDueno = jornada.supervisorId === session.user.id
  const esAdmin = ROLES_ADMIN.includes(session.user.role || '')
  if (!esAdmin) {
    if (!esDueno) {
      return NextResponse.json({ error: 'No puedes eliminar esta asistencia' }, { status: 403 })
    }
    if (!jornada.activa) {
      return NextResponse.json(
        { error: 'Solo puedes eliminar tu asistencia activa. Las asistencias pasadas las elimina un administrador.' },
        { status: 403 },
      )
    }
  }

  const marcajes = jornada._count.asistencias

  await prisma.$transaction(async (tx) => {
    // Borrar los marcajes ligados a esta asistencia (la FK es SetNull, así que
    // hay que borrarlos explícitamente para que no queden huérfanos).
    await tx.asistencia.deleteMany({ where: { jornadaAsistenciaId: id } })
    // Desvincular la jornada de trabajo (se conserva).
    await tx.jornadaAsistencia.delete({ where: { id } })

    await tx.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entidadTipo: 'JORNADA_ASISTENCIA',
        entidadId: id,
        accion: 'asistencia.eliminada',
        usuarioId: session.user.id,
        descripcion: `Asistencia eliminada con ${marcajes} marcaje(s)`,
        cambios: JSON.stringify({ marcajesBorrados: marcajes, registroHorasCampoId: jornada.registroHorasCampoId }),
      },
    })
  })

  return NextResponse.json({ ok: true, marcajesBorrados: marcajes })
}
