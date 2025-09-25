// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/reportes/rendimiento
// 🔧 Descripción: API para reporte de rendimiento comercial
// ✅ GET: Obtener métricas de rendimiento por usuario
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener métricas de rendimiento comercial
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get('periodo') || '2024-10' // Mes actual por defecto
    const usuarioId = searchParams.get('usuarioId')

    // Obtener usuarios comerciales
    const usuariosComerciales = await prisma.user.findMany({
      where: {
        role: 'comercial'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Para cada usuario comercial, calcular métricas
    const metricasUsuarios = await Promise.all(
      usuariosComerciales.map(async (usuario) => {
        // Cotizaciones generadas
        const cotizacionesGeneradas = await prisma.cotizacion.count({
          where: {
            comercialId: usuario.id,
            createdAt: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          }
        })

        // Cotizaciones aprobadas
        const cotizacionesAprobadas = await prisma.cotizacion.count({
          where: {
            comercialId: usuario.id,
            estado: 'aprobada',
            createdAt: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          }
        })

        // Proyectos cerrados (cotizaciones que tienen proyectos asociados)
        const proyectosCerrados = await prisma.proyecto.count({
          where: {
            comercialId: usuario.id,
            createdAt: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          }
        })

        // Valor total vendido (suma de grandTotal de proyectos)
        const valorTotalResult = await prisma.proyecto.aggregate({
          where: {
            comercialId: usuario.id,
            createdAt: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          },
          _sum: {
            grandTotal: true
          }
        })

        // Margen total obtenido (aproximación basada en proyectos)
        const margenTotalResult = await prisma.proyecto.aggregate({
          where: {
            comercialId: usuario.id,
            createdAt: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          },
          _sum: {
            totalCliente: true,
            totalInterno: true
          }
        })

        // Llamadas realizadas (actividades de tipo "llamada")
        const llamadasRealizadas = await prisma.crmActividad.count({
          where: {
            usuarioId: usuario.id,
            tipo: 'llamada',
            fecha: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          }
        })

        // Reuniones agendadas (actividades de tipo "reunión")
        const reunionesAgendadas = await prisma.crmActividad.count({
          where: {
            usuarioId: usuario.id,
            tipo: 'reunión',
            fecha: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          }
        })

        // Propuestas enviadas (actividades de tipo "propuesta")
        const propuestasEnviadas = await prisma.crmActividad.count({
          where: {
            usuarioId: usuario.id,
            tipo: 'propuesta',
            fecha: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          }
        })

        // Emails enviados (actividades de tipo "email")
        const emailsEnviados = await prisma.crmActividad.count({
          where: {
            usuarioId: usuario.id,
            tipo: 'email',
            fecha: {
              gte: new Date(`${periodo}-01`),
              lt: new Date(`${periodo}-01`).getMonth() === 11
                ? new Date(`${parseInt(periodo.split('-')[0]) + 1}-01-01`)
                : new Date(`${periodo.split('-')[0]}-${String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0')}-01`)
            }
          }
        })

        // Calcular métricas derivadas
        const valorTotalVendido = valorTotalResult._sum.grandTotal || 0
        const margenTotalObtenido = (margenTotalResult._sum.totalCliente || 0) - (margenTotalResult._sum.totalInterno || 0)
        const tasaConversion = cotizacionesGeneradas > 0 ? (proyectosCerrados / cotizacionesGeneradas) * 100 : 0
        const tiempoPromedioCierre = proyectosCerrados > 0 ? 24 : null // Placeholder - requeriría cálculo más complejo
        const valorPromedioProyecto = proyectosCerrados > 0 ? valorTotalVendido / proyectosCerrados : 0

        return {
          usuarioId: usuario.id,
          usuario: {
            id: usuario.id,
            name: usuario.name,
            email: usuario.email
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
            emailsEnviados
          }
        }
      })
    )

    // Filtrar por usuario específico si se proporciona
    const metricasFiltradas = usuarioId
      ? metricasUsuarios.filter(m => m.usuarioId === usuarioId)
      : metricasUsuarios

    // Calcular resumen general
    const resumen = {
      totalCotizaciones: metricasFiltradas.reduce((sum, m) => sum + m.metricas.cotizacionesGeneradas, 0),
      totalProyectos: metricasFiltradas.reduce((sum, m) => sum + m.metricas.proyectosCerrados, 0),
      totalValor: metricasFiltradas.reduce((sum, m) => sum + m.metricas.valorTotalVendido, 0),
      promedioConversion: metricasFiltradas.length > 0
        ? metricasFiltradas.reduce((sum, m) => sum + m.metricas.tasaConversion, 0) / metricasFiltradas.length
        : 0,
      periodo
    }

    return NextResponse.json({
      comerciales: metricasFiltradas,
      resumen,
      periodo
    })

  } catch (error) {
    console.error('❌ Error al obtener reporte de rendimiento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}