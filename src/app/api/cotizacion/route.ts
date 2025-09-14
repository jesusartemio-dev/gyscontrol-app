// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/
// 🔧 Descripción: Maneja la obtención y creación de cotizaciones
// 🧠 Uso: GET para listar, POST para crear
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import type { CotizacionesPaginationParams } from '@/types/payloads'
import { 
  parsePaginationParams, 
  paginateQuery, 
  PAGINATION_CONFIGS 
} from '@/lib/utils/pagination'

// ✅ Obtener cotizaciones con paginación optimizada
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // 🔧 Parsear parámetros usando utilidad optimizada
    const paginationParams = parsePaginationParams(
      searchParams, 
      PAGINATION_CONFIGS.cotizaciones
    )
    
    // 📡 Extraer filtros específicos de cotizaciones
    const clienteId = searchParams.get('clienteId')
    const comercialId = searchParams.get('comercialId')
    const estado = searchParams.get('estado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    
    // 🔧 Construir filtros adicionales
    const additionalWhere = {
      ...(clienteId && { clienteId }),
      ...(comercialId && { comercialId }),
      ...(estado && estado !== 'todos' && { estado }),
      ...(fechaDesde && fechaHasta && {
        createdAt: {
          gte: new Date(fechaDesde),
          lte: new Date(fechaHasta)
        }
      })
    }
    
    // 📡 Función de consulta optimizada
    const queryFn = async ({ skip, take, where, orderBy }: any) => {
      return await prisma.cotizacion.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          estado: true,
          totalInterno: true,
          totalCliente: true,
          createdAt: true,
          updatedAt: true,
          cliente: {
            select: {
              id: true,
              nombre: true,
              correo: true
            }
          },
          comercial: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          plantilla: {
            select: {
              id: true,
              nombre: true,
              estado: true
            }
          },
          _count: {
            select: {
              equipos: true,
              servicios: true
            }
          }
        },
        orderBy,
        skip,
        take
      })
    }
    
    // 📡 Función de conteo
    const countFn = async (where: any) => {
      return await prisma.cotizacion.count({ where })
    }
    
    // 🔁 Ejecutar paginación con utilidad optimizada
    const result = await paginateQuery(
      queryFn,
      countFn,
      paginationParams,
      [...(PAGINATION_CONFIGS.cotizaciones.searchFields || ['nombre'])],
      additionalWhere
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error)
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 })
  }
}

// ✅ Crear nueva cotización manual
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { nombre, clienteId, comercialId } = data

    if (!nombre || !clienteId || !comercialId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const nueva = await prisma.cotizacion.create({
      data: {
        nombre,
        clienteId,
        comercialId,
        estado: 'borrador',
        totalInterno: 0,
        totalCliente: 0
      }
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear cotización:', error)
    return NextResponse.json({ error: 'Error al crear cotización' }, { status: 500 })
  }
}
