// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/reportes/clientes
// 🔧 Descripción: API para reporte de análisis de clientes
// ✅ GET: Obtener métricas y análisis de clientes
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener análisis de clientes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')

    // Obtener todos los clientes o uno específico
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
        // TODO: Add new fields when Prisma client is regenerated
        // frecuenciaCompraMeses: true,
        // calificacionSatisfaccion: true
      }
    })

    // Para cada cliente, calcular métricas reales
    const clientesConMetricas = await Promise.all(
      clientes.map(async (cliente) => {
        // Total de proyectos asociados al cliente
        const totalProyectos = await prisma.proyecto.count({
          where: { clienteId: cliente.id }
        })

        // Valor total de todos los proyectos
        const valorTotalResult = await prisma.proyecto.aggregate({
          where: { clienteId: cliente.id },
          _sum: { grandTotal: true }
        })

        // Último proyecto (más reciente)
        const ultimoProyecto = await prisma.proyecto.findFirst({
          where: { clienteId: cliente.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        })

        // Calcular frecuencia promedio entre proyectos (en meses)
        const proyectosCliente = await prisma.proyecto.findMany({
          where: { clienteId: cliente.id },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        })

        let frecuenciaPromedio = 0
        if (proyectosCliente.length > 1) {
          const intervalos: number[] = []
          for (let i = 1; i < proyectosCliente.length; i++) {
            const diffTime = proyectosCliente[i].createdAt.getTime() - proyectosCliente[i-1].createdAt.getTime()
            const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44) // promedio de días por mes
            intervalos.push(diffMonths)
          }
          frecuenciaPromedio = intervalos.reduce((sum, val) => sum + val, 0) / intervalos.length
        }

        // Calificación promedio de satisfacción (basada en calificación del cliente)
        const calificacionSatisfaccion = cliente.calificacion || 3

        // Calcular métricas adicionales
        const valorTotal = valorTotalResult._sum.grandTotal || 0
        const ultimoProyectoFecha = ultimoProyecto?.createdAt || cliente.ultimoProyecto

        return {
          cliente,
          metricas: {
            totalProyectos,
            valorTotal,
            ultimoProyecto: ultimoProyectoFecha,
            frecuenciaPromedio: Math.round(frecuenciaPromedio * 10) / 10, // redondear a 1 decimal
            satisfaccion: calificacionSatisfaccion,
            calificacion: cliente.calificacion || 3
          }
        }
      })
    )

    // Calcular resumen general
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
    console.error('❌ Error al obtener reporte de clientes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
