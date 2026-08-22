import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateProyectoEdtPayload, FiltrosCronogramaPayload } from '@/types/payloads';
import { logger } from '@/lib/logger';
import { validarFechasEdt, validarEstadoEdt } from '@/lib/validators/cronograma';
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck';

// ✅ GET - Listar EDT de un proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filtros: FiltrosCronogramaPayload = {
      edtId: searchParams.get('edtId') || searchParams.get('edtId') || undefined,
      estado: searchParams.get('estado') as any || undefined,
      responsableId: searchParams.get('responsableId') || undefined
    };

    // ✅ Add support for cronogramaId and faseId filtering
    const cronogramaId = searchParams.get('cronogramaId') || undefined;
    const faseId = searchParams.get('faseId') || undefined;

    const edts = await prisma.proyectoEdt.findMany({
      where: {
        proyectoId: id,
        ...(filtros.edtId && { edtId: filtros.edtId }),
        ...(filtros.estado && { estado: filtros.estado }),
        ...(filtros.responsableId && { responsableId: filtros.responsableId }),
        ...(cronogramaId && { proyectoCronogramaId: cronogramaId }),
        ...(faseId && { proyectoFaseId: faseId })
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        edt: { // Prisma relation name
          select: {
            id: true,
            nombre: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        registroHoras: { // Correct relation name
          select: {
            id: true,
            horasTrabajadas: true,
            fechaTrabajo: true
          },
          orderBy: {
            fechaTrabajo: 'desc'
          },
          take: 5 // Últimos 5 registros
        }
      },
      orderBy: [
        { prioridad: 'desc' },
        { fechaFinPlan: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // 📊 Calcular métricas básicas
    const metricas = {
      total: edts.length,
      planificados: edts.filter(e => e.estado === 'planificado').length,
      enProgreso: edts.filter(e => e.estado === 'en_progreso').length,
      completados: edts.filter(e => e.estado === 'completado').length,
      horasEstimadasTotal: edts.reduce((sum, e) => sum + Number(e.horasPlan || 0), 0),
      horasRealesTotal: edts.reduce((sum, e) => sum + Number(e.horasReales), 0)
    };

    logger.info(`📋 EDT listados para proyecto ${id}: ${edts.length} elementos`);

    return NextResponse.json({
      success: true,
      data: edts,
      metricas,
      filtros
    });

  } catch (error) {
    logger.error('❌ Error al listar EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ POST - Crear nuevo EDT
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔐 Verificar permisos (Admin, Gerente, Proyectos)
    const rolesPermitidos = ['admin', 'gerente', 'proyectos'];
    if (!tieneRol(session, rolesPermitidos)) {
      return NextResponse.json(
        { error: 'Sin permisos para crear EDT' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data: CreateProyectoEdtPayload = {
      ...body,
      proyectoId: id
    };

    // Check cronograma lock
    if (data.proyectoCronogramaId && await isCronogramaBloqueado(data.proyectoCronogramaId)) {
      return cronogramaBloqueadoResponse();
    }

    // 🔍 Validaciones de negocio
    if (data.fechaInicio || data.fechaFin) {
      const erroresFechas = validarFechasEdt(data.fechaInicio, data.fechaFin);
      if (erroresFechas.length > 0) {
        return NextResponse.json(
          { error: 'Fechas inválidas', detalles: erroresFechas },
          { status: 400 }
        );
      }
    }

    // ✅ Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: id }
    });

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // ✅ Verificar que el EDT del catálogo existe
    const edtCatalogo = await prisma.edt.findUnique({
      where: { id: data.edtId }
    });

    if (!edtCatalogo) {
      return NextResponse.json(
        { error: 'EDT no encontrado en catálogo' },
        { status: 404 }
      );
    }

    // ✅ Verificar unicidad (proyecto + EDT catálogo)
    const edtExistente = await prisma.proyectoEdt.findFirst({
      where: {
        proyectoId: id,
        edtId: data.edtId // DB field is still edtId
      }
    });

    if (edtExistente) {
      return NextResponse.json(
        { error: 'Ya existe un EDT para esta combinación de proyecto y EDT' },
        { status: 409 }
      );
    }

    // 🏗️ Crear EDT
    const nuevoEdt = await prisma.proyectoEdt.create({
      data: {
        id: crypto.randomUUID(),
        proyectoId: id,
        proyectoCronogramaId: data.proyectoCronogramaId,
        nombre: data.nombre,
        edtId: data.edtId, // DB field is still edtId
        fechaInicioPlan: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
        fechaFinPlan: data.fechaFin ? new Date(data.fechaFin) : undefined,
        horasPlan: data.horasEstimadas,
        responsableId: data.responsableId,
        descripcion: data.descripcion,
        prioridad: data.prioridad,
        estado: 'planificado',
        porcentajeAvance: 0,
        horasReales: 0,
        updatedAt: new Date()
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        edt: { // Prisma relation name
          select: {
            id: true,
            nombre: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info(`✅ EDT creado: ${nuevoEdt.id} para proyecto ${proyecto.nombre}`);

    return NextResponse.json({
      success: true,
      data: nuevoEdt,
      message: 'EDT creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.message },
        { status: 400 }
      );
    }

    logger.error('❌ Error al crear EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ PUT - Actualización masiva de EDT (cambio de estado, reasignación, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔐 Verificar permisos
    const rolesPermitidos = ['admin', 'gerente', 'proyectos'];
    if (!tieneRol(session, rolesPermitidos)) {
      return NextResponse.json(
        { error: 'Sin permisos para actualizar EDT' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { edtIds, updates } = body;

    if (!Array.isArray(edtIds) || edtIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un ID de EDT' },
        { status: 400 }
      );
    }

    // Check cronograma lock
    const firstEdt = await prisma.proyectoEdt.findFirst({
      where: { id: { in: edtIds }, proyectoId: id },
      select: { proyectoCronogramaId: true }
    });
    if (firstEdt?.proyectoCronogramaId && await isCronogramaBloqueado(firstEdt.proyectoCronogramaId)) {
      return cronogramaBloqueadoResponse();
    }

    // ✅ Actualización masiva
    const resultado = await prisma.proyectoEdt.updateMany({
      where: {
        id: { in: edtIds },
        proyectoId: id
      },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    logger.info(`🔄 Actualización masiva EDT: ${resultado.count} elementos actualizados`);

    return NextResponse.json({
      success: true,
      data: { actualizados: resultado.count },
      message: `${resultado.count} EDT actualizados exitosamente`
    });

  } catch (error) {
    logger.error('❌ Error en actualización masiva EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Eliminación masiva de EDT
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔐 Solo Admin y Gerente pueden eliminar
    if (!tieneRol(session, ['admin', 'gerente'])) {
      return NextResponse.json(
        { error: 'Sin permisos para eliminar EDT' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const edtIds = searchParams.get('ids')?.split(',') || [];

    if (edtIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un ID de EDT' },
        { status: 400 }
      );
    }

    // Check cronograma lock
    const firstEdtToDelete = await prisma.proyectoEdt.findFirst({
      where: { id: { in: edtIds }, proyectoId: id },
      select: { proyectoCronogramaId: true }
    });
    if (firstEdtToDelete?.proyectoCronogramaId && await isCronogramaBloqueado(firstEdtToDelete.proyectoCronogramaId)) {
      return cronogramaBloqueadoResponse();
    }

    // ✅ Verificar que no tengan registros de horas
    const edtsConHoras = await prisma.proyectoEdt.findMany({
      where: {
        id: { in: edtIds },
        proyectoId: id,
        registroHoras: { // Correct relation name
          some: {}
        }
      },
      select: { id: true }
    });

    if (edtsConHoras.length > 0) {
      return NextResponse.json(
        { 
          error: 'No se pueden eliminar EDT con registros de horas asociados',
          edtsConHoras: edtsConHoras.map(e => e.id)
        },
        { status: 409 }
      );
    }

    // 🗑️ Eliminar EDT
    const resultado = await prisma.proyectoEdt.deleteMany({
      where: {
        id: { in: edtIds },
        proyectoId: id
      }
    });

    logger.info(`🗑️ EDT eliminados: ${resultado.count} elementos`);

    return NextResponse.json({
      success: true,
      data: { eliminados: resultado.count },
      message: `${resultado.count} EDT eliminados exitosamente`
    });

  } catch (error) {
    logger.error('❌ Error al eliminar EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}