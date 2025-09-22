// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/dashboard
// 🔧 Descripción: API para datos del dashboard CRM
// ✅ GET: Obtener métricas y datos para dashboard
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/crm/dashboard - Obtener datos para dashboard CRM
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener métricas generales
    const [
      totalOportunidades,
      oportunidadesPorEstado,
      valorTotalPipeline,
      actividadesRecientes,
      oportunidadesPorComercial
    ] = await Promise.all([
      // Total de oportunidades
      prisma.crmOportunidad.count(),

      // Oportunidades por estado
      prisma.crmOportunidad.groupBy({
        by: ['estado'],
        _count: { id: true },
        _sum: { valorEstimado: true }
      }),

      // Valor total del pipeline (oportunidades abiertas)
      prisma.crmOportunidad.aggregate({
        where: {
          estado: {
            notIn: ['cerrada_ganada', 'cerrada_perdida']
          }
        },
        _sum: { valorEstimado: true }
      }),

      // Actividades recientes (últimas 10)
      prisma.crmActividad.findMany({
        take: 10,
        orderBy: { fecha: 'desc' },
        include: {
          usuario: {
            select: { id: true, name: true }
          },
          oportunidad: {
            select: {
              id: true,
              nombre: true,
              cliente: {
                select: { id: true, nombre: true }
              }
            }
          }
        }
      }),

      // Oportunidades por comercial
      prisma.crmOportunidad.groupBy({
        by: ['comercialId'],
        _count: { id: true },
        _sum: { valorEstimado: true },
        where: {
          comercialId: { not: null }
        }
      })
    ])

    // Calcular métricas adicionales
    const oportunidadesGanadas = oportunidadesPorEstado.find(e => e.estado === 'cerrada_ganada')?._count.id || 0
    const oportunidadesPerdidas = oportunidadesPorEstado.find(e => e.estado === 'cerrada_perdida')?._count.id || 0
    const oportunidadesActivas = totalOportunidades - oportunidadesGanadas - oportunidadesPerdidas

    const tasaConversion = totalOportunidades > 0 ?
      (oportunidadesGanadas / totalOportunidades) * 100 : 0

    // Formatear datos para el frontend
    const dashboardData = {
      metricasGenerales: {
        totalOportunidades,
        oportunidadesActivas,
        oportunidadesGanadas,
        oportunidadesPerdidas,
        valorTotalPipeline: valorTotalPipeline._sum.valorEstimado || 0,
        tasaConversion: Math.round(tasaConversion * 100) / 100
      },

      oportunidadesPorEstado: oportunidadesPorEstado.map(estado => ({
        estado: estado.estado,
        count: estado._count.id,
        valor: estado._sum.valorEstimado || 0
      })),

      actividadesRecientes: actividadesRecientes.map(actividad => ({
        id: actividad.id,
        tipo: actividad.tipo,
        descripcion: actividad.descripcion,
        fecha: actividad.fecha,
        resultado: actividad.resultado,
        usuario: actividad.usuario,
        oportunidad: actividad.oportunidad
      })),

      rendimientoComercial: oportunidadesPorComercial.map(comercial => ({
        comercialId: comercial.comercialId,
        count: comercial._count.id,
        valor: comercial._sum.valorEstimado || 0
      })),

      // Datos para gráficos
      chartData: {
        pipeline: oportunidadesPorEstado.map(estado => ({
          name: estado.estado,
          value: estado._count.id,
          valor: estado._sum.valorEstimado || 0
        })),

        tendencias: [
          // Mock data - en implementación real vendría de métricas históricas
          { mes: 'Ene', oportunidades: 12, valor: 150000 },
          { mes: 'Feb', oportunidades: 15, valor: 180000 },
          { mes: 'Mar', oportunidades: 18, valor: 220000 },
          { mes: 'Abr', oportunidades: 22, valor: 280000 },
          { mes: 'May', oportunidades: 25, valor: 320000 },
          { mes: 'Jun', oportunidades: 28, valor: 350000 }
        ]
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('❌ Error al obtener datos del dashboard:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}