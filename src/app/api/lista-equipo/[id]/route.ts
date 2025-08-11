// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-equipo/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar y eliminar una ListaEquipo por ID
//
// 🧠 Uso: Usado por la vista de detalle de lista de equipos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-18
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { ListaEquipoUpdatePayload } from '@/types/payloads'

// ✅ Obtener ListaEquipo por ID (GET)
export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const data = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        proyecto: true,
        items: {
          include: {
            proveedor: true,
            cotizaciones: true,
            pedidos: true,
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener la lista de equipos: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const body: ListaEquipoUpdatePayload = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID inválido o no proporcionado' },
        { status: 400 }
      )
    }

    const existe = await prisma.listaEquipo.findUnique({ where: { id } })
    if (!existe) {
      return NextResponse.json(
        { error: 'Lista no encontrada con el ID proporcionado' },
        { status: 404 }
      )
    }

    const data = await prisma.listaEquipo.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('⛔ Error al actualizar lista:', error)

    return NextResponse.json(
      { error: 'Error al actualizar lista: ' + (error instanceof Error ? error.message : JSON.stringify(error)) },
      { status: 500 }
    )
  }
}



// ✅ Eliminar ListaEquipo (DELETE)
export async function DELETE(req: Request, context: { params: { id: string } }) {
  const { id } = context.params;

  try {
    await prisma.$transaction([
      // 0. Desmarcar todas las cotizaciones seleccionadas relacionadas
      prisma.cotizacionProveedorItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id,
          },
          esSeleccionada: true,
        },
        data: {
          esSeleccionada: false,
        },
      }),

      // 1. Setear a null los campos relacionados con listaId
      prisma.cotizacionProveedorItem.updateMany({
        where: { listaId: id },
        data: { listaId: null },
      }),
      prisma.pedidoEquipoItem.updateMany({
        where: { listaId: id },
        data: { listaId: null },
      }),

      // 2. Buscar todos los items de la lista
      prisma.cotizacionProveedorItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id,
          },
        },
        data: {
          listaEquipoItemId: null,
        },
      }),
      prisma.pedidoEquipoItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id,
          },
        },
        data: {
          listaEquipoItemId: null,
        },
      }),

      // 3. Eliminar la lista (esto eliminará los items por cascade)
      prisma.listaEquipo.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: "Lista eliminada correctamente" });
  } catch (error) {
    console.error("[LISTA_EQUIPO_DELETE]", error);
    return new NextResponse("Error al eliminar Lista de Equipo", { status: 500 });
  }
}
