// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/tree/create
// 🔧 Descripción: Crear nuevos nodos en el árbol del cronograma
// ✅ POST: Crear nodo con posicionamiento flexible
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createNodeSchema = z.object({
  type: z.enum(['fase', 'edt', 'actividad', 'tarea']),
  parentId: z.string().optional(),
  data: z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    descripcion: z.string().optional(),
    fechaInicioComercial: z.string().optional(),
    fechaFinComercial: z.string().optional(),
    horasEstimadas: z.number().min(0).optional(),
    prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
    estado: z.enum(['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada', 'planificado']).optional(),
    posicionamiento: z.enum(['inicio_padre', 'despues_ultima']).optional()
  })
})

// ✅ POST /api/cotizaciones/[id]/cronograma/tree/create
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { comercial: true }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para modificar el cronograma' }, { status: 403 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = createNodeSchema.parse(body)

    // Crear nodo según el tipo
    let newNode

    switch (validatedData.type) {
      case 'fase':
        // Determinar orden basado en posicionamiento
        let orden = 1
        if (validatedData.data.posicionamiento === 'despues_ultima') {
          const maxOrden = await prisma.cotizacionFase.findFirst({
            where: { cotizacionId: id },
            orderBy: { orden: 'desc' },
            select: { orden: true }
          })
          orden = (maxOrden?.orden || 0) + 1
        }

        newNode = await prisma.cotizacionFase.create({
          data: {
            cotizacionId: id,
            nombre: validatedData.data.nombre,
            descripcion: validatedData.data.descripcion,
            orden,
            estado: (validatedData.data.estado as any) || 'planificado'
          }
        })
        break

      case 'edt':
        // Determinar fase padre
        let fasePadreId = null
        if (validatedData.parentId) {
          const [parentType, parentRealId] = validatedData.parentId.split('-', 2)
          if (parentType === 'fase') {
            fasePadreId = parentRealId
          }
        }

        newNode = await prisma.cotizacionEdt.create({
          data: {
            cotizacionId: id,
            cotizacionFaseId: fasePadreId || undefined,
            nombre: validatedData.data.nombre,
            descripcion: validatedData.data.descripcion,
            horasEstimadas: validatedData.data.horasEstimadas,
            prioridad: validatedData.data.prioridad as any || 'media',
            estado: validatedData.data.estado as any || 'planificado'
          }
        })
        break

      case 'actividad':
        // Determinar EDT padre (actividades ahora van directamente bajo EDTs)
        let edtPadreId: string | null = null
        if (validatedData.parentId) {
          const [parentType, parentRealId] = validatedData.parentId.split('-', 2)
          if (parentType === 'edt') {
            edtPadreId = parentRealId
          }
        }

        if (!edtPadreId) {
          return NextResponse.json({
            error: 'Las actividades deben tener un EDT padre'
          }, { status: 400 })
        }

        newNode = await prisma.cotizacionActividad.create({
          data: {
            cotizacionEdtId: edtPadreId,
            nombre: validatedData.data.nombre,
            descripcion: validatedData.data.descripcion,
            fechaInicioComercial: validatedData.data.fechaInicioComercial ? new Date(validatedData.data.fechaInicioComercial) : undefined,
            fechaFinComercial: validatedData.data.fechaFinComercial ? new Date(validatedData.data.fechaFinComercial) : undefined,
            horasEstimadas: validatedData.data.horasEstimadas,
            prioridad: validatedData.data.prioridad as any || 'media',
            estado: validatedData.data.estado as any || 'pendiente'
          }
        } as any)
        break

      case 'tarea':
        // Determinar actividad padre (requerido para tareas)
        let actividadPadreId: string | null = null
        if (validatedData.parentId) {
          const [parentType, parentRealId] = validatedData.parentId.split('-', 2)
          if (parentType === 'actividad') {
            actividadPadreId = parentRealId
          }
        }

        if (!actividadPadreId) {
          return NextResponse.json({
            error: 'Las tareas deben tener una actividad padre'
          }, { status: 400 })
        }

        newNode = await prisma.cotizacionTarea.create({
          data: {
            cotizacionActividadId: actividadPadreId,
            nombre: validatedData.data.nombre,
            descripcion: validatedData.data.descripcion,
            fechaInicio: validatedData.data.fechaInicioComercial ? new Date(validatedData.data.fechaInicioComercial) : new Date(),
            fechaFin: validatedData.data.fechaFinComercial ? new Date(validatedData.data.fechaFinComercial) : new Date(),
            horasEstimadas: validatedData.data.horasEstimadas,
            prioridad: validatedData.data.prioridad as any || 'media',
            estado: validatedData.data.estado as any || 'pendiente'
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Tipo de nodo no soportado' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: newNode,
      message: 'Nodo creado exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error creando nodo:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}