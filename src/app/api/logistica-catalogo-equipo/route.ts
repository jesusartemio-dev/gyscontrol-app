// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/logistica-catalogo-equipo/
// 🔧 Descripción: API para gestión del catálogo de equipos (vista logística)
// 🧠 Uso: Solo entrega campos visibles a logística, oculta margen y precioVenta
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-28
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const equipos = await prisma.catalogoEquipo.findMany({
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        marca: true,
        precioInterno: true,
        estado: true,
        categoria: { select: { id: true, nombre: true } },
        unidad: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(equipos)
  } catch (error) {
    console.error('❌ Error al obtener equipos (logística):', error)
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // 🔎 Validación mínima de campos requeridos para logística
    const requiredFields = ['codigo', 'descripcion', 'marca', 'precioInterno', 'categoriaId', 'unidadId', 'estado']
    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json({ error: `Falta el campo obligatorio: ${field}` }, { status: 400 })
      }
    }

    const nuevo = await prisma.catalogoEquipo.create({
      data: {
        codigo: data.codigo,
        descripcion: data.descripcion,
        marca: data.marca,
        precioInterno: data.precioInterno,
        margen: 0,          // Logística no define margen → fijo en 0
        precioVenta: 0,     // Logística no define precioVenta → fijo en 0
        categoriaId: data.categoriaId,
        unidadId: data.unidadId,
        estado: data.estado
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        marca: true,
        precioInterno: true,
        estado: true,
        categoria: { select: { id: true, nombre: true } },
        unidad: { select: { id: true, nombre: true } },
      }
    })

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear equipo (logística):', error)
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 })
  }
}
