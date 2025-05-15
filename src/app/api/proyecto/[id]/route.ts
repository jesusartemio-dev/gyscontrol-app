import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Obtener un proyecto por ID
export async function GET(_: Request, context: { params: { id: string } }) {
  const { id } = await context.params
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: true,
      comercial: true,
      gestor: true,
      cotizacion: true,
      equipos: { include: { items: true } },
      servicios: { include: { items: true } },
      gastos: { include: { items: true } }
    }
  })

  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  return NextResponse.json(proyecto)
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  const { id } = context.params
  const data = await req.json()
  const actualizado = await prisma.proyecto.update({
    where: { id },
    data,
  })
  return NextResponse.json(actualizado)
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const { id } = context.params
  await prisma.proyecto.delete({ where: { id } })
  return NextResponse.json({ status: 'ok' })
}
