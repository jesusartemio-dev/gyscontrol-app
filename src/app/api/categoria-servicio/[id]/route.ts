// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/categoria-servicio/[id]/
// 🔧 API REST para obtener, actualizar o eliminar categoría de servicio
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 🔍 GET
export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id

  try {
    const data = await prisma.categoriaServicio.findUnique({
      where: { id },
      include: { servicios: true },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /categoria-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al obtener categoría' }, { status: 500 })
  }
}

// ✏️ PUT
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id

  try {
    const body = await req.json()
    const data = await prisma.categoriaServicio.update({
      where: { id },
      data: { nombre: body.nombre },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en PUT /categoria-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 })
  }
}

// 🗑️ DELETE
// ✅ Forma correcta
export async function DELETE(request: Request, context: { params: { id: string } }) {
  const { id } = context.params
  try {
    const existente = await prisma.categoriaServicio.findUnique({ where: { id } })
    if (!existente) {
      console.warn('⚠️ Categoría ya fue eliminada o no existe:', id)
      return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    }

    const data = await prisma.categoriaServicio.delete({ where: { id } })
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Error en DELETE /categoria-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 })
  }
}
