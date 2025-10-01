// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/tareas/
// 🔧 Descripción: API REST para gestión de tareas
//    Endpoints: GET (listar), POST (crear)
//
// 🧠 Funcionalidades:
//    - Listar tareas con filtros y paginación
//    - Crear nueva tarea
//    - Validación con Zod
//    - Manejo de errores estandarizado
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import type { 
  TareaPayload, 
  TareasPaginationParams,
  PaginatedResponse 
} from '../../../types/payloads'

// 🔍 Schema de validación para crear tarea
const createTareaSchema = z.object({
  proyectoServicioId: z.string().min(1, 'ID del proyecto servicio es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo'),
  descripcion: z.string().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada']).default('pendiente'),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  fechaInicio: z.string().datetime('Fecha de inicio inválida'),
  fechaFin: z.string().datetime('Fecha de fin inválida'),
  fechaInicioReal: z.string().datetime().optional(),
  fechaFinReal: z.string().datetime().optional(),
  progreso: z.number().min(0).max(100).default(0),
  horasEstimadas: z.number().min(0, 'Horas estimadas debe ser positivo'),
  horasReales: z.number().min(0).default(0),
  responsableId: z.string().min(1, 'ID del responsable es requerido')
})

// 🔍 Schema de validación para parámetros de consulta
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  search: z.string().optional(),
  proyectoServicioId: z.string().optional(),
  responsableId: z.string().optional(),
  estado: z.string().optional(),
  prioridad: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// 📡 GET /api/tareas - Listar tareas con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    // ✅ Validar parámetros de consulta
    const validatedParams = querySchema.parse(params)
    const { page, limit, search, proyectoServicioId, responsableId, estado, prioridad, fechaDesde, fechaHasta, sortBy, sortOrder } = validatedParams
    
    // 🔍 Construir filtros dinámicos
    const where: any = {}
    
    if (proyectoServicioId) {
      where.proyectoServicioId = proyectoServicioId
    }
    
    if (responsableId) {
      where.responsableId = responsableId
    }
    
    if (estado) {
      where.estado = estado
    }
    
    if (prioridad) {
      where.prioridad = prioridad
    }
    
    if (fechaDesde || fechaHasta) {
      where.fechaInicio = {}
      if (fechaDesde) where.fechaInicio.gte = new Date(fechaDesde)
      if (fechaHasta) where.fechaInicio.lte = new Date(fechaHasta)
    }
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // 📊 Calcular offset para paginación
    const offset = (page - 1) * limit
    
    // 🔍 Ejecutar consultas en paralelo
    const [tareas, total] = await Promise.all([
      prisma.tarea.findMany({
        where,
        include: {
          proyectoServicio: {
            select: {
              id: true,
              categoria: true,
              proyecto: {
                select: {
                  id: true,
                  nombre: true,
                  codigo: true
                }
              }
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              subtareas: true,
              dependenciasOrigen: true,
              dependenciasDependiente: true,
              asignaciones: true,
              registrosProgreso: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit
      }),
      prisma.tarea.count({ where })
    ])
    
    // 📊 Construir metadatos de paginación
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1
    
    // 📊 Tipo inferido directamente de Prisma
    type TareaConRelaciones = Prisma.TareaGetPayload<{
      include: {
        proyectoServicio: {
          include: {
            proyecto: {
              select: {
                id: true
                nombre: true
              }
            }
          }
        }
        responsable: {
          select: {
            id: true
            name: true
            email: true
          }
        }
        _count: {
          select: {
            subtareas: true
            dependenciasOrigen: true
             dependenciasDependiente: true
            asignaciones: true
            registrosProgreso: true
          }
        }
      }
    }>

    const response: PaginatedResponse<TareaConRelaciones> = {
      data: tareas as TareaConRelaciones[],
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error al obtener tareas:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// 📡 POST /api/tareas - Crear nueva tarea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Validar datos de entrada
    const validatedData = createTareaSchema.parse(body)
    
    // 🔍 Verificar que el proyecto servicio existe
    const proyectoServicio = await prisma.proyectoServicio.findUnique({
      where: { id: validatedData.proyectoServicioId },
      select: { id: true }
    })
    
    if (!proyectoServicio) {
      return NextResponse.json(
        { error: 'Proyecto servicio no encontrado' },
        { status: 404 }
      )
    }
    
    // 🔍 Verificar que el responsable existe
    const responsable = await prisma.user.findUnique({
      where: { id: validatedData.responsableId },
      select: { id: true }
    })
    
    if (!responsable) {
      return NextResponse.json(
        { error: 'Usuario responsable no encontrado' },
        { status: 404 }
      )
    }
    
    // ✅ Validar fechas
    const fechaInicio = new Date(validatedData.fechaInicio)
    const fechaFin = new Date(validatedData.fechaFin)
    
    if (fechaFin <= fechaInicio) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      )
    }
    
    // 📝 Crear la tarea
    const nuevaTarea = await prisma.tarea.create({
      data: {
        proyectoServicioId: validatedData.proyectoServicioId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        estado: validatedData.estado,
        prioridad: validatedData.prioridad,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        fechaInicioReal: validatedData.fechaInicioReal ? new Date(validatedData.fechaInicioReal) : null,
        fechaFinReal: validatedData.fechaFinReal ? new Date(validatedData.fechaFinReal) : null,
        porcentajeCompletado: validatedData.progreso,
        horasEstimadas: validatedData.horasEstimadas,
        horasReales: validatedData.horasReales,
        responsableId: validatedData.responsableId
      },
      include: {
        proyectoServicio: {
          select: {
            id: true,
            categoria: true,
            proyecto: {
              select: {
                id: true,
                nombre: true,
                codigo: true
              }
            }
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    return NextResponse.json(nuevaTarea, { status: 201 })
    
  } catch (error) {
    console.error('❌ Error al crear tarea:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
