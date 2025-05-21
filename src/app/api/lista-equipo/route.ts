// ===================================================
// 📁 Archivo: /api/lista-equipo/route.ts
// 🔧 Descripción: API para obtener y crear listas de equipos
// 🧠 Uso: GET para listar por proyecto, POST para crear nueva
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-18
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquipoPayload } from '@/types/payloads'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')

    const data = await prisma.listaEquipo.findMany({
      where: {
        ...(proyectoId ? { proyectoId } : {}),
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload: ListaEquipoPayload = await request.json()

    const nuevaLista = await prisma.listaEquipo.create({
      data: payload,
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

    return NextResponse.json(nuevaLista)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
