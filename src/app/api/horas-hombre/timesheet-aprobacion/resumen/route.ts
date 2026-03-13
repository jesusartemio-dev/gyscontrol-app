import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getISOWeek, getWeekRange } from '@/lib/utils/timesheetAprobacion'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const semanaActual = getISOWeek(new Date())
    const { inicio, fin } = getWeekRange(semanaActual)

    // Parallel queries
    const [
      // All users who have hours this week
      horasEstaSemana,
      // All TimesheetAprobacion for this week
      aprobacionesEstaSemana,
      // Global counts by estado
      countsByEstado,
    ] = await Promise.all([
      prisma.registroHoras.findMany({
        where: {
          origen: { in: ['oficina', 'campo'] },
          fechaTrabajo: { gte: inicio, lte: fin },
        },
        select: {
          usuarioId: true,
          horasTrabajadas: true,
        },
      }),
      prisma.timesheetAprobacion.findMany({
        where: { semana: semanaActual },
        select: {
          usuarioId: true,
          estado: true,
          usuario: { select: { name: true } },
        },
      }),
      prisma.timesheetAprobacion.groupBy({
        by: ['estado'],
        _count: { id: true },
      }),
    ])

    // Aggregate hours by user for this week
    const horasPorUsuario = new Map<string, number>()
    for (const r of horasEstaSemana) {
      horasPorUsuario.set(r.usuarioId, (horasPorUsuario.get(r.usuarioId) || 0) + r.horasTrabajadas)
    }

    // Map of aprobaciones by user
    const aprobacionMap = new Map(aprobacionesEstaSemana.map(a => [a.usuarioId, a]))

    // Get user names for those with hours
    const userIds = [...horasPorUsuario.keys()]
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : []
    const userNameMap = new Map(users.map(u => [u.id, u.name || 'Sin nombre']))

    // Classify users for this week
    const sinEnviar: { id: string; nombre: string; horas: number }[] = []
    const pendientes: { id: string; nombre: string; horas: number }[] = []
    const aprobados: { id: string; nombre: string; horas: number }[] = []
    const rechazados: { id: string; nombre: string; horas: number }[] = []

    for (const [userId, horas] of horasPorUsuario) {
      if (horas <= 0) continue
      const aprobacion = aprobacionMap.get(userId)
      const nombre = userNameMap.get(userId) || 'Sin nombre'
      const item = { id: userId, nombre, horas: Math.round(horas * 100) / 100 }

      if (!aprobacion || aprobacion.estado === 'borrador') {
        sinEnviar.push(item)
      } else if (aprobacion.estado === 'enviado') {
        pendientes.push(item)
      } else if (aprobacion.estado === 'aprobado') {
        aprobados.push(item)
      } else if (aprobacion.estado === 'rechazado') {
        rechazados.push(item)
      }
    }

    // Sort all by name
    sinEnviar.sort((a, b) => a.nombre.localeCompare(b.nombre))
    pendientes.sort((a, b) => a.nombre.localeCompare(b.nombre))

    // Global counts
    const globalCounts: Record<string, number> = {}
    for (const c of countsByEstado) {
      globalCounts[c.estado] = c._count.id
    }

    return NextResponse.json({
      semana: semanaActual,
      semanaActual: {
        totalUsuarios: horasPorUsuario.size,
        sinEnviar,
        pendientes,
        aprobados: aprobados.length,
        rechazados: rechazados.length,
      },
      global: {
        enviados: globalCounts['enviado'] || 0,
        aprobados: globalCounts['aprobado'] || 0,
        rechazados: globalCounts['rechazado'] || 0,
      },
    })
  } catch (error) {
    console.error('Error en resumen timesheet:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
