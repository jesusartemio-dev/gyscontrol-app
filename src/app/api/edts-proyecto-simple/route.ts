// API para obtener EDTs basado en cronograma de ejecución (vista completa)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get('proyectoId');

    if (!proyectoId) {
      return NextResponse.json(
        { error: 'proyectoId requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 EDTS SIMPLE: Consultando EDTs para proyecto:', proyectoId);

    // 1. PRIORIDAD: Obtener EDTs del CRONOGRAMA DE EJECUCIÓN (vista completa)
    const cronogramaEjecucion = await prisma.proyectoCronograma.findFirst({
      where: { 
        proyectoId,
        tipo: 'ejecucion' // Cronograma de ejecución tiene todos los EDTs
      },
      select: { id: true }
    });

    let proyectoEdts = [];

    if (cronogramaEjecucion) {
      console.log('🔍 EDTS SIMPLE: Usando cronograma de ejecución:', cronogramaEjecucion.id);
      
      // Obtener EDTs del cronograma de ejecución
      proyectoEdts = await prisma.proyectoEdt.findMany({
        where: { 
          proyectoId,
          proyectoCronogramaId: cronogramaEjecucion.id
        },
        include: {
          categoriaServicio: { 
            select: { id: true, nombre: true } 
          },
          responsable: { 
            select: { id: true, name: true } 
          }
        },
        orderBy: { orden: 'asc' }
      });

      console.log('🔍 EDTS SIMPLE: EDTs de cronograma ejecución:', proyectoEdts.length);

    } else {
      console.log('🔍 EDTS SIMPLE: No hay cronograma de ejecución, usando servicios como fallback');
      
      // 2. FALLBACK: Si no hay cronograma de ejecución, usar servicios
      const proyectoServicios = await prisma.proyectoServicioCotizado.findMany({
        where: { proyectoId },
        select: {
          id: true,
          edt: { select: { nombre: true } },
          responsable: {
            select: { name: true }
          }
        }
      });

      console.log('🔍 EDTS SIMPLE: Servicios del proyecto:', proyectoServicios.length);

      // Crear EDTs basados en las categorías de servicios (ahora desde EDT)
      const categoriasEdt = [...new Set(proyectoServicios.map(s => s.edt?.nombre).filter(Boolean))];
      
      proyectoEdts = categoriasEdt.map((categoria, index) => ({
        id: `categoria-${index}`, // ID temporal
        nombre: `EDT - ${categoria}`,
        categoriaServicioId: categoria,
        categoriaServicio: {
          id: categoria,
          nombre: categoria
        },
        responsable: proyectoServicios.find(s => s.edt?.nombre === categoria)?.responsable || { name: 'Sin responsable' },
        horasPlan: 0,
        horasReales: 0,
        estado: 'planificado',
        porcentajeAvance: 0,
        orden: index
      }));

      console.log('🔍 EDTS SIMPLE: EDTs de fallback construidos:', proyectoEdts.length);
    }

    // 3. DEDUPLICACIÓN: Solo eliminar duplicados exactos por ID (no por categoría)
    const edtsUnicos = proyectoEdts.reduce((acc, edt) => {
      const edtId = edt.id;
      
      // Solo mantener un EDT por ID específico
      if (!acc[edtId]) {
        acc[edtId] = edt;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // 4. MAPEAR al formato esperado por el wizard
    const edts = Object.values(edtsUnicos).map((edt: any) => ({
      id: edt.id,
      nombre: edt.nombre,
      categoriaNombre: edt.categoriaServicio?.nombre || 'Sin categoría',
      responsableNombre: edt.responsable?.name || 'Sin responsable',
      horasPlan: Number(edt.horasPlan || 0),
      horasReales: Number(edt.horasReales || 0),
      estado: edt.estado,
      progreso: edt.porcentajeAvance
    }));

    console.log('🔍 EDTS SIMPLE: EDTs finales únicos:', edts.length);

    return NextResponse.json({
      success: true,
      edts
    });

  } catch (error) {
    console.error('❌ EDTS SIMPLE Error:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo EDTs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}