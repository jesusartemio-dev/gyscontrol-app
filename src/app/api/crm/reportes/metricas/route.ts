// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/reportes/metricas
// 🔧 Descripción: API para métricas detalladas del CRM
// ✅ GET: Obtener métricas consolidadas y tendencias
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener métricas detalladas del CRM
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get('periodo') || '2024-Q4' // Trimestre por defecto

    // Determinar fechas del período
    let fechaInicio: Date
    let fechaFin: Date

    if (periodo.includes('-Q')) {
      // Período trimestral (ej: 2024-Q4)
      const [year, quarter] = periodo.split('-Q')
      const quarterNum = parseInt(quarter)
      const startMonth = (quarterNum - 1) * 3
      fechaInicio = new Date(parseInt(year), startMonth, 1)
      fechaFin = new Date(parseInt(year), startMonth + 3, 0)
    } else if (periodo.includes('-')) {
      // Período mensual (ej: 2024-10)
      const [year, month] = periodo.split('-')
      fechaInicio = new Date(parseInt(year), parseInt(month) - 1, 1)
      fechaFin = new Date(parseInt(year), parseInt(month), 0)
    } else {
      // Período anual (ej: 2024)
      fechaInicio = new Date(parseInt(periodo), 0, 1)
      fechaFin = new Date(parseInt(periodo), 11, 31)
    }

    // Calcular métricas totales del período
    const [
      cotizacionesGeneradas,
      cotizacionesAprobadas,
      proyectosCerrados,
      oportunidadesCreadas,
      oportunidadesGanadas,
      actividadesRealizadas
    ] = await Promise.all([
      // Cotizaciones generadas
      prisma.cotizacion.count({
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin }
        }
      }),

      // Cotizaciones aprobadas
      prisma.cotizacion.count({
        where: {
          estado: 'aprobada',
          createdAt: { gte: fechaInicio, lte: fechaFin }
        }
      }),

      // Proyectos cerrados
      prisma.proyecto.count({
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin }
        }
      }),

      // Oportunidades creadas
      prisma.crmOportunidad.count({
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin }
        }
      }),

      // Oportunidades ganadas
      prisma.crmOportunidad.count({
        where: {
          estado: 'cerrada_ganada',
          createdAt: { gte: fechaInicio, lte: fechaFin }
        }
      }),

      // Actividades realizadas
      prisma.crmActividad.count({
        where: {
          fecha: { gte: fechaInicio, lte: fechaFin }
        }
      })
    ])

    // Valor total vendido
    const valorTotalResult = await prisma.proyecto.aggregate({
      where: {
        createdAt: { gte: fechaInicio, lte: fechaFin }
      },
      _sum: { grandTotal: true }
    })

    // Margen total obtenido
    const margenResult = await prisma.proyecto.aggregate({
      where: {
        createdAt: { gte: fechaInicio, lte: fechaFin }
      },
      _sum: {
        totalCliente: true,
        totalInterno: true
      }
    })

    // Calcular tendencias (últimos 6 meses)
    const tendencias = []
    for (let i = 5; i >= 0; i--) {
      const fechaMes = new Date(fechaFin)
      fechaMes.setMonth(fechaMes.getMonth() - i)
      const mesInicio = new Date(fechaMes.getFullYear(), fechaMes.getMonth(), 1)
      const mesFin = new Date(fechaMes.getFullYear(), fechaMes.getMonth() + 1, 0)

      const [cotizacionesMes, proyectosMes, valorMes] = await Promise.all([
        prisma.cotizacion.count({
          where: { createdAt: { gte: mesInicio, lte: mesFin } }
        }),
        prisma.proyecto.count({
          where: { createdAt: { gte: mesInicio, lte: mesFin } }
        }),
        prisma.proyecto.aggregate({
          where: { createdAt: { gte: mesInicio, lte: mesFin } },
          _sum: { grandTotal: true }
        })
      ])

      tendencias.push({
        periodo: `${fechaMes.getFullYear()}-${String(fechaMes.getMonth() + 1).padStart(2, '0')}`,
        cotizaciones: cotizacionesMes,
        proyectos: proyectosMes,
        valor: valorMes._sum.grandTotal || 0,
        conversion: proyectosMes > 0 ? (proyectosMes / cotizacionesMes) * 100 : 0
      })
    }

    // Calcular métricas promedios
    const tiempoPromedioCierre = proyectosCerrados > 0 ? 24 : null // Placeholder
    const tasaConversion = cotizacionesGeneradas > 0 ? (proyectosCerrados / cotizacionesGeneradas) * 100 : 0
    const valorPromedioProyecto = proyectosCerrados > 0 ? (valorTotalResult._sum.grandTotal || 0) / proyectosCerrados : 0

    const totales = {
      cotizacionesGeneradas,
      cotizacionesAprobadas,
      proyectosCerrados,
      oportunidadesCreadas,
      oportunidadesGanadas,
      actividadesRealizadas,
      valorTotalVendido: valorTotalResult._sum.grandTotal || 0,
      margenTotalObtenido: (margenResult._sum.totalCliente || 0) - (margenResult._sum.totalInterno || 0)
    }

    const promedios = {
      tiempoPromedioCierre,
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      valorPromedioProyecto: Math.round(valorPromedioProyecto * 100) / 100
    }

    return NextResponse.json({
      periodo,
      totales,
      promedios,
      tendencias,
      fechaCalculo: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error al obtener métricas detalladas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}