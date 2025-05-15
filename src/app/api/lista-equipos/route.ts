// ===================================================
// 📁 Archivo: /api/lista-equipos/route.ts
// 🔧 Descripción: API para obtener y crear listas de equipos
// 🧠 Uso: GET para listar por proyecto, POST para crear nueva
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquiposPayload } from '@/types/payloads'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')

    const data = await prisma.listaEquipos.findMany({
      where: {
        ...(proyectoId ? { proyectoId } : {}),
      },
      include: {
        proyecto: true,
        items: true,
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
    const payload: ListaEquiposPayload = await request.json()
    const nuevaLista = await prisma.listaEquipos.create({
      data: payload,
    })
    return NextResponse.json(nuevaLista)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
