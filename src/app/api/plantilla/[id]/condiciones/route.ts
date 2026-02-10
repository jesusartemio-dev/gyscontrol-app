import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const condiciones = await prisma.plantillaCondicion.findMany({
      where: { plantillaId: id },
      orderBy: { orden: 'asc' },
    })
    return NextResponse.json(condiciones)
  } catch (error) {
    console.error('Error al obtener condiciones de plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { catalogoCondicionId, tipo, descripcion, orden } = await req.json()

    if (!descripcion?.trim()) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
    }

    const condicion = await prisma.plantillaCondicion.create({
      data: {
        plantillaId: id,
        catalogoCondicionId: catalogoCondicionId || null,
        tipo: tipo || null,
        descripcion: descripcion.trim(),
        orden: orden ?? 0,
      },
    })
    return NextResponse.json(condicion, { status: 201 })
  } catch (error) {
    console.error('Error al crear condición de plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 })

    await prisma.plantillaCondicion.delete({ where: { id: itemId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar condición de plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
