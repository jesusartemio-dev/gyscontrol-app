/**
 * API para obtener tareas directas de un EDT (tareas sin actividad)
 * Implementa: EDT → Tareas directas (sin jerarquía de actividad)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ edtId: string }> }) {
  try {
    const { edtId } = await params;

    if (!edtId) {
      return NextResponse.json(
        { error: 'EDT ID requerido' },
        { status: 400 }
      );
    }

    console.log('🎯 TAREAS DIRECTAS EDT: Consultando tareas directas para EDT:', edtId);

    // Obtener tareas directas del EDT (sin proyectoActividadId, solo ejecucion)
    const tareasDirectas = await prisma.proyectoTarea.findMany({
      where: {
        proyectoEdtId: edtId,
        proyectoActividadId: null,
        proyectoEdt: { proyectoCronograma: { tipo: 'ejecucion' } }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: { orden: 'asc' }
    });

    console.log('🎯 TAREAS DIRECTAS EDT: Tareas directas encontradas:', tareasDirectas.length);

    // Mapear tareas directas
    const tareasFormatted = tareasDirectas.map((tarea) => ({
      id: tarea.id,
      nombre: tarea.nombre,
      tipo: 'tarea' as const,
      responsableNombre: tarea.user?.name || 'Sin responsable',
      horasPlan: Number(tarea.horasEstimadas || 0),
      horasReales: Number(tarea.horasReales || 0),
      estado: tarea.estado,
      progreso: tarea.porcentajeCompletado,
      descripcion: tarea.descripcion,
      fechaInicio: tarea.fechaInicio,
      fechaFin: tarea.fechaFin,
      // Marcar que es una tarea directa (no relacionada con actividad)
      esDirecta: true
    }));

    console.log('🎯 TAREAS DIRECTAS EDT: Tareas formateadas:', tareasFormatted.length);

    return NextResponse.json({
      success: true,
      tareas: tareasFormatted
    });

  } catch (error) {
    console.error('❌ TAREAS DIRECTAS EDT Error:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo tareas directas del EDT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}