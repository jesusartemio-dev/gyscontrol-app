import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const ROLES_ADMIN = ['admin', 'gestor', 'coordinador']

// PATCH /api/asistencia/jornada/[id]/transferir
// Transfiere la asistencia de campo (JornadaAsistencia: QR + marcaje) a otra
// persona, p. ej. cuando quien la abrió debe retirarse. Opcionalmente transfiere
// también la jornada de trabajo asociada (RegistroHorasCampo).
// Lo puede hacer el dueño actual de la asistencia o un rol admin/gestor/coordinador.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const nuevoId = String(body.supervisorId || '')
  const transferirJornada = body.transferirJornada !== false // por defecto true
  if (!nuevoId) {
    return NextResponse.json({ error: 'Debe indicar a quién transferir' }, { status: 400 })
  }

  const jornada = await prisma.jornadaAsistencia.findUnique({
    where: { id },
    select: { id: true, supervisorId: true, ubicacionId: true, fecha: true, registroHorasCampoId: true },
  })
  if (!jornada) {
    return NextResponse.json({ error: 'Asistencia no encontrada' }, { status: 404 })
  }

  const esDueno = jornada.supervisorId === session.user.id
  const esAdmin = ROLES_ADMIN.includes(session.user.role || '')
  if (!esDueno && !esAdmin) {
    return NextResponse.json({ error: 'No puedes transferir esta asistencia' }, { status: 403 })
  }
  if (jornada.supervisorId === nuevoId) {
    return NextResponse.json({ error: 'La asistencia ya pertenece a esa persona' }, { status: 400 })
  }

  const nuevo = await prisma.user.findUnique({
    where: { id: nuevoId },
    select: { id: true, name: true, email: true },
  })
  if (!nuevo) {
    return NextResponse.json({ error: 'La persona destino no existe' }, { status: 404 })
  }

  // El destino no puede tener ya una asistencia abierta en la misma ubicación/día
  // (constraint único supervisorId+ubicacionId+fecha).
  const conflicto = await prisma.jornadaAsistencia.findUnique({
    where: {
      supervisorId_ubicacionId_fecha: {
        supervisorId: nuevoId,
        ubicacionId: jornada.ubicacionId,
        fecha: jornada.fecha,
      },
    },
    select: { id: true },
  })
  if (conflicto && conflicto.id !== id) {
    return NextResponse.json(
      { error: 'Esa persona ya tiene una asistencia abierta en esta ubicación hoy' },
      { status: 409 },
    )
  }

  let jornadaTransferida = false
  await prisma.$transaction(async (tx) => {
    await tx.jornadaAsistencia.update({ where: { id }, data: { supervisorId: nuevoId } })

    if (transferirJornada && jornada.registroHorasCampoId) {
      const rhc = await tx.registroHorasCampo.findUnique({
        where: { id: jornada.registroHorasCampoId },
        select: { estado: true },
      })
      if (rhc && rhc.estado !== 'aprobado') {
        await tx.registroHorasCampo.update({
          where: { id: jornada.registroHorasCampoId },
          data: { supervisorId: nuevoId },
        })
        jornadaTransferida = true
      }
    }

    await tx.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entidadTipo: 'JORNADA_ASISTENCIA',
        entidadId: id,
        accion: 'asistencia.transferida',
        usuarioId: session.user.id,
        descripcion: `Asistencia transferida a ${nuevo.name || nuevo.email}${jornadaTransferida ? ' (incluida la jornada de trabajo)' : ''}`,
        cambios: JSON.stringify({ de: jornada.supervisorId, a: nuevoId, transferirJornada }),
      },
    })
  })

  return NextResponse.json({ ok: true, responsable: nuevo, jornadaTransferida })
}
