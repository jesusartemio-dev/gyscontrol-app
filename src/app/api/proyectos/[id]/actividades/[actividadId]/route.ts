/**
 * API Routes for ProyectoActividad individual - Cronograma de 6 Niveles
 * Gestión de actividad específica
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/proyectos/[proyectoId]/actividades/[actividadId] - Obtener actividad específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actividadId: string }> }
) {
  try {
    const { id: proyectoId, actividadId } = await params;

    const actividad = await prisma.proyectoActividad.findFirst({
      where: {
        id: actividadId,
        proyectoEdt: {
          proyectoId
        }
      },
      include: {
        proyectoEdt: {
          select: {
            id: true,
            nombre: true,
            edt: {
              select: { nombre: true }
            }
          }
        },
        proyectoCronograma: {
          select: {
            id: true,
            tipo: true,
            nombre: true
          }
        },
        proyectoTarea: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: { proyectoTarea: true }
        }
      }
    });

    if (!actividad) {
      return NextResponse.json(
        {
          success: false,
          error: 'Actividad no encontrada'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: actividad
    });

  } catch (error) {
    logger.error('❌ Error obteniendo actividad:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

// PUT /api/proyectos/[proyectoId]/actividades/[actividadId] - Actualizar actividad
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actividadId: string }> }
) {
  try {
    const { id: proyectoId, actividadId } = await params;
    const body = await request.json();

    const {
      nombre,
      descripcion,
      fechaInicioPlan,
      fechaFinPlan,
      horasPlan,
      prioridad,
      estado
    } = body;

    // Verificar que la actividad existe y pertenece al proyecto
    const actividadExistente = await prisma.proyectoActividad.findFirst({
      where: {
        id: actividadId,
        proyectoEdt: {
          proyectoId
        }
      },
      include: {
        proyectoEdt: true
      }
    });

    if (!actividadExistente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Actividad no encontrada'
        },
        { status: 404 }
      );
    }

    // Validar fechas dentro del rango de la zona si se actualizan
    if (fechaInicioPlan && actividadExistente.proyectoEdt.fechaInicioPlan &&
        new Date(fechaInicioPlan) < actividadExistente.proyectoEdt.fechaInicioPlan) {
      return NextResponse.json(
        {
          success: false,
          error: 'La fecha de inicio debe estar dentro del rango de la zona'
        },
        { status: 400 }
      );
    }

    if (fechaFinPlan && actividadExistente.proyectoEdt.fechaFinPlan &&
        new Date(fechaFinPlan) > actividadExistente.proyectoEdt.fechaFinPlan) {
      return NextResponse.json(
        {
          success: false,
          error: 'La fecha de fin debe estar dentro del rango de la zona'
        },
        { status: 400 }
      );
    }

    // Actualizar actividad
    const actividadActualizada = await prisma.proyectoActividad.update({
      where: { id: actividadId },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(fechaInicioPlan !== undefined && {
          fechaInicioPlan: new Date(fechaInicioPlan)
        }),
        ...(fechaFinPlan !== undefined && {
          fechaFinPlan: new Date(fechaFinPlan)
        }),
        ...(horasPlan !== undefined && { horasPlan: parseFloat(horasPlan) }),
        ...(prioridad !== undefined && { prioridad }),
        ...(estado !== undefined && { estado })
      },
      include: {
        proyectoEdt: {
          select: {
            id: true,
            nombre: true
          }
        },
        proyectoCronograma: {
          select: {
            id: true,
            tipo: true,
            nombre: true
          }
        }
      }
    });

    logger.info(`✅ Actividad actualizada: ${actividadId}`);

    return NextResponse.json({
      success: true,
      data: actividadActualizada
    });

  } catch (error) {
    logger.error('❌ Error actualizando actividad:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/proyectos/[proyectoId]/actividades/[actividadId] - Eliminar actividad
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actividadId: string }> }
) {
  try {
    const { id: proyectoId, actividadId } = await params;

    // Verificar que la actividad existe y pertenece al proyecto
    const actividad = await prisma.proyectoActividad.findFirst({
      where: {
        id: actividadId,
        proyectoEdt: {
          proyectoId
        }
      },
      include: {
        _count: {
          select: { proyectoTarea: true }
        }
      }
    });

    if (!actividad) {
      return NextResponse.json(
        {
          success: false,
          error: 'Actividad no encontrada'
        },
        { status: 404 }
      );
    }

    // Verificar que no tenga tareas activas
    if (actividad._count.proyectoTarea > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar una actividad que tiene tareas asociadas'
        },
        { status: 409 }
      );
    }

    // Eliminar actividad
    await prisma.proyectoActividad.delete({
      where: { id: actividadId }
    });

    logger.info(`✅ Actividad eliminada: ${actividadId}`);

    return NextResponse.json({
      success: true,
      message: 'Actividad eliminada correctamente'
    });

  } catch (error) {
    logger.error('❌ Error eliminando actividad:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}