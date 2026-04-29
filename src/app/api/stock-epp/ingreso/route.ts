import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento } from '@/lib/services/almacen'

/**
 * POST /api/stock-epp/ingreso
 * Ingreso manual de stock de EPPs al almacén (sin OC formal).
 * Body:
 *  {
 *    almacenId: string,
 *    items: [{ catalogoEppId, cantidad, costoUnitario?, costoMoneda? }],
 *    observaciones?: string,
 *  }
 * Cada item genera un MovimientoAlmacen tipo 'entrada_epp' que suma stock
 * y recalcula costo ponderado.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad', 'logistico', 'coordinador_logistico'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para ingresar stock' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.almacenId) {
      return NextResponse.json({ error: 'almacenId es requerido' }, { status: 400 })
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un item' }, { status: 400 })
    }

    // Validar almacén
    const almacen = await prisma.almacen.findUnique({ where: { id: body.almacenId } })
    if (!almacen || !almacen.activo) {
      return NextResponse.json({ error: 'Almacén no encontrado o inactivo' }, { status: 404 })
    }

    // Validar items
    for (const item of body.items) {
      if (!item.catalogoEppId || !item.cantidad || item.cantidad <= 0) {
        return NextResponse.json(
          { error: 'Cada item necesita catalogoEppId y cantidad > 0' },
          { status: 400 }
        )
      }
    }

    // Verificar que los catálogos existen y están activos
    const catalogoIds = body.items.map((i: any) => i.catalogoEppId)
    const catalogos = await prisma.catalogoEPP.findMany({
      where: { id: { in: catalogoIds } },
      select: { id: true, codigo: true, descripcion: true, activo: true },
    })
    const catalogoMap = new Map(catalogos.map(c => [c.id, c]))
    for (const item of body.items) {
      const cat = catalogoMap.get(item.catalogoEppId)
      if (!cat) {
        return NextResponse.json(
          { error: `EPP no encontrado: ${item.catalogoEppId}` },
          { status: 404 }
        )
      }
      if (!cat.activo) {
        return NextResponse.json(
          { error: `EPP inactivo: ${cat.codigo} — actívalo en el catálogo primero` },
          { status: 400 }
        )
      }
    }

    // Crear movimientos (uno por item) en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const movimientos = []
      for (const item of body.items) {
        const mov = await registrarMovimiento(
          {
            almacenId: body.almacenId,
            tipo: 'entrada_epp',
            catalogoEppId: item.catalogoEppId,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario ? Number(item.costoUnitario) : undefined,
            costoMoneda: item.costoMoneda || 'PEN',
            usuarioId: session.user.id,
            observaciones: body.observaciones || 'Ingreso manual de EPP',
          },
          tx as any
        )
        movimientos.push(mov)
      }
      return movimientos
    })

    return NextResponse.json({
      ok: true,
      movimientosCreados: resultado.length,
      mensaje: `${resultado.length} item(s) ingresados al stock`,
    })
  } catch (error: any) {
    console.error('Error en ingreso manual EPP:', error)
    return NextResponse.json(
      { error: error?.message || 'Error en ingreso manual' },
      { status: 500 }
    )
  }
}
