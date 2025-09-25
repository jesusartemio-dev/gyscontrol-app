// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/equipos/[id]/items
// 🔧 Descripción: API para gestionar items de plantillas de equipos independientes
// ✅ POST: Agregar item a plantilla de equipos
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
    const { catalogoEquipoId, cantidad, precioInterno, precioCliente } = data

    if (!catalogoEquipoId || !cantidad || cantidad <= 0) {
      return NextResponse.json(
        { error: 'Datos inválidos: catalogoEquipoId y cantidad requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la plantilla existe
    const plantilla = await prisma.plantillaEquipoIndependiente.findUnique({
      where: { id }
    })

    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    // Obtener datos del catálogo
    const catalogoEquipo = await prisma.catalogoEquipo.findUnique({
      where: { id: catalogoEquipoId },
      include: { categoria: true, unidad: true }
    })

    if (!catalogoEquipo) {
      return NextResponse.json(
        { error: 'Equipo no encontrado en catálogo' },
        { status: 404 }
      )
    }

    // Calcular costos
    const costoInterno = precioInterno * cantidad
    const costoCliente = precioCliente * cantidad

    // Crear el item
    const nuevoItem = await prisma.plantillaEquipoItemIndependiente.create({
      data: {
        plantillaEquipoId: id,
        catalogoEquipoId,
        codigo: catalogoEquipo.codigo,
        descripcion: catalogoEquipo.descripcion,
        categoria: catalogoEquipo.categoria.nombre,
        unidad: catalogoEquipo.unidad.nombre,
        marca: catalogoEquipo.marca,
        precioInterno,
        precioCliente,
        cantidad,
        costoInterno,
        costoCliente,
      }
    })

    // Recalcular totales de la plantilla
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

    return NextResponse.json(nuevoItem, { status: 201 })
  } catch (error) {
    console.error('❌ Error al agregar item a plantilla de equipos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}