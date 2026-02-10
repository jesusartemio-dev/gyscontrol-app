// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/dependencias/route.ts
// 🔧 Descripción: API para gestión de dependencias entre tareas
// 🎯 Funcionalidades: CRUD de dependencias de tareas
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'

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

    // ✅ Obtener todas las dependencias del proyecto
    const dependencias = await prisma.proyectoDependenciasTarea.findMany({
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
                edt: true
              }
            }
          }
        },
        tareaDependiente: {
          include: {
            proyectoEdt: {
              include: {
                edt: true
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createDependenciaSchema.parse(body)

    // Check cronograma lock
    const tareaOrigen = await prisma.proyectoTarea.findUnique({
      where: { id: validatedData.tareaOrigenId },
      select: { proyectoCronogramaId: true }
    })
    if (tareaOrigen?.proyectoCronogramaId && await isCronogramaBloqueado(tareaOrigen.proyectoCronogramaId)) {
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

    // ✅ Validar que ambas tareas existen y pertenecen al proyecto
    const tareaOrigenData = await prisma.proyectoTarea.findFirst({
      where: {
        id: validatedData.tareaOrigenId,
        proyectoEdt: {
          proyectoId: id
        }
      }
    })

    const tareaDependienteData = await prisma.proyectoTarea.findFirst({
      where: {
        id: validatedData.tareaDependienteId,
        proyectoEdt: {
          proyectoId: id
        }
      }
    })

    if (!tareaOrigenData || !tareaDependienteData) {
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
    const existingDependencia = await prisma.proyectoDependenciasTarea.findFirst({
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
    const dependencia = await prisma.proyectoDependenciasTarea.create({
      data: {
        id: crypto.randomUUID(),
        tareaOrigenId: validatedData.tareaOrigenId,
        tareaDependienteId: validatedData.tareaDependienteId,
        tipo: validatedData.tipo
      },
      include: {
        tareaOrigen: {
          include: {
            proyectoEdt: {
              include: {
                edt: true
              }
            }
          }
        },
        tareaDependiente: {
          include: {
            proyectoEdt: {
              include: {
                edt: true
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