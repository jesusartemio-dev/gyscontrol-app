import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// GET /api/planificacion/departamentos — lista departamentos activos
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const departamentos = await prisma.departamento.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        responsable: { select: { id: true, name: true } },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(departamentos)
  } catch (error) {
    console.error('[GET /api/planificacion/departamentos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
