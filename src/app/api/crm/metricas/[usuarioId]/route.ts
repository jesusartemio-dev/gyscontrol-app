// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/metricas/[usuarioId]
// 🔧 Descripción: API para métricas comerciales individuales (tiempo real)
// ✅ GET: Obtener métricas detalladas de un usuario específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener métricas detalladas de un usuario en tiempo real
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { usuarioId } = await params

    // RBAC: comercial solo puede ver sus propias métricas
    const userRole = (session.user as any).role || 'comercial'
    const rolesConAccesoTotal = ['admin', 'gerente', 'coordinador']
    if (!rolesConAccesoTotal.includes(userRole) && usuarioId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get('periodo') || new Date().toISOString().slice(0, 7)
    const tipo = searchParams.get('tipo') || 'mensual'

    // Determinar el rango de fechas basado en el tipo
    const fechaFin = new Date()
    const fechaInicio = new Date()

    switch (tipo) {
      case 'trimestral':
        fechaInicio.setMonth(fechaInicio.getMonth() - 3)
        break
      case 'anual':
        fechaInicio.setFullYear(fechaInicio.getFullYear() - 1)
        break
      default:
        fechaInicio.setMonth(fechaInicio.getMonth() - 1)
    }

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const dateFilterCreated = { createdAt: { gte: fechaInicio, lte: fechaFin } }
    const dateFilterFecha = { fecha: { gte: fechaInicio, lte: fechaFin } }

    // Calcular métricas en tiempo real con Promise.all
    const [
      cotizaciones, aprobadas, proyectos, valorResult, margenResult,
      llamadas, reuniones, propuestas, emails,
      oportunidades, actividades
    ] = await Promise.all([
      prisma.cotizacion.count({ where: { comercialId: usuarioId, ...dateFilterCreated } }),
      prisma.cotizacion.count({ where: { comercialId: usuarioId, estado: 'aprobada', ...dateFilterCreated } }),
      prisma.proyecto.count({ where: { comercialId: usuarioId, ...dateFilterCreated } }),
      prisma.proyecto.aggregate({ where: { comercialId: usuarioId, ...dateFilterCreated }, _sum: { grandTotal: true } }),
      prisma.proyecto.aggregate({ where: { comercialId: usuarioId, ...dateFilterCreated }, _sum: { totalCliente: true, totalInterno: true } }),
      prisma.crmActividad.count({ where: { usuarioId, tipo: 'llamada', ...dateFilterFecha } }),
      prisma.crmActividad.count({ where: { usuarioId, tipo: { in: ['reunión', 'reunion'] }, ...dateFilterFecha } }),
      prisma.crmActividad.count({ where: { usuarioId, tipo: 'propuesta', ...dateFilterFecha } }),
      prisma.crmActividad.count({ where: { usuarioId, tipo: 'email', ...dateFilterFecha } }),
      // Oportunidades del usuario en el período
      prisma.crmOportunidad.findMany({
        where: { comercialId: usuarioId, createdAt: { gte: fechaInicio, lte: fechaFin } },
        select: {
          id: true, nombre: true, estado: true, valorEstimado: true, createdAt: true,
          cliente: { select: { nombre: true, codigo: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Actividades recientes
      prisma.crmActividad.findMany({
        where: { usuarioId, ...dateFilterFecha },
        include: {
          crmOportunidad: { select: { nombre: true, cliente: { select: { nombre: true } } } }
        },
        orderBy: { fecha: 'desc' },
        take: 10
      })
    ])

    const valorTotalVendido = valorResult._sum.grandTotal || 0
    const margenTotalObtenido = (margenResult._sum.totalCliente || 0) - (margenResult._sum.totalInterno || 0)

    const totales = {
      cotizacionesGeneradas: cotizaciones,
      cotizacionesAprobadas: aprobadas,
      proyectosCerrados: proyectos,
      valorTotalVendido,
      margenTotalObtenido,
      tiempoPromedioCierre: 0,
      tasaConversion: cotizaciones > 0 ? Math.round((proyectos / cotizaciones) * 100 * 100) / 100 : 0,
      valorPromedioProyecto: proyectos > 0 ? Math.round((valorTotalVendido / proyectos) * 100) / 100 : 0,
      llamadasRealizadas: llamadas,
      reunionesAgendadas: reuniones,
      propuestasEnviadas: propuestas,
      emailsEnviados: emails
    }

    // Calcular estadísticas de oportunidades
    const oportunidadesPorEstado = oportunidades.reduce((acc, opp) => {
      acc[opp.estado] = (acc[opp.estado] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const valorTotalOportunidades = oportunidades.reduce((sum, opp) => sum + (opp.valorEstimado || 0), 0)

    const rendimiento = {
      eficiencia: totales.cotizacionesGeneradas > 0
        ? Math.round((totales.cotizacionesAprobadas / totales.cotizacionesGeneradas) * 100 * 100) / 100
        : 0,
      productividad: totales.llamadasRealizadas + totales.reunionesAgendadas + totales.emailsEnviados,
      conversionProyectos: totales.cotizacionesAprobadas > 0
        ? Math.round((totales.proyectosCerrados / totales.cotizacionesAprobadas) * 100 * 100) / 100
        : 0
    }

    return NextResponse.json({
      usuario,
      periodo: {
        tipo,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        periodoActual: periodo
      },
      metricas: {
        totales,
        promedios: {
          tiempoPromedioCierre: 0,
          tasaConversion: totales.tasaConversion,
          valorPromedioProyecto: totales.valorPromedioProyecto
        },
        rendimiento
      },
      oportunidades: {
        total: oportunidades.length,
        porEstado: oportunidadesPorEstado,
        valorTotal: valorTotalOportunidades,
        lista: oportunidades.slice(0, 5)
      },
      actividades: actividades.map(act => ({
        id: act.id,
        tipo: act.tipo,
        descripcion: act.descripcion,
        fecha: act.fecha,
        resultado: act.resultado,
        oportunidad: act.crmOportunidad
      })),
      historialMetricas: []
    })
  } catch (error) {
    console.error('❌ Error al obtener métricas del usuario:', error)
    return NextResponse.json({ error: 'Error al obtener métricas del usuario' }, { status: 500 })
  }
}
