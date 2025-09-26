// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/lista-requerimiento/route.ts
// 🔧 Descripción: API para listar y crear listas de requerimientos
//
// 🧠 Uso: Usado por el área de proyectos para definir requerimientos aprobados
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquipoPayload } from '@/types'

// ✅ Obtener todas las listas
export async function GET() {
  try {
    const data = await prisma.listaEquipo.findMany({
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
    const payload: ListaEquipoPayload = await request.json()

    const creada = await prisma.listaEquipo.create({
      data: {
        proyectoId: payload.proyectoId,
        responsableId: payload.responsableId || payload.proyectoId, // temporal fallback
        codigo: payload.codigo || `LST-${Date.now()}`, // generar código si no se proporciona
        nombre: payload.nombre,
        numeroSecuencia: payload.numeroSecuencia || 1,
        estado: (payload.estado || 'borrador') as any
      }
    })

    return NextResponse.json(creada)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear lista de requerimientos' }, { status: 500 })
  }
}
