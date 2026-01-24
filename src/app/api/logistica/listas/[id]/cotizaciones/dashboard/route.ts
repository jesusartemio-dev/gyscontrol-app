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
        listaEquipoItem: {
          include: {
            cotizacionProveedorItems: {
              include: {
                cotizacionProveedor: true
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
      totalItems: lista.listaEquipoItem.length,
      withQuotations: lista.listaEquipoItem.filter(item => item.cotizacionProveedorItems.length > 0).length,
      receivedQuotations: lista.listaEquipoItem.reduce((sum, item) =>
        sum + item.cotizacionProveedorItems.filter(cot => cot.estado === 'cotizado').length, 0
      ),
      selectedCount: lista.listaEquipoItem.filter(item => item.cotizacionSeleccionadaId).length,
      completionPercentage: lista.listaEquipoItem.length > 0
        ? (lista.listaEquipoItem.filter(item => item.cotizacionSeleccionadaId).length / lista.listaEquipoItem.length) * 100
        : 0
    }

    return NextResponse.json({
      lista,
      stats,
      items: lista.listaEquipoItem
    })

  } catch (error) {
    console.error('Error fetching quotation dashboard:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}