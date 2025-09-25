// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/gastos/[id]/items
// 🔧 Descripción: API para gestionar items de plantillas de gastos independientes
// ✅ POST: Agregar item a plantilla de gastos
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await req.json()
    const { nombre, descripcion, cantidad, precioUnitario } = data

    if (!nombre || !cantidad || cantidad <= 0) {
      return NextResponse.json(
        { error: 'Datos inválidos: nombre y cantidad requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la plantilla existe
    const plantilla = await prisma.plantillaGastoIndependiente.findUnique({
      where: { id }
    })

    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    // Calcular costos
    const factorSeguridad = 1.1 // 10% de seguridad
    const margen = 1.2 // 20% de margen
    const costoInterno = cantidad * precioUnitario
    const costoCliente = costoInterno * factorSeguridad * margen

    // Crear el item
    const nuevoItem = await prisma.plantillaGastoItemIndependiente.create({
      data: {
        plantillaGastoId: id,
        nombre,
        descripcion: descripcion || '',
        cantidad,
        precioUnitario,
        factorSeguridad,
        margen,
        costoInterno,
        costoCliente,
      }
    })

    // Recalcular totales de la plantilla
    const items = await prisma.plantillaGastoItemIndependiente.findMany({
      where: { plantillaGastoId: id }
    })

    const totalInterno = items.reduce((sum, item) => sum + item.costoInterno, 0)
    const totalCliente = items.reduce((sum, item) => sum + item.costoCliente, 0)
    const grandTotal = totalCliente - plantilla.descuento

    await prisma.plantillaGastoIndependiente.update({
      where: { id },
      data: {
        totalInterno,
        totalCliente,
        grandTotal
      }
    })

    return NextResponse.json(nuevoItem, { status: 201 })
  } catch (error) {
    console.error('❌ Error al agregar item a plantilla de gastos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}