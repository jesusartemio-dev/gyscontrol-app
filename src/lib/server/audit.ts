// ===================================================
// 📁 Archivo: audit.ts
// 📌 Ubicación: src/lib/server
// 🔧 Descripción: Funciones de auditoría que usan Prisma (server-only)
// ===================================================

import "server-only";
import { prisma } from '@/lib/prisma';
import type { AuditLog } from '@/types/modelos';

// ✅ Crear registro de auditoría para creación
export async function registrarCreacion(
  entidadTipo: string,
  entidadId: string,
  usuarioId: string,
  descripcion: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entidadTipo,
        entidadId,
        accion: 'CREAR',
        usuarioId,
        descripcion,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    console.error('Error al registrar creación en auditoría:', error);
    throw error;
  }
}

// ✅ Crear registro de auditoría para actualización
export async function registrarActualizacion(
  entidadTipo: string,
  entidadId: string,
  usuarioId: string,
  descripcion: string,
  cambios?: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entidadTipo,
        entidadId,
        accion: 'ACTUALIZAR',
        usuarioId,
        descripcion,
        cambios: cambios ? JSON.stringify(cambios) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    console.error('Error al registrar actualización en auditoría:', error);
    throw error;
  }
}

// ✅ Crear registro de auditoría para eliminación
export async function registrarEliminacion(
  entidadTipo: string,
  entidadId: string,
  usuarioId: string,
  descripcion: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entidadTipo,
        entidadId,
        accion: 'ELIMINAR',
        usuarioId,
        descripcion,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    console.error('Error al registrar eliminación en auditoría:', error);
    throw error;
  }
}

// ✅ Obtener historial de entidad con filtros y paginación
export async function obtenerHistorialEntidad(
  entidadTipo: string,
  entidadId: string,
  filtros: {
    usuarioId?: string;
    accion?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
    limite?: number;
    pagina?: number;
  }
): Promise<{
  data: any[];
  pagina: number;
  totalPaginas: number;
  total: number;
  limite: number;
}> {
  try {
    const {
      usuarioId,
      accion,
      fechaDesde,
      fechaHasta,
      limite = 50,
      pagina = 1
    } = filtros;

    const skip = (pagina - 1) * limite;

    // Construir filtros
    const where: any = {
      entidadTipo,
      entidadId
    };

    if (usuarioId) where.usuarioId = usuarioId;
    if (accion) where.accion = accion;
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = fechaDesde;
      if (fechaHasta) where.createdAt.lte = fechaHasta;
    }

    // Obtener total para paginación
    const total = await prisma.auditLog.count({ where });

    // Obtener registros con usuario
    const data = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limite
    });

    const totalPaginas = Math.ceil(total / limite);

    return {
      data,
      pagina,
      totalPaginas,
      total,
      limite
    };
  } catch (error) {
    console.error('Error al obtener historial de entidad:', error);
    throw error;
  }
}

// ✅ Obtener actividad reciente del sistema
export async function obtenerActividadReciente(
  limite: number = 20,
  usuarioId?: string
): Promise<any[]> {
  try {
    const where: any = {};
    if (usuarioId) where.usuarioId = usuarioId;

    const actividad = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limite
    });

    return actividad;
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    throw error;
  }
}