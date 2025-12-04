// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/catalogo-servicio/[id]/
// 🔧 Descripción: GET, PUT, DELETE por ID para ítems del catálogo
// 🧠 Uso: Visualizar, editar o eliminar un servicio por ID
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.catalogoServicio.findUnique({
      where: { id },
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data = {
      nombre: body.nombre,
      descripcion: body.descripcion,
      formula: body.formula,
      cantidad: body.cantidad,
      horaBase: body.horaBase,
      horaRepetido: body.horaRepetido,
      horaUnidad: body.horaUnidad,
      horaFijo: body.horaFijo,
      orden: body.orden,
      nivelDificultad: body.nivelDificultad,
      categoria: { connect: { id: body.categoriaId } },
      unidadServicio: { connect: { id: body.unidadServicioId } },
      recurso: { connect: { id: body.recursoId } },
    }

    const updated = await prisma.catalogoServicio.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('❌ Error en PUT /catalogo-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 })
  }
}


export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.catalogoServicio.delete({
      where: { id },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en DELETE /catalogo-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 })
  }
}
