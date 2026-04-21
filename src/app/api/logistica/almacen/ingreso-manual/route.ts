import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'coordinador_logistico', 'logistico']

/**
 * POST /api/logistica/almacen/ingreso-manual
 *
 * Permite cargar manualmente stock de un ítem del catálogo al almacén central.
 * Pensado para regularizar inventario físico no registrado.
 *
 * Body:
 *   catalogoEquipoId: string
 *   cantidad: number (> 0)
 *   costoUnitario: number (> 0)
 *   costoMoneda?: 'PEN' | 'USD' (default 'PEN')
 *   observaciones?: string
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_PERMITIDOS.includes(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const { catalogoEquipoId, cantidad, costoUnitario, costoMoneda, observaciones } = body

  if (!catalogoEquipoId) {
    return NextResponse.json({ error: 'Debes seleccionar un ítem del catálogo' }, { status: 400 })
  }
  if (typeof cantidad !== 'number' || cantidad <= 0) {
    return NextResponse.json({ error: 'Cantidad debe ser mayor a 0' }, { status: 400 })
  }
  if (typeof costoUnitario !== 'number' || costoUnitario <= 0) {
    return NextResponse.json({ error: 'Costo unitario debe ser mayor a 0' }, { status: 400 })
  }

  const catalogo = await prisma.catalogoEquipo.findUnique({
    where: { id: catalogoEquipoId },
    select: { id: true, codigo: true, descripcion: true },
  })
  if (!catalogo) {
    return NextResponse.json({ error: 'Ítem del catálogo no encontrado' }, { status: 404 })
  }

  try {
    const almacen = await getAlmacenCentral()
    const movimiento = await registrarMovimiento({
      almacenId: almacen.id,
      tipo: 'ajuste_inventario',
      catalogoEquipoId,
      cantidad,
      costoUnitario,
      costoMoneda: costoMoneda || 'PEN',
      usuarioId: session.user.id,
      observaciones: observaciones
        ? `Ingreso manual: ${observaciones}`
        : `Ingreso manual de ${cantidad} x ${catalogo.codigo}`,
    })

    return NextResponse.json({ ok: true, movimiento }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al registrar' }, { status: 500 })
  }
}
