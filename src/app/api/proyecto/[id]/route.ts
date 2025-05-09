import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Obtener un proyecto por ID
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: params.id },
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


export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const actualizado = await prisma.proyecto.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(actualizado)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.proyecto.delete({ where: { id: params.id } })
  return NextResponse.json({ status: 'ok' })
}
