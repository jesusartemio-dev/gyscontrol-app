import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// src/app/api/catalogo-gasto/[id]/route.ts

// GET - Obtener gasto por ID
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const gasto = await prisma.catalogoGasto.findUnique({
      where: { id },
      include: {
        categoria: true,
      },
    })

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error al obtener gasto:', error)
    return NextResponse.json({ error: 'Error interno al obtener gasto' }, { status: 500 })
  }
}

// PUT - Actualizar gasto
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const data = await req.json()

    const allowedFields = [
      'codigo', 'descripcion', 'categoriaId', 'cantidad',
      'precioInterno', 'margen', 'precioVenta', 'estado'
    ]

    const payload: Record<string, any> = {}

    for (const field of allowedFields) {
      if (field in data) {
        payload[field] = data[field]
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron campos válidos para actualizar' }, { status: 400 })
    }

    // Si se actualiza el código, verificar que no exista otro con ese código
    if (payload.codigo) {
      const existente = await prisma.catalogoGasto.findFirst({
        where: {
          codigo: payload.codigo,
          NOT: { id }
        }
      })
      if (existente) {
        return NextResponse.json({ error: 'Ya existe otro gasto con ese código' }, { status: 400 })
      }
    }

    const actualizado = await prisma.catalogoGasto.update({
      where: { id },
      data: payload,
      include: {
        categoria: true,
      },
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('Error al actualizar gasto:', error)
    return NextResponse.json({ error: 'Error interno al actualizar gasto' }, { status: 500 })
  }
}

// DELETE - Eliminar gasto
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const eliminado = await prisma.catalogoGasto.delete({
      where: { id },
    })

    return NextResponse.json(eliminado)
  } catch (error) {
    console.error('Error al eliminar gasto:', error)
    return NextResponse.json({ error: 'Error interno al eliminar gasto' }, { status: 500 })
  }
}
