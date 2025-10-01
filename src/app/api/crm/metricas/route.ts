// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/metricas
// 🔧 Descripción: API para métricas comerciales generales
// ✅ GET: Obtener métricas generales del CRM
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/crm/metricas - Obtener métricas generales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || '2024-09' // Formato YYYY-MM

    // Obtener métricas de todos los usuarios para el período
    const metricas = await prisma.crmMetricaComercial.findMany({
      where: {
        periodo: {
          startsWith: periodo.split('-')[0] // Filtrar por año
        }
      },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        valorTotalVendido: 'desc'
      }
    })

    // Calcular métricas agregadas
    const totales = metricas.reduce((acc, metrica) => ({
      cotizacionesGeneradas: acc.cotizacionesGeneradas + metrica.cotizacionesGeneradas,
      cotizacionesAprobadas: acc.cotizacionesAprobadas + metrica.cotizacionesAprobadas,
      proyectosCerrados: acc.proyectosCerrados + metrica.proyectosCerrados,
      valorTotalVendido: acc.valorTotalVendido + metrica.valorTotalVendido,
      margenTotalObtenido: acc.margenTotalObtenido + metrica.margenTotalObtenido,
      llamadasRealizadas: acc.llamadasRealizadas + metrica.llamadasRealizadas,
      reunionesAgendadas: acc.reunionesAgendadas + metrica.reunionesAgendadas,
      propuestasEnviadas: acc.propuestasEnviadas + metrica.propuestasEnviadas,
      emailsEnviados: acc.emailsEnviados + metrica.emailsEnviados
    }), {
      cotizacionesGeneradas: 0,
      cotizacionesAprobadas: 0,
      proyectosCerrados: 0,
      valorTotalVendido: 0,
      margenTotalObtenido: 0,
      llamadasRealizadas: 0,
      reunionesAgendadas: 0,
      propuestasEnviadas: 0,
      emailsEnviados: 0
    })

    // Calcular promedios
    const numUsuarios = metricas.length
    const promedios = numUsuarios > 0 ? {
      tiempoPromedioCierre: metricas.reduce((sum, m) => sum + (m.tiempoPromedioCierre || 0), 0) / numUsuarios,
      tasaConversion: (totales.proyectosCerrados / totales.cotizacionesGeneradas) * 100,
      valorPromedioProyecto: totales.proyectosCerrados > 0 ? totales.valorTotalVendido / totales.proyectosCerrados : 0
    } : {
      tiempoPromedioCierre: 0,
      tasaConversion: 0,
      valorPromedioProyecto: 0
    }

    const response = {
      periodo,
      totales,
      promedios,
      usuarios: metricas.map(metrica => ({
        usuario: metrica.usuario,
        metricas: {
          cotizacionesGeneradas: metrica.cotizacionesGeneradas,
          cotizacionesAprobadas: metrica.cotizacionesAprobadas,
          proyectosCerrados: metrica.proyectosCerrados,
          valorTotalVendido: metrica.valorTotalVendido,
          margenTotalObtenido: metrica.margenTotalObtenido,
          tiempoPromedioCierre: metrica.tiempoPromedioCierre,
          tasaConversion: metrica.tasaConversion,
          valorPromedioProyecto: metrica.valorPromedioProyecto,
          llamadasRealizadas: metrica.llamadasRealizadas,
          reunionesAgendadas: metrica.reunionesAgendadas,
          propuestasEnviadas: metrica.propuestasEnviadas,
          emailsEnviados: metrica.emailsEnviados
        }
      })),
      estadisticas: {
        numUsuarios,
        mejorVendedor: metricas[0]?.usuario || null,
        peorVendedor: metricas[metricas.length - 1]?.usuario || null,
        promedioCotizacionesPorUsuario: numUsuarios > 0 ? totales.cotizacionesGeneradas / numUsuarios : 0,
        promedioValorPorUsuario: numUsuarios > 0 ? totales.valorTotalVendido / numUsuarios : 0
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Error al obtener métricas generales:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
