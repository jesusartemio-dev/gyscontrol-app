import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { propagarPrecioRealCatalogo } from '@/lib/services/catalogoPrecioSync'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para registrar recepción' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.ordenCompra.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    if (!['confirmada', 'parcial'].includes(existing.estado)) {
      return NextResponse.json({ error: 'Solo se puede registrar recepción en estado confirmada o parcial' }, { status: 400 })
    }

    const body = await req.json()
    const recepciones: { itemId: string; cantidadRecibida: number }[] = body.items

    if (!recepciones || recepciones.length === 0) {
      return NextResponse.json({ error: 'Debe indicar al menos un item' }, { status: 400 })
    }

    // Wrap all mutations in a transaction to prevent race conditions (e.g., double-click creating duplicates)
    const { data, recepcionesPendientesCreadas } = await prisma.$transaction(async (tx) => {
      // Update each item's cantidadRecibida
      for (const rec of recepciones) {
        const item = existing.items.find(i => i.id === rec.itemId)
        if (!item) continue
        const nueva = Math.min(rec.cantidadRecibida, item.cantidad)
        await tx.ordenCompraItem.update({
          where: { id: rec.itemId },
          data: { cantidadRecibida: nueva, updatedAt: new Date() },
        })
      }

      // Crear RecepcionPendiente para items vinculados a pedidos
      let creadas = 0
      for (const rec of recepciones) {
        const item = existing.items.find(i => i.id === rec.itemId)
        if (!item || !item.pedidoEquipoItemId) continue

        const cantidadEfectiva = Math.min(rec.cantidadRecibida, item.cantidad)
        if (cantidadEfectiva <= 0) continue

        // Evitar duplicados: no crear si ya existe una para este OC item en estado activo
        const existente = await tx.recepcionPendiente.findFirst({
          where: {
            ordenCompraItemId: item.id,
            estado: { in: ['pendiente', 'en_almacen'] },
          }
        })
        if (existente) continue

        await tx.recepcionPendiente.create({
          data: {
            pedidoEquipoItemId: item.pedidoEquipoItemId,
            ordenCompraItemId: item.id,
            cantidadRecibida: cantidadEfectiva,
          }
        })
        creadas++
      }

      // Re-fetch items to compute state
      const updatedItems = await tx.ordenCompraItem.findMany({
        where: { ordenCompraId: id },
      })

      const todosCompletos = updatedItems.every(i => i.cantidadRecibida >= i.cantidad)
      const algunoRecibido = updatedItems.some(i => i.cantidadRecibida > 0)

      let nuevoEstado = existing.estado
      if (todosCompletos) {
        nuevoEstado = 'completada'
      } else if (algunoRecibido) {
        nuevoEstado = 'parcial'
      }

      const ocData = await tx.ordenCompra.update({
        where: { id },
        data: { estado: nuevoEstado, updatedAt: new Date() },
        include: {
          proveedor: true,
          centroCosto: { select: { id: true, nombre: true, tipo: true } },
          pedidoEquipo: { select: { id: true, codigo: true, estado: true } },
          proyecto: { select: { id: true, codigo: true, nombre: true } },
          solicitante: { select: { id: true, name: true, email: true } },
          aprobador: { select: { id: true, name: true, email: true } },
          items: { orderBy: { createdAt: 'asc' } },
        },
      })

      // Registrar evento de trazabilidad
      if (creadas > 0) {
        const itemsResumen = recepciones
          .filter(r => r.cantidadRecibida > 0)
          .map(r => {
            const item = existing.items.find(i => i.id === r.itemId)
            return item ? `${Math.min(r.cantidadRecibida, item.cantidad)} x ${item.codigo}` : null
          })
          .filter(Boolean)
          .join(', ')

        await tx.eventoTrazabilidad.create({
          data: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            proyectoId: existing.proyectoId || null,
            pedidoEquipoId: existing.pedidoEquipoId || null,
            tipo: 'recepcion_registrada',
            descripcion: `Recepción registrada en OC ${existing.numero}: ${itemsResumen}`,
            usuarioId: session.user.id,
            metadata: {
              ordenCompraId: id,
              ordenCompraNumero: existing.numero,
              recepcionesCreadas: creadas,
              nuevoEstadoOC: nuevoEstado,
            },
            updatedAt: new Date(),
          }
        })
      }

      return { data: ocData, nuevoEstado, recepcionesPendientesCreadas: creadas }
    })

    const nuevoEstado = data.estado

    // Propagar precioReal al catálogo cuando OC se completa
    if (nuevoEstado === 'completada') {
      const userId = (session.user as any).id
      for (const item of data.items) {
        if (!item.pedidoEquipoItemId) continue
        const pedidoItem = await prisma.pedidoEquipoItem.findUnique({
          where: { id: item.pedidoEquipoItemId },
          select: { catalogoEquipoId: true },
        })
        if (pedidoItem?.catalogoEquipoId) {
          propagarPrecioRealCatalogo({
            catalogoEquipoId: pedidoItem.catalogoEquipoId,
            precioReal: item.precioUnitario,
            userId,
            metadata: { source: 'oc_completada', ordenCompraId: id },
          }).catch(err => console.error('Error propagando precioReal (recepción OC):', err))
        }
      }
    }

    return NextResponse.json({ ...data, recepcionesPendientesCreadas })
  } catch (error) {
    console.error('Error al registrar recepción:', error)
    return NextResponse.json({ error: 'Error al registrar recepción' }, { status: 500 })
  }
}
