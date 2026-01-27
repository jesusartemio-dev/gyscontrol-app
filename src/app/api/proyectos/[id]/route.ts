// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Descripción: API Route para gestión de proyecto individual
// 🧠 Uso: GET, PUT, DELETE de proyecto específico
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ProyectoUpdatePayload } from '@/types/payloads';

// ✅ GET - Obtener proyecto específico con métricas EDT
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
    const incluirMetricas = searchParams.get('metricas') === 'true';

    // 🔍 First check if project exists and get basic info for permissions
    const proyectoBasico = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        nombre: true,
        comercialId: true,
        gestorId: true,
        estado: true
      }
    });

    if (!proyectoBasico) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // 🔐 Verificar permisos de acceso
    const rolesConAccesoTotal = ['admin', 'gerente'];
    const esComercialDelProyecto = proyectoBasico.comercialId === session.user.id;
    const esGestorDelProyecto = proyectoBasico.gestorId === session.user.id;

    // Check if user participates in any EDTs of this project
    let participaEnEdts = false;
    if (!rolesConAccesoTotal.includes(session.user.role) && !esComercialDelProyecto && !esGestorDelProyecto) {
      const edtsUsuario = await prisma.proyectoEdt.findFirst({
        where: {
          proyectoId: proyectoId,
          responsableId: session.user.id
        },
        select: { id: true }
      });
      participaEnEdts = !!edtsUsuario;
    }

    if (!rolesConAccesoTotal.includes(session.user.role) &&
        !esComercialDelProyecto && !esGestorDelProyecto && !participaEnEdts) {
      return NextResponse.json(
        { error: 'Sin permisos para acceder a este proyecto' },
        { status: 403 }
      );
    }

    // 🔍 Now get full project data
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        cliente: {
          select: { id: true, codigo: true, nombre: true, ruc: true }
        },
        comercial: {
          select: { id: true, name: true, email: true }
        },
        gestor: {
          select: { id: true, name: true, email: true }
        },
        listaEquipo: {
          select: { id: true, nombre: true, estado: true, createdAt: true }
        },
        cotizacion: {
          select: { id: true, codigo: true, nombre: true, estado: true }
        },
        // 📊 Incluir métricas EDT si se solicita
        ...(incluirMetricas && {
          proyectoEdt: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              porcentajeAvance: true,
              horasPlan: true,
              horasReales: true,
              fechaInicioPlan: true,
              fechaFinPlan: true,
              edt: {
                select: { id: true, nombre: true }
              }
            }
          }
        }),
        // 📊 Incluir información básica del cronograma para la card
        proyectoCronograma: {
          select: {
            id: true,
            tipo: true,
            nombre: true,
            esBaseline: true,
            proyectoFase: {
              select: {
                id: true,
                nombre: true,
                estado: true
              }
            },
            proyectoEdt: {
              select: {
                id: true,
                nombre: true,
                estado: true,
                porcentajeAvance: true
              }
            }
          }
        }
      }
    });

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // 📊 Calcular métricas EDT si se incluyen
    let proyectoConMetricas: any = proyecto;
    if (incluirMetricas && (proyecto as any).proyectoEdt) {
      const edts = (proyecto as any).proyectoEdt;
      const metricas = {
        totalEdts: edts.length,
        edtsCompletados: edts.filter((e: any) => e.estado === 'completado').length,
        promedioAvance: edts.length > 0 ?
          edts.reduce((sum: number, e: any) => sum + e.porcentajeAvance, 0) / edts.length : 0,
        horasEstimadasTotal: edts.reduce((sum: number, e: any) => sum + Number(e.horasPlan || 0), 0),
        horasRealesTotal: edts.reduce((sum: number, e: any) => sum + Number(e.horasReales || 0), 0)
      };

      const { proyectoEdt, ...proyectoSinEdts } = proyecto as any;
      proyectoConMetricas = {
        ...proyectoSinEdts,
        metricas
      };
    }

    // Mapear nombres de relaciones para compatibilidad frontend
    const proyectoFormateado = {
      ...proyectoConMetricas,
      listaEquipos: proyectoConMetricas.listaEquipo,
      cronogramas: proyectoConMetricas.proyectoCronograma
    };

    logger.info(`📋 Proyecto obtenido: ${proyecto.nombre} (${proyectoId}) - Usuario: ${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: proyectoFormateado
    });

  } catch (error) {
    logger.error('❌ Error al obtener proyecto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ PUT - Actualizar proyecto específico
export async function PUT(
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
    const validatedData: ProyectoUpdatePayload = body;

    // 🔍 Verificar que el proyecto existe y el usuario tiene permisos
    const proyectoExistente = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        comercialId: true,
        gestorId: true,
        estado: true,
        nombre: true
      }
    });

    if (!proyectoExistente) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // 🔐 Verificar permisos de edición
    const rolesConAccesoTotal = ['admin', 'gerente'];
    const esComercialDelProyecto = proyectoExistente.comercialId === session.user.id;
    const esGestorDelProyecto = proyectoExistente.gestorId === session.user.id;

    if (!rolesConAccesoTotal.includes(session.user.role) &&
        !esComercialDelProyecto && !esGestorDelProyecto) {
      return NextResponse.json(
        { error: 'Sin permisos para editar este proyecto' },
        { status: 403 }
      );
    }

    // 🔍 Validaciones de negocio para fechas
    if (validatedData.fechaFin && validatedData.fechaInicio &&
        new Date(validatedData.fechaFin) <= new Date(validatedData.fechaInicio)) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      );
    }

    // 📝 Filtrar campos undefined y actualizar proyecto
    const dataToUpdate = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined)
    );

    const proyectoActualizado = await prisma.proyecto.update({
      where: { id: proyectoId },
      data: dataToUpdate,
      include: {
        comercial: {
          select: { id: true, name: true, email: true }
        },
        gestor: {
          select: { id: true, name: true, email: true }
        },
        cliente: {
          select: { id: true, codigo: true, nombre: true }
        }
      }
    });

    logger.info(`📝 Proyecto actualizado: ${proyectoActualizado.nombre} (${proyectoId}) - Usuario: ${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: proyectoActualizado,
      message: 'Proyecto actualizado exitosamente'
    });

  } catch (error) {
    logger.error('❌ Error al actualizar proyecto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Eliminar proyecto (solo admin/gerente)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔐 Solo admin y gerente pueden eliminar proyectos
    const rolesPermitidos = ['admin', 'gerente'];
    if (!rolesPermitidos.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para eliminar proyectos' },
        { status: 403 }
      );
    }

    const { id: proyectoId } = await params;

    // 🔍 Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true, estado: true }
    });

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // 🚫 No permitir eliminar proyectos cerrados
    if (proyecto.estado === 'cerrado') {
      return NextResponse.json(
        { error: 'No se pueden eliminar proyectos cerrados' },
        { status: 400 }
      );
    }

    // 🗑️ Eliminar proyecto (las relaciones se eliminan en cascada por Prisma)
    await prisma.proyecto.delete({
      where: { id: proyectoId }
    });

    logger.info(`🗑️ Proyecto eliminado: ${proyecto.nombre} (${proyectoId}) - Usuario: ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Proyecto eliminado exitosamente'
    });

  } catch (error) {
    logger.error('❌ Error al eliminar proyecto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}