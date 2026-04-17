import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/pedidos/items-para-requerimiento
 *
 * Devuelve items de pedidos elegibles para incluir en un requerimiento de materiales.
 *
 * Criterios de elegibilidad:
 * - Pedido: estado 'enviado' o 'parcial'
 * - Proyecto: no cancelado ni cerrado
 * - Item: no cancelado ni entregado
 * - Item: sin OC activa (ninguna OrdenCompra asociada que no sea 'cancelada')
 *
 * Respuesta agrupada por proyecto → pedido → items.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo logística y coordinador_logístico pueden crear requerimientos de materiales
    const { role } = session.user
    if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const busqueda = searchParams.get('q')?.trim().toLowerCase() || ''

    // Traer todos los items elegibles con sus relaciones necesarias
    const items = await prisma.pedidoEquipoItem.findMany({
      where: {
        // Item no cancelado ni entregado
        estado: { notIn: ['cancelado', 'entregado'] },
        // Pedido en estado enviado o parcial
        pedidoEquipo: {
          estado: { in: ['aprobado', 'atendido', 'parcial'] },
          // Proyecto activo O pedido interno (sin proyecto)
          OR: [
            {
              proyecto: {
                estado: { notIn: ['cerrado', 'cancelado'] },
              },
            },
            { proyectoId: null }, // Pedidos internos
          ],
        },
        // Sin OC activa: no tiene ningún OrdenCompraItem cuya OC no sea cancelada
        ordenCompraItems: {
          none: {
            ordenCompra: {
              estado: { not: 'cancelada' },
            },
          },
        },
        // Sin requerimiento activo: solo 'rechazado' libera el item
        requerimientoMaterialItems: {
          none: {
            hojaDeGastos: {
              estado: { not: 'rechazado' },
            },
          },
        },
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        unidad: true,
        tipoItem: true,
        cantidadPedida: true,
        cantidadAtendida: true,
        precioUnitario: true,
        estadoEntrega: true,
        pedidoId: true,
        proveedorId: true,
        proveedorNombre: true,
        proveedor: {
          select: { id: true, nombre: true }
        },
        pedidoEquipo: {
          select: {
            id: true,
            codigo: true,
            estado: true,
            fechaNecesaria: true,
            proyectoId: true,
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                estado: true,
              },
            },
          },
        },
      },
      orderBy: [
        { pedidoEquipo: { proyecto: { nombre: 'asc' } } },
        { pedidoEquipo: { codigo: 'asc' } },
        { codigo: 'asc' },
      ],
    })

    // Filtrar por búsqueda si se provee
    const filtrados = busqueda
      ? items.filter(item =>
          item.codigo.toLowerCase().includes(busqueda) ||
          item.descripcion.toLowerCase().includes(busqueda) ||
          item.pedidoEquipo.codigo.toLowerCase().includes(busqueda) ||
          (item.pedidoEquipo.proyecto?.nombre.toLowerCase() ?? '').includes(busqueda) ||
          (item.pedidoEquipo.proyecto?.codigo.toLowerCase() ?? '').includes(busqueda)
        )
      : items

    // Calcular cantidad disponible (pedida - atendida)
    const conDisponible = filtrados.map(item => ({
      ...item,
      cantidadDisponible: Math.max(0, item.cantidadPedida - (item.cantidadAtendida || 0)),
    }))

    // Agrupar por proyecto → pedido (pedidos internos bajo grupo especial)
    const GRUPO_INTERNO_ID = '__interno__'

    type ItemOut = (typeof conDisponible)[number]
    type PedidoGroup = {
      id: string
      codigo: string
      estado: string
      fechaNecesaria: Date
      items: ItemOut[]
    }
    type ProyectoGroup = {
      id: string
      codigo: string
      nombre: string
      estado: string
      pedidos: Map<string, PedidoGroup>
    }

    const byProyecto = new Map<string, ProyectoGroup>()

    for (const item of conDisponible) {
      const proy = item.pedidoEquipo.proyecto
      const ped = item.pedidoEquipo

      // Para pedidos internos (sin proyecto) usar grupo especial
      const proyId = proy ? proy.id : GRUPO_INTERNO_ID
      const proyCodigo = proy ? proy.codigo : 'INT'
      const proyNombre = proy ? proy.nombre : 'Pedidos Internos'
      const proyEstado = proy ? proy.estado : 'activo'

      if (!byProyecto.has(proyId)) {
        byProyecto.set(proyId, {
          id: proyId,
          codigo: proyCodigo,
          nombre: proyNombre,
          estado: proyEstado,
          pedidos: new Map(),
        })
      }
      const proyGroup = byProyecto.get(proyId)!

      if (!proyGroup.pedidos.has(ped.id)) {
        proyGroup.pedidos.set(ped.id, {
          id: ped.id,
          codigo: ped.codigo,
          estado: ped.estado,
          fechaNecesaria: ped.fechaNecesaria,
          items: [],
        })
      }
      proyGroup.pedidos.get(ped.id)!.items.push(item)
    }

    // Serializar a array
    const resultado = Array.from(byProyecto.values()).map(proy => ({
      ...proy,
      pedidos: Array.from(proy.pedidos.values()),
    }))

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Error en items-para-requerimiento:', error)
    return NextResponse.json(
      { error: 'Error al obtener items para requerimiento: ' + String(error) },
      { status: 500 }
    )
  }
}
