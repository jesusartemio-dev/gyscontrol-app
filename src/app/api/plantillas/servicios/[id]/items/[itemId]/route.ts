// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/servicios/[id]/items/[itemId]
// 🔧 Descripción: API para gestionar item específico de plantilla de servicios
// ✅ PATCH: Actualizar item de plantilla de servicios
// ✅ DELETE: Eliminar item de plantilla de servicios
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const data = await req.json()
    const { cantidad } = data

    if (!cantidad || cantidad <= 0) {
      return NextResponse.json(
        { error: 'Cantidad inválida' },
        { status: 400 }
      )
    }

    // Verificar que el item existe y pertenece a la plantilla
    const item = await prisma.plantillaServicioItemIndependiente.findFirst({
      where: {
        id: itemId,
        plantillaServicioId: id
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Calcular nuevas horas totales basado en la fórmula
    const { calcularHoras } = await import('@/lib/utils/formulas')
    const horaTotal = calcularHoras({
      formula: item.formula as 'Fijo' | 'Proporcional' | 'Escalonada',
      cantidad,
      horaBase: item.horaBase || undefined,
      horaRepetido: item.horaRepetido || undefined,
      horaUnidad: item.horaUnidad || undefined,
      horaFijo: item.horaFijo || undefined
    })

    // Recalcular costos
    const costoInterno = +(horaTotal * item.costoHora * item.factorSeguridad).toFixed(2)
    const costoCliente = +(costoInterno * (1 + item.margen)).toFixed(2)

    // Actualizar el item
    const updatedItem = await prisma.plantillaServicioItemIndependiente.update({
      where: { id: itemId },
      data: {
        cantidad,
        horaTotal,
        costoInterno,
        costoCliente
      }
    })

    // Recalcular totales de la plantilla
    const plantilla = await prisma.plantillaServicioIndependiente.findUnique({
      where: { id }
    })

    if (plantilla) {
      const items = await prisma.plantillaServicioItemIndependiente.findMany({
        where: { plantillaServicioId: id }
      })

      const totalInterno = items.reduce((sum, item) => sum + item.costoInterno, 0)
      const totalCliente = items.reduce((sum, item) => sum + item.costoCliente, 0)
      const grandTotal = totalCliente - plantilla.descuento

      await prisma.plantillaServicioIndependiente.update({
        where: { id },
        data: {
          totalInterno,
          totalCliente,
          grandTotal
        }
      })
    }

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('❌ Error al actualizar item de plantilla de servicios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params

    // Verificar que el item existe y pertenece a la plantilla
    const item = await prisma.plantillaServicioItemIndependiente.findFirst({
      where: {
        id: itemId,
        plantillaServicioId: id
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el item
    await prisma.plantillaServicioItemIndependiente.delete({
      where: { id: itemId }
    })

    // Recalcular totales de la plantilla
    const plantilla = await prisma.plantillaServicioIndependiente.findUnique({
      where: { id }
    })

    if (plantilla) {
      const items = await prisma.plantillaServicioItemIndependiente.findMany({
        where: { plantillaServicioId: id }
      })

      const totalInterno = items.reduce((sum, item) => sum + item.costoInterno, 0)
      const totalCliente = items.reduce((sum, item) => sum + item.costoCliente, 0)
      const grandTotal = totalCliente - plantilla.descuento

      await prisma.plantillaServicioIndependiente.update({
        where: { id },
        data: {
          totalInterno,
          totalCliente,
          grandTotal
        }
      })
    }

    return NextResponse.json({ message: 'Item eliminado exitosamente' })
  } catch (error) {
    console.error('❌ Error al eliminar item de plantilla de servicios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}