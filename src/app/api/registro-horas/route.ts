import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateRegistroHorasPayload } from '@/types/payloads';
import { logger } from '@/lib/logger';
import { validarRegistroHorasEdt } from '@/lib/validators/cronograma';

// ✅ GET - Listar registros de horas con filtros EDT
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // 🔍 Filtros
    const filtros = {
      proyectoId: searchParams.get('proyectoId') || undefined,
      proyectoEdtId: searchParams.get('proyectoEdtId') || undefined,
      categoriaServicioId: searchParams.get('categoriaServicioId') || undefined,
      usuarioId: searchParams.get('usuarioId') || undefined,
      recursoId: searchParams.get('recursoId') || undefined,
      origen: searchParams.get('origen') || undefined,
      fechaDesde: searchParams.get('fechaDesde') ? new Date(searchParams.get('fechaDesde')!) : undefined,
      fechaHasta: searchParams.get('fechaHasta') ? new Date(searchParams.get('fechaHasta')!) : undefined
    };

    // 🔐 Filtro por rol
    const whereClause: any = {};
    
    if (filtros.proyectoId) whereClause.proyectoId = filtros.proyectoId;
    if (filtros.proyectoEdtId) whereClause.proyectoEdtId = filtros.proyectoEdtId;
    if (filtros.categoriaServicioId) whereClause.categoriaServicioId = filtros.categoriaServicioId;
    if (filtros.usuarioId) whereClause.usuarioId = filtros.usuarioId;
    if (filtros.recursoId) whereClause.recursoId = filtros.recursoId;
    if (filtros.origen) whereClause.origen = filtros.origen;
    
    if (filtros.fechaDesde || filtros.fechaHasta) {
      whereClause.fechaTrabajo = {};
      if (filtros.fechaDesde) whereClause.fechaTrabajo.gte = filtros.fechaDesde;
      if (filtros.fechaHasta) whereClause.fechaTrabajo.lte = filtros.fechaHasta;
    }

    // 🔒 Restricciones por rol
    if (!['admin', 'gerente'].includes(session.user.role)) {
      // Los usuarios solo ven sus propios registros
      whereClause.usuarioId = session.user.id;
    }

    // 📊 Consulta principal
    const [registros, total] = await Promise.all([
      prisma.registroHoras.findMany({
        where: whereClause,
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true
            }
          },
          proyectoServicio: {
            select: {
              id: true,
              categoria: true
            }
          },
          proyectoEdt: {
            select: {
              id: true,
              zona: true,
              estado: true,
              porcentajeAvance: true
            }
          },
          categoriaServicioRef: {
            select: {
              id: true,
              nombre: true
            }
          },
          usuario: {
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
        },
        skip,
        take: limit
      }),
      prisma.registroHoras.count({ where: whereClause })
    ]);

    // 📈 Métricas agregadas
    const metricas = await prisma.registroHoras.aggregate({
      where: whereClause,
      _sum: {
        horasTrabajadas: true
      },
      _avg: {
        horasTrabajadas: true
      }
    });

    const resumen = {
      totalHoras: Number(metricas._sum.horasTrabajadas || 0),
      promedioHoras: Number(metricas._avg.horasTrabajadas || 0),
      totalRegistros: total,
      horasOficina: 0,
      horasCampo: 0
    };

    // 📊 Calcular horas por origen
    if (filtros.origen || !filtros.proyectoEdtId) {
      const horasPorOrigen = await prisma.registroHoras.groupBy({
        by: ['origen'],
        where: whereClause,
        _sum: {
          horasTrabajadas: true
        }
      });

      horasPorOrigen.forEach(grupo => {
        if (grupo.origen === 'oficina') {
          resumen.horasOficina = Number(grupo._sum.horasTrabajadas || 0);
        } else if (grupo.origen === 'campo') {
          resumen.horasCampo = Number(grupo._sum.horasTrabajadas || 0);
        }
      });
    }

    logger.info(`📋 Registros de horas consultados: ${registros.length}/${total}`);

    return NextResponse.json({
      success: true,
      data: registros,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      resumen,
      filtros
    });

  } catch (error) {
    logger.error('❌ Error al consultar registros de horas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ POST - Crear nuevo registro de horas con soporte EDT
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const data: CreateRegistroHorasPayload = {
      ...body,
      usuarioId: session.user.id // Siempre usar el usuario de la sesión
    };

    // 🔍 Validaciones de negocio EDT
    const erroresEdt = await validarRegistroHorasEdt({
      proyectoEdtId: data.proyectoEdtId!,
      usuarioId: session.user.id,
      fecha: data.fecha,
      horasTrabajadas: data.horasTrabajadas
    });

    if (erroresEdt.length > 0) {
      return NextResponse.json(
        { error: 'Errores de validación EDT', detalles: erroresEdt },
        { status: 400 }
      );
    }

    // ✅ Obtener proyecto desde EDT
    const edt = await prisma.proyectoEdt.findUnique({
      where: { id: data.proyectoEdtId! },
      include: { 
        proyecto: true,
        categoriaServicio: true
      }
    });
    
    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }
    
    const proyecto = edt.proyecto;

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // ✅ Obtener recurso por defecto (primer recurso disponible)
    const recurso = await prisma.recurso.findFirst({
      orderBy: { nombre: 'asc' }
    });

    if (!recurso) {
      return NextResponse.json(
        { error: 'No hay recursos disponibles' },
        { status: 404 }
      );
    }

    // ✅ Si se especifica EDT, verificar que existe y pertenece al proyecto
    let proyectoEdt = null;
    if (data.proyectoEdtId) {
      proyectoEdt = await prisma.proyectoEdt.findFirst({
        where: {
          id: data.proyectoEdtId,
          proyectoId: proyecto.id
        }
      });

      if (!proyectoEdt) {
        return NextResponse.json(
          { error: 'EDT no encontrado o no pertenece al proyecto' },
          { status: 404 }
        );
      }
    }

    // 🏗️ Crear registro de horas
    const nuevoRegistro = await prisma.registroHoras.create({
      data: {
        proyectoId: proyecto.id,
        proyectoServicioId: 'default-service',
        proyectoEdtId: data.proyectoEdtId,
        categoriaServicioId: edt.categoriaServicioId,
        categoria: edt.categoriaServicio?.nombre || 'General',
        nombreServicio: edt.categoriaServicio?.nombre || 'Servicio General',
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        usuarioId: data.usuarioId,
        fechaTrabajo: new Date(data.fecha),
        horasTrabajadas: data.horasTrabajadas,
        descripcion: data.descripcion,
        observaciones: data.observaciones,
        origen: 'oficina',
        ubicacion: 'Oficina'
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        proyectoEdt: {
          select: {
            id: true,
            zona: true,
            estado: true
          }
        },
        usuario: {
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
      }
    });

    // 🔄 Actualizar horas reales del EDT si aplica
    if (data.proyectoEdtId) {
      const totalHoras = await prisma.registroHoras.aggregate({
        where: { proyectoEdtId: data.proyectoEdtId },
        _sum: { horasTrabajadas: true }
      });

      const horasReales = Number(totalHoras._sum.horasTrabajadas || 0);
      
      // Calcular nuevo porcentaje de avance
      let porcentajeAvance = proyectoEdt?.porcentajeAvance || 0;
      if (proyectoEdt?.horasPlan && Number(proyectoEdt.horasPlan) > 0) {
        porcentajeAvance = Math.min(100, Math.round((horasReales / Number(proyectoEdt.horasPlan)) * 100));
      }

      await prisma.proyectoEdt.update({
        where: { id: data.proyectoEdtId },
        data: {
          horasReales,
          porcentajeAvance,
          // Si no tenía fecha de inicio real, establecerla
          fechaInicioReal: proyectoEdt?.fechaInicioReal || new Date(data.fecha)
        }
      });

      logger.info(`🔄 EDT actualizado: ${data.proyectoEdtId} - ${horasReales}h (${porcentajeAvance}%)`);
    }

    logger.info(`✅ Registro de horas creado: ${nuevoRegistro.id} - ${data.horasTrabajadas}h`);

    return NextResponse.json({
      success: true,
      data: nuevoRegistro,
      message: 'Registro de horas creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.message },
        { status: 400 }
      );
    }

    logger.error('❌ Error al crear registro de horas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ PUT - Actualización masiva de registros de horas
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔐 Solo Admin y Gerente pueden hacer actualizaciones masivas
    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para actualización masiva' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { registroIds, updates } = body;

    if (!Array.isArray(registroIds) || registroIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un ID de registro' },
        { status: 400 }
      );
    }

    // ✅ Actualización masiva
    const resultado = await prisma.registroHoras.updateMany({
      where: {
        id: { in: registroIds }
      },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    // 🔄 Recalcular horas de EDT afectados si aplica
    if (updates.proyectoEdtId || updates.horasTrabajadas) {
      const edtsAfectados = await prisma.registroHoras.findMany({
        where: {
          id: { in: registroIds },
          proyectoEdtId: { not: null }
        },
        select: { proyectoEdtId: true },
        distinct: ['proyectoEdtId']
      });

      for (const registro of edtsAfectados) {
        if (registro.proyectoEdtId) {
          const totalHoras = await prisma.registroHoras.aggregate({
            where: { proyectoEdtId: registro.proyectoEdtId },
            _sum: { horasTrabajadas: true }
          });

          await prisma.proyectoEdt.update({
            where: { id: registro.proyectoEdtId },
            data: { horasReales: Number(totalHoras._sum.horasTrabajadas || 0) }
          });
        }
      }
    }

    logger.info(`🔄 Actualización masiva registros: ${resultado.count} elementos`);

    return NextResponse.json({
      success: true,
      data: { actualizados: resultado.count },
      message: `${resultado.count} registros actualizados exitosamente`
    });

  } catch (error) {
    logger.error('❌ Error en actualización masiva registros:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Eliminación de registros de horas
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const registroIds = searchParams.get('ids')?.split(',') || [];

    if (registroIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un ID de registro' },
        { status: 400 }
      );
    }

    // 🔐 Verificar permisos
    const whereClause: any = { id: { in: registroIds } };
    
    // Los usuarios solo pueden eliminar sus propios registros
    if (!['admin', 'gerente'].includes(session.user.role)) {
      whereClause.usuarioId = session.user.id;
    }

    // 📊 Obtener EDT afectados antes de eliminar
    const registrosAEliminar = await prisma.registroHoras.findMany({
      where: whereClause,
      select: {
        id: true,
        proyectoEdtId: true,
        horasTrabajadas: true
      }
    });

    const edtsAfectados = new Set(
      registrosAEliminar
        .filter(r => r.proyectoEdtId)
        .map(r => r.proyectoEdtId!)
    );

    // 🗑️ Eliminar registros
    const resultado = await prisma.registroHoras.deleteMany({
      where: whereClause
    });

    // 🔄 Recalcular horas de EDT afectados
    for (const edtId of edtsAfectados) {
      const totalHoras = await prisma.registroHoras.aggregate({
        where: { proyectoEdtId: edtId },
        _sum: { horasTrabajadas: true }
      });

      const horasReales = Number(totalHoras._sum.horasTrabajadas || 0);
      
      // Recalcular porcentaje de avance
      const edt = await prisma.proyectoEdt.findUnique({
        where: { id: edtId },
        select: { horasPlan: true }
      });

      let porcentajeAvance = 0;
      if (edt?.horasPlan && Number(edt.horasPlan) > 0) {
        porcentajeAvance = Math.min(100, Math.round((horasReales / Number(edt.horasPlan)) * 100));
      }

      await prisma.proyectoEdt.update({
        where: { id: edtId },
        data: {
          horasReales,
          porcentajeAvance
        }
      });
    }

    logger.info(`🗑️ Registros eliminados: ${resultado.count} elementos`);

    return NextResponse.json({
      success: true,
      data: { eliminados: resultado.count },
      message: `${resultado.count} registros eliminados exitosamente`
    });

  } catch (error) {
    logger.error('❌ Error al eliminar registros:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}