import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const ROLES_ADMIN = ['admin', 'gerente', 'gestor', 'coordinador']

// DELETE /api/asistencia/jornada/[id]
// Elimina una asistencia de campo (JornadaAsistencia) y SUS MARCAJES asociados.
// La jornada de trabajo (RegistroHorasCampo) NO se borra: solo se desvincula
// (queda disponible para procesarse/eliminarse aparte desde Mi Jornada).
// Pensado para limpiar asistencias de prueba o abiertas por error.
// Solo el creador de la asistencia o un rol admin/gerente/gestor/coordinador.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const jornada = await prisma.jornadaAsistencia.findUnique({
    where: { id },
    select: { id: true, supervisorId: true, registroHorasCampoId: true, _count: { select: { asistencias: true } } },
  })
  if (!jornada) {
    return NextResponse.json({ error: 'Asistencia no encontrada' }, { status: 404 })
  }

  const esDueno = jornada.supervisorId === session.user.id
  const esAdmin = ROLES_ADMIN.includes(session.user.role || '')
  if (!esDueno && !esAdmin) {
    return NextResponse.json({ error: 'No puedes eliminar esta asistencia' }, { status: 403 })
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
