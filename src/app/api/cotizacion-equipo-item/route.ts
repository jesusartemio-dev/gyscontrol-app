// src/app/api/cotizacion-equipo-item/route.ts

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CotizacionEquipoItemPayload } from '@/types'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  parsePaginationParams,
  paginateQuery,
  PAGINATION_CONFIGS
} from '@/lib/utils/pagination'
import { EstadoCotizacion } from '@prisma/client'

const ESTADOS_COTIZACION_VALIDOS = new Set(Object.values(EstadoCotizacion))

// ✅ Buscar ítems de equipo a través de todas las cotizaciones (paginado)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const paginationParams = parsePaginationParams(searchParams, PAGINATION_CONFIGS.cotizacionEquipoItems)

    const cotizacionId = searchParams.get('cotizacionId')
    const estado = searchParams.get('estado')
    const soloCatalogo = searchParams.get('soloCatalogo') === 'true'

    if (estado && !ESTADOS_COTIZACION_VALIDOS.has(estado as EstadoCotizacion)) {
      return NextResponse.json({ error: `Estado de cotización inválido: ${estado}` }, { status: 400 })
    }

    const cotizacionEquipoWhere: any = {}
    if (cotizacionId) cotizacionEquipoWhere.cotizacionId = cotizacionId
    if (estado) cotizacionEquipoWhere.cotizacion = { estado: estado as EstadoCotizacion }

    const additionalWhere: any = {}
    if (Object.keys(cotizacionEquipoWhere).length > 0) additionalWhere.cotizacionEquipo = cotizacionEquipoWhere
    if (soloCatalogo) additionalWhere.catalogoEquipoId = { not: null }

    const queryFn = async ({ skip, take, where, orderBy }: any) => {
      return prisma.cotizacionEquipoItem.findMany({
        where,
        select: {
          id: true,
          codigo: true,
          descripcion: true,
          categoria: true,
          marca: true,
          unidad: true,
          cantidad: true,
          precioCliente: true,
          costoCliente: true,
          costoInterno: true,
          catalogoEquipoId: true,
          createdAt: true,
          cotizacionEquipo: {
            select: {
              id: true,
              nombre: true,
              cotizacion: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  estado: true,
                  cliente: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take,
      })
    }

    const countFn = async (where: any) => prisma.cotizacionEquipoItem.count({ where })

    const result = await paginateQuery(
      queryFn,
      countFn,
      paginationParams,
      [...PAGINATION_CONFIGS.cotizacionEquipoItems.searchFields],
      additionalWhere
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error al buscar ítems de equipo de cotización:', error)
    return NextResponse.json({ error: 'Error al buscar ítems de equipo de cotización' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data: CotizacionEquipoItemPayload = await req.json()
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const requiredFields: (keyof CotizacionEquipoItemPayload)[] = [
      'cotizacionEquipoId',
      'codigo',
      'descripcion',
      'categoria',
      'unidad',
      'marca',
      'precioInterno',
      'precioCliente',
      'cantidad',
      'costoInterno',
      'costoCliente'
    ]

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return NextResponse.json(
          { error: `Campo faltante o inválido: ${field}` },
          { status: 400 }
        )
      }
    }

    // ✅ Crear el ítem (pick only valid fields to avoid unknown fields from frontend)
    const nuevo = await prisma.cotizacionEquipoItem.create({
      data: {
        id: randomUUID(),
        cotizacionEquipoId: data.cotizacionEquipoId,
        catalogoEquipoId: data.catalogoEquipoId,
        codigo: data.codigo,
        descripcion: data.descripcion,
        categoria: data.categoria,
        unidad: data.unidad,
        marca: data.marca,
        precioLista: data.precioLista,
        precioInterno: data.precioInterno,
        factorCosto: data.factorCosto,
        factorVenta: data.factorVenta,
        precioCliente: data.precioCliente,
        cantidad: data.cantidad,
        costoInterno: data.costoInterno,
        costoCliente: data.costoCliente,
        precioGerencia: data.precioGerencia ?? null,
        precioGerenciaEditado: data.precioGerenciaEditado ?? false,
        orden: data.orden ?? 0,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        categoria: true,
        unidad: true,
        marca: true,
        precioLista: true,
        precioInterno: true,
        factorCosto: true,
        factorVenta: true,
        precioCliente: true,
        cantidad: true,
        costoInterno: true,
        costoCliente: true,
        precioGerencia: true,
        precioGerenciaEditado: true,
        orden: true,
        createdAt: true,
        updatedAt: true,
        cotizacionEquipoId: true,
        catalogoEquipoId: true
      }
    })

    // ✅ Obtener cotizacionId
    const equipo = await prisma.cotizacionEquipo.findUnique({
      where: { id: nuevo.cotizacionEquipoId },
      select: { cotizacionId: true }
    })

    if (equipo) {
      await recalcularTotalesCotizacion(equipo.cotizacionId)
    }

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear ítem de cotización equipo:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: errorMessage,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : null
    }, { status: 500 })
  }
}
