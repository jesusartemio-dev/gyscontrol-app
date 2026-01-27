import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get all quotations for the list with item details
    const quotations = await prisma.cotizacionProveedorItem.findMany({
      where: {
        listaEquipoItem: {
          listaId: id
        }
      },
      include: {
        cotizacionProveedor: {
          include: {
            proveedor: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        listaEquipoItem: {
          select: {
            id: true,
            descripcion: true,
            codigo: true,
            cantidad: true,
            unidad: true,
            cotizacionSeleccionadaId: true // Include selected winner
          }
        }
      },
      orderBy: {
        listaEquipoItem: {
          descripcion: 'asc'
        }
      }
    })

    // Group quotations by item
    const itemGroups = quotations.reduce((acc, quotation) => {
      const itemId = quotation.listaEquipoItemId!

      if (!acc[itemId]) {
        acc[itemId] = {
          itemId,
          item: quotation.listaEquipoItem,
          quotations: [],
          selectedWinner: quotation.listaEquipoItem?.cotizacionSeleccionadaId || undefined
        }
      }

      acc[itemId].quotations.push(quotation)
      return acc
    }, {} as Record<string, any>)

    const comparisonData = Object.values(itemGroups)

    return NextResponse.json({
      comparisonData,
      totalItems: comparisonData.length
    })

  } catch (error) {
    console.error('Error fetching comparison data:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}