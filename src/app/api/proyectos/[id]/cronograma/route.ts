// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/route.ts
// 🔧 Descripción: API para gestión de cronogramas de proyecto
// 🎯 Funcionalidades: CRUD de tipos de cronograma
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Schema de validación para crear cronograma
const createCronogramaSchema = z.object({
  tipo: z.enum(['comercial', 'planificacion', 'ejecucion']),
  nombre: z.string().min(1, 'El nombre es requerido'),
  copiadoDesdeCotizacionId: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/cronograma - Obtener cronogramas del proyecto
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

    // ✅ Obtener todos los cronogramas del proyecto
    const cronogramas = await prisma.proyectoCronograma.findMany({
      where: { proyectoId: id },
      include: {
        fases: {
          include: {
            edts: {
              include: {
                tareas: true
              }
            }
          }
        },
        edts: true,
        tareas: true
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: cronogramas
    })

  } catch (error) {
    console.error('Error al obtener cronogramas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma - Crear nuevo tipo de cronograma
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createCronogramaSchema.parse(body)

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

    // ✅ Verificar que no existe un cronograma del mismo tipo
    const existingCronograma = await prisma.proyectoCronograma.findFirst({
      where: {
        proyectoId: id,
        tipo: validatedData.tipo
      }
    })

    if (existingCronograma) {
      return NextResponse.json(
        { error: `Ya existe un cronograma de tipo ${validatedData.tipo}` },
        { status: 400 }
      )
    }

    // ✅ Crear el cronograma
    const cronograma = await prisma.proyectoCronograma.create({
      data: {
        proyectoId: id,
        tipo: validatedData.tipo,
        nombre: validatedData.nombre,
        copiadoDesdeCotizacionId: validatedData.copiadoDesdeCotizacionId,
        esBaseline: false,
        version: 1
      },
      include: {
        fases: true,
        edts: true,
        tareas: true
      }
    })

    return NextResponse.json({
      success: true,
      data: cronograma
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear cronograma:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}