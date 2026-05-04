import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

/**
 * POST /api/logistica/almacen/herramientas/[id]/dar-de-baja
 *
 * Da de baja una herramienta (oficial). Cubre dos casos:
 *  - Baja "natural": rotura en almacén, vida útil terminada, etc.
 *  - Baja por pérdida en préstamo: cierra el ítem como `perdido` y
 *    libera al usuario responsable.
 *
 * Body:
 *   herramientaUnidadId?: string  // requerido si es serializada
 *   cantidad?: number             // requerido si es no-serializada
 *   motivo: string                // obligatorio
 *   prestamoItemId?: string       // opcional; si la baja se origina por
 *                                 //   pérdida en un préstamo activo
 *
 * Permisos: admin / gerente.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = session.user.role
  if (!['admin', 'gerente'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos. Solo admin o gerente puede dar de baja.' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { herramientaUnidadId, cantidad, motivo, prestamoItemId } = body

  if (!motivo || typeof motivo !== 'string' || !motivo.trim()) {
    return NextResponse.json({ error: 'motivo es obligatorio' }, { status: 400 })
  }

  const herramienta = await prisma.catalogoHerramienta.findUnique({ where: { id } })
  if (!herramienta) return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 })

  // Validar combinación según tipo de gestión.
  if (herramienta.gestionPorUnidad) {
    if (!herramientaUnidadId) {
      return NextResponse.json({ error: 'herramientaUnidadId es requerido para herramientas serializadas' }, { status: 400 })
    }
  } else {
    if (typeof cantidad !== 'number' || cantidad <= 0 || !Number.isInteger(cantidad)) {
      return NextResponse.json({ error: 'cantidad debe ser un entero mayor a 0' }, { status: 400 })
    }
  }

  // Si vino prestamoItemId, validarlo.
  let prestamoItem: Awaited<ReturnType<typeof prisma.prestamoHerramientaItem.findUnique>> | null = null
  if (prestamoItemId) {
    prestamoItem = await prisma.prestamoHerramientaItem.findUnique({
      where: { id: prestamoItemId },
    })
    if (!prestamoItem) {
      return NextResponse.json({ error: 'Ítem de préstamo no encontrado' }, { status: 404 })
    }
    if (prestamoItem.estado !== 'prestado') {
      return NextResponse.json(
        { error: `El ítem de préstamo ya está cerrado (estado: ${prestamoItem.estado})` },
        { status: 409 }
      )
    }
    // Coherencia: el ítem debe corresponder a esta herramienta.
    if (herramienta.gestionPorUnidad) {
      if (prestamoItem.herramientaUnidadId !== herramientaUnidadId) {
        return NextResponse.json(
          { error: 'El ítem de préstamo no corresponde a la unidad indicada' },
          { status: 400 }
        )
      }
    } else {
      if (prestamoItem.catalogoHerramientaId !== id) {
        return NextResponse.json(
          { error: 'El ítem de préstamo no corresponde a esta herramienta' },
          { status: 400 }
        )
      }
      const pendiente = prestamoItem.cantidadPrestada - prestamoItem.cantidadDevuelta
      if (cantidad! > pendiente) {
        return NextResponse.json(
          { error: `No se puede dar de baja ${cantidad}, solo quedan ${pendiente} pendientes en el préstamo` },
          { status: 400 }
        )
      }
    }
  }

  try {
    const almacen = await getAlmacenCentral()
    const motivoLimpio = motivo.trim()

    const result = await prisma.$transaction(async (tx) => {
      let unidadAfectada: { id: string; serie: string } | null = null
      let prestamoIdAfectado: string | null = null

      if (herramienta.gestionPorUnidad) {
        const unidad = await tx.herramientaUnidad.findUnique({ where: { id: herramientaUnidadId! } })
        if (!unidad) throw new Error('Unidad no encontrada')
        if (unidad.catalogoHerramientaId !== id) {
          throw new Error('La unidad no pertenece a esta herramienta')
        }
        if (unidad.estado === 'dada_de_baja') {
          throw new Error('La unidad ya está dada de baja')
        }

        // Auto-link: si está prestada y no se pasó prestamoItemId, buscar el ítem activo.
        if (unidad.estado === 'prestada' && !prestamoItem) {
          const itemActivo = await tx.prestamoHerramientaItem.findFirst({
            where: {
              herramientaUnidadId: unidad.id,
              estado: 'prestado',
            },
          })
          if (itemActivo) prestamoItem = itemActivo
        }

        await tx.herramientaUnidad.update({
          where: { id: unidad.id },
          data: {
            estado: 'dada_de_baja',
            observaciones: unidad.observaciones
              ? `${unidad.observaciones}\n[Baja] ${motivoLimpio}`
              : `[Baja] ${motivoLimpio}`,
          },
        })
        unidadAfectada = { id: unidad.id, serie: unidad.serie }
      }

      // Cierre del ítem de préstamo (si aplica).
      if (prestamoItem) {
        const cantBaja = herramienta.gestionPorUnidad ? 1 : cantidad!
        await tx.prestamoHerramientaItem.update({
          where: { id: prestamoItem.id },
          data: {
            cantidadDevuelta: prestamoItem.cantidadDevuelta + cantBaja,
            estado: 'perdido',
            fechaDevolucionItem: new Date(),
            motivoBaja: motivoLimpio,
            fechaBaja: new Date(),
            dadoDeBajaPorId: session.user.id,
          },
        })

        // Recalcular estado del préstamo padre.
        const itemsPrestamo = await tx.prestamoHerramientaItem.findMany({
          where: { prestamoId: prestamoItem.prestamoId },
        })
        const todosCerrados = itemsPrestamo.every(
          (i) => i.estado === 'devuelto' || i.estado === 'perdido'
        )
        const algoDevuelto = itemsPrestamo.some((i) => i.cantidadDevuelta > 0)
        await tx.prestamoHerramienta.update({
          where: { id: prestamoItem.prestamoId },
          data: {
            estado: todosCerrados ? 'devuelto' : algoDevuelto ? 'devuelto_parcial' : 'activo',
            fechaDevolucionReal: todosCerrados ? new Date() : null,
          },
        })
        prestamoIdAfectado = prestamoItem.prestamoId
      }

      // Registro del movimiento de baja.
      if (herramienta.gestionPorUnidad) {
        // Para serializadas no hay stock por cantidad — solo movimiento auditable.
        await registrarMovimiento(
          {
            almacenId: almacen.id,
            tipo: 'baja_herramienta',
            herramientaUnidadId: unidadAfectada!.id,
            cantidad: 1,
            usuarioId: session.user.id,
            prestamoHerramientaId: prestamoIdAfectado || undefined,
            observaciones: prestamoIdAfectado
              ? `Baja por pérdida en préstamo: ${motivoLimpio}`
              : `Baja: ${motivoLimpio}`,
          },
          tx as any
        )
      } else if (prestamoIdAfectado) {
        // No-serializada con préstamo: el stock YA fue descontado al crear el préstamo.
        // Insertamos el movimiento directo para evitar doble descuento.
        await tx.movimientoAlmacen.create({
          data: {
            almacenId: almacen.id,
            tipo: 'baja_herramienta',
            catalogoHerramientaId: id,
            cantidad: cantidad!,
            usuarioId: session.user.id,
            prestamoHerramientaId: prestamoIdAfectado,
            observaciones: `Baja por pérdida en préstamo: ${motivoLimpio}`,
          },
        })
      } else {
        // No-serializada, baja natural: descuenta del stock.
        const stock = await tx.stockAlmacen.findUnique({
          where: {
            almacenId_catalogoHerramientaId: {
              almacenId: almacen.id,
              catalogoHerramientaId: id,
            },
          },
        })
        const disponible = stock?.cantidadDisponible ?? 0
        if (disponible < cantidad!) {
          throw new Error(`Stock insuficiente. Disponible: ${disponible}, intentas dar de baja: ${cantidad}`)
        }
        await registrarMovimiento(
          {
            almacenId: almacen.id,
            tipo: 'baja_herramienta',
            catalogoHerramientaId: id,
            cantidad: cantidad!,
            usuarioId: session.user.id,
            observaciones: `Baja: ${motivoLimpio}`,
          },
          tx as any
        )
      }

      return { unidadAfectada, prestamoIdAfectado }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    console.error('Error al dar de baja:', error)
    return NextResponse.json({ error: error.message || 'Error al dar de baja' }, { status: 500 })
  }
}
