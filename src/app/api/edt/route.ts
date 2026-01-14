// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/edt/
// 🔧 Descripción: Maneja GET y POST para EDTs
//
// 🧠 Uso: Listar y crear nuevos EDTs
// 📅 Última actualización: 2025-10-15
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const edts = await prisma.edt.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        catalogoServicio: true,
        faseDefault: true
      },
    })

    return NextResponse.json(edts)
  } catch (error) {
    console.error('❌ Error al listar EDTs:', error)
    return NextResponse.json({ error: 'Error al listar' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const nueva = await prisma.edt.create({
      data,
    })
    return NextResponse.json(nueva)
  } catch (error) {
    console.error('❌ Error al crear EDT:', error)
    return NextResponse.json({ error: 'Error al crear' }, { status: 500 })
  }
}
