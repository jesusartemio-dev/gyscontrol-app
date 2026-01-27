/**
 * API Routes for ProyectoDependenciaTarea individual - Cronograma de 6 Niveles
 * Gestión de dependencia específica
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/proyectos/[proyectoId]/dependencias/[dependenciaId] - Obtener dependencia específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: proyectoId, dependenciaId } = await params;

    const dependencia = await prisma.proyectoDependenciasTarea.findFirst({
      where: {
        id: dependenciaId,
        tareaOrigen: {
          proyectoEdt: {
            proyectoId
          }
        }
      },
      include: {
        tareaOrigen: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            proyectoEdt: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        tareaDependiente: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            proyectoEdt: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!dependencia) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dependencia no encontrada'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dependencia
    });

  } catch (error) {
    logger.error('❌ Error obteniendo dependencia:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

// PUT /api/proyectos/[proyectoId]/dependencias/[dependenciaId] - Actualizar dependencia
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: proyectoId, dependenciaId } = await params;
    const body = await request.json();

    const { tipo } = body;

    // Verificar que la dependencia existe y pertenece al proyecto
    const dependenciaExistente = await prisma.proyectoDependenciasTarea.findFirst({
      where: {
        id: dependenciaId,
        tareaOrigen: {
          proyectoEdt: {
            proyectoId
          }
        }
      }
    });

    if (!dependenciaExistente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dependencia no encontrada'
        },
        { status: 404 }
      );
    }

    // Si se cambia el tipo, verificar que no cree un ciclo
    if (tipo && tipo !== dependenciaExistente.tipo) {
      const tieneCiclo = await verificarCiclo(
        dependenciaExistente.tareaDependienteId,
        dependenciaExistente.tareaOrigenId
      );

      if (tieneCiclo) {
        return NextResponse.json(
          {
            success: false,
            error: 'Este cambio crearía un ciclo en las dependencias'
          },
          { status: 400 }
        );
      }
    }

    // Actualizar dependencia
    const dependenciaActualizada = await prisma.proyectoDependenciasTarea.update({
      where: { id: dependenciaId },
      data: {
        ...(tipo !== undefined && { tipo })
      },
      include: {
        tareaOrigen: {
          select: {
            id: true,
            nombre: true
          }
        },
        tareaDependiente: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    logger.info(`✅ Dependencia actualizada: ${dependenciaId}`);

    return NextResponse.json({
      success: true,
      data: dependenciaActualizada
    });

  } catch (error) {
    logger.error('❌ Error actualizando dependencia:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/proyectos/[proyectoId]/dependencias/[dependenciaId] - Eliminar dependencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: proyectoId, dependenciaId } = await params;

    // Verificar que la dependencia existe y pertenece al proyecto
    const dependencia = await prisma.proyectoDependenciasTarea.findFirst({
      where: {
        id: dependenciaId,
        tareaOrigen: {
          proyectoEdt: {
            proyectoId
          }
        }
      }
    });

    if (!dependencia) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dependencia no encontrada'
        },
        { status: 404 }
      );
    }

    // Eliminar dependencia
    await prisma.proyectoDependenciasTarea.delete({
      where: { id: dependenciaId }
    });

    logger.info(`✅ Dependencia eliminada: ${dependenciaId}`);

    return NextResponse.json({
      success: true,
      message: 'Dependencia eliminada correctamente'
    });

  } catch (error) {
    logger.error('❌ Error eliminando dependencia:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

// Función auxiliar para verificar ciclos en dependencias
async function verificarCiclo(tareaActualId: string, tareaBuscadaId: string): Promise<boolean> {
  // Obtener todas las dependencias donde la tarea actual es origen
  const dependencias = await prisma.proyectoDependenciasTarea.findMany({
    where: { tareaOrigenId: tareaActualId },
    select: { tareaDependienteId: true }
  });

  // Verificar recursivamente
  for (const dep of dependencias) {
    if (dep.tareaDependienteId === tareaBuscadaId) {
      return true; // Encontramos un ciclo
    }

    // Verificar recursivamente en las dependencias de esta tarea
    const tieneCiclo = await verificarCiclo(dep.tareaDependienteId, tareaBuscadaId);
    if (tieneCiclo) {
      return true;
    }
  }

  return false;
}