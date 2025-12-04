// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/servicios/[id]/items
// 🔧 Descripción: API para gestionar items de plantillas de servicios independientes
// ✅ POST: Agregar item a plantilla de servicios
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
    const { catalogoServicioId, cantidad, precioInterno, precioCliente, recursoId, unidadServicioId } = data

    if (!catalogoServicioId || !cantidad || cantidad <= 0) {
      return NextResponse.json(
        { error: 'Datos inválidos: catalogoServicioId y cantidad requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la plantilla existe
    const plantilla = await prisma.plantillaServicioIndependiente.findUnique({
      where: { id }
    })

    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    // Obtener datos del catálogo
    const catalogoServicio = await prisma.catalogoServicio.findUnique({
      where: { id: catalogoServicioId },
      include: { categoria: true, recurso: true, unidadServicio: true }
    })

    if (!catalogoServicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado en catálogo' },
        { status: 404 }
      )
    }

    // Calcular horas totales basado en la fórmula escalonada (única fórmula ahora)
    const horasBase = (catalogoServicio.horaBase || 0) + Math.max(0, cantidad - 1) * (catalogoServicio.horaRepetido || 0);
    const factorDificultad = catalogoServicio.nivelDificultad || 1;
    const horaTotal = horasBase * factorDificultad;

    // Calcular costos
    const costoHora = catalogoServicio.recurso.costoHora
    const costoInterno = horaTotal * costoHora
    const costoCliente = precioCliente * cantidad

    // Calcular factor de seguridad y margen (valores por defecto)
    const factorSeguridad = 1.0 // Sin factor de seguridad adicional por defecto
    const margen = precioCliente > 0 ? (precioCliente - precioInterno) / precioInterno : 0

    // Crear el item
    const nuevoItem = await prisma.plantillaServicioItemIndependiente.create({
      data: {
        plantillaServicioId: id,
        catalogoServicioId,
        nombre: catalogoServicio.nombre,
        descripcion: catalogoServicio.descripcion,
        categoria: catalogoServicio.categoria.nombre,
        unidadServicioNombre: catalogoServicio.unidadServicio.nombre,
        recursoNombre: catalogoServicio.recurso.nombre,
        formula: 'Escalonada', // Solo fórmula escalonada ahora
        horaBase: catalogoServicio.horaBase,
        horaRepetido: catalogoServicio.horaRepetido,
        horaUnidad: null, // Ya no se usa
        horaFijo: null, // Ya no se usa
        costoHora,
        cantidad,
        horaTotal,
        factorSeguridad,
        margen,
        costoInterno,
        costoCliente,
        unidadServicioId,
        recursoId,
        orden: catalogoServicio.orden || 0,
      }
    })

    // Recalcular totales de la plantilla
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

    return NextResponse.json(nuevoItem, { status: 201 })
  } catch (error) {
    console.error('❌ Error al agregar item a plantilla de servicios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}