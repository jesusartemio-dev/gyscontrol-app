import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { DiaSemana, ModalidadTrabajo } from '@prisma/client'

const ROLES_ADMIN = ['admin', 'gerente']

export async function PUT(req: Request, { params }: { params: Promise<{ empleadoId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }
  const { empleadoId } = await params
  const body = (await req.json()) as { modalidadTrabajo: ModalidadTrabajo; diasRemoto?: DiaSemana[] }

  const empleado = await prisma.empleado.update({
    where: { id: empleadoId },
    data: {
      modalidadTrabajo: body.modalidadTrabajo,
      diasRemoto: body.modalidadTrabajo === 'hibrido' ? body.diasRemoto || [] : [],
    },
  })
  return NextResponse.json(empleado)
}
