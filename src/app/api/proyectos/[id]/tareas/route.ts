// ===================================================
// 📁 Archivo: tareas/route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/tareas/route.ts
// 🔧 Descripción: API para gestionar tareas de proyecto
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'

const createProyectoTareaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  proyectoEdtId: z.string(),
  proyectoCronogramaId: z.string(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasEstimadas: z.number().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  responsableId: z.string().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada']).default('pendiente'),
  porcentajeCompletado: z.number().min(0).max(100).default(0),
  dependenciaId: z.string().optional()
})

const updateProyectoTareaSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasEstimadas: z.number().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  responsableId: z.string().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada']).optional(),
  porcentajeCompletado: z.number().min(0).max(100).optional()
})

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proyectoId } = await params
    const { searchParams } = new URL(request.url)

    const cronogramaId = searchParams.get('cronogramaId')
    const edtId = searchParams.get('edtId')

    console.log('🔍 [TAREAS API] GET request:', { proyectoId, cronogramaId, edtId })

    let where: any = {
      proyectoEdt: {
        proyectoId
      }
    }

    if (cronogramaId && cronogramaId.trim() !== '') {
      where.proyectoCronogramaId = cronogramaId
      console.log('🔍 [TAREAS API] Filtering by cronogramaId:', cronogramaId)

      // Verify that the cronograma exists
      const cronogramaExists = await prisma.proyectoCronograma.findUnique({
        where: { id: cronogramaId }
      })
      console.log('🔍 [TAREAS API] Cronograma exists:', !!cronogramaExists)
      if (!cronogramaExists) {
        console.warn('⚠️ [TAREAS API] Cronograma not found:', cronogramaId)
      }
    }

    if (edtId && edtId.trim() !== '') {
      where.proyectoEdtId = edtId
      console.log('🔍 [TAREAS API] Filtering by edtId:', edtId)
    }

    console.log('🔍 [TAREAS API] Final where clause:', JSON.stringify(where, null, 2))

    const tareas = await prisma.proyectoTarea.findMany({
      where,
      include: {
        proyectoEdt: {
          include: {
            edt: true,
            user: true
          }
        },
        user: true,
        proyectoSubtarea: {
          include: {
            user: true
          }
        },
        dependenciasComoOrigen: {
          include: {
            tareaDependiente: true
          }
        },
        dependenciasComoDependiente: {
          include: {
            tareaOrigen: true
          }
        }
      },
      orderBy: [
        { fechaInicio: 'asc' }
      ]
    })

    console.log(`✅ [TAREAS API] Found ${tareas.length} tasks`)
    if (tareas.length > 0) {
      console.log('✅ [TAREAS API] Sample task:', {
        id: tareas[0].id,
        nombre: tareas[0].nombre,
        proyectoCronogramaId: tareas[0].proyectoCronogramaId,
        fechaInicio: tareas[0].fechaInicio,
        fechaFin: tareas[0].fechaFin
      })
    }

    return NextResponse.json(tareas)
  } catch (error) {
    console.error('Error al obtener tareas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proyectoId } = await params
    const body = await request.json()

    const validatedData = createProyectoTareaSchema.parse(body)

    // Check cronograma lock
    if (validatedData.proyectoCronogramaId && await isCronogramaBloqueado(validatedData.proyectoCronogramaId)) {
      return cronogramaBloqueadoResponse()
    }

    // Verificar que el EDT existe y pertenece al proyecto
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id: validatedData.proyectoEdtId,
        proyectoId
      }
    })

    if (!edt) {
      return NextResponse.json({ error: 'EDT no encontrado o no pertenece al proyecto' }, { status: 404 })
    }

    // No hay campo orden en ProyectoTarea, se ordena por fechaInicio

    const tarea = await prisma.proyectoTarea.create({
      data: {
        id: `tarea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        proyectoEdtId: validatedData.proyectoEdtId,
        proyectoCronogramaId: validatedData.proyectoCronogramaId,
        fechaInicio: new Date(validatedData.fechaInicio),
        fechaFin: new Date(validatedData.fechaFin),
        fechaInicioReal: validatedData.fechaInicioReal ? new Date(validatedData.fechaInicioReal) : undefined,
        fechaFinReal: validatedData.fechaFinReal ? new Date(validatedData.fechaFinReal) : undefined,
        horasEstimadas: validatedData.horasEstimadas,
        prioridad: validatedData.prioridad,
        responsableId: validatedData.responsableId,
        estado: validatedData.estado,
        porcentajeCompletado: validatedData.porcentajeCompletado,
        dependenciaId: validatedData.dependenciaId,
        updatedAt: new Date()
      },
      include: {
        proyectoEdt: {
          include: {
            edt: true,
            user: true
          }
        },
        user: true,
        proyectoSubtarea: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json(tarea, { status: 201 })
  } catch (error) {
    console.error('Error al crear tarea:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}