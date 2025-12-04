// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/edt/[id]/
// 🔧 API REST para obtener, actualizar o eliminar EDT
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 🔍 GET
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const edt = await prisma.edt.findUnique({
      where: { id },
      include: { servicios: true },
    })

    // 🆕 Agregar información de faseDefault manualmente
    if (edt && (edt as any).faseDefaultId) {
      const faseDefault = await prisma.faseDefault.findUnique({
        where: { id: (edt as any).faseDefaultId }
      })
      return NextResponse.json({ ...edt, faseDefault })
    }

    return NextResponse.json(edt)
  } catch (error) {
    console.error('❌ Error en GET /edt/[id]:', error)
    return NextResponse.json({ error: 'Error al obtener EDT' }, { status: 500 })
  }
}

// ✏️ PUT
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const body = await req.json()
    const data = await prisma.edt.update({
      where: { id },
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        faseDefaultId: body.faseDefaultId || null // 🆕 campo faseDefaultId
      } as any, // Cast temporal hasta regenerar tipos
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en PUT /edt/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar EDT' }, { status: 500 })
  }
}

// 🗑️ DELETE
// ✅ Forma correcta
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const existente = await prisma.edt.findUnique({ where: { id } })
    if (!existente) {
      console.warn('⚠️ EDT ya fue eliminado o no existe:', id)
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const data = await prisma.edt.delete({ where: { id } })
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Error en DELETE /edt/[id]:', error)
    return NextResponse.json({ error: 'Error al eliminar EDT' }, { status: 500 })
  }
}
