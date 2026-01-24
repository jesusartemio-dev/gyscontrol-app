/**
 * API para obtener actividades con sus tareas de un EDT específico
 * Implementa la jerarquía: EDT → Actividades → Tareas
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

    console.log('🏗️ ACTIVIDADES EDT: Consultando actividades para EDT:', edtId);

    // Obtener actividades del EDT con sus tareas relacionadas
    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoEdtId: edtId },
      include: {
        user: {
          select: { id: true, name: true }
        },
        proyectoTarea: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          },
          orderBy: { orden: 'asc' }
        }
      },
      orderBy: { orden: 'asc' }
    });

    console.log('🏗️ ACTIVIDADES EDT: Actividades encontradas:', actividades.length);

    // Mapear actividades con sus tareas
    const actividadesFormatted = actividades.map((actividad) => ({
      id: actividad.id,
      nombre: actividad.nombre,
      tipo: 'actividad' as const,
      responsableNombre: actividad.user?.name || 'Sin responsable',
      horasPlan: Number(actividad.horasPlan || 0),
      horasReales: Number(actividad.horasReales || 0),
      estado: actividad.estado,
      progreso: actividad.porcentajeAvance,
      descripcion: actividad.descripcion,
      fechaInicio: actividad.fechaInicioPlan,
      fechaFin: actividad.fechaFinPlan,
      // Incluir las tareas de esta actividad
      tareas: actividad.proyectoTarea.map((tarea) => ({
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
        fechaFin: tarea.fechaFin
      }))
    }));

    console.log('🏗️ ACTIVIDADES EDT: Total de tareas en actividades:', 
      actividadesFormatted.reduce((total, act) => total + act.tareas.length, 0));

    return NextResponse.json({
      success: true,
      actividades: actividadesFormatted
    });

  } catch (error) {
    console.error('❌ ACTIVIDADES EDT Error:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo actividades del EDT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}