// ===================================================
// 📁 src/app/api/logistica/listas/route.ts
// 🔧 API dedicada para logística → listas filtradas con resumen de cotizaciones
// ✅ Incluye resumen de ítems cotizados, pendientes y respondidos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-27
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EstadoCotizacionProveedor } from '@prisma/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proyectoId = searchParams.get('proyectoId')

  try {
    const listas = await prisma.listaEquipo.findMany({
      where: {
        estado: {
          in: ['por_cotizar', 'por_validar', 'por_aprobar', 'aprobada', 'completada'],
        },
        ...(proyectoId && { proyectoId }), // ✅ aplicar filtro si existe
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
    console.error('❌ Error en /api/logistica/listas:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
