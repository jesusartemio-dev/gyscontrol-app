// ===================================================
// 📁 Archivo: lista-equipo-item/route.ts
// 📌 Ubicación: src/app/api/lista-equipo-item/route.ts
// 🔧 Descripción: API para gestionar ítems de lista de equipos
// 🧠 Uso: GET para listar ítems, POST para crear nuevo ítem
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-06-11
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquipoItemPayload } from '@/types/payloads'

// ✅ Obtener todos los ítems
export async function GET() {
  try {
    const items = await prisma.listaEquipoItem.findMany({
      include: {
        lista: true,
        proveedor: true,
        pedidos: true,
        proyectoEquipoItem: {
          include: {
            proyectoEquipo: true,
          },
        },
        proyectoEquipo: true,
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
          orderBy: { codigo: 'asc' },
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
      },
      orderBy: { codigo: 'asc' },
    })

    return new NextResponse(JSON.stringify(items), {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('❌ Error GET listaEquipoItem:', error)
    return NextResponse.json(
      { error: 'Error al obtener los ítems: ' + String(error) },
      { status: 500 }
    )
  }
}


// ✅ Crear nuevo ítem
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ListaEquipoItemPayload

    if (
      typeof body.listaId !== 'string' ||
      typeof body.codigo !== 'string' ||
      typeof body.descripcion !== 'string' ||
      typeof body.unidad !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    const nuevo = await prisma.listaEquipoItem.create({
      data: {
        listaId: body.listaId,
        proyectoEquipoItemId: body.proyectoEquipoItemId || null,
        proyectoEquipoId: body.proyectoEquipoId || null, // 🔥 nuevo campo directo
        proveedorId: body.proveedorId || null,
        codigo: body.codigo,
        descripcion: body.descripcion,
        unidad: body.unidad,
        cantidad: body.cantidad ?? 0,
        verificado: body.verificado ?? false,
        comentarioRevision: body.comentarioRevision || null,
        presupuesto: body.presupuesto ?? null,
        precioElegido: body.precioElegido ?? null,
        costoElegido: body.costoElegido ?? null,
        costoPedido: body.costoPedido ?? 0,
        costoReal: body.costoReal ?? 0,
        cantidadPedida: body.cantidadPedida ?? 0,
        cantidadEntregada: body.cantidadEntregada ?? 0,
        estado: body.estado ?? 'nuevo', // ✅ NUEVO CAMPO
      },
      include: {
        lista: true,
        proveedor: true,
        pedidos: true,
        proyectoEquipoItem: {
          include: {
            proyectoEquipo: true,
          },
        },
        proyectoEquipo: true, // 🔥 incluir la relación directa
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
          orderBy: { codigo: 'asc' },
        },
      },
    })

    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('❌ Error POST listaEquipoItem:', error)
    return NextResponse.json(
      { error: 'Error al crear ítem: ' + String(error) },
      { status: 500 }
    )
  }
}
