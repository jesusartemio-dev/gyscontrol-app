import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const cronogramaId = searchParams.get('cronogramaId')

    if (!cronogramaId) {
      return NextResponse.json(
        { error: 'cronogramaId es requerido' },
        { status: 400 }
      )
    }

    // Get fases with EDTs and tasks for the specified cronograma
    const fases = await prisma.proyectoFase.findMany({
      where: {
        proyectoId: id,
        proyectoCronogramaId: cronogramaId
      },
      include: {
        proyectoEdt: {
          include: {
            edt: true,
            proyectoTarea: {
              orderBy: {
                fechaInicio: 'asc'
              }
            }
          },
          orderBy: {
            fechaInicioPlan: 'asc'
          }
        }
      },
      orderBy: {
        orden: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: fases
    })

  } catch (error) {
    logger.error('Error fetching cronograma Gantt data:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}