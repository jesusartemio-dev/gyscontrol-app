// ===================================================
// Archivo: route.ts
// Ubicacion: /api/crm/reportes/clientes
// Descripcion: API para reporte de análisis de clientes
// GET: Obtener métricas y análisis de clientes
// ===================================================

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Obtener análisis de clientes (optimized: batch queries instead of N+1)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')

    // Obtener clientes
    const clientes = await prisma.cliente.findMany({
      where: clienteId ? { id: clienteId } : {},
      select: {
        id: true,
        nombre: true,
        ruc: true,
        sector: true,
        tamanoEmpresa: true,
        frecuenciaCompra: true,
        ultimoProyecto: true,
        estadoRelacion: true,
        calificacion: true,
      }
    })

    const clienteIds = clientes.map(c => c.id)

    // Batch: counts and aggregates in 3 queries instead of 4*N
    const [countsByCliente, valorByCliente, proyectosPorCliente] = await Promise.all([
      // Count proyectos per client
      prisma.proyecto.groupBy({
        by: ['clienteId'],
        where: { clienteId: { in: clienteIds } },
        _count: { id: true },
      }),
      // Sum grandTotal per client
      prisma.proyecto.groupBy({
        by: ['clienteId'],
        where: { clienteId: { in: clienteIds } },
        _sum: { grandTotal: true },
      }),
      // Get all projects with dates for frequency calc + ultimo proyecto
      prisma.proyecto.findMany({
        where: { clienteId: { in: clienteIds } },
        select: { clienteId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // Build lookup maps
    const countMap = new Map(countsByCliente.map(c => [c.clienteId, c._count.id]))
    const valorMap = new Map(valorByCliente.map(c => [c.clienteId, c._sum.grandTotal || 0]))

    // Group projects by clienteId for frequency calculation
    const proyectosMap = new Map<string, Date[]>()
    for (const p of proyectosPorCliente) {
      if (!proyectosMap.has(p.clienteId)) {
        proyectosMap.set(p.clienteId, [])
      }
      proyectosMap.get(p.clienteId)!.push(p.createdAt)
    }

    // Build response
    const clientesConMetricas = clientes.map(cliente => {
      const totalProyectos = countMap.get(cliente.id) || 0
      const valorTotal = valorMap.get(cliente.id) || 0
      const fechasProyectos = proyectosMap.get(cliente.id) || []

      // Último proyecto
      const ultimoProyectoFecha = fechasProyectos.length > 0
        ? fechasProyectos[fechasProyectos.length - 1]
        : cliente.ultimoProyecto

      // Frecuencia promedio entre proyectos (meses)
      let frecuenciaPromedio = 0
      if (fechasProyectos.length > 1) {
        const intervalos: number[] = []
        for (let i = 1; i < fechasProyectos.length; i++) {
          const diffTime = fechasProyectos[i].getTime() - fechasProyectos[i - 1].getTime()
          const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44)
          intervalos.push(diffMonths)
        }
        frecuenciaPromedio = intervalos.reduce((sum, val) => sum + val, 0) / intervalos.length
      }

      const calificacionSatisfaccion = cliente.calificacion || 3

      return {
        cliente,
        metricas: {
          totalProyectos,
          valorTotal,
          ultimoProyecto: ultimoProyectoFecha,
          frecuenciaPromedio: Math.round(frecuenciaPromedio * 10) / 10,
          satisfaccion: calificacionSatisfaccion,
          calificacion: cliente.calificacion || 3
        }
      }
    })

    // Resumen general
    const resumen = {
      totalClientes: clientesConMetricas.length,
      clientesActivos: clientesConMetricas.filter(c => c.cliente.estadoRelacion === 'cliente_activo').length,
      valorCartera: clientesConMetricas.reduce((sum, c) => sum + c.metricas.valorTotal, 0),
      satisfaccionPromedio: clientesConMetricas.length > 0
        ? clientesConMetricas.reduce((sum, c) => sum + c.metricas.satisfaccion, 0) / clientesConMetricas.length
        : 0,
      proyectosTotales: clientesConMetricas.reduce((sum, c) => sum + c.metricas.totalProyectos, 0)
    }

    return NextResponse.json({
      clientes: clientesConMetricas,
      resumen
    })

  } catch (error) {
    console.error('Error al obtener reporte de clientes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
