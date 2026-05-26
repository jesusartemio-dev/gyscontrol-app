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

type UpdateItem = {
  id: string
  modo: 'prices' | 'all'
  precioLista: number
  descripcion?: string
  marca?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = (await request.json()) as { items?: BulkItem[]; updates?: UpdateItem[] }
    const items = body.items ?? []
    const updates = body.updates ?? []

    if (items.length === 0 && updates.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un ítem o actualización' }, { status: 400 })
    }

    // Validate new items
    for (const item of items) {
      if (!item.codigo || !item.descripcion || !item.categoriaId || !item.unidadId) {
        return NextResponse.json(
          { error: `Faltan campos obligatorios en el ítem: ${item.codigo || '(sin código)'}` },
          { status: 400 }
        )
      }
    }

    if (items.length > 0) {
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
    }

    // Fetch existing items to preserve their factors when updating prices
    const existingMap = new Map<string, { factorCosto: number; factorVenta: number }>()
    if (updates.length > 0) {
      const existingForUpdate = await prisma.catalogoEquipo.findMany({
        where: { id: { in: updates.map(u => u.id) } },
        select: { id: true, factorCosto: true, factorVenta: true },
      })
      for (const e of existingForUpdate) existingMap.set(e.id, e)
    }

    const [created, updated] = await prisma.$transaction(async (tx) => {
      const newItems = await Promise.all(
        items.map(item =>
          tx.catalogoEquipo.create({
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
          })
        )
      )

      const updatedItems = await Promise.all(
        updates.map(upd => {
          const existing = existingMap.get(upd.id)
          const factorCosto = existing?.factorCosto ?? 1.0
          const factorVenta = existing?.factorVenta ?? 1.15
          const precioInterno = upd.precioLista * factorCosto
          const precioVenta = precioInterno * factorVenta

          const data: Record<string, unknown> = {
            precioLista: upd.precioLista,
            precioInterno,
            precioVenta,
            updatedById: userId,
            updatedAt: new Date(),
          }
          if (upd.modo === 'all') {
            if (upd.descripcion !== undefined) data.descripcion = upd.descripcion.trim()
            if (upd.marca !== undefined) data.marca = upd.marca.trim()
          }

          return tx.catalogoEquipo.update({ where: { id: upd.id }, data })
        })
      )

      return [newItems, updatedItems]
    })

    return NextResponse.json({ ok: true, created: created.length, updated: updated.length }, { status: 201 })
  } catch (error) {
    console.error('Error en bulk import de catálogo:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: `Error procesando equipos: ${msg}` }, { status: 500 })
  }
}
