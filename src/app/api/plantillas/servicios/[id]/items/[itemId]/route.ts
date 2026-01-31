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
    const { cantidad, factorSeguridad } = data

    // Validar que al menos uno de los campos a actualizar esté presente
    if ((cantidad !== undefined && cantidad <= 0) || (factorSeguridad !== undefined && factorSeguridad < 1)) {
      return NextResponse.json(
        { error: cantidad !== undefined && cantidad <= 0 ? 'Cantidad inválida' : 'Factor de seguridad debe ser >= 1' },
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

    // Obtener el nivel de dificultad del catálogo de servicios
    const catalogoServicio = await prisma.catalogoServicio.findUnique({
      where: { id: item.catalogoServicioId || '' },
      select: { nivelDificultad: true }
    });

    // Calcular horas totales - solo si se está actualizando cantidad
    let horaTotal = item.horaTotal; // Mantener el valor actual por defecto

    if (cantidad !== undefined) {
      // Calcular nuevas horas totales basado en la fórmula escalonada simplificada
      const horasBase = (item.horaBase || 0) + Math.max(0, cantidad - 1) * (item.horaRepetido || 0);
      const factorDificultad = catalogoServicio?.nivelDificultad || 1;
      horaTotal = horasBase * factorDificultad;
    }

    // Recalcular costos - Nueva fórmula (2025-01)
    // costoCliente es el cálculo directo, costoInterno se deriva del margen
    const margenMultiplier = item.margen > 2 ? item.margen : (1 + item.margen) // Handle both formats
    const costoCliente = +(horaTotal * item.costoHora * (item.factorSeguridad || 1)).toFixed(2)
    const costoInterno = +(costoCliente / margenMultiplier).toFixed(2)

    // Preparar datos de actualización
    const updateData: any = {
      horaTotal,
      costoInterno,
      costoCliente
    }

    if (cantidad !== undefined) {
      updateData.cantidad = cantidad
    }

    if (factorSeguridad !== undefined) {
      updateData.factorSeguridad = factorSeguridad
      // Recalcular costos con el nuevo factor de seguridad - Nueva fórmula
      updateData.costoCliente = +(horaTotal * item.costoHora * factorSeguridad).toFixed(2)
      updateData.costoInterno = +(updateData.costoCliente / margenMultiplier).toFixed(2)
    }

    // Actualizar el item
    const updatedItem = await prisma.plantillaServicioItemIndependiente.update({
      where: { id: itemId },
      data: {
        ...updateData,
        updatedAt: new Date()
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
          grandTotal,
          updatedAt: new Date()
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
    console.log('🗑️ DELETE request - plantillaId:', id, 'itemId:', itemId)

    // Verificar que el item existe y pertenece a la plantilla
    const item = await prisma.plantillaServicioItemIndependiente.findFirst({
      where: {
        id: itemId,
        plantillaServicioId: id
      }
    })

    console.log('🔍 Item encontrado:', item ? 'Sí' : 'No')

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado', details: `itemId: ${itemId}, plantillaId: ${id}` },
        { status: 404 }
      )
    }

    // Eliminar el item
    console.log('🗑️ Eliminando item...')
    await prisma.plantillaServicioItemIndependiente.delete({
      where: { id: itemId }
    })
    console.log('✅ Item eliminado')

    // Recalcular totales de la plantilla
    console.log('📊 Recalculando totales de la plantilla...')
    const plantilla = await prisma.plantillaServicioIndependiente.findUnique({
      where: { id }
    })

    if (plantilla) {
      const items = await prisma.plantillaServicioItemIndependiente.findMany({
        where: { plantillaServicioId: id }
      })

      console.log('📊 Items restantes:', items.length)
      const totalInterno = items.reduce((sum, item) => sum + item.costoInterno, 0)
      const totalCliente = items.reduce((sum, item) => sum + item.costoCliente, 0)
      const grandTotal = totalCliente - plantilla.descuento
      console.log('📊 Nuevos totales - Interno:', totalInterno, 'Cliente:', totalCliente, 'Grand:', grandTotal)

      await prisma.plantillaServicioIndependiente.update({
        where: { id },
        data: {
          totalInterno,
          totalCliente,
          grandTotal,
          updatedAt: new Date()
        }
      })
      console.log('✅ Totales actualizados')
    }

    console.log('✅ DELETE completado exitosamente')
    return NextResponse.json({ message: 'Item eliminado exitosamente' })
  } catch (error: any) {
    console.error('❌ Error al eliminar item de plantilla de servicios:', error)
    console.error('❌ Error stack:', error?.stack)
    console.error('❌ Error code:', error?.code)

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    const errorCode = error?.code || 'UNKNOWN'

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: errorMessage,
        code: errorCode
      },
      { status: 500 }
    )
  }
}