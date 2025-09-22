// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/clientes/[id]/historial
// 🔧 Descripción: API para obtener historial de proyectos del cliente
// ✅ GET: Obtener historial de proyectos
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/crm/clientes/[id]/historial - Obtener historial de proyectos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener proyectos asociados al cliente
    const proyectos = await prisma.proyecto.findMany({
      where: { clienteId: id },
      include: {
        comercial: {
          select: { id: true, name: true, email: true }
        },
        gestor: {
          select: { id: true, name: true, email: true }
        },
        cotizacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            totalCliente: true,
            grandTotal: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Obtener cotizaciones sin proyecto asociado
    const cotizacionesSinProyecto = await prisma.cotizacion.findMany({
      where: {
        clienteId: id,
        // Filtrar cotizaciones que no están asociadas a ningún proyecto
        proyectos: {
          none: {} // No tiene ningún proyecto asociado
        }
      },
      include: {
        comercial: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular métricas del cliente
    const metricas = {
      totalProyectos: proyectos.length,
      totalCotizaciones: cotizacionesSinProyecto.length,
      valorTotalProyectos: proyectos.reduce((sum, p) => sum + (p.grandTotal || 0), 0),
      valorTotalCotizaciones: cotizacionesSinProyecto.reduce((sum, c) => sum + (c.grandTotal || 0), 0),
      ultimoProyecto: proyectos.length > 0 ? proyectos[0].fechaFin || proyectos[0].createdAt : null,
      promedioValorProyecto: proyectos.length > 0 ?
        proyectos.reduce((sum, p) => sum + (p.grandTotal || 0), 0) / proyectos.length : 0
    }

    return NextResponse.json({
      proyectos,
      cotizacionesSinProyecto,
      metricas
    })
  } catch (error) {
    console.error('❌ Error al obtener historial:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}