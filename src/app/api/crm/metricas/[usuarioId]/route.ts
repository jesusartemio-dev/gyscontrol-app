// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/metricas/[usuarioId]
// 🔧 Descripción: API para métricas comerciales individuales por usuario
// ✅ GET: Obtener métricas detalladas de un usuario específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener métricas detalladas de un usuario
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const { usuarioId } = await params
    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get('periodo') || new Date().toISOString().slice(0, 7) // YYYY-MM
    const tipo = searchParams.get('tipo') || 'mensual' // 'mensual', 'trimestral', 'anual'

    // Determinar el rango de fechas basado en el tipo
    const fechaInicio = new Date()
    const fechaFin = new Date()

    switch (tipo) {
      case 'trimestral':
        fechaInicio.setMonth(fechaInicio.getMonth() - 3)
        break
      case 'anual':
        fechaInicio.setFullYear(fechaInicio.getFullYear() - 1)
        break
      default: // mensual
        fechaInicio.setMonth(fechaInicio.getMonth() - 1)
    }

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener métricas comerciales del período
    const metricasComerciales = await prisma.crmMetricaComercial.findMany({
      where: {
        usuarioId,
        createdAt: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      orderBy: { periodo: 'desc' }
    })

    // Calcular métricas agregadas del período
    const totales = metricasComerciales.reduce(
      (acc, metrica) => ({
        cotizacionesGeneradas: acc.cotizacionesGeneradas + metrica.cotizacionesGeneradas,
        cotizacionesAprobadas: acc.cotizacionesAprobadas + metrica.cotizacionesAprobadas,
        proyectosCerrados: acc.proyectosCerrados + metrica.proyectosCerrados,
        valorTotalVendido: acc.valorTotalVendido + metrica.valorTotalVendido,
        margenTotalObtenido: acc.margenTotalObtenido + metrica.margenTotalObtenido,
        tiempoPromedioCierre: acc.tiempoPromedioCierre + (metrica.tiempoPromedioCierre || 0),
        tasaConversion: acc.tasaConversion + (metrica.tasaConversion || 0),
        valorPromedioProyecto: acc.valorPromedioProyecto + (metrica.valorPromedioProyecto || 0),
        llamadasRealizadas: acc.llamadasRealizadas + metrica.llamadasRealizadas,
        reunionesAgendadas: acc.reunionesAgendadas + metrica.reunionesAgendadas,
        propuestasEnviadas: acc.propuestasEnviadas + metrica.propuestasEnviadas,
        emailsEnviados: acc.emailsEnviados + metrica.emailsEnviados
      }),
      {
        cotizacionesGeneradas: 0,
        cotizacionesAprobadas: 0,
        proyectosCerrados: 0,
        valorTotalVendido: 0,
        margenTotalObtenido: 0,
        tiempoPromedioCierre: 0,
        tasaConversion: 0,
        valorPromedioProyecto: 0,
        llamadasRealizadas: 0,
        reunionesAgendadas: 0,
        propuestasEnviadas: 0,
        emailsEnviados: 0
      }
    )

    // Calcular promedios
    const numMetricas = metricasComerciales.length
    const promedios = {
      tiempoPromedioCierre: numMetricas > 0 ? totales.tiempoPromedioCierre / numMetricas : 0,
      tasaConversion: numMetricas > 0 ? totales.tasaConversion / numMetricas : 0,
      valorPromedioProyecto: numMetricas > 0 ? totales.valorPromedioProyecto / numMetricas : 0
    }

    // Obtener oportunidades del usuario en el período
    const oportunidades = await prisma.crmOportunidad.findMany({
      where: {
        comercialId: usuarioId,
        createdAt: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      select: {
        id: true,
        nombre: true,
        estado: true,
        valorEstimado: true,
        createdAt: true,
        cliente: {
          select: { nombre: true, codigo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Obtener actividades realizadas por el usuario
    const actividades = await prisma.crmActividad.findMany({
      where: {
        usuarioId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      include: {
        crmOportunidad: {
          select: { nombre: true, cliente: { select: { nombre: true } } }
        }
      },
      orderBy: { fecha: 'desc' },
      take: 10
    })

    // Calcular estadísticas adicionales
    const oportunidadesPorEstado = oportunidades.reduce((acc, opp) => {
      acc[opp.estado] = (acc[opp.estado] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const valorTotalOportunidades = oportunidades.reduce((sum, opp) => sum + (opp.valorEstimado || 0), 0)

    // Datos de rendimiento
    const rendimiento = {
      eficiencia: totales.cotizacionesGeneradas > 0 ?
        (totales.cotizacionesAprobadas / totales.cotizacionesGeneradas) * 100 : 0,
      productividad: totales.llamadasRealizadas + totales.reunionesAgendadas + totales.emailsEnviados,
      conversionProyectos: totales.proyectosCerrados > 0 ?
        (totales.proyectosCerrados / totales.cotizacionesAprobadas) * 100 : 0
    }

    const resultado = {
      usuario,
      periodo: {
        tipo,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        periodoActual: periodo
      },
      metricas: {
        totales,
        promedios,
        rendimiento
      },
      oportunidades: {
        total: oportunidades.length,
        porEstado: oportunidadesPorEstado,
        valorTotal: valorTotalOportunidades,
        lista: oportunidades.slice(0, 5) // Últimas 5 oportunidades
      },
      actividades: actividades.map(act => ({
        id: act.id,
        tipo: act.tipo,
        descripcion: act.descripcion,
        fecha: act.fecha,
        resultado: act.resultado,
        oportunidad: act.crmOportunidad
      })),
      historialMetricas: metricasComerciales.map(m => ({
        periodo: m.periodo,
        cotizacionesGeneradas: m.cotizacionesGeneradas,
        cotizacionesAprobadas: m.cotizacionesAprobadas,
        proyectosCerrados: m.proyectosCerrados,
        valorTotalVendido: m.valorTotalVendido,
        tasaConversion: m.tasaConversion
      }))
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('❌ Error al obtener métricas del usuario:', error)
    return NextResponse.json(
      { error: 'Error al obtener métricas del usuario' },
      { status: 500 }
    )
  }
}