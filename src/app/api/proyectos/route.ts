// ===================================================
// 📁 Archivo: route.ts
// 📌 Descripción: API Route para gestión de proyectos con soporte EDT
// 🧠 Uso: CRUD de proyectos integrado con sistema de cronograma
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ProyectoPayload, ProyectoUpdatePayload } from '@/types/payloads';
import { ProyectoEstado } from '@/types/modelos';
import { validateProyectoData } from '@/lib/validators/proyecto';

// ✅ GET - Obtener todos los proyectos con métricas EDT
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const estado = searchParams.get('estado') as ProyectoEstado | null;
    const comercialId = searchParams.get('comercialId');
    const gestorId = searchParams.get('gestorId');
    const incluirMetricas = searchParams.get('metricas') === 'true';
    const skip = (page - 1) * limit;

    // 🔍 Construir filtros
    const where: any = {};
    if (estado) where.estado = estado;
    if (comercialId) where.comercialId = comercialId;
    if (gestorId) where.gestorId = gestorId;

    // 🔐 Filtrar por rol del usuario
    const rolesConAccesoTotal = ['admin', 'gerente'];
    if (!rolesConAccesoTotal.includes(session.user.role)) {
      // Comerciales solo ven sus proyectos
      if (session.user.role === 'comercial') {
        where.comercialId = session.user.id;
      }
      // Gestores solo ven proyectos asignados
      else if (session.user.role === 'gestor') {
        where.gestorId = session.user.id;
      }
      // Otros roles ven proyectos donde participan
      else {
        where.OR = [
          { comercialId: session.user.id },
          { gestorId: session.user.id },
          { proyectoEdts: { some: { responsableId: session.user.id } } }
        ];
      }
    }

    const [proyectos, total] = await Promise.all([
      prisma.proyecto.findMany({
        where,
        skip,
        take: limit,
        include: {
          comercial: {
            select: { id: true, name: true, email: true }
          },
          gestor: {
            select: { id: true, name: true, email: true }
          },
          listaEquipos: {
            select: { id: true, nombre: true, estado: true }
          },
          // 📊 Incluir métricas EDT si se solicita
          ...(incluirMetricas && {
            proyectoEdts: {
              select: {
                id: true,
                estado: true,
                porcentajeAvance: true,
                horasPlan: true,
                horasReales: true
              }
            }
          })
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.proyecto.count({ where })
    ]);

    // 📊 Calcular métricas EDT si se incluyen
    const proyectosConMetricas = incluirMetricas ?
      proyectos.map(proyecto => {
        const edts = (proyecto as any).proyectoEdts || [];
        const metricas = {
          totalEdts: edts.length,
          edtsCompletados: edts.filter((e: any) => e.estado === 'completado').length,
          promedioAvance: edts.length > 0 ?
            edts.reduce((sum: number, e: any) => sum + e.porcentajeAvance, 0) / edts.length : 0,
          horasEstimadasTotal: edts.reduce((sum: number, e: any) => sum + Number(e.horasPlan || 0), 0),
          horasRealesTotal: edts.reduce((sum: number, e: any) => sum + Number(e.horasReales || 0), 0)
        };

        const { proyectoEdts, ...proyectoSinEdts } = proyecto as any;
        return {
          ...proyectoSinEdts,
          metricas
        };
      }) : proyectos;

    logger.info(`📋 Proyectos obtenidos: ${proyectos.length}/${total} - Usuario: ${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: proyectosConMetricas,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('❌ Error al obtener proyectos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ POST - Crear nuevo proyecto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔐 Verificar permisos para crear proyectos
    const rolesPermitidos = ['admin', 'gerente', 'comercial'];
    if (!rolesPermitidos.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para crear proyectos' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 🔍 Validar payload con Zod
    let validatedData: ProyectoPayload;
    try {
      validatedData = validateProyectoData(body) as ProyectoPayload;
    } catch (error) {
      logger.error('❌ Error de validación en POST /api/proyectos:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Error de validación' },
        { status: 400 }
      );
    }

    // 🔍 Validaciones de negocio adicionales (ya cubiertas por Zod)
    // Las validaciones de fechas y montos ya están en el schema Zod

    // Verificar que comercial y gestor existen
    const [comercial, gestor] = await Promise.all([
      validatedData.comercialId ?
        prisma.user.findUnique({
          where: { id: validatedData.comercialId },
          select: { id: true, role: true }
        }) : null,
      validatedData.gestorId ?
        prisma.user.findUnique({
          where: { id: validatedData.gestorId },
          select: { id: true, role: true }
        }) : null
    ]);

    if (validatedData.comercialId && !comercial) {
      return NextResponse.json(
        { error: 'Comercial no encontrado' },
        { status: 400 }
      );
    }

    if (validatedData.gestorId && !gestor) {
      return NextResponse.json(
        { error: 'Gestor no encontrado' },
        { status: 400 }
      );
    }

    // Verificar roles apropiados
    if (comercial && !['comercial', 'gerente', 'admin'].includes(comercial.role)) {
      return NextResponse.json(
        { error: 'El usuario asignado como comercial no tiene el rol apropiado' },
        { status: 400 }
      );
    }

    if (gestor && !['gestor', 'gerente', 'admin'].includes(gestor.role)) {
      return NextResponse.json(
        { error: 'El usuario asignado como gestor no tiene el rol apropiado' },
        { status: 400 }
      );
    }

    // 🔍 Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: validatedData.clienteId },
      select: { id: true, codigo: true, numeroSecuencia: true }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // 📝 Crear proyecto en transacción
    const nuevoProyecto = await prisma.$transaction(async (tx) => {
      // 🔍 Obtener el cliente actual
      const clienteActual = await tx.cliente.findUnique({
        where: { id: validatedData.clienteId },
        select: { codigo: true }
      });

      if (!clienteActual) {
        throw new Error('Cliente no encontrado');
      }

      // 🏷️ Generar código del proyecto: encontrar el siguiente número disponible
      // Buscar todos los códigos de proyectos existentes para este cliente
      const proyectosExistentes = await tx.proyecto.findMany({
        where: { clienteId: validatedData.clienteId },
        select: { codigo: true }
      });

      // Extraer números de los códigos existentes (ej: "MOL01" -> 1, "MOL02" -> 2)
      const codigosExistentes = proyectosExistentes
        .map(p => p.codigo)
        .filter(codigo => codigo.startsWith(clienteActual.codigo))
        .map(codigo => {
          const numeroStr = codigo.slice(clienteActual.codigo.length);
          const numero = parseInt(numeroStr, 10);
          return isNaN(numero) ? null : numero;
        })
        .filter(n => n !== null)
        .sort((a, b) => a - b);

      // Encontrar el primer número disponible empezando desde 1
      let numeroSecuencia = 1;
      for (const num of codigosExistentes) {
        if (numeroSecuencia === num) {
          numeroSecuencia++;
        } else if (numeroSecuencia < num) {
          break;
        }
      }

      const codigoProyecto = `${clienteActual.codigo}${numeroSecuencia.toString().padStart(2, '0')}`;

      //  Crear el proyecto con el código generado
      return await tx.proyecto.create({
        data: {
          ...validatedData,
          codigo: codigoProyecto,
          // Si no se especifica comercial, asignar al usuario actual si es comercial
          comercialId: validatedData.comercialId ||
            (session.user.role === 'comercial' ? session.user.id : validatedData.gestorId),
          // Estado por defecto
          estado: (validatedData.estado || 'en_planificacion') as any
        },
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
    });

    logger.info(`✅ Proyecto creado: ${nuevoProyecto.nombre} (${nuevoProyecto.id}) - Usuario: ${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: nuevoProyecto,
      message: 'Proyecto creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.message },
        { status: 400 }
      );
    }

    logger.error('❌ Error al crear proyecto:', error);
    console.error('❌ Error completo al crear proyecto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ✅ PUT - Actualizar proyecto existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get('id');

    if (!proyectoId) {
      return NextResponse.json(
        { error: 'ID de proyecto requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData: ProyectoUpdatePayload = body;

    // 🔍 Verificar que el proyecto existe y el usuario tiene permisos
    const proyectoExistente = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        comercialId: true,
        gestorId: true,
        estado: true
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

    // � Validaciones de negocio para fechas
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
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.message },
        { status: 400 }
      );
    }

    logger.error('❌ Error al actualizar proyecto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
