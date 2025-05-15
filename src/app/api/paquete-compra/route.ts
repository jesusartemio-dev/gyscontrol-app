// ===================================================
// 📁 Archivo: paquete-compra/route.ts
// 📌 Ubicación: src/app/api/paquete-compra/route.ts
// 🔧 Descripción: Manejo de paquetes de compra (crear, listar)
// 🧠 Uso: API para gestionar paquetes de compra en un proyecto
// ✍️ Autor: GYS Dev Team
// 📅 Última actualización: 2025-05-09
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ✅ GET: Listar todos los paquetes
export async function GET() {
  try {
    const data = await prisma.paqueteCompra.findMany({
      include: {
        proyecto: true,
        items: true
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener paquetes' }, { status: 500 })
  }
}

// ✅ POST: Crear nuevo paquete
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const nuevoPaquete = await prisma.paqueteCompra.create({
      data: body
    })
    return NextResponse.json(nuevoPaquete)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear paquete' }, { status: 500 })
  }
}
