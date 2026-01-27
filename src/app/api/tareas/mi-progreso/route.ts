/**
 * API para obtener metricas de progreso personal del usuario actual
 *
 * Calcula estadisticas por periodo (semana, mes) basadas en:
 * - Tareas asignadas al usuario (Tarea y ProyectoTarea)
 * - Horas registradas
 * - Eficiencia y tendencias
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths
} from 'date-fns'

interface MetricaPeriodo {
  periodo: string
  periodoKey: string
  horasRegistradas: number
  horasObjetivo: number
  tareasCompletadas: number
  tareasAsignadas: number
  eficiencia: number
  tendencia: 'up' | 'down' | 'stable'
}

interface ProyectoProgreso {
  id: string
  nombre: string
  codigo: string
  horasRegistradas: number
  horasObjetivo: number
  progreso: number
  tareasCompletadas: number
  tareasTotal: number
}

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const ahora = new Date()

    // Definir rangos de fechas
    const inicioSemanaActual = startOfWeek(ahora, { weekStartsOn: 1 })
    const finSemanaActual = endOfWeek(ahora, { weekStartsOn: 1 })
    const inicioSemanaAnterior = startOfWeek(subWeeks(ahora, 1), { weekStartsOn: 1 })
    const finSemanaAnterior = endOfWeek(subWeeks(ahora, 1), { weekStartsOn: 1 })
    const inicioMesActual = startOfMonth(ahora)
    const finMesActual = endOfMonth(ahora)
    const inicioMesAnterior = startOfMonth(subMonths(ahora, 1))
    const finMesAnterior = endOfMonth(subMonths(ahora, 1))

    // Obtener todas las tareas asignadas al usuario (ProyectoTarea)
    const proyectoTareas = await prisma.proyectoTarea.findMany({
      where: { responsableId: userId },
      include: {
        proyectoEdt: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true
              }
            }
          }
        },
        registroHoras: {
          where: { usuarioId: userId }
        }
      }
    })

    // Obtener tareas del modelo Tarea asignadas al usuario
    const tareas = await prisma.tarea.findMany({
      where: { responsableId: userId },
      include: {
        proyectoServicioCotizado: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true
              }
            }
          }
        }
      }
    })

    // Obtener registros de horas del usuario
    const registrosHoras = await prisma.registroHoras.findMany({
      where: { usuarioId: userId },
      select: {
        horasTrabajadas: true,
        fechaTrabajo: true,
        proyectoId: true
      }
    })

    // Calcular metricas por periodo
    const calcularMetricasPeriodo = (
      inicio: Date,
      fin: Date,
      periodoNombre: string,
      periodoKey: string,
      periodoAnteriorInicio?: Date,
      periodoAnteriorFin?: Date
    ): MetricaPeriodo => {
      // Horas registradas en el periodo
      const horasEnPeriodo = registrosHoras
        .filter(r => {
          const fecha = new Date(r.fechaTrabajo)
          return fecha >= inicio && fecha <= fin
        })
        .reduce((sum, r) => sum + r.horasTrabajadas, 0)

      // Tareas completadas en el periodo (ProyectoTarea)
      const tareasCompletadasPT = proyectoTareas.filter(t => {
        if (t.estado !== 'completada' || !t.fechaFinReal) return false
        const fechaFin = new Date(t.fechaFinReal)
        return fechaFin >= inicio && fechaFin <= fin
      }).length

      // Tareas completadas en el periodo (Tarea)
      const tareasCompletadasT = tareas.filter(t => {
        if (t.estado !== 'completada' || !t.fechaFinReal) return false
        const fechaFin = new Date(t.fechaFinReal)
        return fechaFin >= inicio && fechaFin <= fin
      }).length

      const tareasCompletadas = tareasCompletadasPT + tareasCompletadasT

      // Total tareas asignadas activas
      const tareasAsignadas = proyectoTareas.filter(t =>
        t.estado !== 'cancelada'
      ).length + tareas.filter(t =>
        t.estado !== 'cancelada'
      ).length

      // Horas objetivo (40h semanales, 160h mensuales aproximadamente)
      const horasObjetivo = periodoKey === 'mes' ? 160 : 40

      // Eficiencia basada en horas objetivo
      const eficiencia = horasObjetivo > 0
        ? Math.min(Math.round((horasEnPeriodo / horasObjetivo) * 100), 100)
        : 0

      // Calcular tendencia comparando con periodo anterior
      let tendencia: 'up' | 'down' | 'stable' = 'stable'
      if (periodoAnteriorInicio && periodoAnteriorFin) {
        const horasAnterior = registrosHoras
          .filter(r => {
            const fecha = new Date(r.fechaTrabajo)
            return fecha >= periodoAnteriorInicio && fecha <= periodoAnteriorFin
          })
          .reduce((sum, r) => sum + r.horasTrabajadas, 0)

        if (horasEnPeriodo > horasAnterior * 1.1) tendencia = 'up'
        else if (horasEnPeriodo < horasAnterior * 0.9) tendencia = 'down'
      }

      return {
        periodo: periodoNombre,
        periodoKey,
        horasRegistradas: Math.round(horasEnPeriodo * 10) / 10,
        horasObjetivo,
        tareasCompletadas,
        tareasAsignadas,
        eficiencia,
        tendencia
      }
    }

    // Calcular metricas para cada periodo
    const metricaSemanaActual = calcularMetricasPeriodo(
      inicioSemanaActual,
      finSemanaActual,
      'Esta semana',
      'semana',
      inicioSemanaAnterior,
      finSemanaAnterior
    )

    const metricaSemanaAnterior = calcularMetricasPeriodo(
      inicioSemanaAnterior,
      finSemanaAnterior,
      'Semana anterior',
      'semana_anterior'
    )

    const metricaMesActual = calcularMetricasPeriodo(
      inicioMesActual,
      finMesActual,
      'Este mes',
      'mes',
      inicioMesAnterior,
      finMesAnterior
    )

    // Calcular progreso por proyecto
    const proyectosMap = new Map<string, ProyectoProgreso>()

    // Agregar datos de ProyectoTarea
    proyectoTareas.forEach(tarea => {
      const proyecto = tarea.proyectoEdt?.proyecto
      if (!proyecto) return

      if (!proyectosMap.has(proyecto.id)) {
        proyectosMap.set(proyecto.id, {
          id: proyecto.id,
          nombre: proyecto.nombre,
          codigo: proyecto.codigo,
          horasRegistradas: 0,
          horasObjetivo: 0,
          progreso: 0,
          tareasCompletadas: 0,
          tareasTotal: 0
        })
      }

      const p = proyectosMap.get(proyecto.id)!
      p.tareasTotal++
      p.horasObjetivo += Number(tarea.horasEstimadas || 0)
      p.horasRegistradas += Number(tarea.horasReales || 0)
      if (tarea.estado === 'completada') p.tareasCompletadas++
    })

    // Agregar datos de Tarea
    tareas.forEach(tarea => {
      const proyecto = tarea.proyectoServicioCotizado?.proyecto
      if (!proyecto) return

      if (!proyectosMap.has(proyecto.id)) {
        proyectosMap.set(proyecto.id, {
          id: proyecto.id,
          nombre: proyecto.nombre,
          codigo: proyecto.codigo,
          horasRegistradas: 0,
          horasObjetivo: 0,
          progreso: 0,
          tareasCompletadas: 0,
          tareasTotal: 0
        })
      }

      const p = proyectosMap.get(proyecto.id)!
      p.tareasTotal++
      p.horasObjetivo += Number(tarea.horasEstimadas || 0)
      p.horasRegistradas += Number(tarea.horasReales || 0)
      if (tarea.estado === 'completada') p.tareasCompletadas++
    })

    // Calcular progreso para cada proyecto
    const proyectosProgreso = Array.from(proyectosMap.values()).map(p => ({
      ...p,
      horasRegistradas: Math.round(p.horasRegistradas * 10) / 10,
      horasObjetivo: Math.round(p.horasObjetivo * 10) / 10,
      progreso: p.tareasTotal > 0
        ? Math.round((p.tareasCompletadas / p.tareasTotal) * 100)
        : 0
    })).sort((a, b) => b.tareasTotal - a.tareasTotal)

    // Calcular logros dinamicos
    const logros = []

    if (metricaSemanaActual.tareasCompletadas > 0) {
      logros.push({
        tipo: 'tareas',
        titulo: `${metricaSemanaActual.tareasCompletadas} tarea${metricaSemanaActual.tareasCompletadas > 1 ? 's' : ''} completada${metricaSemanaActual.tareasCompletadas > 1 ? 's' : ''} esta semana`,
        descripcion: metricaSemanaActual.tareasCompletadas >= 5 ? 'Excelente rendimiento!' : 'Sigue asi!'
      })
    }

    if (metricaSemanaActual.eficiencia >= 80) {
      logros.push({
        tipo: 'eficiencia',
        titulo: `Eficiencia del ${metricaSemanaActual.eficiencia}%`,
        descripcion: 'Meta de eficiencia cumplida'
      })
    }

    if (metricaMesActual.horasRegistradas > 0) {
      logros.push({
        tipo: 'horas',
        titulo: `${metricaMesActual.horasRegistradas} horas registradas este mes`,
        descripcion: `Objetivo: ${metricaMesActual.horasObjetivo}h`
      })
    }

    // Calcular objetivos pendientes
    const objetivos = []

    const tareasPendientes = metricaSemanaActual.tareasAsignadas - metricaSemanaActual.tareasCompletadas
    if (tareasPendientes > 0) {
      objetivos.push({
        tipo: 'tareas',
        titulo: `Completar ${tareasPendientes} tarea${tareasPendientes > 1 ? 's' : ''} pendiente${tareasPendientes > 1 ? 's' : ''}`,
        descripcion: 'Tareas asignadas activas'
      })
    }

    const horasFaltantes = metricaSemanaActual.horasObjetivo - metricaSemanaActual.horasRegistradas
    if (horasFaltantes > 0) {
      objetivos.push({
        tipo: 'horas',
        titulo: `Registrar ${Math.round(horasFaltantes)} horas esta semana`,
        descripcion: `Faltan ${Math.round(horasFaltantes)}h para la meta semanal`
      })
    }

    if (metricaSemanaActual.eficiencia < 75) {
      objetivos.push({
        tipo: 'eficiencia',
        titulo: 'Alcanzar eficiencia del 75%',
        descripcion: `Actual: ${metricaSemanaActual.eficiencia}%`
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        metricas: [
          metricaSemanaActual,
          metricaSemanaAnterior,
          metricaMesActual
        ],
        proyectos: proyectosProgreso,
        logros,
        objetivos,
        resumen: {
          totalTareas: metricaSemanaActual.tareasAsignadas,
          tareasCompletadasSemana: metricaSemanaActual.tareasCompletadas,
          tareasCompletadasMes: metricaMesActual.tareasCompletadas,
          horasSemana: metricaSemanaActual.horasRegistradas,
          horasMes: metricaMesActual.horasRegistradas,
          eficienciaSemana: metricaSemanaActual.eficiencia,
          eficienciaMes: metricaMesActual.eficiencia
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo progreso personal:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    )
  }
}
