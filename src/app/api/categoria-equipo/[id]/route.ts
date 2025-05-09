import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    await prisma.categoriaEquipo.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Categoría eliminada' })
  } catch (error) {
    console.error('❌ Error al eliminar categoría de equipo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
