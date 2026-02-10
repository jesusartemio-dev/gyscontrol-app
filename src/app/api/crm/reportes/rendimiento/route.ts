// ===================================================
// Archivo: route.ts
// Ubicacion: /api/crm/reportes/rendimiento
// Descripcion: API para reporte de rendimiento comercial
// GET: Obtener metricas de rendimiento por usuario
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Returns the first and last+1 day of the month described by "YYYY-MM".
 */
function getDateRange(periodo: string): { gte: Date; lt: Date } {
  const [yearStr, monthStr] = periodo.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr) - 1 // 0-indexed
  return {
    gte: new Date(year, month, 1),
    lt: new Date(year, month + 1, 1), // automatically rolls over year
  }
}

// GET - Obtener metricas de rendimiento comercial
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Default period = current month
    const now = new Date()
    const defaultPeriodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const periodo = searchParams.get('periodo') || defaultPeriodo
    const usuarioId = searchParams.get('usuarioId')

    const dateRange = getDateRange(periodo)

    // Obtener usuarios con roles comerciales
    const usuariosComerciales = await prisma.user.findMany({
      where: {
        role: { in: ['comercial', 'coordinador', 'gerente', 'admin'] as any },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    // Para cada usuario, calcular metricas en paralelo
    const metricasUsuarios = await Promise.all(
      usuariosComerciales.map(async (usuario) => {
        const [
          cotizacionesGeneradas,
          cotizacionesAprobadas,
          proyectosCerrados,
          valorTotalResult,
          margenTotalResult,
          llamadasRealizadas,
          reunionesAgendadas,
          propuestasEnviadas,
          emailsEnviados,
        ] = await Promise.all([
          // Cotizaciones generadas
          prisma.cotizacion.count({
            where: {
              comercialId: usuario.id,
              createdAt: dateRange,
            },
          }),

          // Cotizaciones aprobadas
          prisma.cotizacion.count({
            where: {
              comercialId: usuario.id,
              estado: 'aprobada',
              createdAt: dateRange,
            },
          }),

          // Proyectos cerrados
          prisma.proyecto.count({
            where: {
              comercialId: usuario.id,
              createdAt: dateRange,
            },
          }),

          // Valor total vendido (suma de grandTotal de proyectos)
          prisma.proyecto.aggregate({
            where: {
              comercialId: usuario.id,
              createdAt: dateRange,
            },
            _sum: {
              grandTotal: true,
            },
          }),

          // Margen total obtenido
          prisma.proyecto.aggregate({
            where: {
              comercialId: usuario.id,
              createdAt: dateRange,
            },
            _sum: {
              totalCliente: true,
              totalInterno: true,
            },
          }),

          // Llamadas realizadas (actividades de tipo "llamada")
          prisma.crmActividad.count({
            where: {
              usuarioId: usuario.id,
              tipo: 'llamada',
              fecha: dateRange,
            },
          }),

          // Reuniones agendadas (actividades de tipo "reunion" o "reunión")
          prisma.crmActividad.count({
            where: {
              usuarioId: usuario.id,
              tipo: { in: ['reunión', 'reunion'] },
              fecha: dateRange,
            },
          }),

          // Propuestas enviadas (actividades de tipo "propuesta")
          prisma.crmActividad.count({
            where: {
              usuarioId: usuario.id,
              tipo: 'propuesta',
              fecha: dateRange,
            },
          }),

          // Emails enviados (actividades de tipo "email")
          prisma.crmActividad.count({
            where: {
              usuarioId: usuario.id,
              tipo: 'email',
              fecha: dateRange,
            },
          }),
        ])

        // Calcular metricas derivadas
        const valorTotalVendido = valorTotalResult._sum.grandTotal || 0
        const margenTotalObtenido =
          (margenTotalResult._sum.totalCliente || 0) - (margenTotalResult._sum.totalInterno || 0)
        const tasaConversion =
          cotizacionesGeneradas > 0 ? (proyectosCerrados / cotizacionesGeneradas) * 100 : 0
        const tiempoPromedioCierre = proyectosCerrados > 0 ? 24 : null // Placeholder
        const valorPromedioProyecto =
          proyectosCerrados > 0 ? valorTotalVendido / proyectosCerrados : 0

        return {
          usuarioId: usuario.id,
          usuario: {
            id: usuario.id,
            name: usuario.name,
            email: usuario.email,
          },
          metaMensual: null, // TODO: Add when Prisma client is regenerated
          metaTrimestral: null, // TODO: Add when Prisma client is regenerated
          metricas: {
            cotizacionesGeneradas,
            cotizacionesAprobadas,
            proyectosCerrados,
            valorTotalVendido,
            margenTotalObtenido,
            tiempoPromedioCierre,
            tasaConversion,
            valorPromedioProyecto,
            llamadasRealizadas,
            reunionesAgendadas,
            propuestasEnviadas,
            emailsEnviados,
          },
        }
      })
    )

    // Filtrar por usuario especifico si se proporciona
    const metricasFiltradas = usuarioId
      ? metricasUsuarios.filter((m) => m.usuarioId === usuarioId)
      : metricasUsuarios

    // Calcular resumen general
    const resumen = {
      totalCotizaciones: metricasFiltradas.reduce(
        (sum, m) => sum + m.metricas.cotizacionesGeneradas,
        0
      ),
      totalProyectos: metricasFiltradas.reduce(
        (sum, m) => sum + m.metricas.proyectosCerrados,
        0
      ),
      totalValor: metricasFiltradas.reduce(
        (sum, m) => sum + m.metricas.valorTotalVendido,
        0
      ),
      promedioConversion:
        metricasFiltradas.length > 0
          ? metricasFiltradas.reduce((sum, m) => sum + m.metricas.tasaConversion, 0) /
            metricasFiltradas.length
          : 0,
      periodo,
    }

    return NextResponse.json({
      comerciales: metricasFiltradas,
      resumen,
      periodo,
    })
  } catch (error) {
    console.error('Error al obtener reporte de rendimiento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
