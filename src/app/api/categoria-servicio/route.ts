// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/categoria-servicio/
// 🔧 Descripción: Maneja GET y POST para categorías de servicio
//
// 🧠 Uso: Listar y crear nuevas categorías
// 📅 Última actualización: 2025-04-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const categorias = await prisma.categoriaServicio.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        servicios: true, // anidamos relación con servicios
      },
    })
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('❌ Error al listar categorías:', error)
    return NextResponse.json({ error: 'Error al listar' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const nueva = await prisma.categoriaServicio.create({
      data,
    })
    return NextResponse.json(nueva)
  } catch (error) {
    console.error('❌ Error al crear categoría:', error)
    return NextResponse.json({ error: 'Error al crear' }, { status: 500 })
  }
}
