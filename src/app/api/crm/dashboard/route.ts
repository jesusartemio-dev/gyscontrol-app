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

    // Obtener métricas generales del embudo
    const [
      totalOportunidades,
      oportunidadesActivas,
      oportunidadesGanadas,
      oportunidadesPerdidas,
      valorTotalEmbudo,
      valorEmbudoActivo,
      actividadesRecientes,
      oportunidadesPorEstado
    ] = await Promise.all([
      // Total de oportunidades
      prisma.crmOportunidad.count(),

      // Oportunidades activas (no cerradas)
      prisma.crmOportunidad.count({
        where: {
          estado: {
            notIn: ['cerrada_ganada', 'cerrada_perdida', 'seguimiento_proyecto', 'feedback_mejora']
          }
        }
      }),

      // Oportunidades ganadas (seguimiento_proyecto = ganada, cerrada_ganada = legacy)
      prisma.crmOportunidad.count({
        where: {
          estado: { in: ['cerrada_ganada', 'seguimiento_proyecto'] }
        }
      }),

      // Oportunidades perdidas (feedback_mejora = perdida, cerrada_perdida = legacy)
      prisma.crmOportunidad.count({
        where: {
          estado: { in: ['cerrada_perdida', 'feedback_mejora'] }
        }
      }),

      // Valor total del embudo
      prisma.crmOportunidad.aggregate({
        _sum: { valorEstimado: true }
      }),

      // Valor del embudo activo
      prisma.crmOportunidad.aggregate({
        _sum: { valorEstimado: true },
        where: {
          estado: {
            notIn: ['cerrada_ganada', 'cerrada_perdida', 'seguimiento_proyecto', 'feedback_mejora']
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
    const totalValor = valorTotalEmbudo._sum.valorEstimado || 0
    const valorActivo = valorEmbudoActivo._sum.valorEstimado || 0

    const tasaConversion = totalOportunidades > 0 ?
      (oportunidadesGanadas / totalOportunidades) * 100 : 0

    // Calcular métricas del usuario actual en tiempo real
    let metricasUsuario = null
    if (userId) {
      const ahora = new Date()
      const mesInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const mesFin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)

      const [cotizaciones, cotizacionesAprobadas, proyectos, valorAgregado, llamadas, reuniones, propuestas, emails] = await Promise.all([
        prisma.cotizacion.count({ where: { comercialId: userId, createdAt: { gte: mesInicio, lte: mesFin } } }),
        prisma.cotizacion.count({ where: { comercialId: userId, estado: 'aprobada', createdAt: { gte: mesInicio, lte: mesFin } } }),
        prisma.proyecto.count({ where: { comercialId: userId, createdAt: { gte: mesInicio, lte: mesFin } } }),
        prisma.proyecto.aggregate({ where: { comercialId: userId, createdAt: { gte: mesInicio, lte: mesFin } }, _sum: { grandTotal: true } }),
        prisma.crmActividad.count({ where: { usuarioId: userId, tipo: 'llamada', fecha: { gte: mesInicio, lte: mesFin } } }),
        prisma.crmActividad.count({ where: { usuarioId: userId, tipo: { in: ['reunión', 'reunion'] }, fecha: { gte: mesInicio, lte: mesFin } } }),
        prisma.crmActividad.count({ where: { usuarioId: userId, tipo: 'propuesta', fecha: { gte: mesInicio, lte: mesFin } } }),
        prisma.crmActividad.count({ where: { usuarioId: userId, tipo: 'email', fecha: { gte: mesInicio, lte: mesFin } } }),
      ])

      metricasUsuario = {
        cotizacionesGeneradas: cotizaciones,
        cotizacionesAprobadas,
        proyectosCerrados: proyectos,
        valorTotalVendido: valorAgregado._sum.grandTotal || 0,
        llamadasRealizadas: llamadas,
        reunionesAgendadas: reuniones,
        propuestasEnviadas: propuestas,
        emailsEnviados: emails,
        tasaConversion: cotizaciones > 0 ? Math.round((proyectos / cotizaciones) * 100 * 100) / 100 : 0,
      }
    }

    // Formatear datos de oportunidades por estado
    const embudoData = oportunidadesPorEstado.map(item => ({
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
        valorTotalEmbudo: totalValor,
        valorEmbudoActivo: valorActivo,
        tasaConversion: Math.round(tasaConversion * 100) / 100
      },
      embudo: embudoData,
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
