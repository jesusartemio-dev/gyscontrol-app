import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const proyectos = await prisma.proyecto.findMany({
    include: {
      cliente: true,
      comercial: true,
      gestor: true,
      equipos: true,
      servicios: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(proyectos)
}

export async function POST(req: Request) {
  const data = await req.json()
  const nuevo = await prisma.proyecto.create({ data })
  return NextResponse.json(nuevo, { status: 201 })
}
