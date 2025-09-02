// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/proveedor/[id]
// 🔧 Descripción: API para obtener, actualizar y eliminar un proveedor por ID
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { ProveedorUpdatePayload } from '@/types'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await prisma.proveedor.findUnique({ where: { id } })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener proveedor: ' + String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body: ProveedorUpdatePayload = await request.json()
    const data = await prisma.proveedor.update({ where: { id }, data: body })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar proveedor: ' + String(error) }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    await prisma.proveedor.delete({ where: { id } })
    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar proveedor: ' + String(error) }, { status: 500 })
  }
}
