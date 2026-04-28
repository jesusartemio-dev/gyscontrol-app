/**
 * API para obtener contadores de notificaciones
 *
 * Estrategia:
 * - Para admin/gerente: conteos GLOBALES (necesitan visibilidad total).
 * - Para roles operativos: conteos PERSONALES (solo lo que cada uno debe atender).
 *
 * Areas cubiertas:
 *   Comercial: cotizaciones-pendientes
 *   Proyectos: proyectos-activos, pedidos-pendientes
 *   Logística: listas-por-cotizar, recepciones-pendientes (siempre global por ser trabajo de logística)
 *   Tareas: tareas-asignadas, tareas-vencidas, tareas-proximas
 *   Asistencia: asistencia-abierta, solicitudes-remoto-pendientes
 *   Timesheet: timesheet-no-enviado, timesheet-rechazado, timesheet-pendientes-aprobacion
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ISO week computation (Mon-Sun) — formato "YYYY-Www" igual a TimesheetAprobacion.semana
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const role = session.user.role || ''
    const esAdminOrGerente = ['admin', 'gerente'].includes(role)
    const esLogistico = ['logistico', 'coordinador_logistico', 'admin', 'gerente'].includes(role)
    const esAprobadorTimesheet = ['admin', 'gerente', 'gestor', 'coordinador'].includes(role)

    const ahora = new Date()
    const inicioHoy = new Date(ahora); inicioHoy.setHours(0, 0, 0, 0)
    const finHoy = new Date(inicioHoy); finHoy.setDate(finHoy.getDate() + 1)
    const en3Dias = new Date(ahora); en3Dias.setDate(en3Dias.getDate() + 3)
    const semanaActual = getISOWeek(ahora)

    // ── Filtros por rol ──────────────────────────────
    const cotizacionesWhere: any = { estado: { in: ['borrador', 'enviada'] } }
    if (!esAdminOrGerente) cotizacionesWhere.comercialId = userId

    const proyectosWhere: any = {
      estado: { in: ['creado', 'en_planificacion', 'listas_pendientes', 'listas_aprobadas', 'pedidos_creados', 'en_ejecucion', 'en_cierre'] },
      deletedAt: null,
    }
    if (!esAdminOrGerente) {
      proyectosWhere.OR = [
        { gestorId: userId },
        { liderId: userId },
        { comercialId: userId },
      ]
    }

    const pedidosWhere: any = { estado: { in: ['borrador', 'enviado'] } }
    if (!esAdminOrGerente && !['logistico', 'coordinador_logistico'].includes(role)) {
      pedidosWhere.responsableId = userId
    }

    const listasWhere: any = { estado: { in: ['por_revisar', 'por_cotizar'] } }
    if (!esLogistico) listasWhere.responsableId = userId

    // ── Ejecutar todas las consultas en paralelo ──────
    const [
      cotizacionesPendientes,
      proyectosActivos,
      pedidosPendientes,
      listasPorCotizar,
      recepcionesPendientes,
      tareasAsignadas,
      tareasVencidas,
      tareasProximas,
      ingresosHoy,
      salidasHoy,
      solicitudesRemotoPendientes,
      timesheetSemanaActual,
      timesheetRechazado,
      timesheetPendientesAprobacion,
    ] = await Promise.all([
      prisma.cotizacion.count({ where: cotizacionesWhere }),
      prisma.proyecto.count({ where: proyectosWhere }),
      prisma.pedidoEquipo.count({ where: pedidosWhere }),
      prisma.listaEquipo.count({ where: listasWhere }),
      prisma.recepcionPendiente.count({
        where: { estado: { in: ['pendiente', 'en_almacen'] } },
      }),
      prisma.proyectoTarea.count({
        where: {
          responsableId: userId,
          estado: { in: ['pendiente', 'en_progreso'] },
        },
      }),
      prisma.proyectoTarea.count({
        where: {
          responsableId: userId,
          estado: { in: ['pendiente', 'en_progreso', 'pausada'] },
          fechaFin: { lt: ahora },
        },
      }),
      prisma.proyectoTarea.count({
        where: {
          responsableId: userId,
          estado: { in: ['pendiente', 'en_progreso'] },
          fechaFin: { gte: ahora, lte: en3Dias },
        },
      }),
      prisma.asistencia.count({
        where: { userId, fechaHora: { gte: inicioHoy, lt: finHoy }, tipo: 'ingreso' },
      }),
      prisma.asistencia.count({
        where: { userId, fechaHora: { gte: inicioHoy, lt: finHoy }, tipo: 'salida' },
      }),
      prisma.solicitudTrabajoRemoto.count({
        where: { aprobadorId: userId, estado: 'pendiente' },
      }),
      prisma.timesheetAprobacion.findUnique({
        where: { usuarioId_semana: { usuarioId: userId, semana: semanaActual } },
        select: { estado: true },
      }),
      prisma.timesheetAprobacion.count({
        where: { usuarioId: userId, estado: 'rechazado' },
      }),
      esAprobadorTimesheet
        ? prisma.timesheetAprobacion.count({ where: { estado: 'enviado' } })
        : Promise.resolve(0),
    ])

    // Asistencia abierta: hay ingreso hoy y aún no marcó salida
    const asistenciaAbierta = ingresosHoy > salidasHoy ? 1 : 0

    // Timesheet no enviado: no existe registro O está en borrador para semana actual
    const timesheetNoEnviado =
      !timesheetSemanaActual || timesheetSemanaActual.estado === 'borrador' ? 1 : 0

    return NextResponse.json({
      'cotizaciones-pendientes': cotizacionesPendientes,
      'proyectos-activos': proyectosActivos,
      'pedidos-pendientes': pedidosPendientes,
      'listas-por-cotizar': listasPorCotizar,
      'recepciones-pendientes': recepcionesPendientes,
      'tareas-asignadas': tareasAsignadas,
      'tareas-vencidas': tareasVencidas,
      'tareas-proximas': tareasProximas,
      'asistencia-abierta': asistenciaAbierta,
      'solicitudes-remoto-pendientes': solicitudesRemotoPendientes,
      'timesheet-no-enviado': timesheetNoEnviado,
      'timesheet-rechazado': timesheetRechazado,
      'timesheet-pendientes-aprobacion': timesheetPendientesAprobacion,
    })
  } catch (error) {
    console.error('Error fetching notification counts:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
