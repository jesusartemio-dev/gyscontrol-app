// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/gantt/[proyectoServicioId]/
// 🔧 Descripción: API REST para datos del Gantt Chart
//    Endpoints: GET (obtener datos completos para Gantt)
//
// 🧠 Funcionalidades:
//    - Obtener todas las tareas de un proyecto servicio
//    - Incluir subtareas y dependencias
//    - Formato optimizado para Gantt Chart
//    - Cálculos de progreso y fechas
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { GanttChartPayload } from '@/types/payloads'

// 🔍 Schema de validación para parámetros de ruta
const paramsSchema = z.object({
  proyectoServicioId: z.string().min(1, 'ID del proyecto servicio es requerido')
})

// 🔍 Schema de validación para parámetros de consulta
const querySchema = z.object({
  includeCompleted: z.string().transform(val => val === 'true').default('true'),
  includeCanceled: z.string().transform(val => val === 'true').default('false'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
})

// 📡 GET /api/gantt/[proyectoServicioId] - Obtener datos para Gantt Chart
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proyectoServicioId: string }> }
) {
  try {
    // ✅ Validar parámetros
    const resolvedParams = await params
    const { proyectoServicioId } = paramsSchema.parse(resolvedParams)
    
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const { includeCompleted, includeCanceled, dateFrom, dateTo } = querySchema.parse(queryParams)
    
    // 🔍 Verificar que el proyecto servicio existe
    const proyectoServicio = await prisma.proyectoServicio.findUnique({
      where: { id: proyectoServicioId },
      select: {
        id: true,
        categoria: true,
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            fechaInicio: true,
            fechaFin: true,
            cliente: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    })
    
    if (!proyectoServicio) {
      return NextResponse.json(
        { error: 'Proyecto servicio no encontrado' },
        { status: 404 }
      )
    }
    
    // 🔍 Construir filtros para tareas
    const tareaWhere: any = {
      proyectoServicioId: proyectoServicioId
    }
    
    // Filtrar por estados
    const estadosExcluidos = []
    if (!includeCompleted) estadosExcluidos.push('completada')
    if (!includeCanceled) estadosExcluidos.push('cancelada')
    
    if (estadosExcluidos.length > 0) {
      tareaWhere.estado = {
        notIn: estadosExcluidos
      }
    }
    
    // Filtrar por fechas
    if (dateFrom || dateTo) {
      tareaWhere.OR = [
        {
          fechaInicio: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) })
          }
        },
        {
          fechaFin: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) })
          }
        }
      ]
    }
    
    // 🔍 Obtener todas las tareas con sus relaciones
    const tareas = await prisma.tarea.findMany({
      where: tareaWhere,
      include: {
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
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
        }
      },
      orderBy: { fechaInicio: 'asc' }
    })
    
    // 📊 Calcular métricas del proyecto
    const totalTareas = tareas.length
    const tareasCompletadas = tareas.filter(t => t.estado === 'completada').length
    const tareasEnProgreso = tareas.filter(t => t.estado === 'en_progreso').length
    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente').length
    const tareasCanceladas = tareas.filter(t => t.estado === 'cancelada').length
    
    const totalHorasEstimadas = tareas.reduce((sum, t) => sum + (t.horasEstimadas ? Number(t.horasEstimadas) : 0), 0)
    const totalHorasReales = tareas.reduce((sum, t) => sum + (t.horasReales ? Number(t.horasReales) : 0), 0)
    
    // Calcular progreso general del proyecto
    const progresoGeneral = totalTareas > 0
      ? Math.round(tareas.reduce((sum, t) => sum + t.porcentajeCompletado, 0) / totalTareas)
      : 0
    
    // 📊 Calcular fechas del proyecto
    const fechaInicioProyecto = tareas.length > 0 
      ? new Date(Math.min(...tareas.map(t => t.fechaInicio.getTime())))
      : proyectoServicio.proyecto.fechaInicio
    
    const fechaFinProyecto = tareas.length > 0 
      ? new Date(Math.max(...tareas.map(t => t.fechaFin.getTime())))
      : proyectoServicio.proyecto.fechaFin
    
    // 🔍 Obtener todas las dependencias del proyecto
    const dependencias = await prisma.dependenciaTarea.findMany({
      where: {
        OR: [
          {
            tareaOrigen: {
              proyectoServicioId: proyectoServicioId
            }
          },
          {
            tareaDependiente: {
              proyectoServicioId: proyectoServicioId
            }
          }
        ]
      },
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
    
    // 📊 Construir respuesta optimizada para Gantt
    const ganttData: GanttChartPayload = {
      tareas: tareas.map(tarea => ({
        id: tarea.id,
        nombre: tarea.nombre,
        descripcion: tarea.descripcion,
        estado: tarea.estado,
        prioridad: tarea.prioridad,
        fechaInicio: tarea.fechaInicio.toISOString(),
        fechaFin: tarea.fechaFin.toISOString(),
        fechaInicioReal: tarea.fechaInicioReal?.toISOString(),
        fechaFinReal: tarea.fechaFinReal?.toISOString(),
        progreso: tarea.porcentajeCompletado,
        horasEstimadas: Number(tarea.horasEstimadas || 0),
        horasReales: Number(tarea.horasReales || 0),
        responsable: {
          id: tarea.responsable?.id || '',
          nombre: tarea.responsable?.name || '',
          email: tarea.responsable?.email || ''
        },
        tipo: 'tarea' as const,
        nivel: 0,
        subtareas: tarea.subtareas.map(subtarea => ({
          id: subtarea.id,
          nombre: subtarea.nombre,
          descripcion: subtarea.descripcion,
          estado: subtarea.estado,
          prioridad: 'media' as const,
          fechaInicio: subtarea.fechaInicio.toISOString(),
          fechaFin: subtarea.fechaFin.toISOString(),
          fechaInicioReal: subtarea.fechaInicioReal?.toISOString(),
          fechaFinReal: subtarea.fechaFinReal?.toISOString(),
          horasEstimadas: Number(subtarea.horasEstimadas || 0),
          horasReales: Number(subtarea.horasReales || 0),
          progreso: subtarea.porcentajeCompletado,
          responsable: {
            id: subtarea.asignado?.id || '',
            nombre: subtarea.asignado?.name || '',
            email: subtarea.asignado?.email || ''
          },
          tipo: 'subtarea' as const,
          nivel: 1
        })),
        dependenciasOrigen: tarea.dependenciasOrigen.map(dep => ({
          id: dep.id,
          tipo: dep.tipo,
          tareaDependiente: dep.tareaDependiente
        })),
        dependenciasDependiente: tarea.dependenciasDependiente.map(dep => ({
          id: dep.id,
          tipo: dep.tipo,
          tareaOrigen: dep.tareaOrigen
        }))
      })),
      metricas: {
        progresoGeneral,
        horasTotales: totalHorasEstimadas,
        horasCompletadas: totalHorasReales,
        eficiencia: totalHorasEstimadas > 0 
          ? Math.round((totalHorasEstimadas / totalHorasReales) * 100) 
          : 0,
        fechaInicioProyecto: proyectoServicio.proyecto.fechaInicio.toISOString(),
        fechaFinProyecto: proyectoServicio.proyecto.fechaFin?.toISOString() || new Date().toISOString(),
        fechaInicioReal: undefined,
        fechaFinReal: undefined,
        diasRetraso: undefined,
        tareasTotal: totalTareas,
        tareasCompletadas,
        tareasPendientes,
        tareasEnProgreso
      }
    }
    
    return NextResponse.json(ganttData)
    
  } catch (error) {
    console.error('❌ Error al obtener datos del Gantt:', error)
    
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