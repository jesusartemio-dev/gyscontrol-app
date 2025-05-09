// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/catalogo-servicio/
// 🔧 Descripción: Lista y crea ítems del catálogo de servicios
// 🧠 Uso: GET (listar) / POST (crear)
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-04-21
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await prisma.catalogoServicio.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        categoria: true,
        unidadServicio: true,
        recurso: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /catalogo-servicio:', error)
    return NextResponse.json({ error: 'Error al listar servicios' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = await prisma.catalogoServicio.create({ data: body })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en POST /catalogo-servicio:', error)
    return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 })
  }
}
