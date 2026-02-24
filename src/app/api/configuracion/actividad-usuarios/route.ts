import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role
    if (!['admin', 'gerente'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filtroRol = searchParams.get('rol') || undefined
    const filtroEstado = searchParams.get('estado') || undefined
    const fechaDesde = searchParams.get('fechaDesde') || undefined
    const fechaHasta = searchParams.get('fechaHasta') || undefined

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Filtro de usuarios
    const userWhere: any = {}
    if (filtroRol && filtroRol !== 'all') {
      userWhere.role = filtroRol
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLoginAt: true,
        lastActivityAt: true,
      },
      orderBy: { name: 'asc' },
    })

    // Conteo de acciones por usuario (últimos 30 días) usando índice existente
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['usuarioId'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    })

    const countMap = new Map(
      actionCounts.map(ac => [ac.usuarioId, ac._count.id])
    )

    // Clasificar estado de cada usuario
    const usuariosConActividad = users.map(user => {
      const lastActivity = user.lastActivityAt
        ? new Date(user.lastActivityAt)
        : null

      let estado: 'online_hoy' | 'activo_semana' | 'inactivo'
      if (lastActivity && lastActivity >= todayStart) {
        estado = 'online_hoy'
      } else if (lastActivity && lastActivity >= weekAgo) {
        estado = 'activo_semana'
      } else {
        estado = 'inactivo'
      }

      return {
        ...user,
        accionesUltimos30Dias: countMap.get(user.id) || 0,
        estado,
      }
    })

    // Aplicar filtros
    let resultado = usuariosConActividad
    if (filtroEstado && filtroEstado !== 'all') {
      resultado = resultado.filter(u => u.estado === filtroEstado)
    }
    if (fechaDesde) {
      const desde = new Date(fechaDesde)
      resultado = resultado.filter(u =>
        u.lastActivityAt && new Date(u.lastActivityAt) >= desde
      )
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta)
      hasta.setDate(hasta.getDate() + 1)
      resultado = resultado.filter(u =>
        u.lastActivityAt && new Date(u.lastActivityAt) <= hasta
      )
    }

    // Resumen (siempre sobre todos los usuarios, no filtrados)
    const resumen = {
      totalUsuarios: users.length,
      activosHoy: usuariosConActividad.filter(u => u.estado === 'online_hoy').length,
      activosSemana: usuariosConActividad.filter(u => u.estado === 'activo_semana').length,
      inactivos30Dias: usuariosConActividad.filter(u => {
        if (!u.lastActivityAt) return true
        return new Date(u.lastActivityAt) < thirtyDaysAgo
      }).length,
    }

    return NextResponse.json({ data: resultado, resumen })
  } catch (error: any) {
    console.error('[Actividad Usuarios] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
