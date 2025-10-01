import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ✅ POST /api/proyectos/convertir-desde-cotizacion
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { cotizacionId, proyectoId } = await request.json();

    if (!cotizacionId || !proyectoId) {
      return NextResponse.json(
        { error: 'Se requieren cotizacionId y proyectoId' },
        { status: 400 }
      );
    }

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true, fechaInicio: true, fechaFin: true }
    });

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que la cotización existe y está relacionada
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        proyectos: {
          where: { id: proyectoId },
          select: { id: true }
        }
      }
    });

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    if (cotizacion.proyectos.length === 0) {
      return NextResponse.json(
        { error: 'La cotización no está relacionada con este proyecto' },
        { status: 400 }
      );
    }

    // Ejecutar conversión
    const resultado = await convertirCotizacionAProyecto(cotizacionId, proyectoId);

    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Conversión completada exitosamente'
    });

  } catch (error) {
    console.error('Error en conversión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// Función principal de conversión
async function convertirCotizacionAProyecto(cotizacionId: string, proyectoId: string) {
  // 1. Obtener cronograma comercial
  const edtsComerciales = await prisma.cotizacionEdt.findMany({
    where: { cotizacionId },
    include: {
      categoriaServicio: true,
      responsable: true,
      tareas: true
    }
  });

  // 2. Crear cronograma de ejecución para el proyecto
  const cronogramaEjecucion = await prisma.proyectoCronograma.create({
    data: {
      proyectoId,
      tipo: 'ejecucion',
      nombre: 'Cronograma de Ejecución',
      esBaseline: false,
      version: 1
    }
  });

  // 3. Crear fases estándar del proyecto
  const fasesProyecto = await crearFasesEstandar(proyectoId, cronogramaEjecucion.id);

  // 4. Distribuir EDTs en fases
  const asignaciones = await distribuirEdtsEnFases(edtsComerciales, fasesProyecto);

  // 5. Crear EDTs del proyecto
  const edtsCreados = [];
  for (const asignacion of asignaciones) {
    const edtComercial = asignacion.edt;

    const edtCreado = await prisma.proyectoEdt.create({
      data: {
        proyectoId,
        proyectoCronogramaId: cronogramaEjecucion.id,
        nombre: edtComercial.nombre || `EDT ${edtComercial.categoriaServicio?.nombre}`,
        categoriaServicioId: edtComercial.categoriaServicioId,
        proyectoFaseId: asignacion.faseId,
        zona: edtComercial.zona,
        fechaInicioPlan: edtComercial.fechaInicioComercial,
        fechaFinPlan: edtComercial.fechaFinComercial,
        horasPlan: edtComercial.horasEstimadas,
        responsableId: edtComercial.responsableId,
        descripcion: edtComercial.descripcion,
        prioridad: edtComercial.prioridad,
        estado: 'planificado'
      }
    });

    edtsCreados.push(edtCreado);
  }

  // 5. Ajustar fechas de fases según EDTs asignados
  await ajustarFechasFases(fasesProyecto);

  return {
    fases: fasesProyecto,
    asignaciones,
    edtsCreados,
    totalEdts: edtsCreados.length,
    totalFases: fasesProyecto.length
  };
}

// Crear fases estándar
async function crearFasesEstandar(proyectoId: string, cronogramaId: string) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { fechaInicio: true, fechaFin: true }
  });

  if (!proyecto) {
    throw new Error('Proyecto no encontrado');
  }

  if (!proyecto.fechaInicio || !proyecto.fechaFin) {
    throw new Error('El proyecto debe tener fechas de inicio y fin definidas');
  }

  const duracionTotal = proyecto.fechaFin.getTime() - proyecto.fechaInicio.getTime();
  const fase1Duracion = duracionTotal * 0.2; // 20% planificación
  const fase2Duracion = duracionTotal * 0.6; // 60% ejecución
  const fase3Duracion = duracionTotal * 0.2; // 20% cierre

  const fases = [
    {
      nombre: 'Planificación Detallada',
      orden: 1,
      fechaInicio: proyecto.fechaInicio,
      fechaFin: new Date(proyecto.fechaInicio.getTime() + fase1Duracion)
    },
    {
      nombre: 'Ejecución Planificada',
      orden: 2,
      fechaInicio: new Date(proyecto.fechaInicio.getTime() + fase1Duracion),
      fechaFin: new Date(proyecto.fechaInicio.getTime() + fase1Duracion + fase2Duracion)
    },
    {
      nombre: 'Cierre Planificado',
      orden: 3,
      fechaInicio: new Date(proyecto.fechaInicio.getTime() + fase1Duracion + fase2Duracion),
      fechaFin: proyecto.fechaFin
    }
  ];

  const fasesCreadas = [];
  for (const fase of fases) {
    const faseCreada = await prisma.proyectoFase.create({
      data: {
        proyectoId,
        proyectoCronogramaId: cronogramaId,
        nombre: fase.nombre,
        orden: fase.orden,
        fechaInicioPlan: fase.fechaInicio,
        fechaFinPlan: fase.fechaFin,
        estado: 'planificado'
      }
    });
    fasesCreadas.push(faseCreada);
  }

  return fasesCreadas;
}

// Distribuir EDTs en fases según lógica de negocio
async function distribuirEdtsEnFases(edtsComerciales: any[], fases: any[]) {
  const asignaciones = [];

  for (const edt of edtsComerciales) {
    const faseAsignada = determinarFaseParaEdt(edt, fases);
    asignaciones.push({
      edt,
      faseId: faseAsignada.id,
      faseNombre: faseAsignada.nombre
    });
  }

  return asignaciones;
}

// Lógica para determinar fase según categoría
function determinarFaseParaEdt(edtComercial: any, fases: any[]) {
  const categoria = edtComercial.categoriaServicio?.nombre?.toLowerCase() || '';

  if (categoria.includes('levantamiento') || categoria.includes('diseño') ||
      categoria.includes('planificación')) {
    return fases.find(f => f.nombre === 'Planificación Detallada');
  }

  if (categoria.includes('instalación') || categoria.includes('montaje') ||
      categoria.includes('ejecución')) {
    return fases.find(f => f.nombre === 'Ejecución Planificada');
  }

  if (categoria.includes('prueba') || categoria.includes('puesta en marcha') ||
      categoria.includes('cierre')) {
    return fases.find(f => f.nombre === 'Cierre Planificado');
  }

  // Default: fase de ejecución
  return fases.find(f => f.nombre === 'Ejecución Planificada');
}

// Ajustar fechas de fases según EDTs asignados
async function ajustarFechasFases(fases: any[]) {
  for (const fase of fases) {
    const edtsFase = await prisma.proyectoEdt.findMany({
      where: { proyectoFaseId: fase.id },
      select: { fechaInicioPlan: true, fechaFinPlan: true }
    });

    if (edtsFase.length > 0) {
      const fechasInicio = edtsFase
        .map(e => e.fechaInicioPlan)
        .filter(f => f !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      const fechasFin = edtsFase
        .map(e => e.fechaFinPlan)
        .filter(f => f !== null)
        .sort((a, b) => b.getTime() - a.getTime());

      if (fechasInicio.length > 0 && fechasFin.length > 0) {
        await prisma.proyectoFase.update({
          where: { id: fase.id },
          data: {
            fechaInicioPlan: fechasInicio[0],
            fechaFinPlan: fechasFin[0]
          }
        });
      }
    }
  }
}
