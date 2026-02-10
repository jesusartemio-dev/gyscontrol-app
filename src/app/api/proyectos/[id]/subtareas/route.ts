// ===================================================
// 📁 Archivo: subtareas/route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/subtareas/route.ts
// 🔧 Descripción: API para gestionar subtareas de proyecto
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createProyectoSubtareaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  proyectoTareaId: z.string(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasEstimadas: z.number().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada']).default('pendiente'),
  porcentajeCompletado: z.number().min(0).max(100).default(0),
  asignadoId: z.string().optional()
})

const updateProyectoSubtareaSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasEstimadas: z.number().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada']).optional(),
  porcentajeCompletado: z.number().min(0).max(100).optional(),
  asignadoId: z.string().optional()
})

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params
    const { searchParams } = new URL(request.url)

    const tareaId = searchParams.get('tareaId')

    let where: any = {
      proyectoTarea: {
        proyectoEdt: {
          proyectoId
        }
      }
    }

    if (tareaId) {
      where.proyectoTareaId = tareaId
    }

    const subtareas = await prisma.proyectoSubtarea.findMany({
      where,
      include: {
        proyectoTarea: {
          include: {
            proyectoEdt: {
              include: {
                edt: true
              }
            }
          }
        },
        user: true
      },
      orderBy: [
        { fechaInicio: 'asc' }
      ]
    })

    return NextResponse.json(subtareas)
  } catch (error) {
    console.error('Error al obtener subtareas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params
    const body = await request.json()

    const validatedData = createProyectoSubtareaSchema.parse(body)

    // Verificar que la tarea existe y pertenece al proyecto
    const tarea = await prisma.proyectoTarea.findFirst({
      where: {
        id: validatedData.proyectoTareaId,
        proyectoEdt: {
          proyectoId
        }
      }
    })

    if (!tarea) {
      return NextResponse.json({ error: 'Tarea no encontrada o no pertenece al proyecto' }, { status: 404 })
    }

    const subtarea = await prisma.proyectoSubtarea.create({
      data: {
        id: crypto.randomUUID(),
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        proyectoTareaId: validatedData.proyectoTareaId,
        fechaInicio: new Date(validatedData.fechaInicio),
        fechaFin: new Date(validatedData.fechaFin),
        fechaInicioReal: validatedData.fechaInicioReal ? new Date(validatedData.fechaInicioReal) : undefined,
        fechaFinReal: validatedData.fechaFinReal ? new Date(validatedData.fechaFinReal) : undefined,
        horasEstimadas: validatedData.horasEstimadas,
        estado: validatedData.estado,
        porcentajeCompletado: validatedData.porcentajeCompletado,
        asignadoId: validatedData.asignadoId,
        updatedAt: new Date()
      },
      include: {
        proyectoTarea: {
          include: {
            proyectoEdt: {
              include: {
                edt: true
              }
            }
          }
        },
        user: true
      }
    })

    return NextResponse.json(subtarea, { status: 201 })
  } catch (error) {
    console.error('Error al crear subtarea:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}