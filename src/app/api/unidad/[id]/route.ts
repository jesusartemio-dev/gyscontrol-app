// ===================================================
// 📁 Archivo: src/app/api/unidad/[id]/route.ts
// 📌 Métodos: DELETE y PUT para Unidad
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// ✅ Eliminar unidad
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const count = await prisma.catalogoEquipo.count({ where: { unidadId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: ${count} equipo(s) del catálogo usan esta unidad` },
        { status: 409 }
      )
    }

    await prisma.unidad.delete({ where: { id } })

    return NextResponse.json({ message: 'Unidad eliminada' })
  } catch (error) {
    console.error('❌ Error al eliminar unidad:', error)
    return NextResponse.json({ error: 'Error al eliminar unidad' }, { status: 500 })
  }
}

// ✅ Editar unidad
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { nombre } = await req.json()

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
    }

    const actualizada = await prisma.unidad.update({
      where: { id },
      data: { nombre, updatedAt: new Date() },
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error('❌ Error al actualizar unidad:', error)
    return NextResponse.json({ error: 'Error al actualizar unidad' }, { status: 500 })
  }
}
