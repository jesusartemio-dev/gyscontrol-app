import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento } from '@/lib/services/almacen'

/**
 * POST /api/entrega-epp/items/[itemId]/accion
 * Body:
 *  {
 *    accion: 'renovar' | 'devolver' | 'perdido' | 'dañado' | 'baja',
 *    observaciones?: string,
 *    // Para renovar:
 *    catalogoEppIdNuevo?: string,  // SKU del item nuevo (default: mismo SKU)
 *    almacenId?: string,           // De qué almacén sale el nuevo (default: el mismo de la entrega original)
 *    talla?: string,               // Si aplica
 *  }
 *
 * Reglas:
 *  - Solo items en estado 'vigente' pueden cambiarse
 *  - 'renovar': crea un EntregaEPPItem nuevo en la MISMA entrega original (vigente),
 *    marca el original como 'reemplazado' y enlaza vía reemplazadoPorItemId.
 *    Descuenta stock con tipo 'salida_epp'.
 *  - 'devolver': marca como 'devuelto' y re-ingresa stock con 'devolucion_epp'.
 *  - 'perdido' / 'dañado' / 'baja': solo cambian estado y registran motivo.
 */

const TIPOS_BAJA = ['perdido', 'dañado', 'baja'] as const
type Accion = 'renovar' | 'devolver' | typeof TIPOS_BAJA[number]

export async function POST(req: Request, ctx: { params: Promise<{ itemId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { itemId } = await ctx.params
    const body = await req.json() as {
      accion: Accion
      observaciones?: string
      catalogoEppIdNuevo?: string
      almacenId?: string
      talla?: string
    }

    const { accion } = body
    if (!['renovar', 'devolver', 'perdido', 'dañado', 'baja'].includes(accion)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const item = await prisma.entregaEPPItem.findUnique({
      where: { id: itemId },
      include: {
        entrega: { select: { id: true, almacenId: true } },
        catalogoEpp: { select: { id: true, vidaUtilDias: true } },
      },
    })
    if (!item) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    if (item.estado !== 'vigente') {
      return NextResponse.json({ error: `El item ya está en estado "${item.estado}". Solo se pueden modificar items vigentes.` }, { status: 400 })
    }

    const ahora = new Date()
    const obsPrefix = body.observaciones?.trim() ? body.observaciones.trim() : null

    // ─── Acciones simples (estado + sin movimiento de stock) ───
    if (TIPOS_BAJA.includes(accion as any)) {
      const motivoMap: Record<string, string> = {
        perdido: 'perdido',
        dañado: 'dañado',
        baja: 'baja_voluntaria',
      }
      const updated = await prisma.entregaEPPItem.update({
        where: { id: itemId },
        data: {
          estado: accion as any,
          motivoBaja: motivoMap[accion],
          observaciones: obsPrefix
            ? `${item.observaciones ? item.observaciones + ' | ' : ''}${obsPrefix}`
            : item.observaciones,
          updatedAt: ahora,
        },
      })
      return NextResponse.json({ ok: true, item: updated })
    }

    // ─── Devolver (re-ingresa al stock) ───
    if (accion === 'devolver') {
      return await prisma.$transaction(async (tx) => {
        const updated = await tx.entregaEPPItem.update({
          where: { id: itemId },
          data: {
            estado: 'devuelto',
            motivoBaja: 'devuelto_empleado',
            observaciones: obsPrefix
              ? `${item.observaciones ? item.observaciones + ' | ' : ''}${obsPrefix}`
              : item.observaciones,
            updatedAt: ahora,
          },
        })
        await registrarMovimiento(
          {
            almacenId: item.entrega.almacenId,
            tipo: 'devolucion_epp',
            catalogoEppId: item.catalogoEpp.id,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario ?? undefined,
            costoMoneda: item.costoMoneda,
            usuarioId: session.user.id,
            entregaEppItemId: itemId,
            observaciones: obsPrefix || 'Devolución de EPP por empleado',
          },
          tx as any
        )
        return NextResponse.json({ ok: true, item: updated })
      })
    }

    // ─── Renovar (crea nuevo item + marca original como reemplazado) ───
    if (accion === 'renovar') {
      const catalogoEppIdNuevo = body.catalogoEppIdNuevo ?? item.catalogoEpp.id
      const almacenIdNuevo = body.almacenId ?? item.entrega.almacenId

      // Validar stock disponible para el nuevo SKU
      const stock = await prisma.stockAlmacen.findUnique({
        where: {
          almacenId_catalogoEppId: { almacenId: almacenIdNuevo, catalogoEppId: catalogoEppIdNuevo },
        },
        include: { catalogoEpp: { select: { codigo: true, vidaUtilDias: true } } },
      })
      if (!stock || stock.cantidadDisponible < item.cantidad) {
        return NextResponse.json(
          { error: `Stock insuficiente para renovar: disponible ${stock?.cantidadDisponible ?? 0}, requerido ${item.cantidad}` },
          { status: 400 }
        )
      }

      return await prisma.$transaction(async (tx) => {
        // Crear el item nuevo en la misma entrega
        const fechaReposicion = stock.catalogoEpp?.vidaUtilDias
          ? new Date(ahora.getTime() + stock.catalogoEpp.vidaUtilDias * 24 * 60 * 60 * 1000)
          : null

        const nuevoItem = await tx.entregaEPPItem.create({
          data: {
            entregaId: item.entrega.id,
            catalogoEppId: catalogoEppIdNuevo,
            cantidad: item.cantidad,
            talla: body.talla?.trim() || item.talla,
            costoUnitario: stock.costoUnitarioPromedio ?? null,
            costoMoneda: stock.costoMoneda,
            fechaEntrega: ahora,
            fechaReposicionEstimada: fechaReposicion,
            estado: 'vigente',
            observaciones: obsPrefix ? `Renovación de ${item.id}: ${obsPrefix}` : `Renovación del item ${item.id}`,
            updatedAt: ahora,
          },
        })

        // Marcar el original como reemplazado y enlazar
        await tx.entregaEPPItem.update({
          where: { id: itemId },
          data: {
            estado: 'reemplazado',
            motivoBaja: 'renovado',
            reemplazadoPorItemId: nuevoItem.id,
            updatedAt: ahora,
          },
        })

        // Registrar el movimiento de salida (descuenta stock)
        await registrarMovimiento(
          {
            almacenId: almacenIdNuevo,
            tipo: 'salida_epp',
            catalogoEppId: catalogoEppIdNuevo,
            cantidad: item.cantidad,
            costoUnitario: stock.costoUnitarioPromedio ?? undefined,
            costoMoneda: stock.costoMoneda,
            usuarioId: session.user.id,
            entregaEppItemId: nuevoItem.id,
            observaciones: `Renovación de ${item.id}`,
          },
          tx as any
        )

        return NextResponse.json({ ok: true, itemOriginal: item.id, itemNuevo: nuevoItem })
      })
    }

    return NextResponse.json({ error: 'Acción no implementada' }, { status: 500 })
  } catch (error: any) {
    console.error('Error en acción de item EPP:', error)
    return NextResponse.json({ error: error?.message || 'Error en acción' }, { status: 500 })
  }
}
