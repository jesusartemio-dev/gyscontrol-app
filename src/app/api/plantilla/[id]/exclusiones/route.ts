import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const exclusiones = await prisma.plantillaExclusion.findMany({
      where: { plantillaId: id },
      orderBy: { orden: 'asc' },
    })
    return NextResponse.json(exclusiones)
  } catch (error) {
    console.error('Error al obtener exclusiones de plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { catalogoExclusionId, descripcion, orden } = await req.json()

    if (!descripcion?.trim()) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
    }

    const exclusion = await prisma.plantillaExclusion.create({
      data: {
        plantillaId: id,
        catalogoExclusionId: catalogoExclusionId || null,
        descripcion: descripcion.trim(),
        orden: orden ?? 0,
      },
    })
    return NextResponse.json(exclusion, { status: 201 })
  } catch (error) {
    console.error('Error al crear exclusión de plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 })

    await prisma.plantillaExclusion.delete({ where: { id: itemId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar exclusión de plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
