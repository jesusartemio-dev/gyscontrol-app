// API para obtener EDTs basado en cronograma de ejecución (vista completa)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Función para detectar si un string parece ser un CUID (ID autogenerado)
function pareceSerCuid(str: string | null | undefined): boolean {
  if (!str) return false;
  // CUID válido: empieza con 'c', tiene EXACTAMENTE 25-30 caracteres alfanuméricos
  return /^c[a-z0-9]{24,29}$/.test(str);
}

// Función para obtener un nombre legible, evitando mostrar IDs
function obtenerNombreLegible(nombre: string | null | undefined, fallback: string = 'Sin nombre'): string {
  if (!nombre) return fallback;
  
  // Si es un CUID, usar fallback
  if (pareceSerCuid(nombre)) return fallback;
  
  // Si no es CUID, devolver el nombre tal cual
  return nombre;
}

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

    // 1. Buscar el cronograma de EJECUCIÓN del proyecto
    const cronogramaEjecucion = await prisma.proyectoCronograma.findFirst({
      where: {
        proyectoId,
        tipo: 'ejecucion'
      },
      select: { id: true }
    });

    console.log('🔍 EDTS SIMPLE: Cronograma de ejecución:', cronogramaEjecucion?.id || 'NO ENCONTRADO');

    // 2. Obtener solo los EDTs del cronograma de EJECUCIÓN
    let proyectoEdts: any[] = [];

    if (cronogramaEjecucion) {
      proyectoEdts = await prisma.proyectoEdt.findMany({
        where: {
          proyectoId,
          proyectoCronogramaId: cronogramaEjecucion.id
        },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          horasPlan: true,
          horasReales: true,
          estado: true,
          porcentajeAvance: true,
          orden: true,
          edtId: true,
          proyectoCronogramaId: true,
          edt: {
            select: { id: true, nombre: true, descripcion: true }
          },
          user: {
            select: { id: true, name: true }
          },
          // Incluir tareas del EDT a través de actividades
          proyectoActividad: {
            select: {
              id: true,
              nombre: true,
              proyectoTarea: {
                select: {
                  id: true,
                  nombre: true
                },
                orderBy: { orden: 'asc' }
              }
            },
            orderBy: { orden: 'asc' }
          }
        },
        orderBy: { orden: 'asc' }
      });
    }

    console.log(`🔍 EDTS SIMPLE: EDTs del cronograma de ejecución:`, proyectoEdts.length);
    proyectoEdts.forEach((edt: any, index: number) => {
      console.log(`🔍 EDT ${index + 1}:`, {
        id: edt.id,
        nombre: edt.nombre,
        edtNombre: edt.edt?.nombre,
        responsable: edt.user?.name
      });
    });

    // 2. Si no hay cronograma de ejecución, retornar sin EDTs
    if (!cronogramaEjecucion) {
      console.log('🔍 EDTS SIMPLE: No hay cronograma de ejecución para este proyecto');
      return NextResponse.json({
        success: true,
        edts: [],
        hasCronogramaEjecucion: false
      });
    }

    // 3. DEDUPLICACIÓN: Solo eliminar duplicados exactos por ID (no por categoría)
    const edtsUnicos = proyectoEdts.reduce((acc: Record<string, any>, edt: any) => {
      const edtId = edt.id;

      // Solo mantener un EDT por ID específico
      if (!acc[edtId]) {
        acc[edtId] = edt;
      }

      return acc;
    }, {} as Record<string, any>);

    // 4. MAPEAR al formato esperado por el wizard
    const edts = Object.values(edtsUnicos).map((edt: any, index: number) => {
      const fallbackNombre = `EDT ${index + 1}`;

      // Log detallado para debug
      console.log(`🔍 Procesando EDT ${index + 1}:`, {
        id: edt.id,
        nombre: edt.nombre,
        pareceSerCuidNombre: pareceSerCuid(edt.nombre),
        descripcion: edt.descripcion,
        edtId: edt.edtId,
        edtRelacion: edt.edt ? {
          id: edt.edt.id,
          nombre: edt.edt.nombre,
          pareceSerCuidEdtNombre: pareceSerCuid(edt.edt?.nombre),
          descripcion: edt.edt.descripcion
        } : 'NO HAY RELACION EDT'
      });

      // ✅ Buscar un nombre legible en este orden de prioridad:
      // 1. nombre del ProyectoEdt (si no es un CUID)
      // 2. nombre del catálogo Edt (si no es un CUID)
      // 3. descripción del ProyectoEdt
      // 4. descripción del catálogo Edt
      // 5. Fallback genérico con índice
      let nombreFinal = obtenerNombreLegible(edt.nombre, '');
      if (!nombreFinal) nombreFinal = obtenerNombreLegible(edt.edt?.nombre, '');
      if (!nombreFinal) nombreFinal = obtenerNombreLegible(edt.descripcion, '');
      if (!nombreFinal) nombreFinal = obtenerNombreLegible(edt.edt?.descripcion, '');
      if (!nombreFinal) nombreFinal = fallbackNombre;

      // Para categoriaNombre, usar la misma lógica
      let categoriaNombre = obtenerNombreLegible(edt.edt?.nombre, '');
      if (!categoriaNombre) categoriaNombre = obtenerNombreLegible(edt.edt?.descripcion, '');
      if (!categoriaNombre) categoriaNombre = nombreFinal;

      console.log(`✅ EDT ${index + 1} resultado: nombre="${nombreFinal}", categoria="${categoriaNombre}"`);

      // Extraer tareas de las actividades del EDT
      const tareas: { id: string; nombre: string; proyectoActividad?: { nombre: string } | null }[] = []
      if (edt.proyectoActividad && Array.isArray(edt.proyectoActividad)) {
        for (const actividad of edt.proyectoActividad) {
          if (actividad.proyectoTarea && Array.isArray(actividad.proyectoTarea)) {
            for (const tarea of actividad.proyectoTarea) {
              tareas.push({
                id: tarea.id,
                nombre: tarea.nombre,
                proyectoActividad: { nombre: actividad.nombre }
              })
            }
          }
        }
      }

      return {
        id: edt.id,
        nombre: nombreFinal,
        categoriaNombre: categoriaNombre,
        responsableNombre: edt.user?.name || 'Sin responsable',
        horasPlan: Number(edt.horasPlan || 0),
        horasReales: Number(edt.horasReales || 0),
        estado: edt.estado,
        progreso: edt.porcentajeAvance,
        tareas: tareas
      }
    });

    console.log('🔍 EDTS SIMPLE: EDTs finales únicos:', edts.length);

    return NextResponse.json({
      success: true,
      edts,
      hasCronogramaEjecucion: true
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
