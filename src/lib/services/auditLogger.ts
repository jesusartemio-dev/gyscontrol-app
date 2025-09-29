/**
 * 🔐 Servicio de Auditoría para Permisos
 *
 * Registra todas las operaciones relacionadas con permisos en el sistema de auditoría.
 * Extiende el sistema de auditoría existente para incluir eventos de permisos.
 */

import { prisma } from '@/lib/prisma';

// ✅ Función para registrar cambios de permisos
export async function logPermissionChange(data: {
  userId: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'revoke';
  entityType: 'permission' | 'user_permission';
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entidadTipo: data.entityType === 'permission' ? 'PERMISO' : 'PERMISO_USUARIO',
        entidadId: data.entityId,
        accion: data.action.toUpperCase(),
        usuarioId: data.userId,
        descripcion: generatePermissionAuditDescription(data),
        cambios: data.newValues ? JSON.stringify({
          oldValues: data.oldValues || {},
          newValues: data.newValues
        }) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      }
    });
  } catch (error) {
    console.error('Error logging permission change:', error);
    // No lanzamos error para no interrumpir el flujo principal
  }
}

// ✅ Función para registrar accesos denegados por permisos
export async function logPermissionDenied(data: {
  userId: string;
  resource: string;
  action: string;
  path?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entidadTipo: 'PERMISO_ACCESO',
        entidadId: data.userId,
        accion: 'ACCESO_DENEGADO',
        usuarioId: data.userId,
        descripcion: `Acceso denegado a ${data.resource}:${data.action}${data.path ? ` en ${data.path}` : ''}`,
        metadata: JSON.stringify({
          resource: data.resource,
          action: data.action,
          path: data.path,
          ...data.metadata
        })
      }
    });
  } catch (error) {
    console.error('Error logging permission denied:', error);
  }
}

// ✅ Función para registrar cambios críticos de permisos
export async function logCriticalPermissionChange(data: {
  userId: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'revoke';
  entityType: 'permission' | 'user_permission';
  entityId: string;
  reason: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    // Para cambios críticos, también registramos en un log separado si es necesario
    await logPermissionChange(data);

    // Podríamos enviar notificaciones adicionales para cambios críticos
    console.warn(`🔴 CRITICAL PERMISSION CHANGE: ${data.action} on ${data.entityType} by user ${data.userId}`, {
      reason: data.reason,
      entityId: data.entityId,
      changes: { oldValues: data.oldValues, newValues: data.newValues }
    });

  } catch (error) {
    console.error('Error logging critical permission change:', error);
  }
}

// ✅ Función helper para generar descripciones de auditoría
function generatePermissionAuditDescription(data: {
  action: string;
  entityType: 'permission' | 'user_permission';
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}): string {
  const actionMap = {
    create: 'creó',
    update: 'actualizó',
    delete: 'eliminó',
    assign: 'asignó',
    revoke: 'revocó'
  };

  const entityMap = {
    permission: 'permiso',
    user_permission: 'permiso de usuario'
  };

  let description = `${actionMap[data.action as keyof typeof actionMap]} ${entityMap[data.entityType]}`;

  if (data.newValues?.name) {
    description += ` "${data.newValues.name}"`;
  } else if (data.newValues?.permissionName) {
    description += ` "${data.newValues.permissionName}"`;
  }

  if (data.action === 'assign' && data.newValues?.userName) {
    description += ` a usuario "${data.newValues.userName}"`;
  }

  if (data.action === 'revoke' && data.oldValues?.userName) {
    description += ` de usuario "${data.oldValues.userName}"`;
  }

  return description;
}

// ✅ Función para obtener historial de auditoría de permisos
export async function getPermissionAuditHistory(filters: {
  userId?: string;
  entityType?: 'PERMISO' | 'PERMISO_USUARIO' | 'PERMISO_ACCESO';
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}): Promise<{
  logs: Array<{
    id: string;
    fecha: Date;
    usuario: { id: string; name: string | null; email: string };
    accion: string;
    descripcion: string;
    cambios?: any;
    metadata?: any;
  }>;
  total: number;
}> {
  try {
    const where: any = {};

    if (filters.userId) {
      where.usuarioId = filters.userId;
    }

    if (filters.entityType) {
      where.entidadTipo = filters.entityType;
    }

    if (filters.entityId) {
      where.entidadId = filters.entityId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
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
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs: logs.map((log: any) => ({
        id: log.id,
        fecha: log.createdAt,
        usuario: log.usuario,
        accion: log.accion,
        descripcion: log.descripcion,
        cambios: log.cambios ? JSON.parse(log.cambios) : undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined
      })),
      total
    };

  } catch (error) {
    console.error('Error getting permission audit history:', error);
    throw new Error('Error al obtener historial de auditoría de permisos');
  }
}

// ✅ Función para obtener estadísticas de auditoría de permisos
export async function getPermissionAuditStats(period: 'day' | 'week' | 'month' = 'month'): Promise<{
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByUser: Array<{ userId: string; userName: string; count: number }>;
  recentCriticalChanges: Array<{
    id: string;
    fecha: Date;
    usuario: string;
    descripcion: string;
  }>;
}> {
  try {
    const dateFrom = new Date();
    switch (period) {
      case 'day':
        dateFrom.setDate(dateFrom.getDate() - 1);
        break;
      case 'week':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        break;
    }

    const [totalEvents, eventsByActionResult, eventsByUserResult, recentCriticalChanges] = await Promise.all([
      // Total de eventos
      prisma.auditLog.count({
        where: {
          entidadTipo: { in: ['PERMISO', 'PERMISO_USUARIO', 'PERMISO_ACCESO'] },
          createdAt: { gte: dateFrom }
        }
      }),

      // Eventos por acción
      prisma.auditLog.groupBy({
        by: ['accion'],
        where: {
          entidadTipo: { in: ['PERMISO', 'PERMISO_USUARIO', 'PERMISO_ACCESO'] },
          createdAt: { gte: dateFrom }
        },
        _count: true
      }),

      // Eventos por usuario
      prisma.$queryRaw<Array<{ userId: string; userName: string; count: bigint }>>`
        SELECT
          u.id as "userId",
          u.name as "userName",
          COUNT(a.id) as count
        FROM "AuditLog" a
        JOIN "User" u ON a."usuarioId" = u.id
        WHERE a."entidadTipo" IN ('PERMISO', 'PERMISO_USUARIO', 'PERMISO_ACCESO')
          AND a."createdAt" >= ${dateFrom}
        GROUP BY u.id, u.name
        ORDER BY count DESC
        LIMIT 10
      `,

      // Cambios críticos recientes
      prisma.auditLog.findMany({
        where: {
          entidadTipo: { in: ['PERMISO', 'PERMISO_USUARIO'] },
          accion: { in: ['CREATE', 'DELETE', 'ASSIGN', 'REVOKE'] },
          createdAt: { gte: dateFrom }
        },
        include: {
          usuario: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const eventsByAction = eventsByActionResult.reduce((acc: Record<string, number>, item: any) => {
      acc[item.accion] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const eventsByUser = eventsByUserResult.map((item: any) => ({
      userId: item.userId,
      userName: item.userName || 'Sin nombre',
      count: Number(item.count)
    }));

    return {
      totalEvents,
      eventsByAction,
      eventsByUser,
      recentCriticalChanges: recentCriticalChanges.map((change: any) => ({
        id: change.id,
        fecha: change.createdAt,
        usuario: change.usuario.name || 'Sin nombre',
        descripcion: change.descripcion
      }))
    };

  } catch (error) {
    console.error('Error getting permission audit stats:', error);
    throw new Error('Error al obtener estadísticas de auditoría de permisos');
  }
}

// ✅ Función para registrar cambios de estado (compatibilidad con código existente)
export async function logStatusChange(data: {
  userId: string;
  entityType: string;
  entityId: string;
  oldStatus?: string;
  newStatus: string;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entidadTipo: data.entityType.toUpperCase(),
        entidadId: data.entityId,
        accion: 'STATUS_CHANGE',
        usuarioId: data.userId,
        descripcion: data.description || `Cambio de estado${data.oldStatus ? ` de "${data.oldStatus}"` : ''} a "${data.newStatus}"`,
        cambios: JSON.stringify({
          oldStatus: data.oldStatus,
          newStatus: data.newStatus
        }),
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      }
    });
  } catch (error) {
    console.error('Error logging status change:', error);
  }
}