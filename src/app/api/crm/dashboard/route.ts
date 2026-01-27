// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/dashboard
// 🔧 Descripción: API para dashboard CRM principal
// ✅ GET: Obtener datos para dashboard CRM
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener datos para dashboard CRM
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('role') || 'comercial'

    // Obtener métricas generales del pipeline
    const [
      totalOportunidades,
      oportunidadesActivas,
      oportunidadesGanadas,
      oportunidadesPerdidas,
      valorTotalPipeline,
      valorPipelineActivo,
      actividadesRecientes,
      oportunidadesPorEstado
    ] = await Promise.all([
      // Total de oportunidades
      prisma.crmOportunidad.count(),

      // Oportunidades activas (no cerradas)
      prisma.crmOportunidad.count({
        where: {
          estado: {
            notIn: ['cerrada_ganada', 'cerrada_perdida']
          }
        }
      }),

      // Oportunidades ganadas
      prisma.crmOportunidad.count({
        where: { estado: 'cerrada_ganada' }
      }),

      // Oportunidades perdidas
      prisma.crmOportunidad.count({
        where: { estado: 'cerrada_perdida' }
      }),

      // Valor total del pipeline
      prisma.crmOportunidad.aggregate({
        _sum: { valorEstimado: true }
      }),

      // Valor del pipeline activo
      prisma.crmOportunidad.aggregate({
        _sum: { valorEstimado: true },
        where: {
          estado: {
            notIn: ['cerrada_ganada', 'cerrada_perdida']
          }
        }
      }),

      // Actividades recientes (últimas 10)
      prisma.crmActividad.findMany({
        take: 10,
        orderBy: { fecha: 'desc' },
        include: {
          crmOportunidad: {
            select: { nombre: true, cliente: { select: { nombre: true } } }
          },
          user: {
            select: { name: true }
          }
        }
      }),

      // Oportunidades por estado
      prisma.crmOportunidad.groupBy({
        by: ['estado'],
        _count: { id: true },
        _sum: { valorEstimado: true }
      })
    ])

    // Calcular métricas adicionales
    const totalValor = valorTotalPipeline._sum.valorEstimado || 0
    const valorActivo = valorPipelineActivo._sum.valorEstimado || 0

    const tasaConversion = totalOportunidades > 0 ?
      (oportunidadesGanadas / totalOportunidades) * 100 : 0

    // Obtener métricas del usuario actual (si se proporciona userId)
    let metricasUsuario = null
    if (userId) {
      const periodoActual = new Date().toISOString().slice(0, 7) // YYYY-MM
      metricasUsuario = await prisma.crmMetricaComercial.findFirst({
        where: {
          usuarioId: userId,
          periodo: periodoActual
        }
      })
    }

    // Formatear datos de oportunidades por estado
    const pipelineData = oportunidadesPorEstado.map(item => ({
      estado: item.estado,
      cantidad: item._count.id,
      valor: item._sum.valorEstimado || 0
    }))

    // Datos del dashboard
    const dashboardData = {
      resumen: {
        totalOportunidades,
        oportunidadesActivas,
        oportunidadesGanadas,
        oportunidadesPerdidas,
        valorTotalPipeline: totalValor,
        valorPipelineActivo: valorActivo,
        tasaConversion: Math.round(tasaConversion * 100) / 100
      },
      pipeline: pipelineData,
      actividadesRecientes: actividadesRecientes.map(actividad => ({
        id: actividad.id,
        tipo: actividad.tipo,
        descripcion: actividad.descripcion,
        fecha: actividad.fecha,
        resultado: actividad.resultado,
        oportunidad: actividad.crmOportunidad,
        usuario: actividad.user
      })),
      metricasUsuario,
      fechaActualizacion: new Date().toISOString()
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('❌ Error al obtener datos del dashboard CRM:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    )
  }
}
