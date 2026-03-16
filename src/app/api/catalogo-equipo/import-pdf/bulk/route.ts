import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

type BulkItem = {
  codigo: string
  descripcion: string
  marca: string
  precioLista: number
  factorCosto: number
  factorVenta: number
  precioInterno: number
  precioVenta: number
  categoriaId: string
  unidadId: string
  estado: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { items } = (await request.json()) as { items: BulkItem[] }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de ítems' }, { status: 400 })
    }

    // Validate required fields
    for (const item of items) {
      if (!item.codigo || !item.descripcion || !item.categoriaId || !item.unidadId) {
        return NextResponse.json(
          { error: `Faltan campos obligatorios en el ítem: ${item.codigo || '(sin código)'}` },
          { status: 400 }
        )
      }
    }

    // Check for duplicate codes within the batch
    const codes = items.map(i => i.codigo.toLowerCase().trim())
    const duplicatesInBatch = codes.filter((c, i) => codes.indexOf(c) !== i)
    if (duplicatesInBatch.length > 0) {
      return NextResponse.json(
        { error: `Códigos duplicados en el lote: ${[...new Set(duplicatesInBatch)].join(', ')}` },
        { status: 400 }
      )
    }

    // Check for existing codes in DB
    const existingCodes = await prisma.catalogoEquipo.findMany({
      where: { codigo: { in: items.map(i => i.codigo) } },
      select: { codigo: true },
    })
    if (existingCodes.length > 0) {
      return NextResponse.json(
        { error: `Ya existen equipos con estos códigos: ${existingCodes.map(e => e.codigo).join(', ')}` },
        { status: 409 }
      )
    }

    // Create all items in a transaction
    const created = await prisma.$transaction(
      items.map(item =>
        prisma.catalogoEquipo.create({
          data: {
            id: createId(),
            codigo: item.codigo.trim(),
            descripcion: item.descripcion.trim(),
            marca: item.marca?.trim() || '',
            precioLista: item.precioLista || 0,
            factorCosto: item.factorCosto || 1.0,
            factorVenta: item.factorVenta || 1.15,
            precioInterno: item.precioInterno || 0,
            precioVenta: item.precioVenta || 0,
            categoriaId: item.categoriaId,
            unidadId: item.unidadId,
            estado: item.estado || 'pendiente',
            createdById: userId,
            updatedById: userId,
            updatedAt: new Date(),
          },
          include: {
            categoriaEquipo: true,
            unidad: true,
          },
        })
      )
    )

    return NextResponse.json({ ok: true, created: created.length, items: created }, { status: 201 })
  } catch (error) {
    console.error('Error en bulk import de catálogo:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: `Error creando equipos: ${msg}` }, { status: 500 })
  }
}
