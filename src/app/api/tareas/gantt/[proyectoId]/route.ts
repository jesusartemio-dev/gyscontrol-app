// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/tareas/gantt/[proyectoId]/
// 🔧 Descripción: API REST especializada para Gantt Chart
//    Endpoints: GET (datos del Gantt por proyecto)
//
// 🧠 Funcionalidades:
//    - Obtener datos optimizados para Gantt Chart
//    - Incluir métricas y análisis de progreso
//    - Calcular ruta crítica y timeline
//    - Validación de parámetros
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { 
  calcularMetricasProyecto,
  generarTimeline,
  identificarRutaCritica,
  analizarCargaTrabajo
} from '@/lib/services/gantt'
import type { 
  GanttChartPayload,
  GanttTaskPayload,
  GanttMetricsPayload 
} from '@/types/payloads'

// 🔍 Schema de validación para parámetros de ruta
const paramsSchema = z.object({
  proyectoId: z.string().min(1, 'ID del proyecto es requerido')
})

// 🔍 Schema de validación para query parameters
const querySchema = z.object({
  includeMetrics: z.string().transform(val => val === 'true').default('true'),
  includeTimeline: z.string().transform(val => val === 'true').default('true'),
  includeCriticalPath: z.string().transform(val => val === 'true').default('true'),
  includeWorkload: z.string().transform(val => val === 'true').default('false'),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional()
})

/**
 * 📡 GET /api/tareas/gantt/[proyectoId]
 * Obtiene datos optimizados del Gantt Chart para un proyecto específico
 * 
 * @param request - Request object con parámetros de consulta
 * @param params - Parámetros de ruta { proyectoId }
 * @returns GanttChartPayload con datos, métricas y análisis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proyectoId: string }> }
) {
  try {
    // ✅ Validar parámetros de ruta
    const resolvedParams = await params
    const { proyectoId } = paramsSchema.parse(resolvedParams)
    
    // ✅ Validar query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = querySchema.parse({
      includeMetrics: searchParams.get('includeMetrics') || 'true',
      includeTimeline: searchParams.get('includeTimeline') || 'true',
      includeCriticalPath: searchParams.get('includeCriticalPath') || 'true',
      includeWorkload: searchParams.get('includeWorkload') || 'false',
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined
    })

    // 🔍 Verificar que el proyecto existe
    const proyecto = await prisma.proyectoServicioCotizado.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        proyecto: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        }
      }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // 📡 Construir filtros de fecha si se proporcionan
    const dateFilters: any = {}
    if (queryParams.fechaDesde) {
      dateFilters.fechaInicio = { gte: new Date(queryParams.fechaDesde) }
    }
    if (queryParams.fechaHasta) {
      dateFilters.fechaFin = { lte: new Date(queryParams.fechaHasta) }
    }

    // 📡 Obtener tareas del proyecto con relaciones necesarias
    const tareas = await prisma.tarea.findMany({
      where: {
        proyectoServicioId: proyectoId,
        ...dateFilters
      },
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
          }
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
          orderBy: { fecha: 'desc' },
          take: 5,
          select: {
            id: true,
            fecha: true,
            porcentajeCompletado: true,
            descripcion: true,
            horasTrabajadas: true
          }
        }
      },
      orderBy: [
        { fechaInicio: 'asc' },
        { prioridad: 'desc' }
      ]
    })

    // 🔧 Transformar datos para el formato Gantt
    const ganttTasks: GanttTaskPayload[] = tareas.map(tarea => ({
      id: tarea.id,
      nombre: tarea.nombre,
      descripcion: tarea.descripcion || '',
      estado: tarea.estado,
      prioridad: tarea.prioridad,
      fechaInicio: tarea.fechaInicio.toISOString(),
      fechaFin: tarea.fechaFin.toISOString(),
      fechaInicioReal: tarea.fechaInicioReal?.toISOString(),
      fechaFinReal: tarea.fechaFinReal?.toISOString(),
      progreso: tarea.porcentajeCompletado,
      horasEstimadas: Number(tarea.horasEstimadas || 0),
      horasReales: Number(tarea.horasReales || 0),
      tipo: 'tarea' as const,
      nivel: 0,
      responsable: tarea.responsable ? {
        id: tarea.responsable.id,
        nombre: tarea.responsable.name || '',
        email: tarea.responsable.email
      } : {
        id: '',
        nombre: 'Sin asignar',
        email: ''
      },
      subtareas: tarea.subtareas.map(subtarea => ({
        id: subtarea.id,
        nombre: subtarea.nombre,
        descripcion: subtarea.descripcion || '',
        fechaInicio: subtarea.fechaInicio.toISOString(),
        fechaFin: subtarea.fechaFin.toISOString(),
        fechaInicioReal: subtarea.fechaInicioReal?.toISOString(),
        fechaFinReal: subtarea.fechaFinReal?.toISOString(),
        progreso: Number(subtarea.porcentajeCompletado || 0),
        estado: 'pendiente' as const,
        prioridad: 'media' as const,
        responsable: subtarea.asignado ? {
          id: subtarea.asignado.id,
          nombre: subtarea.asignado.name || '',
          email: subtarea.asignado.email
        } : {
          id: '',
          nombre: 'Sin asignar',
          email: ''
        },
        horasEstimadas: Number(subtarea.horasEstimadas || 0),
        horasReales: Number(subtarea.horasReales || 0),
        dependencias: [],
        subtareas: [],
        tipo: 'subtarea' as const,
        nivel: 1
      })),
      dependencias: [
        ...tarea.dependenciasDependiente.map(dep => dep.tareaOrigen.id),
        ...tarea.dependenciasOrigen.map(dep => dep.tareaDependiente.id)
      ],
      recursos: tarea.asignaciones.map(asignacion => ({
        id: asignacion.usuario.id,
        nombre: asignacion.usuario.name || '',
        tipo: asignacion.rol,
        horasAsignadas: Number(asignacion.horasAsignadas || 0)
      })),
      ultimosRegistros: tarea.registrosProgreso
    }))

    // 🔧 Construir payload base del Gantt
    const ganttData: GanttChartPayload = {
      tareas: ganttTasks,
      metricas: {
         progresoGeneral: Math.round(
           ganttTasks.length > 0 ? (ganttTasks.filter(t => t.estado === 'completada').length / ganttTasks.length) * 100 : 0
         ),
         horasTotales: ganttTasks.reduce((sum, t) => sum + Number(t.horasEstimadas || 0), 0),
         horasCompletadas: ganttTasks.reduce((sum, t) => sum + Number(t.horasReales || 0), 0),
         eficiencia: 0,
         fechaInicioProyecto: ganttTasks.length > 0 ? new Date(Math.min(...ganttTasks.map(t => new Date(t.fechaInicio).getTime()))).toISOString() : new Date().toISOString(),
         fechaFinProyecto: ganttTasks.length > 0 ? new Date(Math.max(...ganttTasks.map(t => new Date(t.fechaFin).getTime()))).toISOString() : new Date().toISOString(),
         diasRetraso: 0,
         tareasTotal: ganttTasks.length,
         tareasCompletadas: ganttTasks.filter(t => t.estado === 'completada').length,
         tareasPendientes: ganttTasks.filter(t => t.estado === 'pendiente').length,
         tareasEnProgreso: ganttTasks.filter(t => t.estado === 'en_progreso').length
       },
      rutaCritica: [],
      timeline: [],
      cargaTrabajo: []
    }

    // 📊 Calcular métricas adicionales según parámetros
    const response: any = {
      ganttData
    }

    if (queryParams.includeMetrics) {
      response.metricas = calcularMetricasProyecto(ganttData)
    }

    if (queryParams.includeTimeline) {
      response.timeline = generarTimeline(ganttData.tareas)
    }

    if (queryParams.includeCriticalPath) {
      response.rutaCritica = identificarRutaCritica(ganttData)
    }

    if (queryParams.includeWorkload) {
      response.cargaTrabajo = analizarCargaTrabajo(ganttData)
    }

    return NextResponse.json(ganttData, { status: 200 })

  } catch (error) {
    console.error('❌ Error en GET /api/tareas/gantt/[proyectoId]:', error)
    
    // 🔍 Manejo específico de errores de validación
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos',
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
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