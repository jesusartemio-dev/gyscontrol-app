// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/reportes/pipeline
// 🔧 Descripción: API para reporte de pipeline de ventas
// ✅ GET: Obtener análisis del pipeline por etapas
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener análisis del pipeline de ventas
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fechaDesde = searchParams.get('fechaDesde') || '2024-01-01'
    const fechaHasta = searchParams.get('fechaHasta') || '2024-12-31'

    // Definir las etapas del pipeline
    const etapas = [
      { nombre: 'Prospecto', estado: 'prospecto' },
      { nombre: 'Contacto Inicial', estado: 'contacto_inicial' },
      { nombre: 'Propuesta Enviada', estado: 'propuesta_enviada' },
      { nombre: 'Negociación', estado: 'negociacion' },
      { nombre: 'Cerrada Ganada', estado: 'cerrada_ganada' },
      { nombre: 'Cerrada Perdida', estado: 'cerrada_perdida' }
    ]

    // Calcular métricas para cada etapa
    const pipelineData = await Promise.all(
      etapas.map(async (etapa) => {
        // Contar oportunidades en esta etapa
        const cantidad = await prisma.crmOportunidad.count({
          where: {
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

    // Calcular métricas generales del pipeline
    const totalOportunidades = pipelineData.reduce((sum, etapa) => sum + etapa.cantidad, 0)
    const valorTotalPipeline = pipelineData.reduce((sum, etapa) => sum + etapa.valorTotal, 0)

    // Calcular valor activo (excluyendo cerradas)
    const valorActivo = pipelineData
      .filter(etapa => !etapa.estado.includes('cerrada'))
      .reduce((sum, etapa) => sum + etapa.valorTotal, 0)

    // Calcular tasa de conversión general
    const oportunidadesGanadas = pipelineData.find(e => e.estado === 'cerrada_ganada')?.cantidad || 0
    const oportunidadesTotales = totalOportunidades
    const tasaConversion = oportunidadesTotales > 0 ? (oportunidadesGanadas / oportunidadesTotales) * 100 : 0

    const resumen = {
      totalOportunidades,
      valorTotalPipeline,
      valorActivo,
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      periodo: {
        desde: fechaDesde,
        hasta: fechaHasta
      }
    }

    return NextResponse.json({
      etapas: pipelineData,
      resumen
    })

  } catch (error) {
    console.error('❌ Error al obtener reporte de pipeline:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
