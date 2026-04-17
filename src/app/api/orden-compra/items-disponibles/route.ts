import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/orden-compra/items-disponibles?proyectoId=X&proveedorId=Y
 * Returns pedido items available for OC creation (without existing OC).
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!['admin', 'gerente', 'logistico', 'coordinador_logistico', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId es requerido' }, { status: 400 })
    }
    const proveedorId = searchParams.get('proveedorId') || undefined

    // Items de pedidos elegibles (aprobado/atendido/parcial) con cantidad restante > 0
    const pedidoItems = await prisma.pedidoEquipoItem.findMany({
      where: {
        pedidoEquipo: {
          proyectoId,
          estado: { in: ['aprobado', 'atendido', 'parcial'] },
        },
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
        ordenCompraItems: { select: { cantidad: true } },
        pedidoEquipo: {
          select: { id: true, codigo: true },
        },
        proveedor: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const itemsConRestante = pedidoItems
      .map(item => {
        const totalOrdenado = item.ordenCompraItems.reduce((sum, oci) => sum + (oci.cantidad || 0), 0)
        const cantidadRestante = item.cantidadPedida - totalOrdenado
        return { ...item, cantidadRestante }
      })
      .filter(item => item.cantidadRestante > 0)

    return NextResponse.json({
      items: itemsConRestante.map(item => ({
        id: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidadRestante,
        precioUnitario: item.precioUnitario || 0,
        proveedorId: item.proveedorId,
        proveedorNombre: item.proveedor?.nombre || item.proveedorNombre || null,
        listaEquipoItemId: item.listaEquipoItemId,
        pedidoCodigo: item.pedidoEquipo.codigo,
        pedidoId: item.pedidoEquipo.id,
      })),
    })
  } catch (error) {
    console.error('Error al obtener items disponibles:', error)
    return NextResponse.json({ error: 'Error al obtener items disponibles' }, { status: 500 })
  }
}
