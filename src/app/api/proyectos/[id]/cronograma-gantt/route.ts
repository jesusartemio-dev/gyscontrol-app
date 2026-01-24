import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error('Error fetching cronograma Gantt data:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}