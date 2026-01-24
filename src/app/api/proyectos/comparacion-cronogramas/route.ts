import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ✅ GET /api/proyectos/comparacion-cronogramas?proyectoId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get('proyectoId');

    if (!proyectoId) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro proyectoId' },
        { status: 400 }
      );
    }

    // Obtener proyecto
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

    // Obtener EDTs comerciales (desde cotización)
    const edtsComerciales = await prisma.cotizacionEdt.findMany({
      where: {
        cotizacion: {
          proyecto: {
            some: { id: proyectoId }
          }
        }
      },
      include: {
        edt: true,
        user: true
      }
    });

    // Obtener EDTs planificados
    const edtsPlanificados = await prisma.proyectoEdt.findMany({
      where: { proyectoId },
      include: {
        edt: true,
        user: true,
        registroHoras: {
          select: { horasTrabajadas: true },
          where: { aprobado: true }
        }
      }
    });

    // Obtener EDTs reales (con horas registradas)
    const edtsReales = edtsPlanificados.filter(edt =>
      edt.registroHoras.length > 0 || Number(edt.horasReales) > 0
    );

    // Calcular métricas
    const totalHorasPlan = edtsPlanificados.reduce((sum, edt) => sum + Number(edt.horasPlan || 0), 0);
    const totalHorasReal = edtsReales.reduce((sum, edt) => sum + Number(edt.horasReales || 0), 0);

    // Análisis por categoría
    const analisisPorCategoria = await calcularAnalisisPorCategoria(proyectoId);

    // Desviaciones temporales
    const desviacionesTemporales = calcularDesviacionesTemporales(edtsPlanificados);

    // Resumen
    const resumen = {
      totalEdtsComercial: edtsComerciales.length,
      totalEdtsPlanificado: edtsPlanificados.length,
      totalEdtsReal: edtsReales.length,
      precisionComercial: calcularPrecisionComercial(edtsComerciales, edtsPlanificados),
      eficienciaPlanificacion: calcularEficienciaPlanificacion(edtsPlanificados),
      velocidadEjecucion: totalHorasPlan > 0 ? (totalHorasReal / totalHorasPlan) * 100 : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        proyecto,
        comercial: edtsComerciales,
        planificado: edtsPlanificados,
        real: edtsReales,
        metricas: {
          totalHorasPlan,
          totalHorasReal,
          desviacionHoras: totalHorasReal - totalHorasPlan,
          analisisPorCategoria,
          desviacionesTemporales
        },
        resumen
      }
    });

  } catch (error) {
    console.error('Error obteniendo comparación de cronogramas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Funciones auxiliares
async function calcularAnalisisPorCategoria(proyectoId: string) {
  const categorias = await prisma.edt.findMany({
    include: {
      proyectoEdt: {
        where: { proyectoId },
        include: {
          registroHoras: {
            select: { horasTrabajadas: true },
            where: { aprobado: true }
          }
        }
      },
      cotizacionEdt: {
        where: {
          cotizacion: {
            proyecto: {
              some: { id: proyectoId }
            }
          }
        }
      }
    }
  });

  return categorias.map(cat => {
    const planificado = cat.proyectoEdt.length;
    const comercial = cat.cotizacionEdt.length;
    const real = cat.proyectoEdt.filter(edt =>
      edt.registroHoras.length > 0 || Number(edt.horasReales) > 0
    ).length;

    return {
      categoria: cat.nombre,
      comercial,
      planificado,
      real,
      desviacion: planificado - comercial
    };
  });
}

function calcularDesviacionesTemporales(edts: any[]) {
  return edts
    .filter(edt => edt.fechaFinPlan && edt.fechaFinReal)
    .map(edt => {
      const planificada = new Date(edt.fechaFinPlan);
      const real = new Date(edt.fechaFinReal);
      const diffTime = real.getTime() - planificada.getTime();
      const diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        nombre: edt.nombre || `EDT ${edt.edt?.nombre}`,
        diasRetraso: diasRetraso > 0 ? diasRetraso : 0,
        estado: diasRetraso > 0 ? 'retrasado' : 'a_tiempo'
      };
    })
    .filter(item => item.diasRetraso > 0)
    .slice(0, 10); // Top 10 desviaciones
}

function calcularPrecisionComercial(comercial: any[], planificado: any[]) {
  if (comercial.length === 0) return 0;

  const coincidencias = comercial.filter(com =>
    planificado.some(plan =>
      plan.edtId === com.edtId
    )
  ).length;

  return (coincidencias / comercial.length) * 100;
}

function calcularEficienciaPlanificacion(planificado: any[]) {
  if (planificado.length === 0) return 0;

  const completados = planificado.filter(edt =>
    edt.estado === 'completado' ||
    (edt.registroHoras.length > 0 && edt.horasReales >= edt.horasPlan)
  ).length;

  return (completados / planificado.length) * 100;
}
