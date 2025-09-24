// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/dependencias/route.ts
// 🔧 Descripción: API para gestión de dependencias entre tareas
// 🎯 Funcionalidades: CRUD de dependencias de tareas
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Schema de validación para crear dependencia
const createDependenciaSchema = z.object({
  tareaOrigenId: z.string().min(1, 'El ID de la tarea origen es requerido'),
  tareaDependienteId: z.string().min(1, 'El ID de la tarea dependiente es requerido'),
  tipo: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).default('finish_to_start'),
})

// ✅ GET /api/proyectos/[id]/cronograma/dependencias - Obtener dependencias del proyecto
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

    // ✅ Obtener todas las dependencias del proyecto
    const dependencias = await (prisma as any).proyectoDependenciaTarea.findMany({
      where: {
        tareaOrigen: {
          proyectoEdt: {
            proyectoId: id
          }
        }
      },
      include: {
        tareaOrigen: {
          include: {
            proyectoEdt: {
              include: {
                categoriaServicio: true
              }
            }
          }
        },
        tareaDependiente: {
          include: {
            proyectoEdt: {
              include: {
                categoriaServicio: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: dependencias
    })

  } catch (error) {
    console.error('Error al obtener dependencias:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/dependencias - Crear nueva dependencia
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createDependenciaSchema.parse(body)

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

    // ✅ Validar que ambas tareas existen y pertenecen al proyecto
    const tareaOrigen = await (prisma as any).proyectoTarea.findFirst({
      where: {
        id: validatedData.tareaOrigenId,
        proyectoEdt: {
          proyectoId: id
        }
      }
    })

    const tareaDependiente = await (prisma as any).proyectoTarea.findFirst({
      where: {
        id: validatedData.tareaDependienteId,
        proyectoEdt: {
          proyectoId: id
        }
      }
    })

    if (!tareaOrigen || !tareaDependiente) {
      return NextResponse.json(
        { error: 'Una o ambas tareas no existen o no pertenecen al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Validar que no se cree una dependencia circular
    if (validatedData.tareaOrigenId === validatedData.tareaDependienteId) {
      return NextResponse.json(
        { error: 'Una tarea no puede depender de sí misma' },
        { status: 400 }
      )
    }

    // ✅ Verificar que no existe ya esta dependencia
    const existingDependencia = await (prisma as any).proyectoDependenciaTarea.findFirst({
      where: {
        tareaOrigenId: validatedData.tareaOrigenId,
        tareaDependienteId: validatedData.tareaDependienteId
      }
    })

    if (existingDependencia) {
      return NextResponse.json(
        { error: 'Esta dependencia ya existe' },
        { status: 400 }
      )
    }

    // ✅ Crear la dependencia
    const dependencia = await (prisma as any).proyectoDependenciaTarea.create({
      data: {
        tareaOrigenId: validatedData.tareaOrigenId,
        tareaDependienteId: validatedData.tareaDependienteId,
        tipo: validatedData.tipo
      },
      include: {
        tareaOrigen: {
          include: {
            proyectoEdt: {
              include: {
                categoriaServicio: true
              }
            }
          }
        },
        tareaDependiente: {
          include: {
            proyectoEdt: {
              include: {
                categoriaServicio: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: dependencia
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear dependencia:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}