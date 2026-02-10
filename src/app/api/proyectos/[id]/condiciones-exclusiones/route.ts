import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const [condiciones, exclusiones] = await Promise.all([
      prisma.proyectoCondicion.findMany({
        where: { proyectoId: id },
        orderBy: { orden: 'asc' },
        include: { catalogoCondicion: { select: { codigo: true, descripcion: true } } }
      }),
      prisma.proyectoExclusion.findMany({
        where: { proyectoId: id },
        orderBy: { orden: 'asc' },
        include: { catalogoExclusion: { select: { codigo: true, descripcion: true } } }
      }),
    ])

    return NextResponse.json({ condiciones, exclusiones })
  } catch (error) {
    console.error('Error al obtener condiciones/exclusiones del proyecto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
