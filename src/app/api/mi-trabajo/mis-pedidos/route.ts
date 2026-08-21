// "Mis Pedidos" — vista personal del solicitante para cerrar el ciclo.
//
// Endpoint dedicado en vez de extender /api/pedido-equipo: ese usa `select` y lo
// consumen varias pantallas; agregarle las recepciones anidadas encarecería
// consultas que no las necesitan.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const userId = session.user.id

    const { searchParams } = new URL(req.url)
    const soloPorConfirmar = searchParams.get('soloPorConfirmar') === 'true'

    // Soy dueño del pedido si lo solicité, o si gestiono el proyecto (respaldo
    // cuando el solicitante está en campo).
    const scopeUsuario = {
      OR: [
        { responsableId: userId },
        { proyecto: { gestorId: userId } },
      ],
    }

    const pedidos = await prisma.pedidoEquipo.findMany({
      where: {
        ...scopeUsuario,
        ...(soloPorConfirmar
          ? { pedidoEquipoItem: { some: { recepcionesPendientes: { some: { estado: 'entregado_proyecto' } } } } }
          : {}),
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        fechaPedido: true,
        fechaNecesaria: true,
        responsableId: true,
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        pedidoEquipoItem: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            unidad: true,
            cantidadPedida: true,
            cantidadAtendida: true,
            estadoEntrega: true,
            recepcionesPendientes: {
              where: { estado: { in: ['pendiente', 'en_almacen', 'entregado_proyecto'] } },
              select: {
                id: true,
                estado: true,
                cantidadRecibida: true,
                fechaEntregaProyecto: true,
                fechaConfirmacion: true,
                entregadoPor: { select: { name: true } },
                ordenCompraItem: {
                  select: { ordenCompra: { select: { numero: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // Aplanar las recepciones que esperan MI confirmación
    const porConfirmar = pedidos.flatMap(p =>
      p.pedidoEquipoItem.flatMap(item =>
        item.recepcionesPendientes
          .filter(r => r.estado === 'entregado_proyecto')
          .map(r => ({
            id: r.id,
            pedidoId: p.id,
            pedidoCodigo: p.codigo,
            proyectoId: p.proyecto?.id ?? null,
            proyectoNombre: p.proyecto?.nombre ?? null,
            itemCodigo: item.codigo,
            itemDescripcion: item.descripcion,
            unidad: item.unidad,
            cantidadRecibida: r.cantidadRecibida,
            fechaEntregaProyecto: r.fechaEntregaProyecto,
            entregadoPor: r.entregadoPor?.name ?? null,
            ocNumero: r.ordenCompraItem?.ordenCompra?.numero ?? null,
          }))
      )
    )

    const resumen = pedidos.map(p => {
      const items = p.pedidoEquipoItem
      const enTransito = items.reduce(
        (n, i) => n + i.recepcionesPendientes.filter(r => r.estado === 'pendiente' || r.estado === 'en_almacen').length,
        0
      )
      const aConfirmar = items.reduce(
        (n, i) => n + i.recepcionesPendientes.filter(r => r.estado === 'entregado_proyecto').length,
        0
      )
      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        estado: p.estado,
        fechaPedido: p.fechaPedido,
        fechaNecesaria: p.fechaNecesaria,
        esSolicitante: p.responsableId === userId,
        proyecto: p.proyecto,
        totalItems: items.length,
        itemsEntregados: items.filter(i => i.estadoEntrega === 'entregado').length,
        enTransito,
        aConfirmar,
      }
    })

    return NextResponse.json({
      pedidos: resumen,
      porConfirmar,
      totalPorConfirmar: porConfirmar.length,
    })
  } catch (error) {
    console.error('Error al cargar mis pedidos:', error)
    return NextResponse.json({ error: 'Error al cargar mis pedidos' }, { status: 500 })
  }
}
