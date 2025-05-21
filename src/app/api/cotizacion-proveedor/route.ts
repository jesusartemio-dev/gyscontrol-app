// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor/
// 🔧 Descripción: API para crear y listar cotizaciones de proveedores
//
// 🧠 Uso: Usado por logística para registrar cotizaciones de equipos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { CotizacionProveedorPayload } from '@/types'

export async function GET() {
  try {
    const data = await prisma.cotizacionProveedor.findMany({
      include: {
        proveedor: true,
        proyecto: true,
        items: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener cotizaciones: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: CotizacionProveedorPayload = await request.json()
    const data = await prisma.cotizacionProveedor.create({ data: body })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear cotización: ' + String(error) },
      { status: 500 }
    )
  }
}
