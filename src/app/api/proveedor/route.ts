// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proveedor/
// 🔧 Descripción: API para crear y obtener proveedores
//
// 🧠 Uso: Usado para la gestión de proveedores desde logística
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { ProveedorPayload } from '@/types'

export async function GET() {
  try {
    const data = await prisma.proveedor.findMany()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener proveedores: ' + String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: ProveedorPayload = await request.json()
    const data = await prisma.proveedor.create({ data: body })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear proveedor: ' + String(error) }, { status: 500 })
  }
}
