// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/fases/[faseId]/
// 🔧 Descripción: API para gestión individual de fases
//    Funciones: Obtener, actualizar y eliminar fase específica
//
// 🧠 Funcionalidades:
//    - GET: Obtener fase individual con EDTs
//    - PUT: Actualizar fase
//    - DELETE: Eliminar fase
//
// ✍️ Autor: Sistema GYS - Módulo Cronograma
// 📅 Creado: 2025-09-21
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Schema de validación para actualizar fase
const actualizarFaseSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  orden: z.number().int().min(0).optional(),
  fechaInicioPlan: z.string().datetime().optional(),
  fechaFinPlan: z.string().datetime().optional(),
  estado: z.enum(['planificado', 'en_progreso', 'completado', 'pausado', 'cancelado']).optional()
})

// ✅ GET /api/proyectos/[id]/fases/[faseId] - Obtener fase individual
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId, faseId } = await params

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener la fase con EDTs relacionados
    const fase = await prisma.proyectoFase.findFirst({
      where: {
        id: faseId,
        proyectoId
      },
      include: {
        edts: {
          include: {
            categoriaServicio: {
              select: { id: true, nombre: true }
            },
            responsable: {
              select: { id: true, name: true, email: true }
            },
            registrosHoras: {
              take: 5,
              orderBy: { fechaTrabajo: 'desc' },
              select: {
                id: true,
                horasTrabajadas: true,
                fechaTrabajo: true,
                usuario: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { fechaFinPlan: 'asc' }
        }
      }
    })

    if (!fase) {
      return NextResponse.json(
        { error: 'Fase no encontrada' },
        { status: 404 }
      )
    }

    // Calcular métricas
    const totalEdts = fase.edts.length
    const edtsCompletados = fase.edts.filter(edt => edt.estado === 'completado').length
    const progresoFase = totalEdts > 0 ? Math.round((edtsCompletados / totalEdts) * 100) : 0
    const horasPlanTotal = fase.edts.reduce((sum, edt) => sum + Number(edt.horasPlan || 0), 0)
    const horasRealesTotal = fase.edts.reduce((sum, edt) => sum + Number(edt.horasReales || 0), 0)

    const faseFormateada = {
      ...fase,
      fechaInicioPlan: fase.fechaInicioPlan?.toISOString(),
      fechaFinPlan: fase.fechaFinPlan?.toISOString(),
      fechaInicioReal: fase.fechaInicioReal?.toISOString(),
      fechaFinReal: fase.fechaFinReal?.toISOString(),
      createdAt: fase.createdAt.toISOString(),
      updatedAt: fase.updatedAt.toISOString(),
      metricas: {
        totalEdts,
        edtsCompletados,
        progresoFase,
        horasPlanTotal,
        horasRealesTotal
      }
    }

    return NextResponse.json({
      success: true,
      data: faseFormateada
    })

  } catch (error) {
    console.error('Error al obtener fase:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ PUT /api/proyectos/[id]/fases/[faseId] - Actualizar fase
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId, faseId } = await params

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        nombre: true,
        fechaInicio: true,
        fechaFin: true
      }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que la fase existe
    const faseExistente = await prisma.proyectoFase.findFirst({
      where: {
        id: faseId,
        proyectoId
      }
    })

    if (!faseExistente) {
      return NextResponse.json(
        { error: 'Fase no encontrada' },
        { status: 404 }
      )
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = actualizarFaseSchema.parse(body)

    // Validar fechas si se están actualizando
    if (validatedData.fechaInicioPlan || validatedData.fechaFinPlan) {
      const fechaInicioPlan = validatedData.fechaInicioPlan
        ? new Date(validatedData.fechaInicioPlan)
        : faseExistente.fechaInicioPlan
      const fechaFinPlan = validatedData.fechaFinPlan
        ? new Date(validatedData.fechaFinPlan)
        : faseExistente.fechaFinPlan

      if (fechaInicioPlan && fechaFinPlan && fechaInicioPlan >= fechaFinPlan) {
        return NextResponse.json(
          { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
          { status: 400 }
        )
      }

      if (fechaInicioPlan && fechaInicioPlan < proyecto.fechaInicio) {
        return NextResponse.json(
          { error: 'La fecha de inicio no puede ser anterior al inicio del proyecto' },
          { status: 400 }
        )
      }

      if (fechaFinPlan && proyecto.fechaFin && fechaFinPlan > proyecto.fechaFin) {
        return NextResponse.json(
          { error: 'La fecha de fin no puede ser posterior al fin del proyecto' },
          { status: 400 }
        )
      }
    }

    // Verificar unicidad del nombre si se está cambiando
    if (validatedData.nombre && validatedData.nombre !== faseExistente.nombre) {
      const faseConMismoNombre = await prisma.proyectoFase.findFirst({
        where: {
          proyectoId,
          nombre: validatedData.nombre,
          id: { not: faseId }
        }
      })

      if (faseConMismoNombre) {
        return NextResponse.json(
          { error: 'Ya existe una fase con este nombre en el proyecto' },
          { status: 400 }
        )
      }
    }

    // Preparar datos para actualizar
    const updateData: any = { ...validatedData }
    if (validatedData.fechaInicioPlan) {
      updateData.fechaInicioPlan = new Date(validatedData.fechaInicioPlan)
    }
    if (validatedData.fechaFinPlan) {
      updateData.fechaFinPlan = new Date(validatedData.fechaFinPlan)
    }

    // Actualizar la fase
    const faseActualizada = await prisma.proyectoFase.update({
      where: { id: faseId },
      data: updateData,
      include: {
        edts: {
          include: {
            categoriaServicio: {
              select: { id: true, nombre: true }
            },
            responsable: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    // Calcular métricas actualizadas
    const totalEdts = faseActualizada.edts.length
    const edtsCompletados = faseActualizada.edts.filter(edt => edt.estado === 'completado').length
    const progresoFase = totalEdts > 0 ? Math.round((edtsCompletados / totalEdts) * 100) : 0
    const horasPlanTotal = faseActualizada.edts.reduce((sum, edt) => sum + Number(edt.horasPlan || 0), 0)
    const horasRealesTotal = faseActualizada.edts.reduce((sum, edt) => sum + Number(edt.horasReales || 0), 0)

    const faseFormateada = {
      ...faseActualizada,
      fechaInicioPlan: faseActualizada.fechaInicioPlan?.toISOString(),
      fechaFinPlan: faseActualizada.fechaFinPlan?.toISOString(),
      fechaInicioReal: faseActualizada.fechaInicioReal?.toISOString(),
      fechaFinReal: faseActualizada.fechaFinReal?.toISOString(),
      createdAt: faseActualizada.createdAt.toISOString(),
      updatedAt: faseActualizada.updatedAt.toISOString(),
      metricas: {
        totalEdts,
        edtsCompletados,
        progresoFase,
        horasPlanTotal,
        horasRealesTotal
      }
    }

    return NextResponse.json({
      success: true,
      data: faseFormateada,
      message: 'Fase actualizada exitosamente'
    })

  } catch (error) {
    console.error('Error al actualizar fase:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ DELETE /api/proyectos/[id]/fases/[faseId] - Eliminar fase
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId, faseId } = await params

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que la fase existe y obtener información
    const faseExistente = await prisma.proyectoFase.findFirst({
      where: {
        id: faseId,
        proyectoId
      },
      include: {
        edts: {
          select: { id: true }
        }
      }
    })

    if (!faseExistente) {
      return NextResponse.json(
        { error: 'Fase no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que no tenga EDTs asignados
    if (faseExistente.edts.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar una fase que tiene EDTs asignados',
          details: `La fase tiene ${faseExistente.edts.length} EDT(s) asignado(s)`
        },
        { status: 400 }
      )
    }

    // Eliminar la fase
    await prisma.proyectoFase.delete({
      where: { id: faseId }
    })

    return NextResponse.json({
      success: true,
      message: 'Fase eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error al eliminar fase:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}