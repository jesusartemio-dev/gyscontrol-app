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

    const data = await prisma.listaEquipoItem.findMany({
      where: { listaId },
      include: {
        proveedor: true,
        cotizaciones: {
          include: {
            cotizacion: {
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
        cotizacionSeleccionada: {
          include: {
            cotizacion: {
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
        pedidos: {
          include: {
            pedido: true // ✅ Incluir relación al pedido padre para acceder al código
          }
        },
        proyectoEquipo: true, // ✅ Agregado: para equipos nuevos sin proyectoEquipoItem
        proyectoEquipoItem: {
          include: {
            proyectoEquipo: true, // ✅ para obtener nombre del equipo padre desde el item
          },
        },
        lista: true, // ✅ Incluir información de la lista
        responsable: true, // ✅ Incluir información del responsable
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error en GET /by-lista:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
