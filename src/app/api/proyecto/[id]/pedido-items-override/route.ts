/**
 * GET /api/proyecto/[id]/pedido-items-override?categoria=equipos|servicios|gastos
 *
 * Devuelve los PedidoEquipoItem imputados a este proyecto vía override
 * (item.proyectoId === id), opcionalmente filtrados por categoría de costo.
 * Incluye el pedido padre para trazabilidad.
 */
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await context.params
    const { searchParams } = new URL(request.url)
    const categoriaParam = searchParams.get('categoria')

    const categoriaCosto =
      categoriaParam === 'equipos' || categoriaParam === 'servicios' || categoriaParam === 'gastos'
        ? categoriaParam
        : undefined

    const items = await prisma.pedidoEquipoItem.findMany({
      where: {
        proyectoId,
        ...(categoriaCosto ? { categoriaCosto } : {}),
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        unidad: true,
        cantidadPedida: true,
        cantidadAtendida: true,
        precioUnitario: true,
        costoTotal: true,
        estado: true,
        categoriaCosto: true,
        pedidoEquipo: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estado: true,
            centroCosto: { select: { id: true, nombre: true } },
            proyecto: { select: { id: true, codigo: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Totales auxiliares
    const totalPresupuesto = items.reduce((s, it) => s + (it.costoTotal ?? 0), 0)
    const totalReal = items.reduce(
      (s, it) => s + (it.precioUnitario ?? 0) * (it.cantidadAtendida ?? 0),
      0
    )

    return NextResponse.json({
      items,
      totals: {
        totalPresupuesto: Math.round(totalPresupuesto * 100) / 100,
        totalReal: Math.round(totalReal * 100) / 100,
        cantidad: items.length,
      },
    })
  } catch (error) {
    console.error('❌ Error obteniendo items con override:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
