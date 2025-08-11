// 📁 src/app/api/lista-por-proyecto/route.ts
// 🎯 Devuelve las listas de equipos para un proyecto específico

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proyectoId = searchParams.get('proyectoId')

  if (!proyectoId) {
    return NextResponse.json({ error: 'Falta parámetro proyectoId' }, { status: 400 })
  }

  try {
    const listas = await prisma.listaEquipo.findMany({
      where: { proyectoId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(listas)
  } catch (error) {
    console.error('❌ Error en /api/lista-por-proyecto:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
