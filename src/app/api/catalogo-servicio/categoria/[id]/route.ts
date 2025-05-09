// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/catalogo-servicio/categoria/[id]/route.ts
// 🔧 Descripción: Lista servicios por ID de categoría
// 🧠 Uso: GET /api/catalogo-servicio/categoria/:id
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-22
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params

  try {
    const servicios = await prisma.catalogoServicio.findMany({
      where: { categoriaId: id },
      orderBy: { nombre: 'asc' },
      include: {
        categoria: true,
        unidadServicio: true,
        recurso: true
      }
    })

    return NextResponse.json(servicios)
  } catch (error) {
    console.error(`❌ Error en GET /catalogo-servicio/categoria/${id}:`, error)
    return NextResponse.json(
      { error: 'Error al listar servicios por categoría' },
      { status: 500 }
    )
  }
}
