// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/lista-requerimiento-item/route.ts
// 🔧 Descripción: Manejo general de lista de requerimiento ítems (POST y GET global)
//
// 🧠 Uso: Se usa para crear o listar ítems asociados a listas de requerimiento
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-05-09
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.listaEquipoItem.findMany({
      include: {
        lista: true,
        proyectoEquipoItem: true,
        proveedor: true,
        cotizaciones: true,
      },
    })
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener los ítems' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const nuevoItem = await prisma.listaEquipoItem.create({
      data,
    })
    return NextResponse.json(nuevoItem)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear el ítem' }, { status: 500 })
  }
}
