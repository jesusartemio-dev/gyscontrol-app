// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion-servicio-item
// 🔧 Descripción: Ruta API para crear ítems dentro de CotizacionServicio
//
// 🧠 Uso: POST desde formulario de selección o edición de ítems
// ✍️ Autor: Jesús Artemio + Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CotizacionServicioItemPayload } from '@/types'
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

// ✅ Buscar ítems de servicio a través de todas las cotizaciones (paginado)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const paginationParams = parsePaginationParams(searchParams, PAGINATION_CONFIGS.cotizacionServicioItems)

    const cotizacionId = searchParams.get('cotizacionId')
    const estado = searchParams.get('estado')
    const soloCatalogo = searchParams.get('soloCatalogo') === 'true'

    if (estado && !ESTADOS_COTIZACION_VALIDOS.has(estado as EstadoCotizacion)) {
      return NextResponse.json({ error: `Estado de cotización inválido: ${estado}` }, { status: 400 })
    }

    const cotizacionServicioWhere: any = {}
    if (cotizacionId) cotizacionServicioWhere.cotizacionId = cotizacionId
    if (estado) cotizacionServicioWhere.cotizacion = { estado: estado as EstadoCotizacion }

    const additionalWhere: any = {}
    if (Object.keys(cotizacionServicioWhere).length > 0) additionalWhere.cotizacionServicio = cotizacionServicioWhere
    if (soloCatalogo) additionalWhere.catalogoServicioId = { not: null }

    const queryFn = async ({ skip, take, where, orderBy }: any) => {
      return prisma.cotizacionServicioItem.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          recursoNombre: true,
          unidadServicioNombre: true,
          cantidad: true,
          horaTotal: true,
          costoHora: true,
          costoInterno: true,
          costoCliente: true,
          catalogoServicioId: true,
          createdAt: true,
          cotizacionServicio: {
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

    const countFn = async (where: any) => prisma.cotizacionServicioItem.count({ where })

    const result = await paginateQuery(
      queryFn,
      countFn,
      paginationParams,
      [...PAGINATION_CONFIGS.cotizacionServicioItems.searchFields],
      additionalWhere
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error al buscar ítems de servicio de cotización:', error)
    return NextResponse.json({ error: 'Error al buscar ítems de servicio de cotización' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data: CotizacionServicioItemPayload = await req.json()

    // ✅ Validación de campos obligatorios mínimos
    if (
      !data.cotizacionServicioId ||
      !data.nombre ||
      !data.edtId ||
      !data.formula ||
      !data.unidadServicioNombre ||
      !data.unidadServicioId ||
      !data.recursoNombre ||
      !data.recursoId ||
      data.costoHora === undefined ||
      data.cantidad === undefined ||
      data.horaTotal === undefined ||
      data.factorSeguridad === undefined ||
      data.margen === undefined ||
      data.costoInterno === undefined ||
      data.costoCliente === undefined
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios en el payload' },
        { status: 400 }
      )
    }

    // ✅ Crear ítem de servicio
    const creado = await prisma.cotizacionServicioItem.create({
      data: {
        id: randomUUID(),
        cotizacionServicioId: data.cotizacionServicioId,
        catalogoServicioId: data.catalogoServicioId,
        unidadServicioId: data.unidadServicioId,
        recursoId: data.recursoId,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        edtId: data.edtId,
        formula: data.formula,
        horaBase: data.horaBase,
        horaRepetido: data.horaRepetido,
        horaUnidad: data.horaUnidad,
        horaFijo: data.horaFijo,
        unidadServicioNombre: data.unidadServicioNombre,
        recursoNombre: data.recursoNombre,
        costoHora: data.costoHora,
        cantidad: data.cantidad,
        horaTotal: data.horaTotal,
        factorSeguridad: data.factorSeguridad,
        margen: data.margen,
        costoInterno: data.costoInterno,
        costoCliente: data.costoCliente,
        orden: data.orden ?? 0,
        nivelDificultad: data.nivelDificultad ?? 1,
        modoCalculo: data.modoCalculo ?? 'normal',
        updatedAt: new Date(),
      }
    })

    // ✅ Recalcular totales de la cotización
    const servicio = await prisma.cotizacionServicio.findUnique({
      where: { id: data.cotizacionServicioId },
      select: { cotizacionId: true }
    })

    if (servicio?.cotizacionId) {
      await recalcularTotalesCotizacion(servicio.cotizacionId)
    }

    return NextResponse.json(creado, { status: 201 })

  } catch (error) {
    console.error('❌ Error en POST /cotizacion-servicio-item:', error)
    return NextResponse.json(
      { error: 'Error al crear el ítem de cotización' },
      { status: 500 }
    )
  }
}
