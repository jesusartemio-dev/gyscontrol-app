import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { resolverColorProyecto } from '@/lib/utils/planificacion'

const ESTADOS_INACTIVOS = ['cerrado', 'pausado', 'cancelado']

// GET /api/planificacion/proyectos-activos — lista proyectos no inactivos con color resuelto
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const proyectos = await prisma.proyecto.findMany({
      where: {
        estado: { notIn: ESTADOS_INACTIVOS as any[] },
        deletedAt: null,
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        colorPlanificacion: true,
        lider: { select: { id: true, name: true } },
      },
      orderBy: { codigo: 'asc' },
    })

    return NextResponse.json(
      proyectos.map((p) => ({
        ...p,
        color: resolverColorProyecto(p.id, p.colorPlanificacion),
      })),
    )
  } catch (error) {
    console.error('[GET /api/planificacion/proyectos-activos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
