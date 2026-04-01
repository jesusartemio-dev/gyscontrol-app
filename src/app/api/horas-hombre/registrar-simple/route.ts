// API para registro de horas (para wizard)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { obtenerCostoHoraPEN } from '@/lib/utils/costoHoraSnapshot';
import { verificarSemanaEditable } from '@/lib/utils/timesheetAprobacion';

export async function POST(request: NextRequest) {
  try {
    // Obtener sesión del usuario logueado
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('❌ REGISTRO SIMPLE: No hay sesión válida');
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      );
    }

    console.log('✅ REGISTRO SIMPLE: Usuario autenticado:', session.user.id, session.user.email);

    const body = await request.json();
    const { fecha, horas, descripcion, proyectoId, proyectoEdtId, proyectoTareaId, proyectoActividadId, elementoTipo } = body;

    console.log('🔍 REGISTRO SIMPLE: Datos recibidos', {
      fecha, horas, descripcion, proyectoId, proyectoEdtId, proyectoTareaId, proyectoActividadId, elementoTipo
    });

    // Validaciones básicas
    if (!fecha || !horas || !descripcion || !proyectoId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true }
    });

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Buscar un servicio del proyecto para asociar
    const proyectoServicio = await prisma.proyectoServicioCotizado.findFirst({
      where: { proyectoId },
      select: {
        id: true,
        nombre: true,
        edtId: true,
        edt: { select: { nombre: true } }
      }
    });

    // El servicio es opcional - proyectos internos pueden no tener servicios cotizados
    if (!proyectoServicio) {
      console.log('ℹ️ REGISTRO SIMPLE: Proyecto sin servicio cotizado, se registrará sin asociación de servicio');
    }

    // Buscar un recurso por defecto
    const recurso = await prisma.recurso.findFirst({
      where: { activo: true },
      select: { id: true, nombre: true }
    });

    if (!recurso) {
      return NextResponse.json(
        { error: 'No hay recursos disponibles en el sistema' },
        { status: 404 }
      );
    }

    // Obtener el EDT para el registro
    const proyectoEdt = proyectoEdtId ? await prisma.proyectoEdt.findUnique({
      where: { id: proyectoEdtId },
      select: {
        id: true,
        nombre: true,
        edtId: true,
        edt: { select: { nombre: true } } // Relación al catálogo Edt
      }
    }) : null;

    // Usar el usuario de la sesión actual
    const usuarioId = session.user.id;
    const usuarioNombre = session.user.name || session.user.email || 'Usuario';

    // Crear registro de horas con corrección de zona horaria
    // Convertir fecha YYYY-MM-DD a Date en zona horaria local (GMT-5)
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaLocal = new Date(year, month - 1, day, 0, 0, 0, 0); // Mes es 0-indexado
    
    console.log('🌍 REGISTRO SIMPLE: Conversión de fecha', {
      fechaOriginal: fecha,
      fechaLocal: fechaLocal.toISOString(),
      zonaHoraria: 'GMT-5 (Colombia)'
    });

    // Determinar la categoría en orden de prioridad:
    // 1. Nombre del ProyectoEdt (proyectoEdt.nombre)
    // 2. Nombre del catálogo Edt (proyectoEdt.edt.nombre)
    // 3. EDT del servicio cotizado (proyectoServicio.edt.nombre)
    // 4. 'general' como fallback
    const categoriaFinal = proyectoEdt?.nombre ||
                           proyectoEdt?.edt?.nombre ||
                           proyectoServicio?.edt?.nombre ||
                           'general';

    // 🔒 Verificar que la semana no esté bloqueada (enviada/aprobada)
    const semanaEditable = await verificarSemanaEditable(usuarioId, fechaLocal);
    if (!semanaEditable) {
      return NextResponse.json(
        { error: 'No se pueden registrar horas en una semana enviada o aprobada' },
        { status: 403 }
      );
    }

    // Snapshot del costo hora actual del empleado (PEN)
    const costoHora = await obtenerCostoHoraPEN(usuarioId)

    const registroHoras = await prisma.registroHoras.create({
      data: {
        id: randomUUID(),
        proyectoId,
        ...(proyectoServicio ? { proyectoServicioId: proyectoServicio.id } : {}),
        categoria: categoriaFinal,
        nombreServicio: proyectoServicio?.nombre || proyectoEdt?.nombre || proyecto.nombre || 'Sin servicio',
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        usuarioId: usuarioId,
        fechaTrabajo: fechaLocal, // ✅ FECHA CORREGIDA
        horasTrabajadas: parseFloat(horas),
        descripcion,
        proyectoTareaId: proyectoTareaId || undefined,
        proyectoEdtId: proyectoEdtId || undefined,
        edtId: proyectoEdt?.edtId || undefined,
        origen: 'oficina',
        costoHora: costoHora || null,
        updatedAt: new Date()
      }
    });

    console.log('✅ REGISTRO SIMPLE: Registro creado exitosamente:', registroHoras.id);

    // ✅ Actualizar horasReales de la tarea si está asociada
    if (proyectoTareaId) {
      try {
        await prisma.proyectoTarea.update({
          where: { id: proyectoTareaId },
          data: {
            horasReales: { increment: parseFloat(horas) },
            updatedAt: new Date()
          }
        });
        console.log('✅ REGISTRO SIMPLE: horasReales actualizado en tarea:', proyectoTareaId);
      } catch (updateError) {
        // No fallar si la tarea no existe, solo loguear
        console.warn('⚠️ REGISTRO SIMPLE: No se pudo actualizar horasReales de tarea:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se registraron ${horas}h en ${proyecto.nombre}`,
      data: {
        id: registroHoras.id,
        horasRegistradas: parseFloat(horas),
        proyecto: proyecto.nombre,
        edt: proyectoEdt?.nombre || proyectoEdt?.edt?.nombre || 'Sin EDT',
        elemento: elementoTipo || 'N/A'
      }
    });

  } catch (error) {
    console.error('❌ REGISTRO SIMPLE Error:', error);
    return NextResponse.json(
      {
        error: 'Error registrando horas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Editar un registro de horas existente (horas, descripción, fecha)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, fecha, horas, descripcion } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de registro requerido' }, { status: 400 });
    }
    if (!fecha || !horas || !descripcion) {
      return NextResponse.json({ error: 'Fecha, horas y descripción son requeridos' }, { status: 400 });
    }

    // Buscar registro existente
    const registro = await prisma.registroHoras.findUnique({
      where: { id },
      select: {
        id: true,
        usuarioId: true,
        fechaTrabajo: true,
        horasTrabajadas: true,
        origen: true,
        proyectoTareaId: true,
        proyectoEdtId: true,
        proyecto: { select: { nombre: true } }
      }
    });

    if (!registro) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    // Solo el dueño puede editar
    if (registro.usuarioId !== session.user.id) {
      return NextResponse.json({ error: 'No puedes editar registros de otro usuario' }, { status: 403 });
    }

    // Verificar que la semana no esté bloqueada
    if (registro.origen === 'oficina') {
      const semanaEditable = await verificarSemanaEditable(registro.usuarioId, registro.fechaTrabajo);
      if (!semanaEditable) {
        return NextResponse.json(
          { error: 'No se pueden editar horas de una semana enviada o aprobada' },
          { status: 403 }
        );
      }
    }

    // Calcular diferencia de horas para actualizar tarea
    const horasAnterior = registro.horasTrabajadas;
    const horasNuevas = parseFloat(horas);
    const diferenciaHoras = horasNuevas - horasAnterior;

    // Convertir fecha
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaLocal = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Verificar que la nueva fecha también esté en semana editable
    const nuevaSemanaEditable = await verificarSemanaEditable(registro.usuarioId, fechaLocal);
    if (!nuevaSemanaEditable) {
      return NextResponse.json(
        { error: 'No se puede mover el registro a una semana enviada o aprobada' },
        { status: 403 }
      );
    }

    // Actualizar registro
    await prisma.registroHoras.update({
      where: { id },
      data: {
        fechaTrabajo: fechaLocal,
        horasTrabajadas: horasNuevas,
        descripcion,
        updatedAt: new Date()
      }
    });

    // Actualizar horasReales de la tarea si está asociada
    if (registro.proyectoTareaId && diferenciaHoras !== 0) {
      try {
        await prisma.proyectoTarea.update({
          where: { id: registro.proyectoTareaId },
          data: {
            horasReales: { increment: diferenciaHoras },
            updatedAt: new Date()
          }
        });
      } catch (updateError) {
        console.warn('⚠️ No se pudo actualizar horasReales de tarea:', updateError);
      }
    }

    // Recalcular EDT si está asociado
    if (registro.proyectoEdtId) {
      const totalHoras = await prisma.registroHoras.aggregate({
        where: { proyectoEdtId: registro.proyectoEdtId },
        _sum: { horasTrabajadas: true }
      });
      const horasReales = Number(totalHoras._sum.horasTrabajadas || 0);
      const proyectoEdt = await prisma.proyectoEdt.findUnique({
        where: { id: registro.proyectoEdtId }
      });
      let porcentajeAvance = 0;
      if (proyectoEdt?.horasPlan && Number(proyectoEdt.horasPlan) > 0) {
        porcentajeAvance = Math.min(100, Math.round((horasReales / Number(proyectoEdt.horasPlan)) * 100));
      }
      await prisma.proyectoEdt.update({
        where: { id: registro.proyectoEdtId },
        data: { horasReales, porcentajeAvance }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Registro actualizado: ${horasNuevas}h en ${registro.proyecto?.nombre || 'proyecto'}`
    });

  } catch (error) {
    console.error('❌ REGISTRO SIMPLE PUT Error:', error);
    return NextResponse.json(
      { error: 'Error actualizando registro', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}