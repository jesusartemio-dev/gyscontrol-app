// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/lista-requerimiento/route.ts
// 🔧 Descripción: API para listar y crear listas de requerimientos
//
// 🧠 Uso: Usado por el área de proyectos para definir requerimientos aprobados
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaRequerimientoPayload } from '@/types'

// ✅ Obtener todas las listas
export async function GET() {
  try {
    const data = await prisma.listaRequerimiento.findMany({
      include: {
        items: true,
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener listas de requerimientos' }, { status: 500 })
  }
}

// ✅ Crear nueva lista
export async function POST(request: Request) {
  try {
    const payload: ListaRequerimientoPayload = await request.json()

    const creada = await prisma.listaRequerimiento.create({
      data: {
        proyectoId: payload.proyectoId,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        estado: payload.estado || 'pendiente'
      }
    })

    return NextResponse.json(creada)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear lista de requerimientos' }, { status: 500 })
  }
}
