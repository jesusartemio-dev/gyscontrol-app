// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor/route.ts
// 🔧 Descripción: API para obtener y crear cotizaciones de proveedores
//
// 🧠 Uso: Manejo de cotizaciones por proveedor en las listas de equipos
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CotizacionProveedorPayload } from '@/types'

// ✅ Permite filtrar por proyectoId vía query param
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')

    const data = await prisma.cotizacionProveedor.findMany({
      where: proyectoId ? { proyectoId } : undefined,
      include: {
        proyecto: true,
        items: {
          include: {
            listaItem: true
          }
        }
      }
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload: CotizacionProveedorPayload = await request.json()
    const nueva = await prisma.cotizacionProveedor.create({
      data: {
        proyectoId: payload.proyectoId,
        nombre: payload.nombre,
        ruc: payload.ruc,
        contacto: payload.contacto,
        estado: payload.estado ?? 'enviado'
      }
    })
    return NextResponse.json(nueva)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear la cotización del proveedor' }, { status: 500 })
  }
}
