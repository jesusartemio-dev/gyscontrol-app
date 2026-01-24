// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/configuracion/duraciones-cronograma
// 🔧 Descripción: API para gestión de duraciones por defecto del cronograma
// ✅ GET: Obtener duraciones por nivel
// ✅ PUT: Actualizar duraciones
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema para crear duraciones
const createDuracionSchema = z.object({
  nivel: z.enum(['edt', 'actividad', 'tarea']),
  duracionDias: z.number().min(0.1, 'Duración debe ser mayor a 0'),
  horasPorDia: z.number().min(1).max(24),
  bufferPorcentaje: z.number().min(0).max(100).default(10)
})

// Schema para actualizar duraciones
const updateDuracionesSchema = z.object({
  edt: z.object({
    duracionDias: z.number().min(0),
    horasPorDia: z.number().min(1).max(24)
  }).optional(),
  actividad: z.object({
    duracionDias: z.number().min(0),
    horasPorDia: z.number().min(1).max(24)
  }).optional(),
  tarea: z.object({
    duracionDias: z.number().min(0),
    horasPorDia: z.number().min(1).max(24)
  }).optional()
})

// ✅ GET /api/configuracion/duraciones-cronograma - Obtener duraciones
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const userRole = session.user.role
    if (!['admin', 'gerente', 'comercial'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para ver duraciones' }, { status: 403 })
    }

    // Obtener duraciones de BD usando consulta directa
    const duraciones = await prisma.$queryRaw`
      SELECT * FROM "plantilla_duracion_cronograma"
      ORDER BY "nivel" ASC
    `

    return NextResponse.json({
      success: true,
      data: duraciones
    })

  } catch (error) {
    console.error('❌ Error obteniendo duraciones:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ POST /api/configuracion/duraciones-cronograma - Crear nueva duración
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para crear duraciones' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createDuracionSchema.parse(body)

    // Verificar que no existe una duración activa para el mismo nivel
    const existente = await prisma.$queryRaw`
      SELECT * FROM "plantilla_duracion_cronograma"
      WHERE "nivel" = ${validatedData.nivel} AND "activo" = true
      LIMIT 1
    ` as any[]

    if (existente && existente.length > 0) {
      return NextResponse.json({
        error: `Ya existe una duración activa para el nivel ${validatedData.nivel}`
      }, { status: 400 })
    }

    // Crear nueva duración usando consulta directa
    const nuevaDuracion = await prisma.$queryRaw`
      INSERT INTO "plantilla_duracion_cronograma"
      ("id", "nivel", "duracionDias", "horasPorDia", "bufferPorcentaje", "activo", "createdAt", "updatedAt")
      VALUES
      (gen_random_uuid(), ${validatedData.nivel}, ${validatedData.duracionDias}, ${validatedData.horasPorDia}, ${validatedData.bufferPorcentaje}, true, NOW(), NOW())
      RETURNING *
    ` as any[]

    return NextResponse.json({
      success: true,
      data: nuevaDuracion[0] || nuevaDuracion,
      message: 'Duración creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error creando duración:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ PUT /api/configuracion/duraciones-cronograma - Actualizar duraciones
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y gerente pueden actualizar
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar duraciones' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateDuracionesSchema.parse(body)

    // Actualizar en BD usando consultas directas
    for (const [nivel, config] of Object.entries(validatedData)) {
      if (config) {
        await prisma.$queryRaw`
          INSERT INTO "plantilla_duracion_cronograma"
          ("id", "nivel", "duracionDias", "horasPorDia", "bufferPorcentaje", "activo", "createdAt", "updatedAt")
          VALUES
          (gen_random_uuid(), ${nivel}, ${config.duracionDias}, ${config.horasPorDia}, 10.0, true, NOW(), NOW())
          ON CONFLICT ("nivel")
          DO UPDATE SET
            "duracionDias" = EXCLUDED."duracionDias",
            "horasPorDia" = EXCLUDED."horasPorDia",
            "updatedAt" = NOW()
        `
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Duraciones actualizadas exitosamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error actualizando duraciones:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}