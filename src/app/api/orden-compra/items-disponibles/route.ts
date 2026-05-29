import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/orden-compra/items-disponibles
 *   ?proyectoId=X   — items de un proyecto
 *   ?centroCostoId=X — items de un centro de costo
 *   ?multiProyecto=true — items de todos los proyectos/CCs (modo consolidado)
 *   &proveedorId=Y  — filtrar por proveedor (opcional)
 *   &mostrarTodos=true — mostrar también items de otros proveedores
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
    const multiProyecto = searchParams.get('multiProyecto') === 'true'

    if (!proyectoId && !centroCostoId && !multiProyecto) {
      return NextResponse.json(
        { error: 'Se requiere proyectoId, centroCostoId o multiProyecto=true' },
        { status: 400 }
      )
    }
    const proveedorId = searchParams.get('proveedorId') || undefined
    const mostrarTodos = searchParams.get('mostrarTodos') === 'true'

    let proveedorFilter: any = {}
    if (proveedorId && !mostrarTodos) {
      proveedorFilter = {
        OR: [
          { proveedorId },
          { proveedorId: null, listaEquipoItem: { proveedorId } },
        ],
      }
    }

    // En modo multiProyecto no filtramos por proyecto/CC
    const scopeFilter = multiProyecto
      ? {}
      : (proyectoId ? { proyectoId } : { centroCostoId })

    const [pedidoItems, pedidosEnviados] = await Promise.all([
      prisma.pedidoEquipoItem.findMany({
        where: {
          pedidoEquipo: {
            ...scopeFilter,
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
          precioUnitarioMoneda: true,
          proveedorId: true,
          proveedorNombre: true,
          listaEquipoItemId: true,
          catalogoEppId: true,
          listaEquipoItem: {
            select: { proveedorId: true, proveedor: { select: { nombre: true } } },
          },
          ordenCompraItems: { select: { cantidad: true } },
          pedidoEquipo: {
            select: {
              id: true,
              codigo: true,
              proyecto: { select: { id: true, codigo: true } },
              centroCosto: { select: { id: true, nombre: true } },
            },
          },
          proveedor: {
            select: { id: true, nombre: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pedidoEquipo.findMany({
        where: { ...scopeFilter, estado: 'enviado' },
        select: {
          id: true,
          codigo: true,
          proyecto: { select: { codigo: true } },
          centroCosto: { select: { nombre: true } },
          _count: { select: { pedidoEquipoItem: true } },
        },
        orderBy: { codigo: 'asc' },
      }),
    ])

    const itemsConRestante = pedidoItems
      .map(item => {
        const totalOrdenado = item.ordenCompraItems.reduce((sum, oci) => sum + (oci.cantidad || 0), 0)
        const cantidadRestante = item.cantidadPedida - totalOrdenado
        return { ...item, cantidadRestante }
      })
      .filter(item => item.cantidadRestante > 0)

    return NextResponse.json({
      items: itemsConRestante.map(item => {
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
          precioMoneda: item.precioUnitarioMoneda || null,
          proveedorId: proveedorEfectivoId,
          proveedorNombre: proveedorEfectivoNombre,
          sinProveedorAsignado: !proveedorEfectivoId,
          listaEquipoItemId: item.listaEquipoItemId,
          catalogoEppId: item.catalogoEppId,
          pedidoCodigo: item.pedidoEquipo.codigo,
          pedidoId: item.pedidoEquipo.id,
          proyectoCodigo: item.pedidoEquipo.proyecto?.codigo ?? null,
          centroCostoNombre: item.pedidoEquipo.centroCosto?.nombre ?? null,
        }
      }),
      pedidosPendientes: pedidosEnviados.map(p => ({
        id: p.id,
        codigo: p.codigo,
        proyectoCodigo: p.proyecto?.codigo ?? null,
        centroCostoNombre: p.centroCosto?.nombre ?? null,
        totalItems: p._count.pedidoEquipoItem,
      })),
    })
  } catch (error) {
    console.error('Error al obtener items disponibles:', error)
    return NextResponse.json({ error: 'Error al obtener items disponibles' }, { status: 500 })
  }
}
