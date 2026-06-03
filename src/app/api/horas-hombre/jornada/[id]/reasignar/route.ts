import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Roles que pueden reasignar (transferir) una jornada a otro responsable.
const ROLES_REASIGNAR = ['admin', 'gestor', 'coordinador']

// PATCH /api/horas-hombre/jornada/[id]/reasignar — transfiere el supervisorId
// (dueño/responsable) de la jornada a otra persona. El creador original se
// preserva en creadoPorId. Tras reasignar, la jornada aparece en
// /mi-trabajo/mi-jornada del nuevo responsable y deja de verla el anterior.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!ROLES_REASIGNAR.includes(session.user.role || '')) {
    return NextResponse.json({ error: 'No tienes permiso para reasignar jornadas' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const nuevoSupervisorId = String(body.supervisorId || '')
  if (!nuevoSupervisorId) {
    return NextResponse.json({ error: 'Debe indicar el responsable destino' }, { status: 400 })
  }

  const jornada = await prisma.registroHorasCampo.findUnique({
    where: { id },
    select: { id: true, estado: true, supervisorId: true },
  })
  if (!jornada) {
    return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 })
  }
  if (jornada.estado === 'aprobado') {
    return NextResponse.json({ error: 'No se puede reasignar una jornada ya aprobada' }, { status: 400 })
  }
  if (jornada.supervisorId === nuevoSupervisorId) {
    return NextResponse.json({ error: 'La jornada ya pertenece a esa persona' }, { status: 400 })
  }

  const nuevo = await prisma.user.findUnique({
    where: { id: nuevoSupervisorId },
    select: { id: true, name: true, email: true },
  })
  if (!nuevo) {
    return NextResponse.json({ error: 'El responsable destino no existe' }, { status: 404 })
  }

  const actualizada = await prisma.registroHorasCampo.update({
    where: { id },
    data: { supervisorId: nuevoSupervisorId },
    select: { id: true, supervisorId: true },
  })

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      entidadTipo: 'REGISTRO_HORAS_CAMPO',
      entidadId: id,
      accion: 'jornada.reasignada',
      usuarioId: session.user.id,
      descripcion: `Jornada reasignada a ${nuevo.name || nuevo.email}`,
      cambios: JSON.stringify({ de: jornada.supervisorId, a: nuevoSupervisorId }),
    },
  })

  return NextResponse.json({ ok: true, jornada: actualizada, responsable: nuevo })
}
