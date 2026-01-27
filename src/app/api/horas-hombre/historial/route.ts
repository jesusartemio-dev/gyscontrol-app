// API para cargar historial de horas desde la base de datos
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión del usuario
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('❌ HISTORIAL: No hay sesión válida');
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('🔍 HISTORIAL: Consultando registros de horas para usuario:', session.user.id);

    // Obtener registros de horas del usuario actual con información de proyectos y EDT
    const registros = await prisma.registroHoras.findMany({
      where: {
        usuarioId: session.user.id  // ✅ Filtrar por usuario actual
      },
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
        },
        proyectoEdt: {
          select: {
            id: true,
            nombre: true,
            edt: {
              select: {
                nombre: true
              }
            }
          }
        },
        proyectoTarea: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    console.log(`✅ HISTORIAL: Encontrados ${registros.length} registros`);

    // Mapear a formato esperado por el frontend con información completa
    const registrosFormateados = registros.map(registro => {
      // Determinar el nivel y nombre del elemento basado en las relaciones
      let nivel: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea' = 'edt';
      let elementoNombre = '';

      if (registro.proyectoTarea) {
        nivel = 'tarea';
        elementoNombre = registro.proyectoTarea.nombre;
      } else if (registro.proyectoEdt) {
        nivel = 'edt';
        elementoNombre = registro.proyectoEdt.nombre || registro.proyectoEdt.edt?.nombre || 'Sin nombre';
      } else {
        nivel = 'edt';
        elementoNombre = registro.nombreServicio || registro.categoria || 'Sin elemento';
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