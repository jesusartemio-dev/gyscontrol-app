/**
 * API para crear y gestionar tareas de proyecto
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import Prisma from '@prisma/client';

const crearTareaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().min(1),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  proyectoEdtId: z.string(),
  proyectoId: z.string(),
  horasEstimadas: z.number().positive(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada'])
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = crearTareaSchema.parse(body);

    const { 
      nombre, 
      descripcion, 
      fechaInicio, 
      fechaFin, 
      proyectoEdtId, 
      proyectoId, 
      horasEstimadas, 
      estado 
    } = validatedData;

    console.log('🆕 CREAR TAREA: Creando nueva tarea:', { nombre, proyectoEdtId, proyectoId });

    // Verificar que el EDT existe
    const proyectoEdt = await prisma.proyectoEdt.findUnique({
      where: { id: proyectoEdtId },
      select: { id: true, nombre: true }
    });

    if (!proyectoEdt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }

    // Buscar un cronograma de ejecución para el proyecto
    const cronogramaEjecucion = await prisma.proyectoCronograma.findFirst({
      where: { 
        proyectoId,
        tipo: 'ejecucion'
      },
      select: { id: true }
    });

    if (!cronogramaEjecucion) {
      return NextResponse.json(
        { error: 'No se encontró cronograma de ejecución para el proyecto' },
        { status: 404 }
      );
    }

    // Crear la nueva tarea con marcador [EXTRA] para indicar que no fue planificada
    // Las tareas creadas desde el wizard de timesheet son tareas extra (no planificadas originalmente)
    const descripcionConMarcador = `[EXTRA]${descripcion || ''}`

    const nuevaTarea = await prisma.proyectoTarea.create({
      data: {
        id: `tarea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nombre,
        descripcion: descripcionConMarcador,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        proyectoEdtId,
        proyectoCronogramaId: cronogramaEjecucion.id,
        horasEstimadas: horasEstimadas,
        estado,
        porcentajeCompletado: 0,
        horasReales: 0,
        orden: 999, // Orden al final por defecto
        updatedAt: new Date()
      }
    });

    console.log('✅ CREAR TAREA: Tarea creada exitosamente:', nuevaTarea.id);

    return NextResponse.json({
      id: nuevaTarea.id,
      nombre: nuevaTarea.nombre,
      descripcion: nuevaTarea.descripcion,
      fechaInicio: nuevaTarea.fechaInicio,
      fechaFin: nuevaTarea.fechaFin,
      estado: nuevaTarea.estado,
      horasEstimadas: nuevaTarea.horasEstimadas
    });

  } catch (error) {
    console.error('❌ CREAR TAREA Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error creando tarea',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
