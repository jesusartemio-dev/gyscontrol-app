import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_SUPERVISION = ['admin', 'gerente', 'coordinador', 'gestor']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') || 'propias'
  const estado = url.searchParams.get('estado')

  const where: any = {}
  if (scope === 'propias') {
    where.solicitanteId = session.user.id
  } else if (scope === 'equipo') {
    if (!ROLES_SUPERVISION.includes(session.user.role)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    // Por ahora supervisor ve todas las solicitudes (no hay relación supervisor-equipo formal)
  } else {
    return NextResponse.json({ message: 'Scope inválido' }, { status: 400 })
  }
  if (estado) where.estado = estado

  const data = await prisma.solicitudTrabajoRemoto.findMany({
    where,
    orderBy: [{ estado: 'asc' }, { fechaInicio: 'desc' }],
    include: {
      solicitante: { select: { id: true, name: true, email: true } },
      aprobador: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  if (!body.fechaInicio || !body.fechaFin) {
    return NextResponse.json({ message: 'Fechas requeridas' }, { status: 400 })
  }

  const fechaInicio = new Date(body.fechaInicio)
  const fechaFin = new Date(body.fechaFin)
  if (fechaFin < fechaInicio) {
    return NextResponse.json({ message: 'Fecha fin no puede ser anterior al inicio' }, { status: 400 })
  }

  const solicitud = await prisma.solicitudTrabajoRemoto.create({
    data: {
      solicitanteId: session.user.id,
      fechaInicio,
      fechaFin,
      descripcion: body.descripcion || null,
      estado: 'pendiente',
    },
  })
  return NextResponse.json(solicitud)
}
