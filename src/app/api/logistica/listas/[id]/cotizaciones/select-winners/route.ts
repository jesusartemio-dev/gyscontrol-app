import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { selections } = await request.json()

    if (!selections || typeof selections !== 'object') {
      return NextResponse.json(
        { error: 'Se requieren selecciones válidas' },
        { status: 400 }
      )
    }

    // Validate that all selected quotations exist and belong to this list
    const quotationIds = Object.values(selections) as string[]
    const validQuotations = await prisma.cotizacionProveedorItem.findMany({
      where: {
        id: { in: quotationIds },
        listaEquipoItem: {
          listaId: id
        }
      }
    })

    if (validQuotations.length !== quotationIds.length) {
      return NextResponse.json(
        { error: 'Una o más cotizaciones seleccionadas no son válidas' },
        { status: 400 }
      )
    }

    // Start a transaction to update selections
    await prisma.$transaction(async (tx) => {
      // First, clear all previous selections for this list
      await tx.cotizacionProveedorItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id
          }
        },
        data: {
          esSeleccionada: false
        }
      })

      // Then, set the new selections
      for (const [itemId, quotationId] of Object.entries(selections)) {
        await tx.cotizacionProveedorItem.update({
          where: { id: quotationId as string },
          data: {
            esSeleccionada: true,
            listaEquipoItem: {
              update: {
                precioElegido: undefined, // Will be set from the quotation
                tiempoEntrega: undefined,
                tiempoEntregaDias: undefined,
                costoElegido: undefined
              }
            }
          }
        })

        // Update the list item with winner details
        const winnerQuotation = validQuotations.find(q => q.id === quotationId)
        if (winnerQuotation) {
          await tx.listaEquipoItem.update({
            where: { id: itemId },
            data: {
              cotizacionSeleccionadaId: quotationId as string,
              precioElegido: winnerQuotation.precioUnitario,
              tiempoEntrega: winnerQuotation.tiempoEntrega,
              tiempoEntregaDias: winnerQuotation.tiempoEntregaDias,
              costoElegido: winnerQuotation.costoTotal
            }
          })
        }
      }
    })

    // Log the selection operation
    console.log(`Winner selection completed for list ${id}: ${quotationIds.length} winners selected`)

    return NextResponse.json({
      success: true,
      selectedCount: quotationIds.length,
      message: 'Ganadores seleccionados exitosamente'
    })

  } catch (error) {
    console.error('Error selecting winners:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}