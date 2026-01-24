// API para registro de horas (para wizard)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
        categoria: true // Campo string que contiene la categoría
      }
    });

    // Si no hay servicio, retornar error ya que es requerido
    if (!proyectoServicio) {
      console.log('❌ REGISTRO SIMPLE: No hay servicio asociado al proyecto');
      return NextResponse.json(
        { error: 'No se encontró un servicio asociado al proyecto' },
        { status: 404 }
      );
    }

    // Buscar un recurso por defecto
    const recurso = await prisma.recurso.findFirst({
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
    // 3. Categoría del servicio cotizado (proyectoServicio.categoria)
    // 4. 'general' como fallback
    const categoriaFinal = proyectoEdt?.nombre ||
                           proyectoEdt?.edt?.nombre ||
                           proyectoServicio.categoria ||
                           'general';

    const registroHoras = await prisma.registroHoras.create({
      data: {
        id: randomUUID(),
        proyectoId,
        proyectoServicioId: proyectoServicio.id,
        categoria: categoriaFinal,
        nombreServicio: proyectoServicio.nombre || proyectoEdt?.nombre || 'Sin servicio',
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
        updatedAt: new Date()
      }
    });

    console.log('✅ REGISTRO SIMPLE: Registro creado exitosamente:', registroHoras.id);

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