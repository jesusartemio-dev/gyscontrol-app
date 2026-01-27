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

// Mock data for demonstration
const mockListasEquipo = [
  {
    id: '1',
    nombre: 'Lista Equipos Oficina Central',
    descripcion: 'Equipos necesarios para la oficina central del proyecto Alpha',
    codigo: 'LEQ-001',
    estado: 'por_revisar',
    proyectoId: '1',
    responsableId: 'user1',
    numeroSecuencia: 1,
    fechaPedido: '2024-01-20',
    fechaNecesaria: '2024-02-15',
    observaciones: 'Urgente para inicio de proyecto',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    items: [
      {
        id: '1',
        nombre: 'Laptop Dell XPS 13',
        descripcion: 'Laptop para desarrollo',
        cantidad: 5,
        unidad: 'unidades',
        precioUnitario: 1200,
        total: 6000
      },
      {
        id: '2',
        nombre: 'Monitor 24 pulgadas',
        descripcion: 'Monitor secundario',
        cantidad: 5,
        unidad: 'unidades',
        precioUnitario: 300,
        total: 1500
      }
    ]
  },
  {
    id: '2',
    nombre: 'Lista Equipos Servidor',
    descripcion: 'Equipos de servidor para infraestructura',
    codigo: 'LEQ-002',
    estado: 'por_cotizar',
    proyectoId: '1',
    responsableId: 'user2',
    numeroSecuencia: 2,
    fechaPedido: '2024-01-25',
    fechaNecesaria: '2024-03-01',
    observaciones: 'Revisar especificaciones técnicas',
    createdAt: '2024-01-25T09:00:00Z',
    updatedAt: '2024-01-25T09:00:00Z',
    items: [
      {
        id: '3',
        nombre: 'Servidor Dell PowerEdge',
        descripcion: 'Servidor principal',
        cantidad: 2,
        unidad: 'unidades',
        precioUnitario: 5000,
        total: 10000
      }
    ]
  },
  {
    id: '3',
    nombre: 'Lista Equipos Red',
    descripcion: 'Equipos de networking y comunicaciones',
    codigo: 'LEQ-003',
    estado: 'aprobado',
    proyectoId: '2',
    responsableId: 'user3',
    numeroSecuencia: 1,
    fechaPedido: '2024-02-01',
    fechaNecesaria: '2024-02-20',
    observaciones: 'Aprobado por gerencia',
    createdAt: '2024-02-01T08:00:00Z',
    updatedAt: '2024-02-01T08:00:00Z',
    items: [
      {
        id: '4',
        nombre: 'Switch Cisco 24 puertos',
        descripcion: 'Switch principal',
        cantidad: 3,
        unidad: 'unidades',
        precioUnitario: 800,
        total: 2400
      },
      {
        id: '5',
        nombre: 'Router Cisco ISR',
        descripcion: 'Router de borde',
        cantidad: 1,
        unidad: 'unidades',
        precioUnitario: 1500,
        total: 1500
      }
    ]
  },
  {
    id: '4',
    nombre: 'Lista Equipos Móviles',
    descripcion: 'Dispositivos móviles para el equipo',
    codigo: 'LEQ-004',
    estado: 'borrador',
    proyectoId: '2',
    responsableId: 'user1',
    numeroSecuencia: 2,
    fechaPedido: '2024-02-05',
    fechaNecesaria: '2024-02-25',
    observaciones: 'En proceso de definición',
    createdAt: '2024-02-05T11:00:00Z',
    updatedAt: '2024-02-05T11:00:00Z',
    items: []
  },
  {
    id: '5',
    nombre: 'Lista Equipos Seguridad',
    descripción: 'Equipos de seguridad y monitoreo',
    codigo: 'LEQ-005',
    estado: 'por_validar',
    proyectoId: '3',
    responsableId: 'user2',
    numeroSecuencia: 1,
    fechaPedido: '2024-02-10',
    fechaNecesaria: '2024-03-10',
    observaciones: 'Pendiente validación técnica',
    createdAt: '2024-02-10T14:00:00Z',
    updatedAt: '2024-02-10T14:00:00Z',
    items: [
      {
        id: '6',
        nombre: 'Cámara IP Hikvision',
        descripcion: 'Cámara de seguridad',
        cantidad: 8,
        unidad: 'unidades',
        precioUnitario: 200,
        total: 1600
      }
    ]
  },
  {
    id: '6',
    nombre: 'Lista Equipos Rechazada',
    descripcion: 'Lista que fue rechazada por presupuesto',
    codigo: 'LEQ-006',
    estado: 'rechazado',
    proyectoId: '3',
    responsableId: 'user3',
    numeroSecuencia: 2,
    fechaPedido: '2024-02-12',
    fechaNecesaria: '2024-03-15',
    observaciones: 'Rechazado por exceder presupuesto',
    createdAt: '2024-02-12T16:00:00Z',
    updatedAt: '2024-02-12T16:00:00Z',
    items: [
      {
        id: '7',
        nombre: 'Equipo Costoso',
        descripcion: 'Equipo que excede presupuesto',
        cantidad: 1,
        unidad: 'unidades',
        precioUnitario: 50000,
        total: 50000
      }
    ]
  }
]

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
              listaEquipoItem: true
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
