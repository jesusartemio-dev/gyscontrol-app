// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/fases/route.ts
// 🔧 Descripción: API para gestión de fases de proyecto
// 🎯 Funcionalidades: CRUD de fases
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'

// ✅ Schema de validación para crear fase
const createFaseSchema = z.object({
  proyectoCronogramaId: z.string().min(1, 'ID de cronograma requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  orden: z.number().min(1).optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
})

// ✅ Schema de validación para actualizar fase
const updateFaseSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  orden: z.number().min(1).optional(),
  estado: z.enum(['planificado', 'en_progreso', 'completado', 'pausado', 'cancelado']).optional(),
  porcentajeAvance: z.number().min(0).max(100).optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/fases - Obtener fases del proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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

    // ✅ Obtener parámetros de consulta para filtrado
    const { searchParams } = new URL(request.url);
    const cronogramaId = searchParams.get('cronogramaId') || undefined;

    // ✅ Obtener fases del proyecto con filtrado opcional por cronograma
    const fases = await (prisma as any).proyectoFase.findMany({
      where: {
        proyectoId: id,
        ...(cronogramaId && { proyectoCronogramaId: cronogramaId })
      },
      include: {
        proyectoCronograma: {
          select: { id: true, nombre: true, tipo: true }
        },
        proyectoEdt: {
          include: {
            proyectoTarea: true,
            edt: true,
            user: true
          }
        },
        _count: {
          select: { proyectoEdt: true }
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

// ✅ POST /api/proyectos/[id]/fases - Crear nueva fase
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createFaseSchema.parse(body)

    // Check cronograma lock
    if (validatedData.proyectoCronogramaId && await isCronogramaBloqueado(validatedData.proyectoCronogramaId)) {
      return cronogramaBloqueadoResponse()
    }

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

    // ✅ Obtener el orden máximo actual para asignar el siguiente
    const maxOrden = await (prisma as any).proyectoFase.aggregate({
      where: { proyectoCronogramaId: validatedData.proyectoCronogramaId },
      _max: { orden: true }
    })

    const nuevoOrden = (maxOrden._max?.orden || 0) + 1

    // ✅ Crear la fase
    const fase = await (prisma as any).proyectoFase.create({
      data: {
        proyectoId: id,
        proyectoCronogramaId: validatedData.proyectoCronogramaId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        orden: validatedData.orden || nuevoOrden,
        estado: 'planificado',
        porcentajeAvance: 0,
        fechaInicioPlan: validatedData.fechaInicioPlan ? new Date(validatedData.fechaInicioPlan) : null,
        fechaFinPlan: validatedData.fechaFinPlan ? new Date(validatedData.fechaFinPlan) : null
      },
      include: {
        proyectoCronograma: {
          select: { id: true, nombre: true, tipo: true }
        },
        _count: {
          select: { edts: true }
        }
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