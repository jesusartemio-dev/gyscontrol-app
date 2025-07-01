// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor/
// 🔧 Descripción: API para crear y listar cotizaciones de proveedores
//
// 🧠 Uso: Usado por logística para registrar cotizaciones de equipos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-30
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
      orderBy: {
        codigo: 'asc', // ✅ Ordena los ítems por código ascendente
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener cotizaciones: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: CotizacionProveedorPayload = await request.json()

    // ✅ Validación básica
    if (!body.proveedorId || !body.proyectoId || !body.fecha) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: proveedorId, proyectoId o fecha' },
        { status: 400 }
      )
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: body.proyectoId },
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener último numeroSecuencia
    const ultimaCotizacion = await prisma.cotizacionProveedor.findFirst({
      where: { proyectoId: body.proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
    })

    const nuevoNumero = ultimaCotizacion ? ultimaCotizacion.numeroSecuencia + 1 : 1
    const codigoGenerado = `${proyecto.codigo}-COT-${String(nuevoNumero).padStart(3, '0')}`

    const nuevaCotizacion = await prisma.cotizacionProveedor.create({
      data: {
        proveedorId: body.proveedorId,
        proyectoId: body.proyectoId,
        codigo: codigoGenerado,
        numeroSecuencia: nuevoNumero,
        fecha: new Date(body.fecha),
      },
    })

    return NextResponse.json(nuevaCotizacion)
  } catch (error) {
    console.error('❌ Error al crear cotización:', error)
    return NextResponse.json(
      { error: 'Error al crear cotización: ' + String(error) },
      { status: 500 }
    )
  }
}
