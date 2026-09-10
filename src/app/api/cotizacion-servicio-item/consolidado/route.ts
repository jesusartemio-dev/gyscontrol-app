// src/app/api/cotizacion-servicio-item/consolidado/route.ts
//
// Ítems de servicio cotizados vinculados al catálogo (catalogoServicioId != null),
// sin paginar: el dataset está acotado por el tamaño del catálogo, no por el
// de las cotizaciones, así que el cliente agrupa/suma en memoria (mismo
// patrón que PedidoConsolidadoView).

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EstadoCotizacion } from '@prisma/client'

const ESTADOS_COTIZACION_VALIDOS = new Set(Object.values(EstadoCotizacion))

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado')

    if (estado && !ESTADOS_COTIZACION_VALIDOS.has(estado as EstadoCotizacion)) {
      return NextResponse.json({ error: `Estado de cotización inválido: ${estado}` }, { status: 400 })
    }

    const cotizacionServicioWhere: any = {}
    if (estado) cotizacionServicioWhere.cotizacion = { estado: estado as EstadoCotizacion }

    const items = await prisma.cotizacionServicioItem.findMany({
      where: {
        catalogoServicioId: { not: null },
        ...(Object.keys(cotizacionServicioWhere).length > 0 ? { cotizacionServicio: cotizacionServicioWhere } : {}),
      },
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
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('❌ Error al obtener consolidado de servicios cotizados:', error)
    return NextResponse.json({ error: 'Error al obtener consolidado de servicios cotizados' }, { status: 500 })
  }
}
