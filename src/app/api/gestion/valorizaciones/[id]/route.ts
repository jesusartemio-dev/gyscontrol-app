import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const valorizacion = await prisma.valorizacion.findUnique({
      where: { id },
      include: {
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            totalCliente: true,
            clienteId: true,
            moneda: true,
            tipoCambio: true,
            cotizacionId: true,
            adelantoPorcentaje: true,
            adelantoMonto: true,
            adelantoAmortizado: true,
          },
        },
        adjuntos: true,
        partidas: { orderBy: { orden: 'asc' } },
        valorizacionHH: {
          select: {
            id: true,
            clienteId: true,
            totalHorasReportadas: true,
            totalHorasEquivalentes: true,
            subtotal: true,
            descuentoPct: true,
            descuentoMonto: true,
          },
        },
      },
    })

    if (!valorizacion) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    return NextResponse.json(valorizacion)
  } catch (error) {
    console.error('Error al obtener valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
