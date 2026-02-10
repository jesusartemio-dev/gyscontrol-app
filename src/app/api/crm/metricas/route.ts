// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/metricas
// 🔧 Descripción: API para métricas comerciales generales (tiempo real)
// ✅ GET: Obtener métricas generales del CRM calculadas on-the-fly
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper: calcular rango de fechas para un periodo YYYY-MM
function parsePeriodoFechas(periodo: string): { desde: Date; hasta: Date } {
  const [year, month] = periodo.split('-').map(Number)
  const desde = new Date(year, month - 1, 1)
  const hasta = new Date(year, month, 0, 23, 59, 59)
  return { desde, hasta }
}

// Helper: calcular metricas de un usuario para un rango de fechas
async function calcularMetricasUsuario(userId: string, desde: Date, hasta: Date) {
  const dateFilterCreated = { createdAt: { gte: desde, lte: hasta } }
  const dateFilterFecha = { fecha: { gte: desde, lte: hasta } }

  const [cotizaciones, aprobadas, proyectos, valorResult, margenResult, llamadas, reuniones, propuestas, emails] = await Promise.all([
    prisma.cotizacion.count({ where: { comercialId: userId, ...dateFilterCreated } }),
    prisma.cotizacion.count({ where: { comercialId: userId, estado: 'aprobada', ...dateFilterCreated } }),
    prisma.proyecto.count({ where: { comercialId: userId, ...dateFilterCreated } }),
    prisma.proyecto.aggregate({ where: { comercialId: userId, ...dateFilterCreated }, _sum: { grandTotal: true } }),
    prisma.proyecto.aggregate({ where: { comercialId: userId, ...dateFilterCreated }, _sum: { totalCliente: true, totalInterno: true } }),
    prisma.crmActividad.count({ where: { usuarioId: userId, tipo: 'llamada', ...dateFilterFecha } }),
    prisma.crmActividad.count({ where: { usuarioId: userId, tipo: { in: ['reunión', 'reunion'] }, ...dateFilterFecha } }),
    prisma.crmActividad.count({ where: { usuarioId: userId, tipo: 'propuesta', ...dateFilterFecha } }),
    prisma.crmActividad.count({ where: { usuarioId: userId, tipo: 'email', ...dateFilterFecha } }),
  ])

  const valorTotalVendido = valorResult._sum.grandTotal || 0
  const margenTotalObtenido = (margenResult._sum.totalCliente || 0) - (margenResult._sum.totalInterno || 0)
  const tasaConversion = cotizaciones > 0 ? (proyectos / cotizaciones) * 100 : 0
  const valorPromedioProyecto = proyectos > 0 ? valorTotalVendido / proyectos : 0

  return {
    cotizacionesGeneradas: cotizaciones,
    cotizacionesAprobadas: aprobadas,
    proyectosCerrados: proyectos,
    valorTotalVendido,
    margenTotalObtenido,
    tiempoPromedioCierre: null as number | null,
    tasaConversion: Math.round(tasaConversion * 100) / 100,
    valorPromedioProyecto: Math.round(valorPromedioProyecto * 100) / 100,
    llamadasRealizadas: llamadas,
    reunionesAgendadas: reuniones,
    propuestasEnviadas: propuestas,
    emailsEnviados: emails
  }
}

// ✅ GET /api/crm/metricas - Obtener métricas generales en tiempo real
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userRole = (session.user as any).role || 'comercial'
    const rolesConAccesoTotal = ['admin', 'gerente', 'coordinador']
    const esComercial = !rolesConAccesoTotal.includes(userRole)

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || new Date().toISOString().slice(0, 7)

    // Obtener el año para filtrar usuarios con actividad
    const year = parseInt(periodo.split('-')[0])
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)

    // RBAC: comercial solo ve sus propias métricas
    const usuarios = await prisma.user.findMany({
      where: {
        role: { in: ['comercial', 'coordinador', 'gerente', 'admin'] },
        ...(esComercial ? { id: session.user.id } : {}),
      },
      select: { id: true, name: true, email: true, role: true }
    })

    // Calcular metricas de cada usuario para el año
    const metricasUsuarios = await Promise.all(
      usuarios.map(async (usuario) => {
        const metricas = await calcularMetricasUsuario(usuario.id, yearStart, yearEnd)
        return { usuario, metricas }
      })
    )

    // Filtrar solo usuarios con alguna actividad
    const metricasActivas = metricasUsuarios.filter(m =>
      m.metricas.cotizacionesGeneradas > 0 || m.metricas.proyectosCerrados > 0 ||
      m.metricas.llamadasRealizadas > 0 || m.metricas.reunionesAgendadas > 0
    )

    // Ordenar por valor vendido descendente
    metricasActivas.sort((a, b) => b.metricas.valorTotalVendido - a.metricas.valorTotalVendido)

    // Calcular totales agregados
    const totales = metricasActivas.reduce((acc, { metricas: m }) => ({
      cotizacionesGeneradas: acc.cotizacionesGeneradas + m.cotizacionesGeneradas,
      cotizacionesAprobadas: acc.cotizacionesAprobadas + m.cotizacionesAprobadas,
      proyectosCerrados: acc.proyectosCerrados + m.proyectosCerrados,
      valorTotalVendido: acc.valorTotalVendido + m.valorTotalVendido,
      margenTotalObtenido: acc.margenTotalObtenido + m.margenTotalObtenido,
      llamadasRealizadas: acc.llamadasRealizadas + m.llamadasRealizadas,
      reunionesAgendadas: acc.reunionesAgendadas + m.reunionesAgendadas,
      propuestasEnviadas: acc.propuestasEnviadas + m.propuestasEnviadas,
      emailsEnviados: acc.emailsEnviados + m.emailsEnviados
    }), {
      cotizacionesGeneradas: 0, cotizacionesAprobadas: 0, proyectosCerrados: 0,
      valorTotalVendido: 0, margenTotalObtenido: 0,
      llamadasRealizadas: 0, reunionesAgendadas: 0, propuestasEnviadas: 0, emailsEnviados: 0
    })

    const numUsuarios = metricasActivas.length
    const promedios = numUsuarios > 0 ? {
      tiempoPromedioCierre: 0,
      tasaConversion: totales.cotizacionesGeneradas > 0
        ? Math.round((totales.proyectosCerrados / totales.cotizacionesGeneradas) * 100 * 100) / 100
        : 0,
      valorPromedioProyecto: totales.proyectosCerrados > 0
        ? Math.round((totales.valorTotalVendido / totales.proyectosCerrados) * 100) / 100
        : 0
    } : { tiempoPromedioCierre: 0, tasaConversion: 0, valorPromedioProyecto: 0 }

    return NextResponse.json({
      periodo,
      totales,
      promedios,
      usuarios: metricasActivas.map(({ usuario, metricas }) => ({
        usuario,
        metricas
      })),
      estadisticas: {
        numUsuarios,
        mejorVendedor: metricasActivas[0]?.usuario || null,
        peorVendedor: metricasActivas[metricasActivas.length - 1]?.usuario || null,
        promedioCotizacionesPorUsuario: numUsuarios > 0 ? Math.round(totales.cotizacionesGeneradas / numUsuarios) : 0,
        promedioValorPorUsuario: numUsuarios > 0 ? Math.round(totales.valorTotalVendido / numUsuarios) : 0
      }
    })
  } catch (error) {
    console.error('❌ Error al obtener métricas generales:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
