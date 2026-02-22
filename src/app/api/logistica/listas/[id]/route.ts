import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { id } = await context.params

    const listaRaw = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        proyecto: true,
        user: true,
        listaEquipoItem: {
          include: {
            user: true,
            proveedor: true,
            cotizacionProveedorItems: {
              include: {
                cotizacionProveedor: {
                  select: {
                    id: true,
                    codigo: true,
                    proveedor: {
                      select: { nombre: true },
                    },
                  },
                },
              },
              orderBy: { precioUnitario: 'asc' },
            },
            pedidoEquipoItem: {
              include: {
                pedidoEquipo: true
              }
            },
            ordenCompraItems: {
              include: {
                ordenCompra: {
                  select: {
                    id: true,
                    numero: true,
                    estado: true,
                    subtotal: true,
                    total: true,
                    moneda: true,
                    fechaEntregaEstimada: true,
                    proveedor: { select: { id: true, nombre: true } },
                    pedidoEquipo: { select: { id: true, codigo: true } },
                  },
                },
              },
            },
            proyectoEquipoItem: {
              include: { proyectoEquipoCotizado: true },
            },
            proyectoEquipoCotizado: true,
          },
          orderBy: { codigo: 'asc' },
        },
      },
    })

    if (!listaRaw) {
      return NextResponse.json(
        { error: 'Lista no encontrada' },
        { status: 404 }
      )
    }

    const lista = {
      ...listaRaw,
      responsable: listaRaw.user,
      items: listaRaw.listaEquipoItem?.map((item: any) => ({
        ...item,
        responsable: item.user,
        cotizaciones: item.cotizacionProveedorItems?.map((cot: any) => ({
          ...cot,
          cotizacion: cot.cotizacionProveedor
        })),
        pedidos: item.pedidoEquipoItem?.map((ped: any) => ({
          ...ped,
          pedido: ped.pedidoEquipo
        })),
        ordenCompraItems: item.ordenCompraItems,
        proyectoEquipo: item.proyectoEquipoCotizado
      }))
    }

    return NextResponse.json(lista)
  } catch (error) {
    console.error('Error en /api/logistica/listas/[id]:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
