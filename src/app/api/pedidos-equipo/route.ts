// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedidos-equipo/route.ts
// 🔧 Descripción: API para gestión de pedidos de equipos
// 🧠 Uso: CRUD de pedidos de equipos conectado a base de datos real
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EstadoPedido } from '@prisma/client'
import type { PaginatedResponse, PedidosPaginationParams } from '@/types/payloads'
import { 
  parsePaginationParams, 
  paginateQuery, 
  PAGINATION_CONFIGS 
} from '@/lib/utils/pagination'

// ✅ GET - Obtener pedidos de equipos con paginación y búsqueda optimizada
export async function GET(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // 🔧 Parsear parámetros usando utilidad optimizada
    const paginationParams = parsePaginationParams(
      searchParams, 
      PAGINATION_CONFIGS.pedidos
    )
    
    // 📡 Extraer filtros específicos de pedidos
    const proyectoId = searchParams.get('proyectoId')
    const estadoParam = searchParams.get('estado')
    const responsableId = searchParams.get('responsableId')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const prioridad = searchParams.get('prioridad')
    
    // ✅ Validar que el estado sea un valor válido del enum
    const estadosValidos = Object.values(EstadoPedido)
    const estado = estadoParam && estadosValidos.includes(estadoParam as EstadoPedido) ? estadoParam as EstadoPedido : undefined
    
    // 🔧 Construir filtros adicionales
    const additionalWhere = {
      ...(proyectoId && { proyectoId }),
      ...(estado && { estado }),
      ...(responsableId && { responsableId }),
      ...(prioridad && { prioridad }),
      ...(fechaDesde && fechaHasta && {
        fechaPedido: {
          gte: new Date(fechaDesde),
          lte: new Date(fechaHasta)
        }
      })
    }

    // 📡 Función de consulta optimizada
    const queryFn = async ({ skip, take, where, orderBy }: any) => {
      const pedidos = await prisma.pedidoEquipo.findMany({
        where,
        select: {
          id: true,
          codigo: true,
          numeroSecuencia: true,
          estado: true,
          prioridad: true,
          fechaPedido: true,
          fechaNecesaria: true,
          fechaEntregaEstimada: true,
          fechaEntregaReal: true,
          observacion: true,
          createdAt: true,
          updatedAt: true,
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          lista: {
            select: {
              id: true,
              codigo: true,
              nombre: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        },
        orderBy,
        skip,
        take
      })
      
      // 🔄 Transformar datos para la interfaz (optimizado)
      return pedidos.map(pedido => ({
        id: pedido.id,
        codigo: pedido.codigo,
        numeroSecuencia: pedido.numeroSecuencia,
        proyecto: {
          id: pedido.proyecto.id,
          nombre: pedido.proyecto.nombre,
          codigo: pedido.proyecto.codigo
        },
        responsable: {
          id: pedido.responsable?.id || '',
          name: pedido.responsable?.name || 'Sin asignar',
          email: pedido.responsable?.email || ''
        },
        lista: pedido.lista ? {
          id: pedido.lista.id,
          codigo: pedido.lista.codigo,
          nombre: pedido.lista.nombre
        } : null,
        estado: pedido.estado,
        prioridad: pedido.prioridad || 'media',
        fechaPedido: pedido.fechaPedido?.toISOString() || pedido.createdAt.toISOString(),
        fechaNecesaria: pedido.fechaNecesaria?.toISOString() || '',
        fechaEntregaEstimada: pedido.fechaEntregaEstimada?.toISOString() || '',
        fechaEntregaReal: pedido.fechaEntregaReal?.toISOString() || '',
        itemsCount: pedido._count.items,
        observaciones: pedido.observacion || '',
        createdAt: pedido.createdAt.toISOString(),
        updatedAt: pedido.updatedAt.toISOString()
      }))
    }
    
    // 📡 Función de conteo
    const countFn = async (where: any) => {
      return await prisma.pedidoEquipo.count({ where })
    }
    
    // 🔁 Ejecutar paginación con utilidad optimizada
    const result = await paginateQuery(
      queryFn,
      countFn,
      paginationParams,
      [...(PAGINATION_CONFIGS.pedidos.searchFields || ['codigo', 'observacion'])],
      additionalWhere
    )
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error al obtener pedidos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST - Crear nuevo pedido de equipo
export async function POST(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      proyectoId,
      listaId,
      responsableId,
      fechaNecesaria,
      prioridad = 'media',
      observacion
    } = body

    // ✅ Validaciones básicas
    if (!proyectoId) {
      return NextResponse.json(
        { error: 'El proyecto es obligatorio' },
        { status: 400 }
      )
    }

    if (!fechaNecesaria) {
      return NextResponse.json(
        { error: 'La fecha necesaria es obligatoria' },
        { status: 400 }
      )
    }

    // 📝 Generar código único
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { codigo: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // 🔢 Obtener siguiente número secuencial
    const ultimoPedido = await prisma.pedidoEquipo.findFirst({
      where: {
        codigo: {
          startsWith: `PED-${proyecto.codigo}-`
        }
      },
      orderBy: { codigo: 'desc' }
    })

    let numeroSecuencia = 1
    if (ultimoPedido) {
      const match = ultimoPedido.codigo.match(/-([0-9]+)$/)
      if (match) {
        numeroSecuencia = parseInt(match[1]) + 1
      }
    }

    const codigo = `PED-${proyecto.codigo}-${numeroSecuencia.toString().padStart(3, '0')}`

    // 💾 Crear pedido
    const nuevoPedido = await prisma.pedidoEquipo.create({
      data: {
        codigo,
        numeroSecuencia,
        proyectoId,
        listaId,
        responsableId,
        fechaNecesaria: new Date(fechaNecesaria),
        prioridad,
        observacion,
        estado: 'borrador'
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true
          }
        },
        lista: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        }
      }
    })

    return NextResponse.json(nuevoPedido, { status: 201 })

  } catch (error) {
    console.error('❌ Error al crear pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
