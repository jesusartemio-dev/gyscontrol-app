import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWeekRange, getISOWeek } from '@/lib/utils/timesheetAprobacion'
import { EstadoTimesheet } from '@prisma/client'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

/**
 * Enriches a timesheet entry (real or virtual) with RegistroHoras detail.
 */
async function enrichWithRegistros(usuarioId: string, semana: string) {
  const { inicio, fin } = getWeekRange(semana)

  const registros = await prisma.registroHoras.findMany({
    where: {
      usuarioId,
      origen: { in: ['oficina', 'campo'] },
      fechaTrabajo: { gte: inicio, lte: fin },
    },
    select: {
      id: true,
      fechaTrabajo: true,
      horasTrabajadas: true,
      descripcion: true,
      nombreServicio: true,
      origen: true,
      proyecto: { select: { id: true, codigo: true, nombre: true } },
      proyectoEdt: { select: { nombre: true } },
      proyectoTarea: { select: { nombre: true } },
    },
    orderBy: { fechaTrabajo: 'asc' },
  })

  // Group hours by project
  const porProyecto: Record<string, { codigo: string; nombre: string; horas: number }> = {}
  for (const r of registros) {
    const pid = r.proyecto.id
    if (!porProyecto[pid]) {
      porProyecto[pid] = { codigo: r.proyecto.codigo, nombre: r.proyecto.nombre, horas: 0 }
    }
    porProyecto[pid].horas += r.horasTrabajadas
  }

  const diasUnicos = new Set(registros.map(r => new Date(r.fechaTrabajo).toISOString().slice(0, 10)))
  const totalHoras = registros.reduce((s, r) => s + r.horasTrabajadas, 0)

  return {
    registros,
    proyectos: Object.values(porProyecto),
    diasTrabajados: diasUnicos.size,
    totalHoras: Math.round(totalHoras * 100) / 100,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const estadoParam = searchParams.get('estado') || 'enviado'
    const usuarioId = searchParams.get('usuarioId')
    const semanaDesde = searchParams.get('semanaDesde') // e.g. "2026-W05"
    const semanaHasta = searchParams.get('semanaHasta') // e.g. "2026-W08"

    // ─── 1. Fetch existing TimesheetAprobacion records ───
    const where: Record<string, unknown> = {}
    // For 'todos' and 'sin_enviar', don't filter by estado on TimesheetAprobacion
    if (estadoParam !== 'todos' && estadoParam !== 'sin_enviar') {
      where.estado = estadoParam as EstadoTimesheet
    }
    if (usuarioId) {
      where.usuarioId = usuarioId
    }
    if (semanaDesde || semanaHasta) {
      where.semana = {}
      if (semanaDesde) (where.semana as Record<string, string>).gte = semanaDesde
      if (semanaHasta) (where.semana as Record<string, string>).lte = semanaHasta
    }

    // Don't query TimesheetAprobacion if we only want sin_enviar
    const aprobaciones = estadoParam === 'sin_enviar'
      ? []
      : await prisma.timesheetAprobacion.findMany({
          where,
          include: {
            usuario: { select: { id: true, name: true, email: true } },
            aprobadoPor: { select: { name: true } },
          },
          orderBy: [
            { estado: 'asc' },
            { fechaEnvio: 'desc' },
          ],
        })

    // Enrich existing aprobaciones
    const result: any[] = await Promise.all(
      aprobaciones.map(async (a) => {
        const enriched = await enrichWithRegistros(a.usuarioId, a.semana)
        return {
          id: a.id,
          semana: a.semana,
          estado: a.estado as string,
          totalHoras: enriched.totalHoras || a.totalHoras,
          fechaEnvio: a.fechaEnvio,
          fechaResolucion: a.fechaResolucion,
          motivoRechazo: a.motivoRechazo,
          usuario: a.usuario,
          aprobadoPor: a.aprobadoPor?.name || null,
          diasTrabajados: enriched.diasTrabajados,
          proyectos: enriched.proyectos,
          registros: enriched.registros,
        }
      })
    )

    // ─── 2. Discover RegistroHoras without TimesheetAprobacion ("sin_enviar") ───
    // Only include when tab is 'todos' or 'sin_enviar'
    if (estadoParam === 'todos' || estadoParam === 'sin_enviar') {
      // Build date range filter for RegistroHoras
      const fechaWhere: Record<string, unknown> = {}
      if (semanaDesde) {
        const { inicio } = getWeekRange(semanaDesde)
        fechaWhere.gte = inicio
      }
      if (semanaHasta) {
        const { fin } = getWeekRange(semanaHasta)
        fechaWhere.lte = fin
      }

      const rhWhere: Record<string, unknown> = {
        origen: { in: ['oficina', 'campo'] },
      }
      if (usuarioId) rhWhere.usuarioId = usuarioId
      if (Object.keys(fechaWhere).length > 0) rhWhere.fechaTrabajo = fechaWhere

      // Get all distinct user+week combinations from RegistroHoras
      const allRegistros = await prisma.registroHoras.findMany({
        where: rhWhere,
        select: {
          usuarioId: true,
          fechaTrabajo: true,
        },
      })

      // Group by user + ISO week
      const userWeekMap = new Map<string, { usuarioId: string; semana: string }>()
      for (const r of allRegistros) {
        const semana = getISOWeek(new Date(r.fechaTrabajo))
        const key = `${r.usuarioId}__${semana}`
        if (!userWeekMap.has(key)) {
          userWeekMap.set(key, { usuarioId: r.usuarioId, semana })
        }
      }

      // Existing aprobacion keys (already in result)
      const existingKeys = new Set(
        aprobaciones.map(a => `${a.usuarioId}__${a.semana}`)
      )

      // Find "orphan" user+week combos without TimesheetAprobacion
      const orphans: { usuarioId: string; semana: string }[] = []
      for (const [key, val] of userWeekMap) {
        if (!existingKeys.has(key)) {
          orphans.push(val)
        }
      }

      if (orphans.length > 0) {
        // Also check if there's a TimesheetAprobacion we didn't fetch (because of estado filter)
        const orphanUserIds = [...new Set(orphans.map(o => o.usuarioId))]
        const orphanSemanas = [...new Set(orphans.map(o => o.semana))]

        const existingAprobacionesForOrphans = await prisma.timesheetAprobacion.findMany({
          where: {
            usuarioId: { in: orphanUserIds },
            semana: { in: orphanSemanas },
          },
          select: { usuarioId: true, semana: true },
        })
        const existingAprobacionKeys = new Set(
          existingAprobacionesForOrphans.map(a => `${a.usuarioId}__${a.semana}`)
        )

        // Only truly orphaned ones (no TimesheetAprobacion at all)
        const trueOrphans = orphans.filter(
          o => !existingAprobacionKeys.has(`${o.usuarioId}__${o.semana}`)
        )

        if (trueOrphans.length > 0) {
          // Fetch user info
          const orphanUserIdsUnique = [...new Set(trueOrphans.map(o => o.usuarioId))]
          const users = await prisma.user.findMany({
            where: { id: { in: orphanUserIdsUnique } },
            select: { id: true, name: true, email: true },
          })
          const userMap = new Map(users.map(u => [u.id, u]))

          // Enrich each orphan
          const orphanResults = await Promise.all(
            trueOrphans.map(async (o) => {
              const enriched = await enrichWithRegistros(o.usuarioId, o.semana)
              const user = userMap.get(o.usuarioId)
              return {
                id: `sin_enviar__${o.usuarioId}__${o.semana}`,
                semana: o.semana,
                estado: 'sin_enviar',
                totalHoras: enriched.totalHoras,
                fechaEnvio: null,
                fechaResolucion: null,
                motivoRechazo: null,
                usuario: user || { id: o.usuarioId, name: 'Desconocido', email: '' },
                aprobadoPor: null,
                diasTrabajados: enriched.diasTrabajados,
                proyectos: enriched.proyectos,
                registros: enriched.registros,
              }
            })
          )

          // Filter out any with 0 hours
          const orphanWithHours = orphanResults.filter(o => o.totalHoras > 0)
          result.push(...orphanWithHours)
        }
      }
    }

    // Sort: sin_enviar first, then enviado, then others; within same estado by semana desc
    const estadoOrder: Record<string, number> = {
      sin_enviar: 0,
      enviado: 1,
      borrador: 2,
      rechazado: 3,
      aprobado: 4,
    }
    result.sort((a, b) => {
      const orderA = estadoOrder[a.estado] ?? 5
      const orderB = estadoOrder[b.estado] ?? 5
      if (orderA !== orderB) return orderA - orderB
      return b.semana.localeCompare(a.semana)
    })

    return NextResponse.json({ aprobaciones: result })
  } catch (error) {
    console.error('Error obteniendo pendientes:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
