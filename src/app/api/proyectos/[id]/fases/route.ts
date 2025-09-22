import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ✅ GET /api/proyectos/[id]/fases - Obtener fases de un proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoId: id },
      include: {
        edts: {
          include: {
            categoriaServicio: true,
            responsable: true,
            registrosHoras: { take: 5, orderBy: { fechaTrabajo: 'desc' } }
          }
        }
      },
      orderBy: { orden: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: fases,
      meta: {
        totalFases: fases.length,
        totalEdts: fases.reduce((sum, f) => sum + f.edts.length, 0)
      }
    });
  } catch (error) {
    console.error('Error obteniendo fases:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ POST /api/proyectos/[id]/fases - Crear nueva fase
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, fechaInicio: true, fechaFin: true }
    });

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Validar fechas
    if (data.fechaInicioPlan && data.fechaFinPlan) {
      const fechaInicio = new Date(data.fechaInicioPlan);
      const fechaFin = new Date(data.fechaFinPlan);

      if (fechaInicio >= fechaFin) {
        return NextResponse.json(
          { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
          { status: 400 }
        );
      }

      // Validar que las fechas estén dentro del proyecto
      if (proyecto.fechaFin && (fechaInicio < proyecto.fechaInicio || fechaFin > proyecto.fechaFin)) {
        return NextResponse.json(
          { error: 'Las fechas de la fase deben estar dentro del rango del proyecto' },
          { status: 400 }
        );
      }
    }

    // Crear fase
    const nuevaFase = await prisma.proyectoFase.create({
      data: {
        proyectoId: id,
        nombre: data.nombre,
        descripcion: data.descripcion,
        orden: data.orden || 0,
        fechaInicioPlan: data.fechaInicioPlan ? new Date(data.fechaInicioPlan) : null,
        fechaFinPlan: data.fechaFinPlan ? new Date(data.fechaFinPlan) : null,
        estado: data.estado || 'planificado'
      }
    });

    return NextResponse.json({
      success: true,
      data: nuevaFase,
      message: 'Fase creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando fase:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}