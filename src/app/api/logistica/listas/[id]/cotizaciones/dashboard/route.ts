import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Obtener lista con items y cotizaciones
    const lista = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            cotizaciones: {
              include: {
                cotizacion: true
              }
            },
            cotizacionSeleccionada: true
          }
        },
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        }
      }
    })

    if (!lista) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
    }

    // Calcular estadísticas
    const stats = {
      totalItems: lista.items.length,
      withQuotations: lista.items.filter(item => item.cotizaciones.length > 0).length,
      receivedQuotations: lista.items.reduce((sum, item) =>
        sum + item.cotizaciones.filter(cot => cot.estado === 'cotizado').length, 0
      ),
      selectedCount: lista.items.filter(item => item.cotizacionSeleccionadaId).length,
      completionPercentage: lista.items.length > 0
        ? (lista.items.filter(item => item.cotizacionSeleccionadaId).length / lista.items.length) * 100
        : 0
    }

    return NextResponse.json({
      lista,
      stats,
      items: lista.items
    })

  } catch (error) {
    console.error('Error fetching quotation dashboard:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}