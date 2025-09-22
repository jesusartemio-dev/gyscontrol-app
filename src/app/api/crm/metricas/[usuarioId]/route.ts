// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/metricas/[usuarioId]
// 🔧 Descripción: API para métricas comerciales por usuario
// ✅ GET: Obtener métricas de un usuario específico
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/crm/metricas/[usuarioId] - Obtener métricas de un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { usuarioId } = await params
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo')

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener métricas del usuario
    const whereCondition: any = { usuarioId }

    if (periodo) {
      if (periodo.includes('-')) {
        // Formato YYYY-MM
        whereCondition.periodo = periodo
      } else {
        // Formato YYYY (obtener todo el año)
        whereCondition.periodo = {
          startsWith: periodo
        }
      }
    }

    const metricas = await prisma.crmMetricaComercial.findMany({
      where: whereCondition,
      orderBy: { periodo: 'desc' }
    })

    // Calcular totales acumulados
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

    // Calcular promedios y tasas
    const numPeriodos = metricas.length
    const promedios = numPeriodos > 0 ? {
      tiempoPromedioCierre: metricas.reduce((sum, m) => sum + (m.tiempoPromedioCierre || 0), 0) / numPeriodos,
      tasaConversion: totales.cotizacionesGeneradas > 0 ?
        (totales.proyectosCerrados / totales.cotizacionesGeneradas) * 100 : 0,
      valorPromedioProyecto: totales.proyectosCerrados > 0 ?
        totales.valorTotalVendido / totales.proyectosCerrados : 0
    } : {
      tiempoPromedioCierre: 0,
      tasaConversion: 0,
      valorPromedioProyecto: 0
    }

    // Obtener oportunidades recientes del usuario
    const oportunidadesRecientes = await prisma.crmOportunidad.findMany({
      where: {
        comercialId: usuarioId
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        estado: true,
        valorEstimado: true,
        fechaCierreEstimada: true,
        cliente: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    const response = {
      usuario,
      periodo: periodo || 'todos',
      metricasHistoricas: metricas,
      totales,
      promedios,
      oportunidadesRecientes,
      estadisticas: {
        numPeriodos,
        mejorMes: metricas.reduce((prev, current) =>
          (current.valorTotalVendido > prev.valorTotalVendido) ? current : prev,
          metricas[0] || null
        ),
        tendencia: numPeriodos > 1 ? (
          metricas[0]?.valorTotalVendido > metricas[1]?.valorTotalVendido ? 'ascendente' :
          metricas[0]?.valorTotalVendido < metricas[1]?.valorTotalVendido ? 'descendente' : 'estable'
        ) : 'sin_datos'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Error al obtener métricas del usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}