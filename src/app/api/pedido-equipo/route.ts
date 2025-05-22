// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedido-equipo/
// 🔧 Descripción: API para crear y listar pedidos de equipo por proyecto
//
// 🧠 Uso: Proyectos genera pedidos; logística visualiza y gestiona
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-21
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoPayload } from '@/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')

    const data = await prisma.pedidoEquipo.findMany({
      where: proyectoId ? { proyectoId } : undefined,
      include: {
        responsable: true,
        proyecto: true,
        lista: true,
        items: {
          include: {
            listaEquipoItem: {
              include: {
                proveedor: true, // opcional, por si quieres mostrar nombre proveedor
              },
            },
          },
        },
      },
      orderBy: { fechaPedido: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener pedidos: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: PedidoEquipoPayload = await request.json()

    // Paso 1: Crear el pedido
    const pedido = await prisma.pedidoEquipo.create({
      data: {
        proyecto: { connect: { id: body.proyectoId } },
        responsable: { connect: { id: body.responsableId } },
        lista: { connect: { id: body.listaId } },
        codigo: body.codigo,
        estado: body.estado,
        observacion: body.observacion,
        fechaPedido: body.fechaPedido ? new Date(body.fechaPedido) : undefined,
        fechaEntregaEstimada: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada) : undefined,
        fechaEntregaReal: body.fechaEntregaReal ? new Date(body.fechaEntregaReal) : undefined,
      },
    })

    // Paso 2: Obtener los ítems de la lista
    const listaItems = await prisma.listaEquipoItem.findMany({
      where: { listaId: body.listaId },
    })

    // Paso 3: Crear PedidoEquipoItem para cada ítem de la lista
    for (const item of listaItems) {
      await prisma.pedidoEquipoItem.create({
        data: {
          pedidoId: pedido.id,
          listaEquipoItemId: item.id,
          cantidadPedida: item.cantidad, // puedes iniciar con la misma cantidad
          precioUnitario: item.precioElegido || 0,
          costoTotal: (item.precioElegido || 0) * item.cantidad,
          fechaNecesaria: body.fechaEntregaEstimada
            ? new Date(body.fechaEntregaEstimada)
            : new Date(),
          estado: 'pendiente',
        },
      })
    }

    return NextResponse.json(pedido)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
