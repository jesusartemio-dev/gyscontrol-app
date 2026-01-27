// ===================================================
// 📁 Archivo: /api/lista-equipo-item/by-lista/[listaId]/route.ts
// 🔧 Descripción: API para obtener ítems de una lista específica
// 🧠 Uso: GET /api/lista-equipo-item/by-lista/:listaId
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-24
// ===================================================
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ listaId: string }> }) {
  try {
    const { listaId } = await params

    if (!listaId) {
      return NextResponse.json({ error: 'listaId es obligatorio' }, { status: 400 })
    }

    const rawData = await prisma.listaEquipoItem.findMany({
      where: { listaId },
      include: {
        proveedor: true,
        user: true, // ✅ Responsable del item
        catalogoEquipo: {
          include: {
            categoriaEquipo: true
          }
        },
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
        },
        cotizacionSeleccionada: true,
        pedidoEquipoItem: {
          include: {
            pedidoEquipo: true // ✅ Incluir relación al pedido padre para acceder al código
          }
        },
        proyectoEquipoCotizado: true, // ✅ Agregado: para equipos nuevos sin proyectoEquipoItem
        proyectoEquipoItem: {
          include: {
            proyectoEquipoCotizado: true, // ✅ para obtener nombre del equipo padre desde el item
            catalogoEquipo: {
              include: {
                categoriaEquipo: true
              }
            }
          },
        },
        listaEquipo: true, // ✅ Incluir información de la lista
      },
      orderBy: { createdAt: 'desc' },
    })

    // 🔄 Frontend compatibility mapping
    const data = rawData.map((item: any) => ({
      ...item,
      responsable: item.user,
      lista: item.listaEquipo,
      cotizaciones: item.cotizacionProveedorItems?.map((cot: any) => ({
        ...cot,
        cotizacion: cot.cotizacionProveedor
      })),
      pedidos: item.pedidoEquipoItem?.map((ped: any) => ({
        ...ped,
        pedido: ped.pedidoEquipo
      })),
      proyectoEquipo: item.proyectoEquipoCotizado
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error en GET /by-lista:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
