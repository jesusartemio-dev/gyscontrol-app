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

    const lista = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        proyecto: true,
        items: {
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
              orderBy: { codigo: 'asc' },
            },
            pedidos: {
              include: {
                pedido: true // ✅ Incluir relación al pedido padre para acceder al código
              }
            },
            proyectoEquipoItem: {
              include: { proyectoEquipo: true },
            },
          },
          orderBy: { codigo: 'asc' },
        },
      },
    })

    if (!lista) {
      return NextResponse.json(
        { error: 'Lista no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(lista)
  } catch (error) {
    console.error('❌ Error en /api/logistica/listas/[id]:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
