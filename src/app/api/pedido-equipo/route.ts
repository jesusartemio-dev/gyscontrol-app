// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedido-equipo/
// 🔧 Descripción: API para crear y listar pedidos de equipo por proyecto con código secuencial
// 🧠 Uso: Proyectos genera pedidos; logística visualiza y gestiona
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-29
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
                proveedor: true,
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

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: body.proyectoId },
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener último numeroSecuencia de pedidos para este proyecto
    const ultimoPedido = await prisma.pedidoEquipo.findFirst({
      where: { proyectoId: body.proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
    })

    const nuevoNumero = ultimoPedido ? ultimoPedido.numeroSecuencia + 1 : 1
    const codigoGenerado = `${proyecto.codigo}-PED-${String(nuevoNumero).padStart(3, '0')}`

    // Paso 1: Crear el pedido con código automático
    const pedido = await prisma.pedidoEquipo.create({
      data: {
        proyectoId: body.proyectoId,
        responsableId: body.responsableId,
        listaId: body.listaId,
        codigo: codigoGenerado,
        numeroSecuencia: nuevoNumero,
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

    // Paso 3: Crear PedidoEquipoItem para cada ítem de la lista y actualizar cantidadPedida
    for (const item of listaItems) {
      await prisma.pedidoEquipoItem.create({
        data: {
          pedidoId: pedido.id,
          listaEquipoItemId: item.id,
          cantidadPedida: item.cantidad,
          precioUnitario: item.precioElegido || 0,
          costoTotal: (item.precioElegido || 0) * item.cantidad,
          fechaNecesaria: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada) : new Date(),
          estado: 'pendiente',
        },
      })

      await prisma.listaEquipoItem.update({
        where: { id: item.id },
        data: {
          cantidadPedida: {
            increment: item.cantidad,
          },
        },
      })
    }

    return NextResponse.json(pedido)
  } catch (error) {
    console.error('❌ Error al crear pedido:', error)
    return NextResponse.json(
      { error: 'Error al crear pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
