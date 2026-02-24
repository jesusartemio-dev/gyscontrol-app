import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    const where: any = {}
    if (proyectoId) where.proyectoId = proyectoId
    if (estado) where.estado = estado

    const valorizaciones = await prisma.valorizacion.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true, totalCliente: true, clienteId: true, adelantoPorcentaje: true, adelantoMonto: true, adelantoAmortizado: true } },
        adjuntos: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    return NextResponse.json(valorizaciones)
  } catch (error) {
    console.error('Error al listar valorizaciones:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
