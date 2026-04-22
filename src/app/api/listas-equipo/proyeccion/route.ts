/**
 * API para gestión de proyecciones de listas de equipo
 * Maneja las operaciones CRUD para listas técnicas en fase de proyección
 * 
 * @author TRAE AI - GYS System
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { registrarCreacion } from '@/lib/services/audit';
import { crearEvento } from '@/lib/utils/trazabilidad';

// ✅ Esquemas de validación
const FiltrosProyeccionSchema = z.object({
  proyectoId: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  estado: z.enum(['borrador', 'por_revisar', 'por_cotizar', 'por_aprobar', 'aprobada', 'anulada']).optional()
});

const CrearListaProyeccionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  proyectoId: z.string().min(1, 'El proyecto es requerido'),
  fechaRequerida: z.string().optional(),
  items: z.array(z.object({
    nombre: z.string().min(1),
    descripcion: z.string().optional(),
    cantidad: z.number().positive(),
    unidad: z.string().min(1),
    costoEstimado: z.number().positive().optional()
  })).min(1, 'Debe incluir al menos un item')
});

// 📡 GET - Obtener listas de proyección con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 🔁 Filtrar valores null de los parámetros de query
    const rawParams = {
      proyectoId: searchParams.get('proyectoId'),
      fechaDesde: searchParams.get('fechaDesde'),
      fechaHasta: searchParams.get('fechaHasta'),
      estado: searchParams.get('estado'),
      categoria: searchParams.get('categoria')
    };
    
    // Remover valores null
    const cleanParams = Object.fromEntries(
      Object.entries(rawParams).filter(([_, value]) => value !== null)
    );
    
    // ✅ Validar parámetros filtrados
    const filtros = FiltrosProyeccionSchema.parse(cleanParams);

    // 🔍 Construir filtros dinámicos
    const whereClause: any = {};
    
    if (filtros.proyectoId) {
      whereClause.proyectoId = filtros.proyectoId;
    }
    
    if (filtros.estado) {
      whereClause.estado = filtros.estado;
    }
    

    
    if (filtros.fechaDesde || filtros.fechaHasta) {
      whereClause.createdAt = {};
      if (filtros.fechaDesde) {
        whereClause.createdAt.gte = new Date(filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        whereClause.createdAt.lte = new Date(filtros.fechaHasta);
      }
    }

    // 📊 Obtener listas con información relacionada
    const listas = await prisma.listaEquipo.findMany({
      where: whereClause,
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        listaEquipoItem: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            cantidad: true,
            unidad: true,
            presupuesto: true,
            estado: true
          }
        },
        _count: {
          select: {
            listaEquipoItem: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // 🧮 Calcular métricas agregadas
    const metricas = {
      totalListas: listas.length,
      totalItems: listas.reduce((sum, lista) => sum + lista._count.listaEquipoItem, 0),
      costoTotalEstimado: listas.reduce((sum, lista) =>
        sum + lista.listaEquipoItem.reduce((itemSum, item) =>
          itemSum + (item.presupuesto || 0) * item.cantidad, 0
        ), 0
      ),
      distribucionEstados: listas.reduce((acc, lista) => {
        acc[lista.estado] = (acc[lista.estado] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    console.log('✅ Listas de proyección obtenidas:', {
      filtros,
      totalResultados: listas.length
    });

    return NextResponse.json({
      success: true,
      data: listas,
      metricas,
      filtros
    });

  } catch (error) {
    console.error('❌ Error al obtener listas de proyección:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parámetros de filtro inválidos',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

// 📝 POST - Crear nueva lista de proyección
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const datosValidados = CrearListaProyeccionSchema.parse(body);

    // 🔍 Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: datosValidados.proyectoId },
      select: { id: true, nombre: true }
    });

    if (!proyecto) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Proyecto no encontrado' 
        },
        { status: 404 }
      );
    }

    // 🏗️ Crear lista con items en transacción
    const nuevaLista = await prisma.$transaction(async (tx) => {
      // 🔍 Generar código y secuencia para la lista
      const ultimaLista = await tx.listaEquipo.findFirst({
        where: { proyectoId: datosValidados.proyectoId },
        orderBy: { numeroSecuencia: 'desc' }
      });
      
      const numeroSecuencia = (ultimaLista?.numeroSecuencia || 0) + 1;
      const codigo = `LST-${numeroSecuencia.toString().padStart(3, '0')}`;
      
      // Crear la lista principal
      const lista = await tx.listaEquipo.create({
        data: {
          id: `lista-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nombre: datosValidados.nombre,
          codigo: codigo,
          numeroSecuencia: numeroSecuencia,
          proyectoId: datosValidados.proyectoId,
          responsableId: 'temp-user-id', // TODO: Obtener del contexto de autenticación
          estado: 'borrador',
          updatedAt: new Date()
        }
      });

      // Crear los items asociados
      const listaEquipoItem = await Promise.all(
        datosValidados.items.map((item, index) =>
          tx.listaEquipoItem.create({
            data: {
              id: `lista-item-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
              listaId: lista.id,
              responsableId: 'temp-user-id', // TODO: Obtener del contexto de autenticación
              codigo: `${lista.codigo}-ITEM-${String(index + 1).padStart(3, '0')}`,
              descripcion: item.descripcion || item.nombre,
              cantidad: item.cantidad,
              unidad: item.unidad,
              presupuesto: item.costoEstimado,
              estado: 'borrador',
              updatedAt: new Date()
            }
          })
        )
      );

      return { ...lista, listaEquipoItem };
    });

    console.log('✅ Lista de proyección creada:', {
      listaId: nuevaLista.id,
      proyectoId: datosValidados.proyectoId,
      totalItems: datosValidados.items.length
    });

    // ✅ Registrar en auditoría
    if (session?.user?.id) {
      try {
        await registrarCreacion(
          'LISTA_EQUIPO',
          nuevaLista.id,
          session.user.id,
          nuevaLista.nombre,
          {
            proyecto: proyecto.nombre,
            codigo: nuevaLista.codigo,
            origen: 'proyeccion',
            totalItems: datosValidados.items.length,
          }
        );
      } catch (auditError) {
        console.error('Error al registrar auditoría:', auditError);
      }

      // 🕑 Evento de trazabilidad
      crearEvento(prisma, {
        listaEquipoId: nuevaLista.id,
        proyectoId: datosValidados.proyectoId,
        tipo: 'lista_creada',
        descripcion: `Lista ${nuevaLista.codigo} creada en proyección (${datosValidados.items.length} items)`,
        usuarioId: session.user.id,
        metadata: { codigo: nuevaLista.codigo, origen: 'proyeccion', totalItems: datosValidados.items.length },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: nuevaLista,
      message: 'Lista de proyección creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error al crear lista de proyección:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos de entrada inválidos',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

// 🔄 PUT - Actualizar estado de múltiples listas (operaciones en lote)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accion, listaIds, nuevoEstado, datos } = body;

    if (!accion || !listaIds || !Array.isArray(listaIds)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Acción y lista de IDs son requeridos' 
        },
        { status: 400 }
      );
    }

    let resultado;

    switch (accion) {
      case 'cambiar_estado':
        if (!nuevoEstado) {
          return NextResponse.json(
            { success: false, error: 'Nuevo estado es requerido' },
            { status: 400 }
          );
        }
        
        resultado = await prisma.listaEquipo.updateMany({
          where: { id: { in: listaIds } },
          data: { 
            estado: nuevoEstado
          }
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Acción no reconocida' },
          { status: 400 }
        );
    }

    console.log('✅ Operación en lote ejecutada:', {
      accion,
      listaIds,
      registrosAfectados: resultado.count
    });

    return NextResponse.json({
      success: true,
      data: resultado,
      message: `${resultado.count} listas actualizadas exitosamente`
    });

  } catch (error) {
    console.error('❌ Error en operación en lote:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
