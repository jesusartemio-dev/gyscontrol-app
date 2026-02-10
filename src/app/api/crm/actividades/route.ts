import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userRole = (session.user as any).role || 'comercial'
    const rolesConAccesoTotal = ['admin', 'gerente', 'coordinador']
    const esComercial = !rolesConAccesoTotal.includes(userRole)

    const { searchParams } = new URL(request.url)

    // Filtros
    const tipo = searchParams.get('tipo')
    const resultado = searchParams.get('resultado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const oportunidadId = searchParams.get('oportunidadId')
    const usuarioId = searchParams.get('usuarioId')

    // Paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}

    if (tipo) where.tipo = tipo
    if (resultado) where.resultado = resultado
    if (oportunidadId) where.oportunidadId = oportunidadId
    if (usuarioId) where.usuarioId = usuarioId

    if (fechaDesde || fechaHasta) {
      where.fecha = {}
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde)
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta)
    }

    // RBAC: comercial solo ve sus propias actividades
    if (esComercial) {
      where.usuarioId = session.user.id
    }

    // Fechas para estadísticas temporales
    const ahora = new Date()
    const inicioSemana = new Date(ahora)
    inicioSemana.setDate(ahora.getDate() - ahora.getDay())
    inicioSemana.setHours(0, 0, 0, 0)

    const inicioSemanaAnterior = new Date(inicioSemana)
    inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7)

    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

    // Queries en paralelo
    const [
      actividades,
      total,
      estadisticasPorTipo,
      estadisticasPorResultado,
      actividadesEstaSemana,
      actividadesSemanaAnterior,
      actividadesPorUsuario
    ] = await Promise.all([
      // Lista paginada
      prisma.crmActividad.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          crmOportunidad: {
            select: {
              id: true,
              nombre: true,
              cliente: { select: { id: true, nombre: true, codigo: true } }
            }
          }
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: limit
      }),

      // Total
      prisma.crmActividad.count({ where }),

      // Por tipo
      prisma.crmActividad.groupBy({
        by: ['tipo'],
        _count: { id: true },
        where
      }),

      // Por resultado
      prisma.crmActividad.groupBy({
        by: ['resultado'],
        _count: { id: true },
        where
      }),

      // Esta semana
      prisma.crmActividad.count({
        where: { fecha: { gte: inicioSemana } }
      }),

      // Semana anterior
      prisma.crmActividad.count({
        where: {
          fecha: { gte: inicioSemanaAnterior, lt: inicioSemana }
        }
      }),

      // Por usuario (top 5)
      prisma.crmActividad.groupBy({
        by: ['usuarioId'],
        _count: { id: true },
        where: { fecha: { gte: inicioMes } },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })
    ])

    // Obtener nombres de usuarios
    const usuarioIds = actividadesPorUsuario.map(a => a.usuarioId)
    const usuarios = await prisma.user.findMany({
      where: { id: { in: usuarioIds } },
      select: { id: true, name: true }
    })

    const usuariosMap = new Map(usuarios.map(u => [u.id, u.name]))

    // Formatear estadísticas
    const estadisticas: Record<string, any> = {
      total,
      estaSemana: actividadesEstaSemana,
      semanaAnterior: actividadesSemanaAnterior,
      cambioSemanal: actividadesSemanaAnterior > 0
        ? Math.round(((actividadesEstaSemana - actividadesSemanaAnterior) / actividadesSemanaAnterior) * 100)
        : actividadesEstaSemana > 0 ? 100 : 0,

      porTipo: estadisticasPorTipo.reduce((acc, stat) => {
        acc[stat.tipo] = stat._count.id
        return acc
      }, {} as Record<string, number>),

      porResultado: estadisticasPorResultado.reduce((acc, stat) => {
        if (stat.resultado) acc[stat.resultado] = stat._count.id
        return acc
      }, {} as Record<string, number>),

      porUsuario: actividadesPorUsuario.map(stat => ({
        usuarioId: stat.usuarioId,
        nombre: usuariosMap.get(stat.usuarioId) || 'Sin nombre',
        cantidad: stat._count.id
      }))
    }

    return NextResponse.json({
      data: actividades,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      estadisticas
    })
  } catch (error) {
    console.error('Error al obtener actividades:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
