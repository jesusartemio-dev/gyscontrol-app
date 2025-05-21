// ===================================================
// 📁 Archivo: lista-equipo-item/route.ts
// 📌 Ubicación: src/app/api/lista-equipo-item/route.ts
// 🔧 Descripción: API para gestionar ítems de lista de equipos
// 🧠 Uso: GET para listar ítems, POST para crear nuevo ítem
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-18
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquipoItemPayload } from '@/types/payloads'

export async function GET() {
  try {
    const items = await prisma.listaEquipoItem.findMany({
      include: {
        lista: true,
        proveedor: true,
        cotizaciones: true,
        pedidos: true,
        proyectoEquipoItem: {
          include: {
            proyectoEquipo: true, // ✅ para mostrar el nombre del grupo en UI
          },
        },
      },
    })
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener los ítems: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: ListaEquipoItemPayload = await request.json()

    // ✅ Validación mínima
    if (!body.listaId || !body.codigo || !body.descripcion || !body.unidad) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    const nuevo = await prisma.listaEquipoItem.create({
      data: {
        listaId: body.listaId,
        proyectoEquipoItemId: body.proyectoEquipoItemId || null,
        proveedorId: body.proveedorId || null,
        codigo: body.codigo,
        descripcion: body.descripcion,
        unidad: body.unidad,
        cantidad: body.cantidad,
        verificado: body.verificado ?? false,
        comentarioRevision: body.comentarioRevision || null,
        presupuesto: body.presupuesto ?? null,
        precioElegido: body.precioElegido ?? null,
        costoElegido: body.costoElegido ?? null,
        costoPedido: body.costoPedido ?? 0,
        costoReal: body.costoReal ?? 0,
        cantidadPedida: body.cantidadPedida ?? 0,
        cantidadEntregada: body.cantidadEntregada ?? 0,
      },
      include: {
        lista: true,
        proveedor: true,
        cotizaciones: true,
        pedidos: true,
        proyectoEquipoItem: {
          include: {
            proyectoEquipo: true,
          },
        },
      },
    })

    return NextResponse.json(nuevo)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear ítem: ' + String(error) },
      { status: 500 }
    )
  }
}
