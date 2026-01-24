// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/subtareas/[id]/
// 🔧 Descripción: API REST para operaciones específicas de subtarea
//    Endpoints: GET (obtener), PUT (actualizar), DELETE (eliminar)
//
// 🧠 Funcionalidades:
//    - Obtener subtarea por ID con relaciones
//    - Actualizar subtarea existente
//    - Eliminar subtarea
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

// 🔍 Schema de validación para actualizar subtarea
const updateSubtareaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo').optional(),
  descripcion: z.string().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada']).optional(),
  fechaInicio: z.string().datetime('Fecha de inicio inválida').nullable().optional(),
  fechaFin: z.string().datetime('Fecha de fin inválida').nullable().optional(),
  horasPlan: z.number().min(0, 'Horas estimadas debe ser positivo').optional(),
  horasReales: z.number().min(0).optional(),
  progreso: z.number().min(0).max(100).optional(),
  asignadoId: z.string().nullable().optional()
})

// 🔍 Schema de validación para parámetros de ruta
const paramsSchema = z.object({
  id: z.string().min(1, 'ID de subtarea es requerido')
})

// 📡 GET /api/subtareas/[id] - Obtener subtarea por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Validar parámetros
    const resolvedParams = await params
    const { id } = paramsSchema.parse(resolvedParams)
    
    // 🔍 Buscar subtarea con todas las relaciones
    const subtarea = await prisma.subtarea.findUnique({
      where: { id },
      include: {
        tarea: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            estado: true,
            prioridad: true,
            fechaInicio: true,
            fechaFin: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            proyectoServicioCotizado: {
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
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })
    
    if (!subtarea) {
      return NextResponse.json(
        { error: 'Subtarea no encontrada' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(subtarea)
    
  } catch (error) {
    console.error('❌ Error al obtener subtarea:', error)
    
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

// 📡 PUT /api/subtareas/[id] - Actualizar subtarea
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
    const validatedData = updateSubtareaSchema.parse(body)
    
    // 🔍 Verificar que la subtarea existe
    const subtareaExistente = await prisma.subtarea.findUnique({
      where: { id },
      include: {
        tarea: {
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
            estado: true
          }
        }
      }
    })
    
    if (!subtareaExistente) {
      return NextResponse.json(
        { error: 'Subtarea no encontrada' },
        { status: 404 }
      )
    }
    
    // ⚠️ Verificar que la tarea padre no esté completada o cancelada
    if (subtareaExistente.tarea.estado === 'completada' || subtareaExistente.tarea.estado === 'cancelada') {
      return NextResponse.json(
        { error: 'No se puede modificar una subtarea de una tarea completada o cancelada' },
        { status: 409 }
      )
    }
    
    // 🔍 Verificar asignado si se está actualizando
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
    
    // ✅ Orden field removed from model - no validation needed
    
    // ✅ Validar fechas si se están actualizando
    let fechaInicio: Date | null = subtareaExistente.fechaInicio
    let fechaFin: Date | null = subtareaExistente.fechaFin
    
    if (validatedData.fechaInicio !== undefined) {
      fechaInicio = validatedData.fechaInicio ? new Date(validatedData.fechaInicio) : null
    }
    
    if (validatedData.fechaFin !== undefined) {
      fechaFin = validatedData.fechaFin ? new Date(validatedData.fechaFin) : null
    }
    
    // Validar que fechaFin > fechaInicio si ambas existen
    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      )
    }
    
    // Validar que las fechas estén dentro del rango de la tarea padre
    const tareaFechaInicio = subtareaExistente.tarea.fechaInicio
    const tareaFechaFin = subtareaExistente.tarea.fechaFin
    
    if (fechaInicio && (fechaInicio < tareaFechaInicio || fechaInicio > tareaFechaFin)) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe estar dentro del rango de la tarea padre' },
        { status: 400 }
      )
    }
    
    if (fechaFin && (fechaFin < tareaFechaInicio || fechaFin > tareaFechaFin)) {
      return NextResponse.json(
        { error: 'La fecha de fin debe estar dentro del rango de la tarea padre' },
        { status: 400 }
      )
    }
    
    // 📝 Preparar datos para actualización
    const updateData: any = { ...validatedData }
    
    if (validatedData.fechaInicio !== undefined) {
      updateData.fechaInicio = fechaInicio
    }
    
    if (validatedData.fechaFin !== undefined) {
      updateData.fechaFin = fechaFin
    }
    
    if (validatedData.asignadoId !== undefined) {
      updateData.asignadoId = validatedData.asignadoId
    }
    
    // 🔄 Lógica automática según estado
    if (validatedData.estado) {
      const estadoAnterior = subtareaExistente.estado
      const estadoNuevo = validatedData.estado
      
      // Si se completa, establecer progreso al 100%
      if (estadoNuevo === 'completada' && estadoAnterior !== 'completada') {
        if (updateData.progreso === undefined) {
          updateData.progreso = 100
        }
      }
      
      // Si se cancela, mantener el progreso actual
      if (estadoNuevo === 'cancelada' && estadoAnterior !== 'cancelada') {
        // No cambiar el progreso automáticamente
      }
    }
    
    // 📝 Actualizar la subtarea
    const subtareaActualizada = await prisma.subtarea.update({
      where: { id },
      data: updateData,
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
    
    return NextResponse.json(subtareaActualizada)
    
  } catch (error) {
    console.error('❌ Error al actualizar subtarea:', error)
    
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

// 📡 DELETE /api/subtareas/[id] - Eliminar subtarea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Validar parámetros
    const resolvedParams = await params
    const { id } = paramsSchema.parse(resolvedParams)
    
    // 🔍 Verificar que la subtarea existe
    const subtareaExistente = await prisma.subtarea.findUnique({
      where: { id },
      include: {
        tarea: {
          select: {
            id: true,
            estado: true
          }
        }
      }
    })
    
    if (!subtareaExistente) {
      return NextResponse.json(
        { error: 'Subtarea no encontrada' },
        { status: 404 }
      )
    }
    
    // ⚠️ Verificar que la tarea padre no esté completada
    if (subtareaExistente.tarea.estado === 'completada') {
      return NextResponse.json(
        { error: 'No se puede eliminar una subtarea de una tarea completada' },
        { status: 409 }
      )
    }
    
    // 🗑️ Eliminar la subtarea
    await prisma.subtarea.delete({
      where: { id }
    })
    
    return NextResponse.json(
      { message: 'Subtarea eliminada exitosamente' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('❌ Error al eliminar subtarea:', error)
    
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