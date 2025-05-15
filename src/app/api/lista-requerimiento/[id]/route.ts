// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-requerimiento/[id]/route.ts
// 🔧 Descripción: Manejo de GET, PUT y DELETE para una ListaRequerimiento específica
//
// 🧠 Uso: Usado para obtener, actualizar o eliminar una lista de requerimiento
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-09
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// ✅ Obtener una ListaRequerimiento por ID (incluye items)
export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await prisma.listaRequerimiento.findUnique({
      where: { id },
      include: {
        items: true,
        proyecto: { select: { id: true, nombre: true } }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener la lista' }, { status: 500 })
  }
}

// ✅ Actualizar una ListaRequerimiento
export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const payload = await request.json()
    const data = await prisma.listaRequerimiento.update({
      where: { id },
      data: payload
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar la lista' }, { status: 500 })
  }
}

// ✅ Eliminar una ListaRequerimiento
export async function DELETE(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    await prisma.listaRequerimiento.delete({ where: { id } })
    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar la lista' }, { status: 500 })
  }
}
