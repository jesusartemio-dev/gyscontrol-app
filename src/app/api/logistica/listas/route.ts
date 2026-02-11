import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EstadoCotizacionProveedor } from '@prisma/client'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const proyectoId = searchParams.get('proyectoId')

  try {
    const listas = await prisma.listaEquipo.findMany({
      where: {
        estado: {
          in: ['por_cotizar', 'por_validar', 'por_aprobar', 'aprobada', 'completada'],
        },
        ...(proyectoId && { proyectoId }),
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
          },
        },
        listaEquipoItem: {
          include: {
            cotizacionProveedorItems: {
              include: {
                cotizacionProveedor: {
                  include: {
                    proveedor: {
                      select: {
                        id: true,
                        nombre: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const listasConResumen = listas.map((lista) => {
      const totalItems = lista.listaEquipoItem.length
      const cotizados = lista.listaEquipoItem.filter(i => i.cotizacionProveedorItems.length > 0).length
      const respondidos = lista.listaEquipoItem.filter(i =>
        i.cotizacionProveedorItems.some(c => c.estado === EstadoCotizacionProveedor.cotizado)
      ).length
      const pendientes = totalItems - cotizados

      return {
        ...lista,
        resumen: {
          totalItems,
          cotizados,
          respondidos,
          pendientes,
        },
      }
    })

    return NextResponse.json(listasConResumen)
  } catch (error) {
    console.error('Error en /api/logistica/listas:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
