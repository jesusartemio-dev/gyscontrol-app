// API para cargar historial de horas desde la base de datos
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 HISTORIAL: Consultando registros de horas...');

    // Obtener todos los registros de horas con información de proyectos
    const registros = await prisma.registroHoras.findMany({
      orderBy: {
        fechaTrabajo: 'desc'
      },
      take: 100, // Limitar a 100 registros más recientes
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        }
      }
    });

    console.log(`✅ HISTORIAL: Encontrados ${registros.length} registros`);

    // Mapear a formato esperado por el frontend usando información de proyectos
    const registrosFormateados = registros.map(registro => {
      // Determinar el nivel basado en qué existe
      let nivel: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea' = 'edt';
      let elementoNombre = registro.nombreServicio || 'Sin elemento';

      if (registro.proyectoTareaId) {
        nivel = 'tarea';
        elementoNombre = `Tarea: ${elementoNombre}`;
      } else {
        nivel = 'edt';
        elementoNombre = `EDT: ${elementoNombre}`;
      }

      // Formatear nombre del proyecto
      const proyectoNombre = registro.proyecto
        ? `${registro.proyecto.codigo} - ${registro.proyecto.nombre}`
        : `Proyecto ${registro.proyectoId.substring(0, 8)}...`;

      return {
        id: registro.id,
        fecha: registro.fechaTrabajo,
        horas: registro.horasTrabajadas,
        descripcion: registro.descripcion || '',
        nivel: nivel,
        elementoNombre: elementoNombre,
        proyectoNombre: proyectoNombre,
        aprobado: registro.aprobado
      };
    });

    console.log(`✅ HISTORIAL: Registros formateados: ${registrosFormateados.length}`);

    return NextResponse.json({
      success: true,
      data: registrosFormateados,
      count: registrosFormateados.length
    });

  } catch (error) {
    console.error('❌ HISTORIAL Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error cargando historial de horas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}