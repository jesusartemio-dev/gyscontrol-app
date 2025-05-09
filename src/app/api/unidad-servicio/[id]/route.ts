// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/unidad-servicio/[id]/
// 🔧 API REST para obtener, actualizar o eliminar unidad
//
// 🧠 Uso: GET → traer por ID, PUT → actualizar, DELETE → eliminar
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.unidadServicio.findUnique({
      where: { id: params.id },
      include: {
        servicios: true,
        plantillaServicioItems: true,
        cotizacionServicioItems: true
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /unidad-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al obtener unidad' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const data = await prisma.unidadServicio.update({
      where: { id: params.id },
      data: { nombre: body.nombre }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en PUT /unidad-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar unidad' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.unidadServicio.delete({
      where: { id: params.id }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en DELETE /unidad-servicio/[id]:', error)
    return NextResponse.json({ error: 'Error al eliminar unidad' }, { status: 500 })
  }
}
