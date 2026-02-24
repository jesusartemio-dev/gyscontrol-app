import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/proyectos/[id]/items-cotizados
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, cotizacionId: true },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    if (!proyecto.cotizacionId) {
      return NextResponse.json({
        tieneCotizacion: false,
        equipos: [],
        servicios: [],
        gastos: [],
      })
    }

    const [equipos, servicios, gastos] = await Promise.all([
      prisma.proyectoEquipoCotizado.findMany({
        where: { proyectoId },
        select: { id: true, nombre: true, subtotalCliente: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.proyectoServicioCotizado.findMany({
        where: { proyectoId },
        select: { id: true, nombre: true, subtotalCliente: true, edtId: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.proyectoGastoCotizado.findMany({
        where: { proyectoId },
        select: { id: true, nombre: true, subtotalCliente: true },
        orderBy: { nombre: 'asc' },
      }),
    ])

    return NextResponse.json({
      tieneCotizacion: true,
      equipos,
      servicios,
      gastos,
    })
  } catch (error) {
    console.error('Error al obtener items cotizados:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
