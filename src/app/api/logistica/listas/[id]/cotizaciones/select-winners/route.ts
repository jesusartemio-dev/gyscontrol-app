import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { selections } = await request.json()

    if (!selections || typeof selections !== 'object') {
      return NextResponse.json(
        { error: 'Se requieren selecciones válidas' },
        { status: 400 }
      )
    }

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

    await prisma.$transaction(async (tx) => {
      // Clear all previous selections for this list
      await tx.cotizacionProveedorItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id
          }
        },
        data: {
          esSeleccionada: false,
        }
      })

      // Set the new selections
      for (const [itemId, quotationId] of Object.entries(selections)) {
        await tx.cotizacionProveedorItem.update({
          where: { id: quotationId as string },
          data: {
            esSeleccionada: true,
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
              costoElegido: winnerQuotation.costoTotal,
            }
          })
        }
      }
    })

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
