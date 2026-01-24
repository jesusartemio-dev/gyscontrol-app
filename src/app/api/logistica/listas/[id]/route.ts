// ===================================================
// 📁 Archivo: /api/logistica/listas/[id]/route.ts
// 📌 Descripción: API para obtener el detalle de una lista logística por ID
// 🧠 Uso: GET /api/logistica/listas/[id]
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-31 (💥 incluye cotizacion.codigo y proveedor en cotizaciones)
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
                pedidoEquipo: true // ✅ Incluir relación al pedido padre para acceder al código
              }
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

    // 🔄 Frontend compatibility mapping
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
        proyectoEquipo: item.proyectoEquipoCotizado
      }))
    }

    return NextResponse.json(lista)
  } catch (error) {
    console.error('❌ Error en /api/logistica/listas/[id]:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
