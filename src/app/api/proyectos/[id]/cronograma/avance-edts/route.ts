import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/proyectos/[id]/cronograma/avance-edts
// Retorna los ProyectoEdt del cronograma de ejecución con su porcentajeAvance
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

    // Buscar cronograma de ejecución del proyecto
    const cronograma = await prisma.proyectoCronograma.findFirst({
      where: {
        proyectoId,
        tipo: 'ejecucion',
      },
      select: { id: true },
    })

    if (!cronograma) {
      return NextResponse.json({
        tieneEjecucion: false,
        edts: [],
      })
    }

    // Obtener todos los EDTs del cronograma de ejecución
    const edts = await prisma.proyectoEdt.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: {
        id: true,
        edtId: true,
        nombre: true,
        porcentajeAvance: true,
      },
      orderBy: { orden: 'asc' },
    })

    return NextResponse.json({
      tieneEjecucion: true,
      edts,
    })
  } catch (error) {
    console.error('Error al obtener avance de EDTs:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
