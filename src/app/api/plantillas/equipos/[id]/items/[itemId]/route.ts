// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/equipos/[id]/items/[itemId]
// 🔧 Descripción: API para gestionar item específico de plantilla de equipos
// ✅ PUT: Actualizar cantidad de item
// ✅ DELETE: Eliminar item de plantilla de equipos
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const data = await req.json()
    const { cantidad } = data

    if (!cantidad || typeof cantidad !== 'number' || cantidad < 1) {
      return NextResponse.json(
        { error: 'Cantidad debe ser un número mayor a 0' },
        { status: 400 }
      )
    }

    // Verificar que el item existe y pertenece a la plantilla
    const item = await prisma.plantillaEquipoItemIndependiente.findFirst({
      where: {
        id: itemId,
        plantillaEquipoId: id
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar la cantidad y recalcular costos
    const precioInterno = item.precioInterno
    const precioCliente = item.precioCliente

    const updatedItem = await prisma.plantillaEquipoItemIndependiente.update({
      where: { id: itemId },
      data: {
        cantidad,
        costoInterno: cantidad * precioInterno,
        costoCliente: cantidad * precioCliente,
        updatedAt: new Date()
      }
    })

    // Recalcular totales de la plantilla
    const plantilla = await prisma.plantillaEquipoIndependiente.findUnique({
      where: { id }
    })

    if (plantilla) {
      const items = await prisma.plantillaEquipoItemIndependiente.findMany({
        where: { plantillaEquipoId: id }
      })

      const totalInterno = items.reduce((sum, item) => sum + item.costoInterno, 0)
      const totalCliente = items.reduce((sum, item) => sum + item.costoCliente, 0)
      const grandTotal = totalCliente - plantilla.descuento

      await prisma.plantillaEquipoIndependiente.update({
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
    console.error('❌ Error al actualizar item de plantilla de equipos:', error)
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
    const item = await prisma.plantillaEquipoItemIndependiente.findFirst({
      where: {
        id: itemId,
        plantillaEquipoId: id
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el item
    await prisma.plantillaEquipoItemIndependiente.delete({
      where: { id: itemId }
    })

    // Recalcular totales de la plantilla
    const plantilla = await prisma.plantillaEquipoIndependiente.findUnique({
      where: { id }
    })

    if (plantilla) {
      const items = await prisma.plantillaEquipoItemIndependiente.findMany({
        where: { plantillaEquipoId: id }
      })

      const totalInterno = items.reduce((sum, item) => sum + item.costoInterno, 0)
      const totalCliente = items.reduce((sum, item) => sum + item.costoCliente, 0)
      const grandTotal = totalCliente - plantilla.descuento

      await prisma.plantillaEquipoIndependiente.update({
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
    console.error('❌ Error al eliminar item de plantilla de equipos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}