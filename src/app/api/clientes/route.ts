// src/app/api/clientes/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ✅ GET: Listar todos los clientes
export async function GET() {
  const clientes = await prisma.cliente.findMany()
  return NextResponse.json(clientes)
}

// ✅ POST: Crear nuevo cliente
export async function POST(req: Request) {
  const data = await req.json()
  const nuevo = await prisma.cliente.create({ data })
  return NextResponse.json(nuevo)
}

// ✅ PUT: Actualizar cliente
export async function PUT(req: Request) {
  const data = await req.json()
  const { id, ...rest } = data
  const actualizado = await prisma.cliente.update({
    where: { id },
    data: rest,
  })
  return NextResponse.json(actualizado)
}

// ✅ DELETE: Eliminar cliente
export async function DELETE(req: Request) {
  const { id } = await req.json()
  await prisma.cliente.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
