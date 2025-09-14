// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/tareas/progreso/
// 🔧 Descripción: API REST especializada para estadísticas de progreso
//    Endpoints: GET (estadísticas de progreso de tareas)
//
// 🧠 Funcionalidades:
//    - Obtener métricas de progreso por proyecto
//    - Estadísticas por responsable y estado
//    - Análisis de rendimiento y eficiencia
//    - Filtros por fecha y proyecto
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { 
  EstadoTarea,
  PrioridadTarea 
} from '@/types/modelos'

// 🔍 Schema de validación para query parameters
const querySchema = z.object({
  proyectoServicioId: z.string().optional(),
  responsableId: z.string().optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  includeSubtareas: z.string().transform(val => val === 'true').default('true'),
  includeHistorico: z.string().transform(val => val === 'true').default('false'),
  groupBy: z.enum(['proyecto', 'responsable', 'estado', 'prioridad']).default('proyecto')
})

// 📊 Interface para estadísticas de progreso
interface EstadisticasProgreso {
  resumen: {
    totalTareas: number
    tareasCompletadas: number
    tareasEnProgreso: number
    tareasPendientes: number
    tareasCanceladas: number
    porcentajeCompletado: number
    progresoPromedio: number
  }
  rendimiento: {
    horasEstimadas: number
    horasReales: number
    eficiencia: number
    desviacionTiempo: number
    tareasAtrasadas: number
    tareasAdelantadas: number
  }
  distribucion: {
    porEstado: Record<EstadoTarea, number>
    porPrioridad: Record<PrioridadTarea, number>
    porResponsable: Array<{
      responsableId: string
      nombreResponsable: string
      totalTareas: number
      tareasCompletadas: number
      progresoPromedio: number
      eficiencia: number
    }>
  }
  tendencias?: {
    progresoSemanal: Array<{
      semana: string
      tareasCompletadas: number
      progresoPromedio: number
    }>
    rendimientoMensual: Array<{
      mes: string
      eficiencia: number
      horasPromedio: number
    }>
  }
}

/**
 * 📡 GET /api/tareas/progreso
 * Obtiene estadísticas detalladas de progreso de tareas
 * 
 * @param request - Request object con parámetros de consulta
 * @returns EstadisticasProgreso con métricas y análisis
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Validar query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = querySchema.parse({
      proyectoServicioId: searchParams.get('proyectoServicioId') || undefined,
      responsableId: searchParams.get('responsableId') || undefined,
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined,
      includeSubtareas: searchParams.get('includeSubtareas') || 'true',
      includeHistorico: searchParams.get('includeHistorico') || 'false',
      groupBy: searchParams.get('groupBy') || 'proyecto'
    })

    // 📡 Construir filtros base
    const whereClause: any = {}
    
    if (queryParams.proyectoServicioId) {
      whereClause.proyectoServicioId = queryParams.proyectoServicioId
    }
    
    if (queryParams.responsableId) {
      whereClause.responsableId = queryParams.responsableId
    }
    
    if (queryParams.fechaDesde || queryParams.fechaHasta) {
      whereClause.fechaInicio = {}
      if (queryParams.fechaDesde) {
        whereClause.fechaInicio.gte = new Date(queryParams.fechaDesde)
      }
      if (queryParams.fechaHasta) {
        whereClause.fechaInicio.lte = new Date(queryParams.fechaHasta)
      }
    }

    // 📡 Obtener tareas con relaciones necesarias
    const tareas = await prisma.tarea.findMany({
      where: whereClause,
      include: {
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        proyectoServicio: {
          select: {
            id: true,
            categoria: true
          }
        },
        subtareas: queryParams.includeSubtareas ? {
          select: {
            id: true,
            porcentajeCompletado: true,
            horasEstimadas: true,
            horasReales: true
          }
        } : false,
        registrosProgreso: queryParams.includeHistorico ? {
          orderBy: { fecha: 'desc' },
          select: {
            fecha: true,
            porcentajeCompletado: true,
            horasTrabajadas: true
          }
        } : false
      }
    })

    // 📊 Calcular estadísticas de resumen
    const totalTareas = tareas.length
    const tareasCompletadas = tareas.filter(t => t.estado === 'completada').length
    const tareasEnProgreso = tareas.filter(t => t.estado === 'en_progreso').length
    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente').length
    const tareasCanceladas = tareas.filter(t => t.estado === 'cancelada').length
    
    const porcentajeCompletado = totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0
    const progresoPromedio = totalTareas > 0
      ? tareas.reduce((sum, t) => sum + t.porcentajeCompletado, 0) / totalTareas
      : 0

    // 📊 Calcular métricas de rendimiento
    const horasEstimadas = tareas.reduce((sum, t) => sum + (t.horasEstimadas ? Number(t.horasEstimadas) : 0), 0)
    const horasReales = tareas.reduce((sum, t) => sum + (t.horasReales ? Number(t.horasReales) : 0), 0)
    const eficiencia = horasEstimadas > 0 ? (horasEstimadas / horasReales) * 100 : 0
    const desviacionTiempo = horasReales - horasEstimadas
    
    const ahora = new Date()
    const tareasAtrasadas = tareas.filter(t => 
      t.estado !== 'completada' && 
      t.estado !== 'cancelada' && 
      new Date(t.fechaFin) < ahora
    ).length
    
    const tareasAdelantadas = tareas.filter(t => 
      t.estado === 'completada' && 
      t.fechaFinReal && 
      new Date(t.fechaFinReal) < new Date(t.fechaFin)
    ).length

    // 📊 Calcular distribución por estado
    const porEstado: Record<EstadoTarea, number> = {
      pendiente: tareasPendientes,
      en_progreso: tareasEnProgreso,
      completada: tareasCompletadas,
      cancelada: tareasCanceladas,
      pausada: tareas.filter(t => t.estado === 'pausada').length
    }

    // 📊 Calcular distribución por prioridad
    const porPrioridad: Record<PrioridadTarea, number> = {
      baja: tareas.filter(t => t.prioridad === 'baja').length,
      media: tareas.filter(t => t.prioridad === 'media').length,
      alta: tareas.filter(t => t.prioridad === 'alta').length,
      critica: tareas.filter(t => t.prioridad === 'critica').length
    }

    // 📊 Calcular estadísticas por responsable
    const responsablesMap = new Map()
    
    tareas.forEach(tarea => {
      if (!tarea.responsable) return // Skip tasks without responsible
      
      const responsableId = tarea.responsable.id
      if (!responsablesMap.has(responsableId)) {
        responsablesMap.set(responsableId, {
          responsableId,
          nombreResponsable: tarea.responsable.name || 'Sin nombre',
          totalTareas: 0,
          tareasCompletadas: 0,
          progresoTotal: 0,
          horasEstimadas: 0,
          horasReales: 0
        })
      }
      
      const stats = responsablesMap.get(responsableId)
      stats.totalTareas++
      stats.progresoTotal += tarea.porcentajeCompletado
      stats.horasEstimadas += tarea.horasEstimadas ? Number(tarea.horasEstimadas) : 0
      stats.horasReales += tarea.horasReales ? Number(tarea.horasReales) : 0
      
      if (tarea.estado === 'completada') {
        stats.tareasCompletadas++
      }
    })

    const porResponsable = Array.from(responsablesMap.values()).map(stats => ({
      responsableId: stats.responsableId,
      nombreResponsable: stats.nombreResponsable,
      totalTareas: stats.totalTareas,
      tareasCompletadas: stats.tareasCompletadas,
      progresoPromedio: stats.totalTareas > 0 ? stats.progresoTotal / stats.totalTareas : 0,
      eficiencia: stats.horasEstimadas > 0 ? (stats.horasEstimadas / stats.horasReales) * 100 : 0
    }))

    // 📊 Construir respuesta base
    const estadisticas: EstadisticasProgreso = {
      resumen: {
        totalTareas,
        tareasCompletadas,
        tareasEnProgreso,
        tareasPendientes,
        tareasCanceladas,
        porcentajeCompletado: Math.round(porcentajeCompletado * 100) / 100,
        progresoPromedio: Math.round(progresoPromedio * 100) / 100
      },
      rendimiento: {
        horasEstimadas,
        horasReales,
        eficiencia: Math.round(eficiencia * 100) / 100,
        desviacionTiempo,
        tareasAtrasadas,
        tareasAdelantadas
      },
      distribucion: {
        porEstado,
        porPrioridad,
        porResponsable
      }
    }

    // 📊 Agregar tendencias históricas si se solicita
    if (queryParams.includeHistorico && tareas.some(t => t.registrosProgreso && t.registrosProgreso.length > 0)) {
      // 🔧 Calcular progreso semanal (últimas 12 semanas)
      const progresoSemanal = []
      const rendimientoMensual = []
      
      // Implementación simplificada - en producción sería más compleja
      for (let i = 11; i >= 0; i--) {
        const fechaSemana = new Date()
        fechaSemana.setDate(fechaSemana.getDate() - (i * 7))
        
        progresoSemanal.push({
          semana: `Semana ${12 - i}`,
          tareasCompletadas: Math.floor(Math.random() * 10), // Placeholder
          progresoPromedio: Math.floor(Math.random() * 100) // Placeholder
        })
      }
      
      for (let i = 5; i >= 0; i--) {
        rendimientoMensual.push({
          mes: `Mes ${6 - i}`,
          eficiencia: Math.floor(Math.random() * 100), // Placeholder
          horasPromedio: Math.floor(Math.random() * 40) // Placeholder
        })
      }
      
      estadisticas.tendencias = {
        progresoSemanal,
        rendimientoMensual
      }
    }

    return NextResponse.json(estadisticas, { status: 200 })

  } catch (error) {
    console.error('❌ Error en GET /api/tareas/progreso:', error)
    
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