// ===================================================
// 📁 Archivo: audit.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para consultar el historial de auditoría
// ===================================================

import type { AuditLog } from '@/types/modelos';

const BASE_URL = '/api/audit';

// ✅ Obtener historial de auditoría para una entidad específica
export async function getAuditHistory(
  entidadTipo: string,
  entidadId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  try {
    const url = `${BASE_URL}?entidadTipo=${entidadTipo}&entidadId=${entidadId}&limit=${limit}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error('Error al obtener el historial de auditoría');
    }

    return await res.json();
  } catch (error) {
    console.error('❌ getAuditHistory:', error);
    return [];
  }
}

// ✅ Obtener historial de auditoría por usuario
export async function getAuditHistoryByUser(
  usuarioId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  try {
    const url = `${BASE_URL}/user/${usuarioId}?limit=${limit}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error('Error al obtener el historial del usuario');
    }

    return await res.json();
  } catch (error) {
    console.error('❌ getAuditHistoryByUser:', error);
    return [];
  }
}

// ✅ Obtener historial de auditoría por tipo de acción
export async function getAuditHistoryByAction(
  accion: string,
  limit: number = 50
): Promise<AuditLog[]> {
  try {
    const url = `${BASE_URL}/action/${accion}?limit=${limit}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error('Error al obtener el historial por acción');
    }

    return await res.json();
  } catch (error) {
    console.error('❌ getAuditHistoryByAction:', error);
    return [];
  }
}

// ✅ Formatear cambios para mostrar en la UI
export function formatAuditChanges(cambios: string | null | undefined): Record<string, any> {
  if (!cambios) return {};

  try {
    return JSON.parse(cambios);
  } catch (error) {
    console.error('Error parsing audit changes:', error);
    return {};
  }
}

// ✅ Formatear descripción de cambios para mostrar
export function formatAuditDescription(log: AuditLog): string {
  const cambios = formatAuditChanges(log.cambios);

  if (Object.keys(cambios).length === 0) {
    return log.descripcion;
  }

  const changedFields = Object.keys(cambios);
  if (changedFields.length === 1) {
    const field = changedFields[0];
    const { anterior, nuevo } = cambios[field];
    return `${log.descripcion}: ${field} cambió de "${anterior || 'vacío'}" a "${nuevo || 'vacío'}"`;
  }

  return `${log.descripcion}: ${changedFields.length} campos modificados`;
}

// ✅ Crear registro de auditoría para creación
export async function registrarCreacion(
  entidadTipo: string,
  entidadId: string,
  usuarioId: string,
  descripcion: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma');

    await prisma.auditLog.create({
      data: {
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
    const { prisma } = await import('@/lib/prisma');

    await prisma.auditLog.create({
      data: {
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
    const { prisma } = await import('@/lib/prisma');

    await prisma.auditLog.create({
      data: {
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
  data: AuditLog[];
  pagina: number;
  totalPaginas: number;
  total: number;
  limite: number;
}> {
  try {
    const { prisma } = await import('@/lib/prisma');

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
        usuario: {
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
): Promise<AuditLog[]> {
  try {
    const { prisma } = await import('@/lib/prisma');

    const where: any = {};
    if (usuarioId) where.usuarioId = usuarioId;

    const actividad = await prisma.auditLog.findMany({
      where,
      include: {
        usuario: {
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
