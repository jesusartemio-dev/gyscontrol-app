import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/orden-compra/items-disponibles?proyectoId=X|centroCostoId=X&proveedorId=Y&incluirSinProveedor=true
 * Returns pedido items available for OC creation (without existing OC).
 * Acepta proyectoId O centroCostoId (uno de los dos es requerido).
 *
 * Reglas de filtrado por proveedor:
 *   - Sin proveedorId: devuelve TODOS los items (cualquier proveedor o sin asignar).
 *   - Con proveedorId + incluirSinProveedor=true (default): devuelve items del proveedor + items sin proveedor asignado (PEI.proveedorId NULL Y LEI.proveedorId NULL).
 *   - Con proveedorId + incluirSinProveedor=false: filtro estricto solo del proveedor.
 *
 * También considera el caso legacy donde PedidoEquipoItem.proveedorId está NULL pero
 * ListaEquipoItem.proveedorId sí tiene valor (cotización aprobada no propagada al pedido).
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
    const proyectoId = searchParams.get('proyectoId') || undefined
    const centroCostoId = searchParams.get('centroCostoId') || undefined
    if (!proyectoId && !centroCostoId) {
      return NextResponse.json(
        { error: 'Se requiere proyectoId o centroCostoId' },
        { status: 400 }
      )
    }
    const proveedorId = searchParams.get('proveedorId') || undefined
    const incluirSinProveedor = searchParams.get('incluirSinProveedor') !== 'false' // default true

    // Filtro por proveedor — considera ambos: PEI.proveedorId Y LEI.proveedorId
    let proveedorFilter: any = {}
    if (proveedorId) {
      const conditions: any[] = [
        { proveedorId },                                                    // (a) ítem ya asignado al proveedor
        { proveedorId: null, listaEquipoItem: { proveedorId } },             // (b) PEI sin proveedor pero LEI sí (caso legacy)
      ]
      if (incluirSinProveedor) {
        // (c) Items completamente sin asignar — se compran al proveedor de esta OC
        conditions.push({ proveedorId: null, listaEquipoItem: { proveedorId: null } })
        conditions.push({ proveedorId: null, listaEquipoItemId: null })
      }
      proveedorFilter = { OR: conditions }
    }

    // Items de pedidos elegibles (aprobado/atendido/parcial) con cantidad restante > 0
    const pedidoItems = await prisma.pedidoEquipoItem.findMany({
      where: {
        pedidoEquipo: {
          ...(proyectoId ? { proyectoId } : { centroCostoId }),
          estado: { in: ['aprobado', 'atendido', 'parcial'] },
        },
        estado: { notIn: ['cancelado', 'entregado'] },
        ...proveedorFilter,
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
        listaEquipoItem: {
          select: { proveedorId: true, proveedor: { select: { nombre: true } } },
        },
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
      items: itemsConRestante.map(item => {
        // Resolver proveedor efectivo: PEI > LEI
        const proveedorEfectivoId = item.proveedorId ?? item.listaEquipoItem?.proveedorId ?? null
        const proveedorEfectivoNombre =
          item.proveedor?.nombre ?? item.proveedorNombre ?? item.listaEquipoItem?.proveedor?.nombre ?? null
        return {
          id: item.id,
          codigo: item.codigo,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidadRestante,
          precioUnitario: item.precioUnitario || 0,
          proveedorId: proveedorEfectivoId,
          proveedorNombre: proveedorEfectivoNombre,
          // Indica si el item viene sin proveedor asignado (se confirmará al guardar)
          sinProveedorAsignado: !proveedorEfectivoId,
          listaEquipoItemId: item.listaEquipoItemId,
          pedidoCodigo: item.pedidoEquipo.codigo,
          pedidoId: item.pedidoEquipo.id,
        }
      }),
    })
  } catch (error) {
    console.error('Error al obtener items disponibles:', error)
    return NextResponse.json({ error: 'Error al obtener items disponibles' }, { status: 500 })
  }
}
