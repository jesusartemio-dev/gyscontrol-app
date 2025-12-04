// API para registro de horas sin autenticación (para wizard)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
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

    // Buscar un servicio del proyecto para asociar (incluyendo la relación con EDT)
    const proyectoServicio = await prisma.proyectoServicioCotizado.findFirst({
      where: { proyectoId },
      select: {
        id: true,
        nombre: true,
        edt: { select: { nombre: true } } // Obtener la categoría desde el EDT relacionado
      }
    });

    if (!proyectoServicio) {
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
      select: { id: true, categoriaServicioId: true, categoriaServicio: { select: { nombre: true } } }
    }) : null;

    // Buscar un usuario por defecto para el wizard
    const usuario = await prisma.user.findFirst({
      select: { id: true, name: true }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'No hay usuarios disponibles en el sistema' },
        { status: 404 }
      );
    }

    // Crear registro de horas con corrección de zona horaria
    // Convertir fecha YYYY-MM-DD a Date en zona horaria local (GMT-5)
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaLocal = new Date(year, month - 1, day, 0, 0, 0, 0); // Mes es 0-indexado
    
    console.log('🌍 REGISTRO SIMPLE: Conversión de fecha', {
      fechaOriginal: fecha,
      fechaLocal: fechaLocal.toISOString(),
      zonaHoraria: 'GMT-5 (Colombia)'
    });

    const registroHoras = await prisma.registroHoras.create({
      data: {
        proyectoId,
        proyectoServicioId: proyectoServicio.id,
        categoria: proyectoEdt?.categoriaServicio?.nombre || proyectoServicio.edt?.nombre || 'general',
        nombreServicio: proyectoServicio.nombre,
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        usuarioId: usuario.id,
        fechaTrabajo: fechaLocal, // ✅ FECHA CORREGIDA
        horasTrabajadas: parseFloat(horas),
        descripcion,
        proyectoTareaId: proyectoTareaId || null,
        proyectoEdtId: proyectoEdtId || null,
        categoriaServicioId: proyectoEdt?.categoriaServicioId || null,
        origen: 'oficina'
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
        edt: proyectoEdt?.categoriaServicio?.nombre || 'Sin EDT',
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