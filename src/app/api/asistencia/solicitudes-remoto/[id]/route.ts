import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_APROBACION = ['admin', 'gerente', 'coordinador', 'gestor']

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_APROBACION.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  if (!['aprobado', 'rechazado'].includes(body.estado)) {
    return NextResponse.json({ message: 'Estado inválido' }, { status: 400 })
  }

  const actualizada = await prisma.solicitudTrabajoRemoto.update({
    where: { id },
    data: {
      estado: body.estado,
      aprobadorId: session.user.id,
      aprobadoEn: new Date(),
      motivoRechazo: body.estado === 'rechazado' ? body.motivoRechazo || null : null,
    },
  })
  return NextResponse.json(actualizada)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const solicitud = await prisma.solicitudTrabajoRemoto.findUnique({ where: { id } })
  if (!solicitud) return NextResponse.json({ message: 'No encontrada' }, { status: 404 })
  if (solicitud.solicitanteId !== session.user.id) {
    return NextResponse.json({ message: 'No puedes cancelar solicitudes ajenas' }, { status: 403 })
  }
  if (solicitud.estado !== 'pendiente') {
    return NextResponse.json({ message: 'Solo se pueden cancelar solicitudes pendientes' }, { status: 400 })
  }

  await prisma.solicitudTrabajoRemoto.update({
    where: { id },
    data: { estado: 'cancelado' },
  })
  return NextResponse.json({ ok: true })
}
