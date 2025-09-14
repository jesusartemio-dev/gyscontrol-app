// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/tareas/[id]/
// 🔧 Descripción: API REST para operaciones específicas de tarea
//    Endpoints: GET (obtener), PUT (actualizar), DELETE (eliminar)
//
// 🧠 Funcionalidades:
//    - Obtener tarea por ID con relaciones
//    - Actualizar tarea existente
//    - Eliminar tarea (soft delete)
//    - Validación con Zod
//    - Manejo de errores estandarizado
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { Tarea } from '@/types/modelos'

// 🔍 Schema de validación para actualizar tarea
const updateTareaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo').optional(),
  descripcion: z.string().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  fechaInicio: z.string().datetime('Fecha de inicio inválida').optional(),
  fechaFin: z.string().datetime('Fecha de fin inválida').optional(),
  fechaInicioReal: z.string().datetime().nullable().optional(),
  fechaFinReal: z.string().datetime().nullable().optional(),
  progreso: z.number().min(0).max(100).optional(),
  horasEstimadas: z.number().min(0, 'Horas estimadas debe ser positivo').optional(),
  horasReales: z.number().min(0).optional(),
  responsableId: z.string().min(1, 'ID del responsable es requerido').optional()
})

// 🔍 Schema de validación para parámetros de ruta
const paramsSchema = z.object({
  id: z.string().min(1, 'ID de tarea es requerido')
})

// 📡 GET /api/tareas/[id] - Obtener tarea por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Validar parámetros
    const resolvedParams = await params
    const { id } = paramsSchema.parse(resolvedParams)
    
    // 🔍 Buscar tarea con todas las relaciones
    const tarea = await prisma.tarea.findUnique({
      where: { id },
      include: {
        proyectoServicio: {
          select: {
            id: true,
            categoria: true,
            proyecto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                cliente: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        subtareas: {
          include: {
            asignado: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        dependenciasOrigen: {
          include: {
            tareaDependiente: {
              select: {
                id: true,
                nombre: true,
                estado: true
              }
            }
          }
        },
        dependenciasDependiente: {
          include: {
            tareaOrigen: {
              select: {
                id: true,
                nombre: true,
                estado: true
              }
            }
          }
        },
        asignaciones: {
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        registrosProgreso: {
          include: {
            usuario: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { fecha: 'desc' },
          take: 10 // Últimos 10 registros
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
      }
    })
    
    if (!tarea) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(tarea)
    
  } catch (error) {
    console.error('❌ Error al obtener tarea:', error)
    
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

// 📡 PUT /api/tareas/[id] - Actualizar tarea
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Validar parámetros
    const resolvedParams = await params
    const { id } = paramsSchema.parse(resolvedParams)
    const body = await request.json()
    
    // ✅ Validar datos de entrada
    const validatedData = updateTareaSchema.parse(body)
    
    // 🔍 Verificar que la tarea existe
    const tareaExistente = await prisma.tarea.findUnique({
      where: { id },
      select: { 
        id: true, 
        fechaInicio: true, 
        fechaFin: true,
        estado: true
      }
    })
    
    if (!tareaExistente) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }
    
    // 🔍 Verificar responsable si se está actualizando
    if (validatedData.responsableId) {
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
    }
    
    // ✅ Validar fechas si se están actualizando
    let fechaInicio = tareaExistente.fechaInicio
    let fechaFin = tareaExistente.fechaFin
    
    if (validatedData.fechaInicio) {
      fechaInicio = new Date(validatedData.fechaInicio)
    }
    
    if (validatedData.fechaFin) {
      fechaFin = new Date(validatedData.fechaFin)
    }
    
    if (fechaFin <= fechaInicio) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      )
    }
    
    // 📝 Preparar datos para actualización
    const updateData: any = { ...validatedData }
    
    if (validatedData.fechaInicio) {
      updateData.fechaInicio = fechaInicio
    }
    
    if (validatedData.fechaFin) {
      updateData.fechaFin = fechaFin
    }
    
    if (validatedData.fechaInicioReal !== undefined) {
      updateData.fechaInicioReal = validatedData.fechaInicioReal ? new Date(validatedData.fechaInicioReal) : null
    }
    
    if (validatedData.fechaFinReal !== undefined) {
      updateData.fechaFinReal = validatedData.fechaFinReal ? new Date(validatedData.fechaFinReal) : null
    }
    
    // 🔄 Actualizar timestamps automáticos según estado
    if (validatedData.estado) {
      const estadoAnterior = tareaExistente.estado
      const estadoNuevo = validatedData.estado
      
      // Si cambia a 'en_progreso' y no tiene fecha de inicio real, establecerla
    if (estadoNuevo === 'en_progreso' && estadoAnterior !== 'en_progreso') {
        if (!updateData.fechaInicioReal) {
          updateData.fechaInicioReal = new Date()
        }
      }
      
      // Si cambia a 'completada' y no tiene fecha de fin real, establecerla
      if (estadoNuevo === 'completada' && estadoAnterior !== 'completada') {
        if (!updateData.fechaFinReal) {
          updateData.fechaFinReal = new Date()
        }
        // Establecer progreso al 100% si se completa
        if (updateData.progreso === undefined) {
          updateData.progreso = 100
        }
      }
    }
    
    // 📝 Actualizar la tarea
    const tareaActualizada = await prisma.tarea.update({
      where: { id },
      data: updateData,
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
            dependenciasDependiente: true
          }
        }
      }
    })
    
    return NextResponse.json(tareaActualizada)
    
  } catch (error) {
    console.error('❌ Error al actualizar tarea:', error)
    
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

// 📡 DELETE /api/tareas/[id] - Eliminar tarea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Validar parámetros
    const resolvedParams = await params
    const { id } = paramsSchema.parse(resolvedParams)
    
    // 🔍 Verificar que la tarea existe
    const tareaExistente = await prisma.tarea.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subtareas: true,
            dependenciasOrigen: true,
            dependenciasDependiente: true
          }
        }
      }
    })
    
    if (!tareaExistente) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }
    
    // ⚠️ Verificar dependencias antes de eliminar
    if (tareaExistente._count.subtareas > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar la tarea porque tiene subtareas asociadas',
          details: `La tarea tiene ${tareaExistente._count.subtareas} subtareas`
        },
        { status: 409 }
      )
    }
    
    if (tareaExistente._count.dependenciasOrigen > 0 || tareaExistente._count.dependenciasDependiente > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar la tarea porque tiene dependencias',
          details: `La tarea tiene ${tareaExistente._count.dependenciasOrigen + tareaExistente._count.dependenciasDependiente} dependencias`
        },
        { status: 409 }
      )
    }
    
    // 🗑️ Eliminar la tarea (Prisma manejará las relaciones en cascada)
    await prisma.tarea.delete({
      where: { id }
    })
    
    return NextResponse.json(
      { message: 'Tarea eliminada exitosamente' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('❌ Error al eliminar tarea:', error)
    
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