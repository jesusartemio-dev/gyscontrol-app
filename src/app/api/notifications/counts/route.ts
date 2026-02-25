/**
 * API para obtener contadores de notificaciones
 *
 * Devuelve los contadores de items que requieren atención:
 * - Cotizaciones pendientes (borrador o enviada)
 * - Proyectos activos (en ejecución o planificación)
 * - Pedidos pendientes (borrador o enviado)
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Ejecutar todas las consultas en paralelo para mejor rendimiento
    const [
      cotizacionesPendientes,
      proyectosActivos,
      pedidosPendientes,
      listasPorCotizar
    ] = await Promise.all([
      prisma.cotizacion.count({
        where: { estado: { in: ['borrador', 'enviada'] } }
      }),
      prisma.proyecto.count({
        where: {
          estado: { in: ['creado', 'en_planificacion', 'listas_pendientes', 'listas_aprobadas', 'pedidos_creados', 'en_ejecucion', 'en_cierre'] },
          deletedAt: null
        }
      }),
      prisma.pedidoEquipo.count({
        where: { estado: { in: ['borrador', 'enviado'] } }
      }),
      prisma.listaEquipo.count({
        where: { estado: { in: ['por_revisar', 'por_cotizar'] } }
      })
    ])

    return NextResponse.json({
      'cotizaciones-pendientes': cotizacionesPendientes,
      'proyectos-activos': proyectosActivos,
      'pedidos-pendientes': pedidosPendientes,
      'listas-por-cotizar': listasPorCotizar
    })

  } catch (error) {
    console.error('Error fetching notification counts:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
