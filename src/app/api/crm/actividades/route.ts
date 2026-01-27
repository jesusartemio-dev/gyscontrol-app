// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/actividades
// 🔧 Descripción: API para gestionar actividades generales del CRM
// ✅ GET: Obtener todas las actividades con filtros y paginación
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/crm/actividades - Obtener todas las actividades del CRM
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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

    // Filtros de fecha
    if (fechaDesde || fechaHasta) {
      where.fecha = {}
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde)
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta)
    }

    // Obtener actividades con relaciones
    const [actividades, total] = await Promise.all([
      prisma.crmActividad.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          crmOportunidad: {
            select: {
              id: true,
              nombre: true,
              cliente: {
                select: {
                  id: true,
                  nombre: true,
                  codigo: true
                }
              }
            }
          }
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: limit
      }),
      prisma.crmActividad.count({ where })
    ])

    // Calcular estadísticas
    const estadisticas = await prisma.crmActividad.groupBy({
      by: ['tipo', 'resultado'],
      _count: { id: true },
      where
    })

    const estadisticasFormateadas: Record<string, number> = {}

    estadisticas.forEach(stat => {
      if (stat.tipo) {
        estadisticasFormateadas[`tipo_${stat.tipo}`] = stat._count.id
      }
      if (stat.resultado) {
        estadisticasFormateadas[`resultado_${stat.resultado}`] = stat._count.id
      }
    })

    estadisticasFormateadas.total = total

    const response = {
      data: actividades,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      estadisticas: estadisticasFormateadas
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Error al obtener actividades:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
