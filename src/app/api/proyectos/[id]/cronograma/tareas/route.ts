// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/tareas/route.ts
// 🔧 Descripción: API para gestión de tareas de cronograma
// 🎯 Funcionalidades: CRUD de tareas (4to nivel)
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Schema de validación para crear tarea
const createTareaSchema = z.object({
  proyectoEdtId: z.string().min(1, 'El ID del EDT es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  fechaInicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fechaFin: z.string().min(1, 'La fecha de fin es requerida'),
  horasEstimadas: z.number().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  dependenciaId: z.string().optional(),
  responsableId: z.string().optional(),
})

// ✅ Schema de validación para actualizar tarea
const updateTareaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasEstimadas: z.number().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  porcentajeCompletado: z.number().int().min(0).max(100).optional(),
  dependenciaId: z.string().optional(),
  responsableId: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/cronograma/tareas - Obtener tareas del proyecto
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

    // ✅ Obtener todas las tareas del proyecto
    const tareas = await (prisma as any).proyectoTarea.findMany({
      where: { proyectoEdt: { proyectoId: id } },
      include: {
        proyectoEdt: {
          include: {
            categoriaServicio: true
          }
        },
        responsable: true,
        dependencia: true,
        tareasDependientes: true,
        registrosHoras: true,
        subtareas: true,
        _count: {
          select: { subtareas: true, registrosHoras: true }
        }
      },
      orderBy: { fechaInicio: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: tareas
    })

  } catch (error) {
    console.error('Error al obtener tareas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/tareas - Crear nueva tarea
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createTareaSchema.parse(body)

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

    // ✅ Validar que el EDT existe y pertenece al proyecto
    const edt = await (prisma as any).proyectoEdt.findFirst({
      where: {
        id: validatedData.proyectoEdtId,
        proyectoId: id
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Obtener el cronograma del EDT para asignarlo a la tarea
    const cronogramaId = edt.proyectoCronogramaId

    // ✅ Crear la tarea
    const tarea = await (prisma as any).proyectoTarea.create({
      data: {
        proyectoEdtId: validatedData.proyectoEdtId,
        proyectoCronogramaId: cronogramaId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        fechaInicio: new Date(validatedData.fechaInicio),
        fechaFin: new Date(validatedData.fechaFin),
        horasEstimadas: validatedData.horasEstimadas,
        prioridad: validatedData.prioridad,
        dependenciaId: validatedData.dependenciaId,
        responsableId: validatedData.responsableId,
        estado: 'pendiente',
        porcentajeCompletado: 0
      },
      include: {
        proyectoEdt: {
          include: {
            categoriaServicio: true
          }
        },
        responsable: true,
        dependencia: true,
        subtareas: true
      }
    })

    return NextResponse.json({
      success: true,
      data: tarea
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear tarea:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}