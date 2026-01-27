import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get all list items with their quotations
    const listItems = await prisma.listaEquipoItem.findMany({
      where: { listaId: id },
      include: {
        cotizacionProveedorItems: {
          include: {
            cotizacionProveedor: {
              include: {
                proveedor: true
              }
            }
          }
        }
      }
    })

    const totalItems = listItems.length
    const selectedItems = listItems.filter(item =>
      item.cotizacionProveedorItems.some(cot => cot.esSeleccionada)
    ).length

    const pendingItems = totalItems - selectedItems
    const completionPercentage = totalItems > 0 ? (selectedItems / totalItems) * 100 : 0

    // Calculate savings and delivery times
    let totalSavings = 0
    let totalDeliveryTime = 0
    let deliveryTimeCount = 0
    let bestPriceItems = 0
    let fastestDeliveryItems = 0

    listItems.forEach(item => {
      const quotations = item.cotizacionProveedorItems.filter(cot =>
        cot.precioUnitario && cot.precioUnitario > 0
      )

      if (quotations.length > 0) {
        const prices = quotations.map(q => q.precioUnitario!)
        const minPrice = Math.min(...prices)
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length

        totalSavings += (avgPrice - minPrice) * item.cantidad

        // Check if best price is selected
        const selectedQuotation = quotations.find(q => q.esSeleccionada)
        if (selectedQuotation && selectedQuotation.precioUnitario === minPrice) {
          bestPriceItems++
        }
      }

      // Calculate delivery times
      const validDeliveryTimes = item.cotizacionProveedorItems.filter(cot =>
        cot.tiempoEntregaDias && cot.tiempoEntregaDias > 0
      )

      if (validDeliveryTimes.length > 0) {
        const times = validDeliveryTimes.map(q => q.tiempoEntregaDias!)
        const minTime = Math.min(...times)

        totalDeliveryTime += minTime // Use minimum delivery time for average
        deliveryTimeCount++

        // Check if fastest delivery is selected
        const selectedQuotation = validDeliveryTimes.find(q => q.esSeleccionada)
        if (selectedQuotation && selectedQuotation.tiempoEntregaDias === minTime) {
          fastestDeliveryItems++
        }
      }
    })

    const averageDeliveryTime = deliveryTimeCount > 0 ? totalDeliveryTime / deliveryTimeCount : 0

    const stats = {
      totalItems,
      selectedItems,
      pendingItems,
      completionPercentage,
      totalSavings,
      averageDeliveryTime,
      bestPriceItems,
      fastestDeliveryItems
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Error fetching selection stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}