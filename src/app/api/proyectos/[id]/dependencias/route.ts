/**
 * API Routes for ProyectoDependenciaTarea - Cronograma de 6 Niveles
 * Gestión de dependencias entre tareas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/proyectos/[proyectoId]/dependencias - Listar dependencias de un proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: proyectoId } = await params;
    const { searchParams } = new URL(request.url);

    // Filtros opcionales
    const tareaId = searchParams.get('tareaId');
    const tipo = searchParams.get('tipo');

    const whereClause: any = {
      tareaOrigen: {
        proyectoEdt: {
          proyectoId
        }
      },
      ...(tareaId && {
        OR: [
          { tareaOrigenId: tareaId },
          { tareaDependienteId: tareaId }
        ]
      }),
      ...(tipo && { tipo })
    };

    const dependencias = await prisma.proyectoDependenciasTarea.findMany({
      where: whereClause,
      include: {
        tareaOrigen: {
          select: {
            id: true,
            nombre: true,
            estado: true,
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
            proyectoEdt: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    logger.info(`✅ Dependencias obtenidas para proyecto ${proyectoId}: ${dependencias.length}`);

    return NextResponse.json({
      success: true,
      data: dependencias
    });

  } catch (error) {
    logger.error('❌ Error obteniendo dependencias:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

// POST /api/proyectos/[proyectoId]/dependencias - Crear nueva dependencia
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: proyectoId } = await params;
    const body = await request.json();

    const {
      tareaOrigenId,
      tareaDependienteId,
      tipo
    } = body;

    // Validaciones básicas
    if (!tareaOrigenId || !tareaDependienteId) {
      return NextResponse.json(
        {
          success: false,
          error: 'tareaOrigenId y tareaDependienteId son requeridos'
        },
        { status: 400 }
      );
    }

    // Verificar que no sean la misma tarea
    if (tareaOrigenId === tareaDependienteId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Una tarea no puede depender de sí misma'
        },
        { status: 400 }
      );
    }

    // Verificar que ambas tareas existen y pertenecen al proyecto
    const tareaOrigen = await prisma.proyectoTarea.findFirst({
      where: {
        id: tareaOrigenId,
        proyectoEdt: {
          proyectoId
        }
      }
    });

    const tareaDependiente = await prisma.proyectoTarea.findFirst({
      where: {
        id: tareaDependienteId,
        proyectoEdt: {
          proyectoId
        }
      }
    });

    if (!tareaOrigen || !tareaDependiente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Una o ambas tareas no existen o no pertenecen al proyecto'
        },
        { status: 404 }
      );
    }

    // Verificar que no exista ya la dependencia
    const dependenciaExistente = await prisma.proyectoDependenciasTarea.findFirst({
      where: {
        tareaOrigenId,
        tareaDependienteId
      }
    });

    if (dependenciaExistente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe una dependencia entre estas tareas'
        },
        { status: 409 }
      );
    }

    // Verificar que no se cree un ciclo
    const tieneCiclo = await verificarCiclo(tareaDependienteId, tareaOrigenId);
    if (tieneCiclo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta dependencia crearía un ciclo en las dependencias'
        },
        { status: 400 }
      );
    }

    // Crear dependencia
    const nuevaDependencia = await prisma.proyectoDependenciasTarea.create({
      data: {
        id: crypto.randomUUID(),
        tareaOrigenId,
        tareaDependienteId,
        tipo: tipo || 'finish_to_start'
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

    logger.info(`✅ Dependencia creada: ${tareaOrigenId} -> ${tareaDependienteId}`);

    return NextResponse.json({
      success: true,
      data: nuevaDependencia
    }, { status: 201 });

  } catch (error) {
    logger.error('❌ Error creando dependencia:', error);
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