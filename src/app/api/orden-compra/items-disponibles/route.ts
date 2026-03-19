import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/orden-compra/items-disponibles?proyectoId=X&proveedorId=Y
 * Returns items available for OC creation from pedidos and listas of a project.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId es requerido' }, { status: 400 })
    }
    const proveedorId = searchParams.get('proveedorId') || undefined

    // 1. Items de pedidos elegibles (enviado/atendido/parcial) sin OC existente
    const pedidoItems = await prisma.pedidoEquipoItem.findMany({
      where: {
        pedidoEquipo: {
          proyectoId,
          estado: { in: ['enviado', 'atendido', 'parcial'] },
        },
        ordenCompraItems: { none: {} },
        estado: { notIn: ['cancelado', 'entregado'] },
        ...(proveedorId ? { proveedorId } : {}),
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        unidad: true,
        cantidadPedida: true,
        precioUnitario: true,
        proveedorId: true,
        proveedorNombre: true,
        listaEquipoItemId: true,
        pedidoEquipo: {
          select: { id: true, codigo: true },
        },
        proveedor: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 2. Items de listas del proyecto que NO tienen pedido activo ni OC directa
    const listaItems = await prisma.listaEquipoItem.findMany({
      where: {
        listaEquipo: {
          proyectoId,
          estado: { notIn: ['borrador', 'cancelada'] as any },
        },
        // Excluir items que ya tienen pedido activo (no cancelado)
        pedidoEquipoItem: {
          none: {
            pedidoEquipo: { estado: { notIn: ['cancelado'] } },
            estado: { notIn: ['cancelado'] },
          },
        },
        // Excluir items que ya tienen OC directa
        ordenCompraItems: { none: {} },
        estado: { notIn: ['completada'] as any },
        ...(proveedorId ? { proveedorId } : {}),
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        unidad: true,
        cantidad: true,
        precioElegido: true,
        proveedorId: true,
        listaEquipo: {
          select: { id: true, nombre: true },
        },
        proveedor: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as any[]

    return NextResponse.json({
      pedidoItems: pedidoItems.map((item: any) => ({
        id: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidadPedida,
        precioUnitario: item.precioUnitario || 0,
        proveedorId: item.proveedorId,
        proveedorNombre: item.proveedor?.nombre || item.proveedorNombre || null,
        listaEquipoItemId: item.listaEquipoItemId,
        pedidoCodigo: item.pedidoEquipo.codigo,
        pedidoId: item.pedidoEquipo.id,
        source: 'pedido' as const,
      })),
      listaItems: listaItems.map(item => ({
        id: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        precioUnitario: item.precioElegido || 0,
        proveedorId: item.proveedorId,
        proveedorNombre: item.proveedor?.nombre || null,
        listaNombre: item.listaEquipo.nombre,
        listaId: item.listaEquipo.id,
        source: 'lista' as const,
      })),
    })
  } catch (error) {
    console.error('Error al obtener items disponibles:', error)
    return NextResponse.json({ error: 'Error al obtener items disponibles' }, { status: 500 })
  }
}
