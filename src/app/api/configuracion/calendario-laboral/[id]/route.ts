// ===================================================
// 📅 API para Gestión Individual de Calendarios Laborales
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCalendarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  pais: z.string().optional(),
  empresa: z.string().optional(),
  activo: z.boolean().optional(),
  horasPorDia: z.number().min(1).max(24).optional(),
  diasLaborables: z.array(z.string()).optional(),
  horaInicioManana: z.string().optional(),
  horaFinManana: z.string().optional(),
  horaInicioTarde: z.string().optional(),
  horaFinTarde: z.string().optional()
})

// ✅ GET /api/configuracion/calendario-laboral/[id] - Obtener calendario específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const calendario = await prisma.calendarioLaboral.findUnique({
      where: { id },
      include: {
        diaCalendario: true,
        excepcionCalendario: true,
        configuracionCalendario: true,
      },
    })

    if (!calendario) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: calendario
    })

  } catch (error) {
    console.error('Error obteniendo calendario:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ PUT /api/configuracion/calendario-laboral/[id] - Actualizar calendario
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

    const body = await request.json()
    const validatedData = updateCalendarioSchema.parse(body)

    // Verificar permisos
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar calendarios' }, { status: 403 })
    }

    // Build update data dynamically from validated fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (validatedData.nombre !== undefined) updateData.nombre = validatedData.nombre
    if (validatedData.descripcion !== undefined) updateData.descripcion = validatedData.descripcion
    if (validatedData.pais !== undefined) updateData.pais = validatedData.pais
    if (validatedData.empresa !== undefined) updateData.empresa = validatedData.empresa
    if (validatedData.activo !== undefined) updateData.activo = validatedData.activo
    if (validatedData.horasPorDia !== undefined) updateData.horasPorDia = validatedData.horasPorDia
    if (validatedData.diasLaborables !== undefined) updateData.diasLaborables = validatedData.diasLaborables
    if (validatedData.horaInicioManana !== undefined) updateData.horaInicioManana = validatedData.horaInicioManana
    if (validatedData.horaFinManana !== undefined) updateData.horaFinManana = validatedData.horaFinManana
    if (validatedData.horaInicioTarde !== undefined) updateData.horaInicioTarde = validatedData.horaInicioTarde
    if (validatedData.horaFinTarde !== undefined) updateData.horaFinTarde = validatedData.horaFinTarde

    const calendario = await prisma.calendarioLaboral.update({
      where: { id },
      data: updateData,
      include: {
        diaCalendario: true,
        excepcionCalendario: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: calendario,
      message: 'Calendario actualizado exitosamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error actualizando calendario:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ DELETE /api/configuracion/calendario-laboral/[id] - Eliminar calendario
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

    // Verificar permisos
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para eliminar calendarios' }, { status: 403 })
    }

    // Verificar que no esté siendo usado
    const configCount = await prisma.configuracionCalendario.count({
      where: { calendarioLaboralId: id },
    })

    if (configCount > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar el calendario porque está siendo usado por empresas o proyectos'
      }, { status: 400 })
    }

    // Eliminar calendario (las relaciones se eliminan en cascada por onDelete: Cascade)
    await prisma.calendarioLaboral.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Calendario eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error eliminando calendario:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}