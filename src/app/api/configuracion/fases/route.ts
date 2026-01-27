// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/configuracion/fases
// 🔧 Descripción: API para gestionar fases de configuración
// ✅ GET: Obtener fases disponibles para importación
// ✅ POST: Crear nueva fase por defecto
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const createFaseSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  orden: z.number().min(0).default(0),
  duracionDias: z.number().min(1, 'La duración es obligatoria'),
  color: z.string().optional(),
  activo: z.boolean().default(true)
})

// ✅ GET /api/configuracion/fases - Obtener fases de configuración
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    // Obtener fases de la base de datos
    const fases = await prisma.faseDefault.findMany({
      where: all ? {} : { activo: true },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: fases
    })

  } catch (error) {
    console.error('❌ Error obteniendo fases de configuración:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ POST /api/configuracion/fases - Crear nueva fase por defecto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createFaseSchema.parse(body)

    // Verificar que no existe una fase con el mismo nombre
    const faseExistente = await prisma.faseDefault.findFirst({
      where: { nombre: validatedData.nombre }
    })

    if (faseExistente) {
      return NextResponse.json({
        error: 'Ya existe una fase por defecto con ese nombre'
      }, { status: 400 })
    }

    // Crear nueva fase por defecto
    const nuevaFase = await prisma.faseDefault.create({
      data: {
        id: randomUUID(),
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        orden: validatedData.orden,
        duracionDias: validatedData.duracionDias,
        color: validatedData.color,
        activo: validatedData.activo,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: nuevaFase,
      message: 'Fase por defecto creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error creando fase por defecto:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
