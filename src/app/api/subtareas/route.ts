// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/subtareas/
// 🔧 Descripción: API REST para gestión de subtareas
//    Endpoints: GET (listar), POST (crear)
//
// 🧠 Funcionalidades:
//    - Listar subtareas con filtros y paginación
//    - Crear nueva subtarea
//    - Validación con Zod
//    - Manejo de errores estandarizado
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { Subtarea } from '@/types/modelos'
import type { SubtareaPayload, PaginatedResponse } from '@/types/payloads'

// 🔍 Schema de validación para crear subtarea
const createSubtareaSchema = z.object({
  tareaId: z.string().min(1, 'ID de la tarea es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo'),
  descripcion: z.string().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada']).default('pendiente'),
  fechaInicio: z.string().datetime('Fecha de inicio inválida').optional(),
  fechaFin: z.string().datetime('Fecha de fin inválida').optional(),
  horasPlan: z.number().min(0, 'Horas estimadas debe ser positivo').default(0),
  horasReales: z.number().min(0).default(0),
  progreso: z.number().min(0).max(100).default(0),
  asignadoId: z.string().optional()
})

// 🔍 Schema de validación para parámetros de consulta
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  search: z.string().optional(),
  tareaId: z.string().optional(),
  asignadoId: z.string().optional(),
  estado: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// 📡 GET /api/subtareas - Listar subtareas con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    // ✅ Validar parámetros de consulta
    const validatedParams = querySchema.parse(params)
    const { page, limit, search, tareaId, asignadoId, estado, sortBy, sortOrder } = validatedParams
    
    // 🔍 Construir filtros dinámicos
    const where: any = {}
    
    if (tareaId) {
      where.tareaId = tareaId
    }
    
    if (asignadoId) {
      where.asignadoId = asignadoId
    }
    
    if (estado) {
      where.estado = estado
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
    const [subtareas, total] = await Promise.all([
      prisma.subtarea.findMany({
        where,
        include: {
          tarea: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              proyectoServicioCotizado: {
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
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosProgreso: {
            select: {
              id: true,
              fecha: true,
              horasTrabajadas: true,
              porcentajeCompletado: true,
              descripcion: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit
      }),
      prisma.subtarea.count({ where })
    ])
    
    // 📊 Construir metadatos de paginación
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1
    
    // 📊 Transformar resultados para respuesta (convertir fechas a strings, Decimal a number y null a undefined)
    const subtareasTransformadas = subtareas.map(subtarea => ({
      id: subtarea.id,
      tareaId: subtarea.tareaId,
      nombre: subtarea.nombre,
      descripcion: subtarea.descripcion || undefined,
      estado: subtarea.estado,
      fechaInicio: subtarea.fechaInicio?.toISOString() || '',
      fechaFin: subtarea.fechaFin?.toISOString() || '',
      fechaInicioReal: subtarea.fechaInicioReal?.toISOString() || undefined,
      fechaFinReal: subtarea.fechaFinReal?.toISOString() || undefined,
      porcentajeCompletado: Number(subtarea.porcentajeCompletado) || 0,
      horasPlan: Number(subtarea.horasEstimadas) || 0,
      horasReales: Number(subtarea.horasReales) || 0,
      asignadoId: subtarea.asignadoId || undefined,
      createdAt: subtarea.createdAt.toISOString(),
      updatedAt: subtarea.updatedAt.toISOString(),
      tarea: {
        id: subtarea.tarea.id,
        nombre: subtarea.tarea.nombre,
        estado: subtarea.tarea.estado,
        proyectoServicio: subtarea.tarea.proyectoServicioCotizado
      } as any,
      asignado: subtarea.user ? {
        id: subtarea.user.id,
        name: subtarea.user.name || undefined,
        email: subtarea.user.email
      } as any : undefined,
      registrosProgreso: subtarea.registrosProgreso.map(registro => ({
        id: registro.id,
        fecha: registro.fecha.toISOString(),
        horasTrabajadas: Number(registro.horasTrabajadas) || 0,
        descripcion: registro.descripcion || undefined,
        porcentajeCompletado: Number(registro.porcentajeCompletado) || 0
      })) as any
    }))

    const response: PaginatedResponse<Subtarea> = {
      data: subtareasTransformadas,
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
    console.error('❌ Error al obtener subtareas:', error)
    
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

// 📡 POST /api/subtareas - Crear nueva subtarea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Validar datos de entrada
    const validatedData = createSubtareaSchema.parse(body)
    
    // 🔍 Verificar que la tarea existe
    const tarea = await prisma.tarea.findUnique({
      where: { id: validatedData.tareaId },
      select: { 
        id: true, 
        fechaInicio: true, 
        fechaFin: true,
        estado: true
      }
    })
    
    if (!tarea) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }
    
    // ⚠️ Verificar que la tarea no esté completada o cancelada
    if (tarea.estado === 'completada' || tarea.estado === 'cancelada') {
      return NextResponse.json(
        { error: 'No se pueden agregar subtareas a una tarea completada o cancelada' },
        { status: 409 }
      )
    }
    
    // 🔍 Verificar que el asignado existe (si se proporciona)
    if (validatedData.asignadoId) {
      const asignado = await prisma.user.findUnique({
        where: { id: validatedData.asignadoId },
        select: { id: true }
      })
      
      if (!asignado) {
        return NextResponse.json(
          { error: 'Usuario asignado no encontrado' },
          { status: 404 }
        )
      }
    }
    
    // ✅ Validar fechas si se proporcionan
    if (validatedData.fechaInicio && validatedData.fechaFin) {
      const fechaInicio = new Date(validatedData.fechaInicio)
      const fechaFin = new Date(validatedData.fechaFin)
      
      if (fechaFin <= fechaInicio) {
        return NextResponse.json(
          { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
          { status: 400 }
        )
      }
      
      // Verificar que las fechas estén dentro del rango de la tarea padre
      if (fechaInicio < tarea.fechaInicio || fechaFin > tarea.fechaFin) {
        return NextResponse.json(
          { error: 'Las fechas de la subtarea deben estar dentro del rango de la tarea padre' },
          { status: 400 }
        )
      }
    }
    
    // ✅ Orden field removed from model - no validation needed
    
    // 📝 Preparar datos para creación
    const createData: any = {
      ...validatedData,
      fechaInicio: validatedData.fechaInicio ? new Date(validatedData.fechaInicio) : null,
      fechaFin: validatedData.fechaFin ? new Date(validatedData.fechaFin) : null
    }
    
    // 📝 Crear la subtarea
    const nuevaSubtarea = await prisma.subtarea.create({
      data: createData,
      include: {
        tarea: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            proyectoServicioCotizado: {
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
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(nuevaSubtarea, { status: 201 })
    
  } catch (error) {
    console.error('❌ Error al crear subtarea:', error)
    
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
