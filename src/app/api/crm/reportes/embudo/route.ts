// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/reportes/embudo
// 🔧 Descripción: API para reporte del embudo de ventas
// ✅ GET: Obtener análisis del embudo por etapas
// ===================================================

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener análisis del embudo de ventas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userRole = (session.user as any).role || 'comercial'
    const rolesConAccesoTotal = ['admin', 'gerente', 'coordinador']
    const esComercial = !rolesConAccesoTotal.includes(userRole)
    const comercialFilter = esComercial ? { comercialId: session.user.id } : {}

    const { searchParams } = new URL(req.url)
    const fechaDesde = searchParams.get('fechaDesde') || '2024-01-01'
    const fechaHasta = searchParams.get('fechaHasta') || '2024-12-31'

    // Definir las etapas del embudo
    // Flujo: Inicio → Contacto → Propuesta (V.Técnica / V.Comercial) → Negociación → [Seg.Proyecto / Feedback]
    const etapas = [
      { nombre: 'Inicio', estado: 'inicio' },
      { nombre: 'Contacto Cliente', estado: 'contacto_cliente' },
      { nombre: 'Validación Técnica', estado: 'validacion_tecnica' },
      { nombre: 'Validación Comercial', estado: 'validacion_comercial' },
      { nombre: 'Negociación', estado: 'negociacion' },
      { nombre: 'Seguimiento Proyecto', estado: 'seguimiento_proyecto' },
      { nombre: 'Feedback de Mejora', estado: 'feedback_mejora' },
      { nombre: 'Cerrada Ganada', estado: 'cerrada_ganada' },      // Legacy
      { nombre: 'Cerrada Perdida', estado: 'cerrada_perdida' }     // Legacy
    ]

    // Calcular métricas para cada etapa
    const embudoData = await Promise.all(
      etapas.map(async (etapa) => {
        // Contar oportunidades en esta etapa
        const cantidad = await prisma.crmOportunidad.count({
          where: {
            ...comercialFilter,
            estado: etapa.estado as any,
            createdAt: {
              gte: new Date(fechaDesde),
              lte: new Date(fechaHasta)
            }
          }
        })

        // Valor total estimado de oportunidades en esta etapa
        const valorTotalResult = await prisma.crmOportunidad.aggregate({
          where: {
            ...comercialFilter,
            estado: etapa.estado as any,
            createdAt: {
              gte: new Date(fechaDesde),
              lte: new Date(fechaHasta)
            }
          },
          _sum: {
            valorEstimado: true
          }
        })

        // Calcular tiempo promedio en etapa (días)
        const oportunidadesEnEtapa = await prisma.crmOportunidad.findMany({
          where: {
            ...comercialFilter,
            estado: etapa.estado as any,
            createdAt: {
              gte: new Date(fechaDesde),
              lte: new Date(fechaHasta)
            }
          },
          select: {
            createdAt: true,
            fechaCierreEstimada: true,
            fechaUltimoContacto: true
          }
        })

        let tiempoPromedio = 0
        if (oportunidadesEnEtapa.length > 0) {
          const tiempos: number[] = []
          oportunidadesEnEtapa.forEach(opp => {
            const fechaInicio = opp.createdAt
            const fechaFin = opp.fechaUltimoContacto || opp.fechaCierreEstimada || new Date()
            const diffTime = fechaFin.getTime() - fechaInicio.getTime()
            const diffDays = diffTime / (1000 * 60 * 60 * 24)
            tiempos.push(diffDays)
          })
          tiempoPromedio = tiempos.reduce((sum, tiempo) => sum + tiempo, 0) / tiempos.length
        }

        // Calcular probabilidad promedio para la etapa
        const probabilidadResult = await prisma.crmOportunidad.aggregate({
          where: {
            ...comercialFilter,
            estado: etapa.estado as any,
            createdAt: {
              gte: new Date(fechaDesde),
              lte: new Date(fechaHasta)
            }
          },
          _avg: {
            probabilidad: true
          }
        })

        return {
          nombre: etapa.nombre,
          estado: etapa.estado,
          cantidad,
          valorTotal: valorTotalResult._sum.valorEstimado || 0,
          tiempoPromedio: Math.round(tiempoPromedio),
          probabilidadPromedio: Math.round(probabilidadResult._avg.probabilidad || 0),
          oportunidades: oportunidadesEnEtapa.map(opp => ({
            id: opp.createdAt.getTime(), // Usar timestamp como ID temporal
            fechaInicio: opp.createdAt,
            fechaCierreEstimada: opp.fechaCierreEstimada,
            ultimoContacto: opp.fechaUltimoContacto
          }))
        }
      })
    )

    // Calcular métricas generales del embudo
    const totalOportunidades = embudoData.reduce((sum, etapa) => sum + etapa.cantidad, 0)
    const valorTotalEmbudo = embudoData.reduce((sum, etapa) => sum + etapa.valorTotal, 0)

    // Calcular valor activo (excluyendo cerradas y estados finales)
    const estadosCerrados = ['cerrada_ganada', 'cerrada_perdida', 'seguimiento_proyecto', 'feedback_mejora']
    const valorActivo = embudoData
      .filter(etapa => !estadosCerrados.includes(etapa.estado))
      .reduce((sum, etapa) => sum + etapa.valorTotal, 0)

    // Calcular tasa de conversión general (seguimiento_proyecto = ganada, cerrada_ganada = legacy)
    const oportunidadesGanadas = embudoData
      .filter(e => e.estado === 'cerrada_ganada' || e.estado === 'seguimiento_proyecto')
      .reduce((sum, e) => sum + e.cantidad, 0)
    const oportunidadesTotales = totalOportunidades
    const tasaConversion = oportunidadesTotales > 0 ? (oportunidadesGanadas / oportunidadesTotales) * 100 : 0

    const resumen = {
      totalOportunidades,
      valorTotalEmbudo,
      valorActivo,
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      periodo: {
        desde: fechaDesde,
        hasta: fechaHasta
      }
    }

    return NextResponse.json({
      etapas: embudoData,
      resumen
    })

  } catch (error) {
    console.error('❌ Error al obtener reporte del embudo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
