// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/fases/route.ts
// 🔧 Descripción: API para gestión de fases de cronograma
// 🎯 Funcionalidades: CRUD de fases
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Schema de validación para crear fase
const createFaseSchema = z.object({
  proyectoCronogramaId: z.string().min(1, 'El ID del cronograma es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  orden: z.number().int().min(0).default(0),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
})

// ✅ Schema de validación para actualizar fase
const updateFaseSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  orden: z.number().int().min(0).optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  estado: z.enum(['planificado', 'en_progreso', 'completado', 'pausado', 'cancelado']).optional(),
  porcentajeAvance: z.number().int().min(0).max(100).optional(),
})

// ✅ GET /api/proyectos/[id]/cronograma/fases - Obtener fases del proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Obtener todas las fases del proyecto
    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoId: id },
      include: {
        edts: true,
        _count: {
          select: { edts: true }
        }
      },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: fases
    })

  } catch (error) {
    console.error('Error al obtener fases:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/fases - Crear nueva fase
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createFaseSchema.parse(body)

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Validar que el cronograma existe y pertenece al proyecto
    const cronograma = await (prisma as any).proyectoCronograma.findFirst({
      where: {
        id: validatedData.proyectoCronogramaId,
        proyectoId: id
      }
    })

    if (!cronograma) {
      return NextResponse.json(
        { error: 'Cronograma no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Verificar que no existe una fase con el mismo nombre en el mismo cronograma
    const existingFase = await (prisma as any).proyectoFase.findFirst({
      where: {
        proyectoCronogramaId: validatedData.proyectoCronogramaId,
        nombre: validatedData.nombre
      }
    })

    if (existingFase) {
      return NextResponse.json(
        { error: 'Ya existe una fase con este nombre en el cronograma' },
        { status: 400 }
      )
    }

    // ✅ Crear la fase
    const fase = await (prisma as any).proyectoFase.create({
      data: {
        proyectoId: id,
        proyectoCronogramaId: validatedData.proyectoCronogramaId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        orden: validatedData.orden,
        fechaInicioPlan: validatedData.fechaInicioPlan ? new Date(validatedData.fechaInicioPlan) : null,
        fechaFinPlan: validatedData.fechaFinPlan ? new Date(validatedData.fechaFinPlan) : null,
        estado: 'planificado',
        porcentajeAvance: 0
      },
      include: {
        edts: true
      }
    })

    return NextResponse.json({
      success: true,
      data: fase
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear fase:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}