// ===================================================
// 📁 Archivo: route.ts
// 📌 Descripción: API Route para gestión de listas de equipos
// 🧠 Uso: CRUD de listas técnicas de equipos
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { EstadoListaEquipo } from '@prisma/client'
import type { PaginatedResponse, ListasEquipoPaginationParams } from '@/types/payloads'
import { 
  parsePaginationParams, 
  paginateQuery, 
  PAGINATION_CONFIGS 
} from '@/lib/utils/pagination'

// GET /api/listas-equipo - Obtener listas de equipos con paginación y búsqueda
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // 🔧 Parsear parámetros usando utilidad optimizada
    const paginationParams = parsePaginationParams(
      searchParams, 
      PAGINATION_CONFIGS.listasEquipo
    )
    
    // 📡 Extraer filtros específicos de listas-equipo
    const proyectoId = searchParams.get('proyectoId')
    const estadoParam = searchParams.get('estado')
    const responsableId = searchParams.get('responsableId')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    
    // ✅ Validar estado del enum
    const estadosValidos = Object.values(EstadoListaEquipo)
    const estado = estadoParam && estadosValidos.includes(estadoParam as EstadoListaEquipo) 
      ? estadoParam as EstadoListaEquipo 
      : undefined
    
    // 🔧 Construir filtros adicionales
    const additionalWhere = {
      ...(proyectoId && { proyectoId }),
      ...(estado && estadoParam !== 'todos' && { estado }),
      ...(responsableId && { responsableId }),
      ...(fechaDesde && fechaHasta && {
        fechaNecesaria: {
          gte: new Date(fechaDesde),
          lte: new Date(fechaHasta)
        }
      })
    }
    
    // 📡 Función de consulta optimizada
    const queryFn = async ({ skip, take, where, orderBy }: any) => {
      return await prisma.listaEquipo.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          codigo: true,
          estado: true,
          numeroSecuencia: true,
          fechaNecesaria: true,
          fechaAprobacionFinal: true,
          createdAt: true,
          updatedAt: true,
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          listaEquipoItem: {
            select: {
              cantidad: true,
              precioElegido: true,
              presupuesto: true
            }
          },
          _count: {
            select: {
              listaEquipoItem: true,
              cotizacionProveedorItem: true
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
      return await prisma.listaEquipo.count({ where })
    }
    
    // 🔁 Ejecutar paginación con utilidad optimizada
    const result = await paginateQuery(
      queryFn,
      countFn,
      paginationParams,
      [...(PAGINATION_CONFIGS.listasEquipo.searchFields || ['codigo', 'nombre'])],
      additionalWhere
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching listas-equipo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/listas-equipo - Crear nueva lista de equipos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validación básica
    if (!body.nombre || !body.proyectoId) {
      return NextResponse.json(
        { error: 'Nombre y proyecto son requeridos' },
        { status: 400 }
      )
    }

    // ✅ Obtener información del proyecto y calcular siguiente número de secuencia
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: body.proyectoId },
      select: { codigo: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Obtener el siguiente número de secuencia
    const ultimaLista = await prisma.listaEquipo.findFirst({
      where: { proyectoId: body.proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
      select: { numeroSecuencia: true }
    })

    const siguienteNumero = (ultimaLista?.numeroSecuencia || 0) + 1
    const codigoLista = `${proyecto.codigo}-LST-${String(siguienteNumero).padStart(3, '0')}`

    // ✅ Verificar que el usuario responsable existe
    const responsableId = body.responsableId || session.user.id
    const responsable = await prisma.user.findUnique({
      where: { id: responsableId },
      select: { id: true, name: true }
    })

    if (!responsable) {
      console.error('❌ Usuario responsable no encontrado:', responsableId)
      return NextResponse.json(
        { error: 'Usuario responsable no encontrado' },
        { status: 400 }
      )
    }

    // ✅ Usuario responsable validado

    // ✅ Crear lista en la base de datos con Prisma
    const nuevaLista = await prisma.listaEquipo.create({
      data: {
        id: randomUUID(),
        proyectoId: body.proyectoId,
        nombre: body.nombre,
        codigo: codigoLista,
        estado: 'borrador',
        numeroSecuencia: siguienteNumero,
        responsableId: responsableId, // ✅ Campo requerido y validado
        updatedAt: new Date(),
        ...(body.fechaNecesaria && { fechaNecesaria: new Date(body.fechaNecesaria) })
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        listaEquipoItem: true,
        _count: {
          select: {
            listaEquipoItem: true
          }
        }
      }
    })

    return NextResponse.json(nuevaLista, { status: 201 })
  } catch (error) {
    console.error('Error creating lista-equipo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
