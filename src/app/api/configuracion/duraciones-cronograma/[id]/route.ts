/**
 * API: Gestión Individual de Plantillas de Duración
 *
 * PUT /api/configuracion/duraciones-cronograma/[id] - Actualizar plantilla
 * DELETE /api/configuracion/duraciones-cronograma/[id] - Desactivar plantilla
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación para actualizar plantillas
const updatePlantillaSchema = z.object({
  duracionDias: z.number().min(0.1, 'Duración debe ser mayor a 0').optional(),
  horasPorDia: z.number().min(1).max(24).optional(),
  bufferPorcentaje: z.number().min(0).max(100).optional(),
  activo: z.boolean().optional()
})

// PUT /api/configuracion/duraciones-cronograma/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos de administrador
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar configuraciones' }, { status: 403 })
    }

    // Verificar que la plantilla existe
    const plantillaExistente = await (prisma as any).plantillaDuracionCronograma.findUnique({
      where: { id }
    })

    if (!plantillaExistente) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = updatePlantillaSchema.parse(body)

    // Si se está activando/desactivando, verificar conflictos
    if (validatedData.activo !== undefined) {
      if (validatedData.activo === false) {
        // Desactivar - permitido
      } else {
        // Activar - verificar que no haya otra activa con misma combinación
        const conflicto = await (prisma as any).plantillaDuracionCronograma.findFirst({
          where: {
            nivel: plantillaExistente.nivel,
            activo: true,
            id: { not: id } // Excluir la actual
          }
        })

        if (conflicto) {
          return NextResponse.json({
            error: `Ya existe una plantilla activa para ${plantillaExistente.nivel}`
          }, { status: 400 })
        }
      }
    }

    // Actualizar plantilla
    const plantillaActualizada = await (prisma as any).plantillaDuracionCronograma.update({
      where: { id },
      data: validatedData
    })

    return NextResponse.json({
      success: true,
      data: plantillaActualizada,
      message: 'Plantilla de duración actualizada exitosamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error al actualizar plantilla de duración:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// DELETE /api/configuracion/duraciones-cronograma/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos de administrador
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para eliminar configuraciones' }, { status: 403 })
    }

    // Verificar que la plantilla existe
    const plantillaExistente = await (prisma as any).plantillaDuracionCronograma.findUnique({
      where: { id }
    })

    if (!plantillaExistente) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Desactivar plantilla (soft delete)
    const plantillaDesactivada = await (prisma as any).plantillaDuracionCronograma.update({
      where: { id },
      data: { activo: false }
    })

    return NextResponse.json({
      success: true,
      data: plantillaDesactivada,
      message: 'Plantilla de duración desactivada exitosamente'
    })

  } catch (error) {
    console.error('Error al desactivar plantilla de duración:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}