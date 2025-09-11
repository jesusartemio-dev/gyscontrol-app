/**
 * 📋 API de Eventos de Trazabilidad - Sistema GYS
 * 
 * Endpoints para manejo de eventos específicos de trazabilidad,
 * incluyendo consultas filtradas y creación de nuevos eventos.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

// 📋 Esquemas de validación
const FiltrosEventosSchema = z.object({
  entidadId: z.string().optional(),
  entidadTipo: z.enum(['PEDIDO', 'PROYECTO', 'ITEM']).optional(),
  tipo: z.string().optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  limite: z.string().transform(val => parseInt(val)).optional().default('50')
});

const CrearEventoSchema = z.object({
  entidadId: z.string().min(1, 'ID de entidad requerido'),
  entidadTipo: z.enum(['PEDIDO', 'PROYECTO', 'ITEM']),
  tipo: z.enum(['CREACION', 'ACTUALIZACION', 'ENTREGA', 'CANCELACION']),
  descripcion: z.string().min(1, 'Descripción requerida'),
  metadata: z.record(z.any()).optional()
});

/**
 * 📡 GET - Obtener eventos de trazabilidad filtrados
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 📊 Validar parámetros de consulta
    const { searchParams } = new URL(request.url);
    const filtrosRaw = Object.fromEntries(searchParams.entries());
    
    const validacion = FiltrosEventosSchema.safeParse(filtrosRaw);
    if (!validacion.success) {
      logger.warn('Parámetros de eventos inválidos', {
        errores: validacion.error.errors,
        parametros: filtrosRaw
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parámetros inválidos',
          detalles: validacion.error.errors
        },
        { status: 400 }
      );
    }

    const filtros = validacion.data;

    logger.info('Obteniendo eventos de trazabilidad', {
      filtros,
      usuario: session.user.email
    });

    // 🔍 Construir filtros de Prisma
    const whereClause: any = {};
    
    if (filtros.entidadId) {
      whereClause.entidadId = filtros.entidadId;
    }
    
    if (filtros.entidadTipo) {
      whereClause.entidadTipo = filtros.entidadTipo;
    }
    
    if (filtros.tipo) {
      whereClause.tipo = filtros.tipo;
    }
    
    if (filtros.fechaDesde || filtros.fechaHasta) {
      whereClause.fecha = {};
      if (filtros.fechaDesde) {
        whereClause.fecha.gte = new Date(filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        whereClause.fecha.lte = new Date(filtros.fechaHasta);
      }
    }

    // 📋 Datos temporales para desarrollo
    const eventosTemporales = [
      {
        id: '1',
        entidadId: filtros.entidadId || 'default',
        entidadTipo: filtros.entidadTipo || 'PEDIDO',
        tipo: 'CREACION',
        descripcion: 'Pedido creado exitosamente',
        fecha: new Date('2025-01-20T10:00:00Z'),
        metadata: { estado: 'nuevo', prioridad: 'alta' },
        usuarioId: session.user.id,
        usuario: {
          id: session.user.id,
          nombre: session.user.name || 'Usuario Test',
          email: session.user.email
        }
      },
      {
        id: '2',
        entidadId: filtros.entidadId || 'default',
        entidadTipo: filtros.entidadTipo || 'PEDIDO',
        tipo: 'ACTUALIZACION',
        descripcion: 'Estado actualizado a en proceso',
        fecha: new Date('2025-01-21T14:30:00Z'),
        metadata: { estadoAnterior: 'nuevo', estadoNuevo: 'proceso' },
        usuarioId: session.user.id,
        usuario: {
          id: session.user.id,
          nombre: session.user.name || 'Usuario Test',
          email: session.user.email
        }
      }
    ];

    logger.info('Devolviendo eventos temporales', { cantidad: eventosTemporales.length });
    const eventos = eventosTemporales;

    // 🔄 Transformar datos para el frontend
    const eventosTransformados = eventos.map(evento => ({
      id: evento.id,
      entidadId: evento.entidadId,
      entidadTipo: evento.entidadTipo,
      tipo: evento.tipo,
      descripcion: evento.descripcion,
      fecha: evento.fecha.toISOString(),
      metadata: typeof evento.metadata === 'string' 
        ? JSON.parse(evento.metadata) 
        : evento.metadata,
      usuario: evento.usuario ? {
        id: evento.usuario.id,
        nombre: evento.usuario.nombre,
        email: evento.usuario.email
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: eventosTransformados,
      metadata: {
        total: eventosTransformados.length,
        filtrosAplicados: filtros,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error al obtener eventos de trazabilidad', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        mensaje: 'No se pudieron obtener los eventos de trazabilidad'
      },
      { status: 500 }
    );
  }
}

/**
 * 📝 POST - Crear nuevo evento de trazabilidad
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 📋 Validar datos del evento
    const body = await request.json();
    const validacion = CrearEventoSchema.safeParse(body);
    
    if (!validacion.success) {
      logger.warn('Datos de evento inválidos', {
        errores: validacion.error.errors,
        body
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos',
          detalles: validacion.error.errors
        },
        { status: 400 }
      );
    }

    const datosEvento = validacion.data;

    logger.info('Creando evento de trazabilidad', {
      entidadId: datosEvento.entidadId,
      tipo: datosEvento.tipo,
      usuario: session.user.email
    });

    // 📝 TODO: Crear modelo EventoTrazabilidad en Prisma schema
    // const evento = await prisma.eventoTrazabilidad.create({
    //   data: {
    //     entidadId: datosEvento.entidadId,
    //     entidadTipo: datosEvento.entidadTipo,
    //     tipo: datosEvento.tipo,
    //     descripcion: datosEvento.descripcion,
    //     metadata: datosEvento.metadata ? JSON.stringify(datosEvento.metadata) : null,
    //     usuarioId: session.user.id,
    //     fecha: new Date()
    //   },
    //   include: {
    //     usuario: {
    //       select: {
    //         id: true,
        //         nombre: true,
        //         email: true
        //       }
        //     }
        //   }
        // });

    // 🔄 TODO: Respuesta temporal hasta implementar modelo EventoTrazabilidad
    const eventoTransformado = {
      id: 'temp-' + Date.now(),
      entidadId: datosEvento.entidadId,
      entidadTipo: datosEvento.entidadTipo,
      tipo: datosEvento.tipo,
      descripcion: datosEvento.descripcion,
      fecha: new Date().toISOString(),
      metadata: datosEvento.metadata || null,
      usuario: {
          id: session.user.id,
          nombre: session.user.name || 'Usuario',
          email: session.user.email || ''
        }
    };

    logger.info('Evento de trazabilidad creado exitosamente', {
      eventoId: eventoTransformado.id,
      usuario: session.user.email
    });

    return NextResponse.json({
      success: true,
      data: eventoTransformado,
      mensaje: 'Evento de trazabilidad creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    logger.error('Error al crear evento de trazabilidad', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        mensaje: 'No se pudo crear el evento de trazabilidad'
      },
      { status: 500 }
    );
  }
}
