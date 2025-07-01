import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const data = await prisma.listaEquipo.findMany({
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
