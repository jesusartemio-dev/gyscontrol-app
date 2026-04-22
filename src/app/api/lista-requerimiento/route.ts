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
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarCreacion } from '@/lib/services/audit'

// ✅ Obtener todas las listas
export async function GET() {
  try {
    const data = await prisma.listaEquipo.findMany({
      include: {
        listaEquipoItem: true,
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
    const session = await getServerSession(authOptions)
    const payload: ListaEquipoPayload = await request.json()

    const creada = await prisma.listaEquipo.create({
      data: {
        id: `lista-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        proyectoId: payload.proyectoId,
        responsableId: payload.responsableId || payload.proyectoId, // temporal fallback
        codigo: payload.codigo || `LST-${Date.now()}`, // generar código si no se proporciona
        nombre: payload.nombre,
        numeroSecuencia: payload.numeroSecuencia || 1,
        estado: (payload.estado || 'borrador') as any,
        updatedAt: new Date()
      }
    })

    // ✅ Registrar en auditoría
    const usuarioId = session?.user?.id || payload.responsableId
    if (usuarioId) {
      try {
        await registrarCreacion(
          'LISTA_EQUIPO',
          creada.id,
          usuarioId,
          creada.nombre,
          {
            codigo: creada.codigo,
            origen: 'lista-requerimiento',
          }
        )
      } catch (auditError) {
        console.error('Error al registrar auditoría:', auditError)
      }
    }

    return NextResponse.json(creada)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear lista de requerimientos' }, { status: 500 })
  }
}
