import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearNotificacion } from '@/lib/utils/notificaciones'

async function generarNumeroOC(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `OC-${yy}${mm}${dd}`

  const ultimo = await prisma.ordenCompra.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultimo) {
    const parts = ultimo.numero.split('-')
    correlativo = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = session.user.role
    if (!['admin', 'gerente', 'logistico'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para generar órdenes de compra' }, { status: 403 })
    }

    const { pedidoId, itemIds, moneda = 'USD', condicionPago = 'contado', observaciones, fechaEntregaEstimada, fechasEntregaPorProveedor } = await req.json()

    if (!pedidoId) {
      return NextResponse.json({ error: 'pedidoId es requerido' }, { status: 400 })
    }

    // 1. Buscar pedido con items y relaciones
    const pedido = await prisma.pedidoEquipo.findUnique({
      where: { id: pedidoId },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true, gestorId: true } },
        pedidoEquipoItem: {
          include: {
            ordenCompraItems: { select: { id: true } },
            listaEquipoItem: {
              select: { id: true, proveedorId: true, proveedor: { select: { id: true, nombre: true } } }
            },
            proveedor: { select: { id: true, nombre: true } },
          }
        }
      }
    })

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (!['enviado', 'atendido', 'parcial'].includes(pedido.estado)) {
      return NextResponse.json(
        { error: `No se pueden generar OCs para un pedido en estado "${pedido.estado}". El pedido debe estar enviado o atendido.` },
        { status: 400 }
      )
    }

    // 2. Filtrar items elegibles
    let items = pedido.pedidoEquipoItem

    // Si se especificaron itemIds, filtrar
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      items = items.filter(item => itemIds.includes(item.id))
    }

    // Helper: proveedorId directo o fallback desde listaEquipoItem
    const getProveedorId = (item: typeof items[0]) =>
      item.proveedorId || item.listaEquipoItem?.proveedorId || null

    // Excluir items sin proveedor (ni directo ni desde lista)
    const itemsSinProveedor = items.filter(item => !getProveedorId(item))
    items = items.filter(item => !!getProveedorId(item))

    // Excluir items que ya tienen OC vinculada
    const itemsConOC = items.filter(item => item.ordenCompraItems.length > 0)
    items = items.filter(item => item.ordenCompraItems.length === 0)

    if (items.length === 0) {
      const razones: string[] = []
      if (itemsSinProveedor.length > 0) razones.push(`${itemsSinProveedor.length} sin proveedor`)
      if (itemsConOC.length > 0) razones.push(`${itemsConOC.length} ya tienen OC`)
      return NextResponse.json(
        { error: `No hay items elegibles para generar OCs. ${razones.join(', ')}.` },
        { status: 400 }
      )
    }

    // 3. Agrupar por proveedorId (directo o desde listaEquipoItem)
    const gruposPorProveedor = new Map<string, typeof items>()
    for (const item of items) {
      const provId = getProveedorId(item)!
      if (!gruposPorProveedor.has(provId)) {
        gruposPorProveedor.set(provId, [])
      }
      gruposPorProveedor.get(provId)!.push(item)
    }

    // 4. Crear OCs en transacción
    const ordenesCreadas = await prisma.$transaction(async (tx) => {
      const ocs = []

      for (const [proveedorId, grupoItems] of gruposPorProveedor) {
        const numero = await generarNumeroOC()

        const ocItems = grupoItems.map(item => ({
          codigo: item.codigo,
          descripcion: item.descripcion,
          tipoItem: (item as any).tipoItem || 'equipo',
          unidad: item.unidad,
          cantidad: item.cantidadPedida,
          precioUnitario: item.precioUnitario || 0,
          costoTotal: item.cantidadPedida * (item.precioUnitario || 0),
          pedidoEquipoItemId: item.id,
          listaEquipoItemId: item.listaEquipoItemId || null,
          updatedAt: new Date(),
        }))

        const subtotal = ocItems.reduce((sum, i) => sum + i.costoTotal, 0)
        const igv = moneda === 'USD' ? 0 : subtotal * 0.18
        const total = subtotal + igv

        // Usar fecha por proveedor si disponible, fallback a fecha global
        const fechaProveedor = fechasEntregaPorProveedor?.[proveedorId] || fechaEntregaEstimada

        const oc = await tx.ordenCompra.create({
          data: {
            numero,
            proveedorId,
            pedidoEquipoId: pedido.id,
            proyectoId: pedido.proyectoId || null,
            categoriaCosto: 'equipos',
            solicitanteId: session.user.id,
            condicionPago,
            moneda,
            subtotal,
            igv,
            total,
            observaciones: observaciones || `Generada desde pedido ${pedido.codigo}`,
            fechaEntregaEstimada: fechaProveedor ? new Date(fechaProveedor) : null,
            updatedAt: new Date(),
            items: { create: ocItems },
          },
          include: {
            proveedor: { select: { id: true, nombre: true } },
            items: true,
          },
        })

        // Propagar fechaEntregaEstimada a los PedidoEquipoItem vinculados
        if (fechaProveedor) {
          const pedidoItemIds = grupoItems.map(item => item.id)
          await tx.pedidoEquipoItem.updateMany({
            where: { id: { in: pedidoItemIds } },
            data: { fechaEntregaEstimada: new Date(fechaProveedor) },
          })
        }

        // Registrar EventoTrazabilidad: OC generada
        await tx.eventoTrazabilidad.create({
          data: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            proyectoId: pedido.proyectoId || null,
            pedidoEquipoId: pedido.id,
            tipo: 'oc_generada',
            descripcion: `OC ${numero} generada para ${oc.proveedor?.nombre || 'proveedor'} con ${grupoItems.length} items`,
            usuarioId: session.user.id,
            metadata: {
              ordenCompraId: oc.id,
              ordenCompraNumero: numero,
              proveedorNombre: oc.proveedor?.nombre,
              cantidadItems: grupoItems.length,
              total: oc.total,
              moneda,
              pedidoCodigo: pedido.codigo,
            },
            updatedAt: new Date(),
          }
        })

        ocs.push(oc)
      }

      return ocs
    })

    // Notificar al gestor del proyecto (fire-and-forget)
    if (pedido.proyecto?.gestorId) {
      const ocsResumen = ordenesCreadas.map((oc: any) => oc.numero).join(', ')
      crearNotificacion(prisma, {
        usuarioId: pedido.proyecto.gestorId,
        titulo: `OC generada para ${pedido.codigo}`,
        mensaje: `Se generaron ${ordenesCreadas.length} OC(s) (${ocsResumen}) con ${items.length} items`,
        tipo: 'success',
        prioridad: 'media',
        entidadTipo: 'PedidoEquipo',
        entidadId: pedido.id,
        accionUrl: `/logistica/pedidos/${pedido.id}`,
        accionTexto: 'Ver pedido',
      })
    }

    return NextResponse.json({
      ordenesCreadas,
      resumen: {
        totalOCs: ordenesCreadas.length,
        totalItems: items.length,
        itemsSinProveedor: itemsSinProveedor.length,
        itemsConOCExistente: itemsConOC.length,
      }
    })
  } catch (error) {
    console.error('Error al generar OCs desde pedido:', error)
    return NextResponse.json(
      { error: 'Error interno al generar órdenes de compra' },
      { status: 500 }
    )
  }
}
