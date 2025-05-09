// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantilla-servicio
// 🔧 Descripción: CRUD general para PlantillaServicio
//
// 🧠 Uso: Listar y crear secciones de servicios en una plantilla
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const servicios = await prisma.plantillaServicio.findMany({
    include: { items: true }
  })
  return NextResponse.json(servicios)
}

export async function POST(req: Request) {
  const data = await req.json()
  const nuevo = await prisma.plantillaServicio.create({ data })
  return NextResponse.json(nuevo)
}
