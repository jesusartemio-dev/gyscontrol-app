// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/edts/route.ts
// 🔧 Descripción: API para gestión de EDTs de proyecto
// 🎯 Funcionalidades: CRUD de EDTs (Estructura de Desglose de Trabajo)
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Schema de validación para crear EDT
const createEdtSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  categoriaServicioId: z.string().min(1, 'La categoría de servicio es requerida'),
  proyectoFaseId: z.string().optional(),
  zona: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  horasPlan: z.number().min(0).default(0),
  responsableId: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  descripcion: z.string().optional(),
})

// ✅ Schema de validación para actualizar EDT
const updateEdtSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  categoriaServicioId: z.string().min(1, 'La categoría de servicio es requerida').optional(),
  proyectoFaseId: z.string().optional(),
  zona: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasPlan: z.number().min(0).optional(),
  porcentajeAvance: z.number().int().min(0).max(100).optional(),
  estado: z.enum(['planificado', 'en_progreso', 'detenido', 'completado', 'cancelado']).optional(),
  responsableId: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  descripcion: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/cronograma/edts - Obtener EDTs del proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const faseId = searchParams.get('faseId')
    const cronogramaId = searchParams.get('cronogramaId')

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

    // ✅ Construir filtros
    const where: any = { proyectoId: id }
    if (faseId) where.proyectoFaseId = faseId
    if (cronogramaId) where.proyectoCronogramaId = cronogramaId

    // ✅ Obtener todos los EDTs del proyecto
    const edts = await (prisma as any).proyectoEdt.findMany({
      where,
      include: {
        proyecto: {
          select: { id: true, nombre: true, codigo: true, estado: true }
        },
        categoriaServicio: {
          select: { id: true, nombre: true }
        },
        responsable: {
          select: { id: true, name: true, email: true }
        },
        proyectoFase: {
          select: { id: true, nombre: true }
        },
        proyectoCronograma: {
          select: { id: true, tipo: true, nombre: true }
        },
        _count: {
          select: { tareas: true }
        }
      },
      orderBy: [
        { proyectoFase: { orden: 'asc' } },
        { prioridad: 'desc' },
        { fechaInicioPlan: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: edts
    })

  } catch (error) {
    console.error('Error al obtener EDTs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/edts - Crear nuevo EDT
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createEdtSchema.parse(body)

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

    // ✅ Validar que la categoría de servicio existe
    const categoriaServicio = await prisma.categoriaServicio.findUnique({
      where: { id: validatedData.categoriaServicioId }
    })

    if (!categoriaServicio) {
      return NextResponse.json(
        { error: 'Categoría de servicio no encontrada' },
        { status: 404 }
      )
    }

    // ✅ Determinar el cronograma (por defecto el comercial si existe)
    let cronogramaId = null
    if (validatedData.proyectoFaseId) {
      // Si se especifica una fase, obtener el cronograma de esa fase
      const fase = await (prisma as any).proyectoFase.findUnique({
        where: { id: validatedData.proyectoFaseId },
        select: { proyectoCronogramaId: true }
      })
      cronogramaId = fase?.proyectoCronogramaId
    } else {
      // Buscar cronograma comercial por defecto
      const cronogramaComercial = await (prisma as any).proyectoCronograma.findFirst({
        where: {
          proyectoId: id,
          tipo: 'comercial'
        }
      })
      cronogramaId = cronogramaComercial?.id
    }

    if (!cronogramaId) {
      return NextResponse.json(
        { error: 'No se encontró un cronograma válido para el proyecto' },
        { status: 404 }
      )
    }

    // ✅ Crear el EDT
    const edt = await (prisma as any).proyectoEdt.create({
      data: {
        proyectoId: id,
        proyectoCronogramaId: cronogramaId,
        proyectoFaseId: validatedData.proyectoFaseId,
        nombre: validatedData.nombre,
        categoriaServicioId: validatedData.categoriaServicioId,
        zona: validatedData.zona,
        fechaInicioPlan: validatedData.fechaInicioPlan ? new Date(validatedData.fechaInicioPlan) : null,
        fechaFinPlan: validatedData.fechaFinPlan ? new Date(validatedData.fechaFinPlan) : null,
        horasPlan: validatedData.horasPlan,
        responsableId: validatedData.responsableId,
        prioridad: validatedData.prioridad,
        descripcion: validatedData.descripcion,
        estado: 'planificado',
        porcentajeAvance: 0
      },
      include: {
        proyecto: {
          select: { id: true, nombre: true, codigo: true, estado: true }
        },
        categoriaServicio: {
          select: { id: true, nombre: true }
        },
        responsable: {
          select: { id: true, name: true, email: true }
        },
        proyectoFase: {
          select: { id: true, nombre: true }
        },
        proyectoCronograma: {
          select: { id: true, tipo: true, nombre: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: edt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear EDT:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}