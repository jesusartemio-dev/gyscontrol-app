// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/tareas
// 🔧 Descripción: API para gestionar tareas de una cotización (actualizado para 6 niveles)
// ✅ GET: Listar tareas de una cotización con filtros
// ✅ POST: Crear nueva tarea asociada a una actividad
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validación para crear tarea
const createTareaSchema = z.object({
  cotizacionActividadId: z.string().min(1, 'La actividad es requerida'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  horasEstimadas: z.number().min(0).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada']).default('pendiente'),
  responsableId: z.string().optional(),
  orden: z.number().min(0).default(0),
  cotizacionServicioItemId: z.string().optional() // Nueva relación opcional
})

// ✅ GET /api/cotizaciones/[id]/tareas - Listar tareas de una cotización con filtros
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        comercial: true
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para ver las tareas' }, { status: 403 })
    }

    // Construir filtros
    const where: any = {
      cotizacionActividad: {
        cotizacionZona: {
          cotizacionEdt: {
            cotizacionId: id
          }
        }
      }
    }

    // Filtros opcionales
    const estado = searchParams.get('estado')
    if (estado) {
      where.estado = estado
    }

    const responsableId = searchParams.get('responsableId')
    if (responsableId) {
      where.responsableId = responsableId
    }

    const actividadId = searchParams.get('actividadId')
    if (actividadId) {
      where.cotizacionActividadId = actividadId
    }

    const prioridad = searchParams.get('prioridad')
    if (prioridad) {
      where.prioridad = prioridad
    }

    // Obtener tareas con estadísticas
    const tareas = await prisma.cotizacionTarea.findMany({
      where,
      include: {
        cotizacionActividad: {
          include: {
            cotizacionZona: {
              include: {
                cotizacionEdt: {
                  include: {
                    cotizacionServicio: true
                  }
                }
              }
            }
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cotizacionServicioItem: true,
        dependencia: {
          select: {
            id: true,
            nombre: true
          }
        },
        tareasDependientes: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        }
      },
      orderBy: [
        { cotizacionActividad: { cotizacionZona: { cotizacionEdt: { createdAt: 'asc' } } } },
        { orden: 'asc' },
        { fechaInicio: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: tareas,
      filtros: {
        estado,
        responsableId,
        actividadId,
        prioridad
      }
    })

  } catch (error) {
    console.error('❌ Error al obtener tareas:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ POST /api/cotizaciones/[id]/tareas - Crear nueva tarea
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

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        comercial: true
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para crear tareas' }, { status: 403 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = createTareaSchema.parse(body)

    // Verificar que la actividad existe y pertenece a la cotización
    const actividad = await prisma.cotizacionActividad.findFirst({
      where: {
        id: validatedData.cotizacionActividadId,
        cotizacionZona: {
          cotizacionEdt: {
            cotizacionId: id
          }
        }
      }
    })

    if (!actividad) {
      return NextResponse.json({
        error: 'Actividad no encontrada o no pertenece a esta cotización'
      }, { status: 400 })
    }

    // ✅ Validación jerárquica: Verificar que no se creen tareas duplicadas en la misma actividad
    const tareaDuplicada = await prisma.cotizacionTarea.findFirst({
      where: {
        cotizacionActividadId: validatedData.cotizacionActividadId,
        nombre: validatedData.nombre
      }
    })

    if (tareaDuplicada) {
      return NextResponse.json({
        error: 'Ya existe una tarea con este nombre en la actividad'
      }, { status: 400 })
    }

    // Verificar fechas válidas
    const fechaInicio = new Date(validatedData.fechaInicio)
    const fechaFin = new Date(validatedData.fechaFin)

    if (fechaFin <= fechaInicio) {
      return NextResponse.json({
        error: 'La fecha de fin debe ser posterior a la fecha de inicio'
      }, { status: 400 })
    }

    // Verificar unicidad del nombre en la actividad
    const tareaExistente = await prisma.cotizacionTarea.findFirst({
      where: {
        cotizacionActividadId: validatedData.cotizacionActividadId,
        nombre: validatedData.nombre
      }
    })

    if (tareaExistente) {
      return NextResponse.json({
        error: 'Ya existe una tarea con este nombre en la actividad'
      }, { status: 400 })
    }

    // Verificar servicio item si se especifica
    if (validatedData.cotizacionServicioItemId) {
      const servicioItem = await prisma.cotizacionServicioItem.findFirst({
        where: {
          id: validatedData.cotizacionServicioItemId,
          cotizacionServicio: {
            cotizacionId: id
          }
        }
      })

      if (!servicioItem) {
        return NextResponse.json({
          error: 'Ítem de servicio no encontrado o no pertenece a esta cotización'
        }, { status: 400 })
      }
    }

    // Crear la tarea
    const nuevaTarea = await prisma.cotizacionTarea.create({
      data: {
        cotizacionActividadId: validatedData.cotizacionActividadId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        horasEstimadas: validatedData.horasEstimadas,
        prioridad: validatedData.prioridad,
        estado: validatedData.estado,
        responsableId: validatedData.responsableId,
        orden: validatedData.orden,
        cotizacionServicioItemId: validatedData.cotizacionServicioItemId
      },
      include: {
        cotizacionActividad: {
          include: {
            cotizacionZona: {
              include: {
                cotizacionEdt: {
                  include: {
                    cotizacionServicio: true
                  }
                }
              }
            }
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cotizacionServicioItem: true,
        dependencia: {
          select: {
            id: true,
            nombre: true
          }
        },
        tareasDependientes: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: nuevaTarea,
      message: 'Tarea creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error al crear tarea:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}