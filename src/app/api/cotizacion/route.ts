// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/
// 🔧 Descripción: Maneja la obtención y creación de cotizaciones
// 🧠 Uso: GET para listar, POST para crear
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Obtener todas las cotizaciones
export async function GET() {
  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        cliente: true,
        comercial: true,
        plantilla: true,
        equipos: {
          include: {
            items: true
          }
        },
        servicios: {
          include: {
            items: {
              include: {
                unidadServicio: true,
                recurso: true,
                catalogoServicio: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(cotizaciones)
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error)
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 })
  }
}

// ✅ Crear nueva cotización manual
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { nombre, clienteId, comercialId } = data

    if (!nombre || !clienteId || !comercialId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const nueva = await prisma.cotizacion.create({
      data: {
        nombre,
        clienteId,
        comercialId,
        estado: 'borrador',
        totalInterno: 0,
        totalCliente: 0
      }
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear cotización:', error)
    return NextResponse.json({ error: 'Error al crear cotización' }, { status: 500 })
  }
}
