// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/dependencias/[id]/
// 🔧 Descripción: API REST para operaciones específicas de dependencia
//    Endpoints: GET (obtener), DELETE (eliminar)
//
// 🧠 Funcionalidades:
//    - Obtener dependencia por ID con relaciones
//    - Eliminar dependencia
//    - Validación con Zod
//    - Manejo de errores estandarizado
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { DependenciaTarea } from '@/types/modelos'

// 🔍 Schema de validación para parámetros de ruta
const paramsSchema = z.object({
  id: z.string().min(1, 'ID de dependencia es requerido')
})

// 📡 GET /api/dependencias/[id] - Obtener dependencia por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Validar parámetros
    const resolvedParams = await params
    const { id } = paramsSchema.parse(resolvedParams)
    
    // 🔍 Buscar dependencia con todas las relaciones
    const dependencia = await prisma.dependenciasTarea.findUnique({
      where: { id },
      include: {
        tareaOrigen: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            estado: true,
            prioridad: true,
            fechaInicio: true,
            fechaFin: true,
            fechaInicioReal: true,
            fechaFinReal: true,
            porcentajeCompletado: true,
            horasEstimadas: true,
            horasReales: true,
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
        tareaDependiente: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            estado: true,
            prioridad: true,
            fechaInicio: true,
            fechaFin: true,
            fechaInicioReal: true,
            fechaFinReal: true,
            porcentajeCompletado: true,
            horasEstimadas: true,
            horasReales: true,
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
        }
      }
    })
    
    if (!dependencia) {
      return NextResponse.json(
        { error: 'Dependencia no encontrada' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(dependencia)
    
  } catch (error) {
    console.error('❌ Error al obtener dependencia:', error)
    
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

// 📡 DELETE /api/dependencias/[id] - Eliminar dependencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Validar parámetros
    const resolvedParams = await params
    const { id } = paramsSchema.parse(resolvedParams)
    
    // 🔍 Verificar que la dependencia existe
    const dependenciaExistente = await prisma.dependenciasTarea.findUnique({
      where: { id },
      include: {
        tareaOrigen: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        },
        tareaDependiente: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        }
      }
    })
    
    if (!dependenciaExistente) {
      return NextResponse.json(
        { error: 'Dependencia no encontrada' },
        { status: 404 }
      )
    }
    
    // ⚠️ Verificar restricciones de negocio
    // No permitir eliminar dependencias si la tarea origen está completada
    // y la tarea destino está en progreso o completada
    if (dependenciaExistente.tareaOrigen.estado === 'completada' && 
        (dependenciaExistente.tareaDependiente.estado === 'en_progreso' || 
         dependenciaExistente.tareaDependiente.estado === 'completada')) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar la dependencia porque la tarea destino ya está en progreso o completada',
          details: {
            tareaOrigen: dependenciaExistente.tareaOrigen.nombre,
            tareaDestino: dependenciaExistente.tareaDependiente.nombre,
            estadoOrigen: dependenciaExistente.tareaOrigen.estado,
            estadoDestino: dependenciaExistente.tareaDependiente.estado
          }
        },
        { status: 409 }
      )
    }
    
    // 🗑️ Eliminar la dependencia
    await prisma.dependenciasTarea.delete({
      where: { id }
    })
    
    return NextResponse.json(
      { 
        message: 'Dependencia eliminada exitosamente',
        details: {
          tareaOrigen: dependenciaExistente.tareaOrigen.nombre,
          tareaDestino: dependenciaExistente.tareaDependiente.nombre
        }
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('❌ Error al eliminar dependencia:', error)
    
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