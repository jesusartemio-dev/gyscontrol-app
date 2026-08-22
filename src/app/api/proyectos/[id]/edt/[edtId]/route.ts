import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProyectoEdtUpdatePayload } from '@/types/payloads';
import { logger } from '@/lib/logger';
import { validarFechasEdt, validarEstadoEdt } from '@/lib/validators/cronograma';

// ✅ GET - Obtener EDT específico con detalles completos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const edt = await prisma.proyectoEdt.findUnique({
        where: {
          id: edtId,
          proyectoId: id
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true
          }
        },
        edt: {
          select: {
            id: true,
            nombre: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        registroHoras: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            recurso: {
              select: {
                id: true,
                nombre: true
              }
            }
          },
          orderBy: {
            fechaTrabajo: 'desc'
          }
        }
      }
    });

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }

    // 📊 Calcular métricas detalladas
    const horasRealesCalculadas = edt.registroHoras.reduce(
      (sum, reg) => sum + Number(reg.horasTrabajadas),
      0
    );

    const metricas = {
      horasReales: horasRealesCalculadas,
      horasPlan: Number(edt.horasPlan || 0),
      eficiencia: edt.horasPlan ? (horasRealesCalculadas / Number(edt.horasPlan)) * 100 : 0,
      diasTrabajados: new Set(edt.registroHoras.map(r => r.fechaTrabajo.toDateString())).size,
      ultimoRegistro: edt.registroHoras[0]?.fechaTrabajo || null,
      registrosPorSemana: edt.registroHoras.reduce((acc, reg) => {
        const semana = getWeekNumber(reg.fechaTrabajo);
        acc[semana] = (acc[semana] || 0) + Number(reg.horasTrabajadas);
        return acc;
      }, {} as Record<string, number>)
    };

    // 🚨 Alertas y notificaciones
    const alertas = [];
    
    if (edt.fechaFinPlan && new Date() > edt.fechaFinPlan && edt.estado !== 'completado') {
      alertas.push({
        tipo: 'retraso',
        mensaje: 'EDT vencido según planificación',
        dias: Math.ceil((new Date().getTime() - edt.fechaFinPlan.getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    if (edt.horasPlan && horasRealesCalculadas > Number(edt.horasPlan) * 1.2) {
      alertas.push({
        tipo: 'sobrecosto',
        mensaje: 'Horas reales exceden 20% del plan',
        exceso: horasRealesCalculadas - Number(edt.horasPlan)
      });
    }

    logger.info(`📋 EDT consultado: ${edt.id} - ${edt.edt.nombre}`);

    return NextResponse.json({
      success: true,
      data: {
        ...edt,
        metricas,
        alertas
      }
    });

  } catch (error) {
    logger.error('❌ Error al obtener EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ PUT - Actualizar EDT específico
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔐 Verificar permisos
    const rolesPermitidos = ['admin', 'gerente', 'proyectos'];
    const esResponsable = await prisma.proyectoEdt.findFirst({
      where: {
        id: edtId,
        responsableId: session.user.id
      }
    });

    if (!tieneRol(session, rolesPermitidos) && !esResponsable) {
      return NextResponse.json(
        { error: 'Sin permisos para actualizar este EDT' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data: ProyectoEdtUpdatePayload = {
      ...body,
      id: edtId
    };

    // 🔍 Validaciones de negocio
    const erroresFechas = validarFechasEdt(data.fechaInicio, data.fechaFin);
    if (erroresFechas.length > 0) {
      return NextResponse.json(
        { error: 'Errores de validación de fechas', detalles: erroresFechas },
        { status: 400 }
      );
    }

    if (data.estado && data.porcentajeAvance !== undefined) {
      const estadoValido = validarEstadoEdt(data.estado);
      
      if (!estadoValido) {
        return NextResponse.json(
          { error: 'Estado de EDT inválido' },
          { status: 400 }
        );
      }
    }

    // ✅ Verificar que el EDT existe y pertenece al proyecto
    const edtExistente = await prisma.proyectoEdt.findUnique({
        where: {
          id: edtId,
        proyectoId: id
      }
    });

    if (!edtExistente) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }

    // 🔄 Preparar datos de actualización
    const updateData: any = { ...data };
    delete updateData.id;

    // 📊 Auto-calcular porcentaje si se cambia a completado
    if (data.estado === 'completado' && data.porcentajeAvance === undefined) {
      updateData.porcentajeAvance = 100;
      updateData.fechaFinReal = updateData.fechaFinReal || new Date();
    }

    // 🏗️ Actualizar EDT
    updateData.updatedAt = new Date()
    const edtActualizado = await prisma.proyectoEdt.update({
        where: { id: edtId },
      data: updateData,
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        edt: {
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

    // 🔄 Recalcular horas reales si es necesario
    if (data.estado || updateData.fechaFinReal) {
      const horasReales = await prisma.registroHoras.aggregate({
        where: { proyectoEdtId: edtId },
        _sum: { horasTrabajadas: true }
      });

      await prisma.proyectoEdt.update({
        where: { id: edtId },
        data: { horasReales: horasReales._sum.horasTrabajadas || 0, updatedAt: new Date() }
      });
    }

    logger.info(`✅ EDT actualizado: ${edtActualizado.id} - Estado: ${edtActualizado.estado}`);

    return NextResponse.json({
      success: true,
      data: edtActualizado,
      message: 'EDT actualizado exitosamente'
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.message },
        { status: 400 }
      );
    }

    logger.error('❌ Error al actualizar EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Eliminar EDT específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params;
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

    // ✅ Verificar que el EDT existe
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
          id: edtId,
          proyectoId: id
      },
      include: {
        registroHoras: {
          select: { id: true }
        }
      }
    });

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }

    // ✅ Verificar que no tenga registros de horas
    if (edt.registroHoras.length > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar EDT con registros de horas asociados',
          registroHoras: edt.registroHoras.length
        },
        { status: 409 }
      );
    }

    // 🗑️ Eliminar EDT
    await prisma.proyectoEdt.delete({
        where: { id: edtId }
      });

    logger.info(`🗑️ EDT eliminado: ${edtId}`);

    return NextResponse.json({
      success: true,
      message: 'EDT eliminado exitosamente'
    });

  } catch (error) {
    logger.error('❌ Error al eliminar EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// 🛠️ Función auxiliar para calcular número de semana
function getWeekNumber(date: Date): string {
  const startDate = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil(days / 7);
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}