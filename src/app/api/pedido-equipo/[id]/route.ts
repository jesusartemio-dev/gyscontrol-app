// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/pedido-equipo/[id]/
// 🔧 Descripción: API para obtener, actualizar o eliminar un pedido de equipo
//
// 🧠 Uso: Visualización y edición de pedido por ID
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-21
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoUpdatePayload } from '@/types'

// ✅ Obtener pedido por ID
export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const data = await prisma.pedidoEquipo.findUnique({
      where: { id },
      include: {
        responsable: true,
        proyecto: true,
        lista: true,
        items: {
          include: {
            listaEquipoItem: {
              include: {
                proveedor: true, // opcional
              },
            },
          },
        },
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener pedido:', error)
    return NextResponse.json(
      { error: 'Error al obtener pedido: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Actualizar pedido
export async function PUT(context: { params: { id: string }; request: Request }) {
  try {
    const { id } = await context.params
    const body: PedidoEquipoUpdatePayload = await context.request.json()

    const data = await prisma.pedidoEquipo.update({
      where: { id },
      data: body,
      include: {
        responsable: true,
        proyecto: true,
        lista: true,
        items: {
          include: {
            listaEquipoItem: true,
          },
        },
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar pedido:', error)
    return NextResponse.json(
      { error: 'Error al actualizar pedido: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Eliminar pedido (espera que onDelete: Cascade esté configurado en Prisma)
export async function DELETE(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params;

    await prisma.pedidoEquipo.delete({
      where: { id },
    });

    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('❌ Error al eliminar pedido:', error);
    return NextResponse.json(
      { error: 'Error al eliminar pedido: ' + String(error) },
      { status: 500 }
    );
  }
}

