import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

/**
 * POST /api/logistica/almacen/herramientas/[id]/ajustar-stock
 * Solo aplica a herramientas bulk (gestionPorUnidad=false).
 *
 * Body:
 *   delta: number    (positivo suma stock, negativo resta)
 *   motivo: string   (obligatorio)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = session.user.role
  if (!['admin', 'gerente', 'coordinador_logistico', 'logistico'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { delta, motivo } = body

  if (typeof delta !== 'number' || delta === 0) {
    return NextResponse.json({ error: 'delta debe ser distinto de 0' }, { status: 400 })
  }
  if (!motivo || typeof motivo !== 'string') {
    return NextResponse.json({ error: 'motivo es obligatorio' }, { status: 400 })
  }

  const herramienta = await prisma.catalogoHerramienta.findUnique({ where: { id } })
  if (!herramienta) return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 })
  if (herramienta.gestionPorUnidad) {
    return NextResponse.json(
      { error: 'Esta herramienta se gestiona por unidad serializada. Usa el endpoint de unidades.' },
      { status: 400 }
    )
  }

  try {
    const almacen = await getAlmacenCentral()

    if (delta < 0) {
      const stockActual = await prisma.stockAlmacen.findUnique({
        where: { almacenId_catalogoHerramientaId: { almacenId: almacen.id, catalogoHerramientaId: id } },
      })
      const disponible = stockActual?.cantidadDisponible ?? 0
      if (disponible < Math.abs(delta)) {
        return NextResponse.json(
          { error: `Stock insuficiente. Disponible: ${disponible}, intentas reducir: ${Math.abs(delta)}` },
          { status: 400 }
        )
      }
    }

    const movimiento = await registrarMovimiento({
      almacenId: almacen.id,
      tipo: delta > 0 ? 'ajuste_inventario' : 'baja_herramienta',
      catalogoHerramientaId: id,
      cantidad: Math.abs(delta),
      usuarioId: session.user.id,
      observaciones: `Ajuste manual: ${motivo}`,
    })

    return NextResponse.json({ ok: true, movimiento })
  } catch (error: any) {
    console.error('Error al ajustar stock:', error)
    return NextResponse.json({ error: error.message || 'Error al ajustar stock' }, { status: 500 })
  }
}
