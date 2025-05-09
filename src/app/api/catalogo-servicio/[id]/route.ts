// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/catalogo-servicio/[id]/
// 🔧 Descripción: GET, PUT, DELETE por ID para ítems del catálogo
// 🧠 Uso: Visualizar, editar o eliminar un servicio por ID
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.catalogoServicio.findUnique({
      where: { id: params.id },
      include: {
        categoria: true,
        unidadServicio: true,
        recurso: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /catalogo-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al obtener servicio' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const data = await prisma.catalogoServicio.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en PUT /catalogo-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.catalogoServicio.delete({
      where: { id: params.id },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en DELETE /catalogo-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 })
  }
}
