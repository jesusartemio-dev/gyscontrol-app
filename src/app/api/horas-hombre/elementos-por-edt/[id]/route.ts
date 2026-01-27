/**
 * API para obtener elementos (tareas y actividades) de un EDT específico
 * Sin autenticación para uso en Timesheet Semanal
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: edtId } = await params;

    if (!edtId) {
      return NextResponse.json(
        { error: 'EDT ID requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 ELEMENTOS EDT: Consultando elementos para EDT:', edtId);

    // Obtener actividades del EDT
    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoEdtId: edtId },
      include: {
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: { orden: 'asc' }
    });

    // Obtener tareas del EDT
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoEdtId: edtId },
      include: {
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: { orden: 'asc' }
    });

    console.log('🔍 ELEMENTOS EDT: Actividades encontradas:', actividades.length);
    console.log('🔍 ELEMENTOS EDT: Tareas encontradas:', tareas.length);

    // Mapear actividades
    const actividadesFormatted = actividades.map((actividad) => ({
      id: actividad.id,
      nombre: actividad.nombre,
      tipo: 'actividad',
      responsableNombre: actividad.user?.name || 'Sin responsable',
      horasPlan: Number(actividad.horasPlan || 0),
      horasReales: Number(actividad.horasReales || 0),
      estado: actividad.estado,
      progreso: actividad.porcentajeAvance,
      descripcion: actividad.descripcion,
      fechaInicio: actividad.fechaInicioPlan,
      fechaFin: actividad.fechaFinPlan
    }));

    // Mapear tareas
    const tareasFormatted = tareas.map((tarea) => ({
      id: tarea.id,
      nombre: tarea.nombre,
      tipo: 'tarea',
      responsableNombre: tarea.user?.name || 'Sin responsable',
      horasPlan: Number(tarea.horasEstimadas || 0),
      horasReales: Number(tarea.horasReales || 0),
      estado: tarea.estado,
      progreso: tarea.porcentajeCompletado,
      descripcion: tarea.descripcion,
      fechaInicio: tarea.fechaInicio,
      fechaFin: tarea.fechaFin
    }));

    // Solo devolver tareas (no actividades) para registro de horas
    const elementos = tareasFormatted;

    console.log('🔍 ELEMENTOS EDT: Elementos totales (solo tareas):', elementos.length);

    return NextResponse.json({
      success: true,
      elementos
    });

  } catch (error) {
    console.error('❌ ELEMENTOS EDT Error:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo elementos del EDT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}