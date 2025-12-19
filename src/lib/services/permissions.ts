/**
 * 🔐 Servicio de Permisos Granulares
 *
 * Maneja la lógica de negocio para el sistema de permisos del sistema GYS.
 * Incluye verificación de permisos, asignación, revocación y gestión de permisos.
 */

import { prisma } from '@/lib/prisma';
import type {
  Permission,
  UserPermission,
  PermissionCheck,
  PermissionCheckResult,
  CreatePermissionPayload,
  UpdatePermissionPayload,
  AssignPermissionPayload,
  UserWithPermissions,
  PermissionWithUsers,
  SystemRole,
  PermissionResource,
  PermissionAction
} from '@/types/permissions';
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES } from '@/types/permissions';
import { ALL_BASE_PERMISSIONS } from '@/lib/permissions/base-permissions';

// ✅ Verificar si un usuario tiene un permiso específico
export async function checkUserPermission(
  userId: string,
  resource: PermissionResource,
  action: PermissionAction
): Promise<PermissionCheckResult> {
  try {
    // 1. Buscar permisos directos del usuario
    const userPermissions = await prisma.userPermissions.findMany({
      where: {
        userId,
        permission: {
          resource,
          action
        }
      },
      include: {
        permission: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // 2. Verificar si hay un permiso directo (grant o deny)
    const directPermission = userPermissions.find((up: any) => up.type === 'grant');
    const directDeny = userPermissions.find((up: any) => up.type === 'deny');

    if (directDeny) {
      return {
        hasPermission: false,
        userPermission: directDeny as any,
        reason: 'Permiso denegado explícitamente'
      };
    }

    if (directPermission) {
      return {
        hasPermission: true,
        permission: directPermission.permission as any,
        userPermission: directPermission as any
      };
    }

    // 3. Si no hay permisos directos, verificar permisos por rol
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return {
        hasPermission: false,
        reason: 'Usuario no encontrado'
      };
    }

    // 4. Verificar si el rol del usuario incluye esta acción
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role as SystemRole] || [];
    const hasRolePermission = rolePermissions.includes(action);

    if (hasRolePermission) {
      return {
        hasPermission: true,
        reason: `Permiso concedido por rol: ${user.role}`
      };
    }

    // 5. Si no tiene permiso por rol ni directo, denegar
    return {
      hasPermission: false,
      reason: 'No tiene permiso para esta acción'
    };

  } catch (error) {
    console.error('Error checking user permission:', error);
    return {
      hasPermission: false,
      reason: 'Error interno del sistema'
    };
  }
}

// ✅ Verificar múltiples permisos a la vez
export async function checkUserPermissions(
  userId: string,
  checks: PermissionCheck[]
): Promise<PermissionCheckResult[]> {
  const results = await Promise.all(
    checks.map(check => checkUserPermission(userId, check.resource, check.action))
  );
  return results;
}

// ✅ Obtener todos los permisos de un usuario
export async function getUserPermissions(userId: string): Promise<UserWithPermissions> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPermissions: {
          include: {
            permission: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Calcular permisos efectivos (combinando rol + permisos directos)
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role as SystemRole] || [];
    const effectivePermissions: Permission[] = [];

    // Agregar permisos del rol (convertir BasePermission a Permission)
    for (const action of rolePermissions) {
      const basePermissions = ALL_BASE_PERMISSIONS.filter(
        p => p.action === action
      );
      // Convertir BasePermission a Permission agregando propiedades faltantes
      const convertedPermissions: Permission[] = basePermissions.map(bp => ({
        ...bp,
        id: bp.name, // Usar name como id para permisos de rol
        resource: bp.resource as PermissionResource, // Cast to PermissionResource
        action: bp.action as PermissionAction, // Cast to PermissionAction
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      effectivePermissions.push(...convertedPermissions);
    }

    // Agregar permisos directos (sobrescribiendo si es necesario)
    for (const userPerm of user.userPermissions) {
      if (userPerm.type === 'grant') {
        // Remover permisos del rol si hay conflicto
        const existingIndex = effectivePermissions.findIndex(
          p => p.resource === userPerm.permission.resource && p.action === userPerm.permission.action
        );
        if (existingIndex >= 0) {
          effectivePermissions.splice(existingIndex, 1);
        }
        effectivePermissions.push(userPerm.permission as any);
      }
    }

    return {
      id: user.id,
      name: user.name || undefined,
      email: user.email,
      role: user.role,
      userPermissions: user.userPermissions as any,
      effectivePermissions
    };

  } catch (error) {
    console.error('Error getting user permissions:', error);
    throw new Error('Error al obtener permisos del usuario');
  }
}

// ✅ Asignar un permiso a un usuario
export async function assignPermissionToUser(
  payload: AssignPermissionPayload,
  assignedBy?: string
): Promise<UserPermission> {
  try {
    // Verificar que el permiso existe
    const permission = await prisma.permission.findUnique({
      where: { id: payload.permissionId }
    });

    if (!permission) {
      throw new Error('Permiso no encontrado');
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Crear o actualizar el permiso de usuario
    const userPermission = await prisma.userPermissions.upsert({
      where: {
        userId_permissionId: {
          userId: payload.userId,
          permissionId: payload.permissionId
        }
      },
      update: {
        type: payload.type,
        updatedAt: new Date()
      },
      create: {
        userId: payload.userId,
        permissionId: payload.permissionId,
        type: payload.type,
        createdBy: assignedBy
      },
      include: {
        user: true,
        permission: true
      }
    });

    // TODO: Registrar en auditoría
    // await auditLogger.logPermissionChange({
    //   userId: assignedBy || payload.userId,
    //   action: 'assign',
    //   entityType: 'user_permission',
    //   entityId: userPermission.id,
    //   newValues: { type: payload.type }
    // });

    return userPermission as any;

  } catch (error) {
    console.error('Error assigning permission:', error);
    throw error;
  }
}

// ✅ Revocar un permiso de un usuario
export async function revokePermissionFromUser(
  userId: string,
  permissionId: string,
  revokedBy?: string
): Promise<void> {
  try {
    const userPermission = await prisma.userPermissions.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId
        }
      }
    });

    if (!userPermission) {
      throw new Error('El usuario no tiene este permiso asignado');
    }

    await prisma.userPermissions.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId
        }
      }
    });

    // TODO: Registrar en auditoría
    // await auditLogger.logPermissionChange({
    //   userId: revokedBy || userId,
    //   action: 'revoke',
    //   entityType: 'user_permission',
    //   entityId: userPermission.id,
    //   oldValues: { type: userPermission.type }
    // });

  } catch (error) {
    console.error('Error revoking permission:', error);
    throw error;
  }
}

// ✅ Crear un nuevo permiso
export async function createPermission(
  payload: CreatePermissionPayload
): Promise<Permission> {
  try {
    // Verificar que no exista un permiso con el mismo nombre
    const existing = await prisma.permission.findUnique({
      where: { name: payload.name }
    });

    if (existing) {
      throw new Error('Ya existe un permiso con este nombre');
    }

    const permission = await prisma.permission.create({
      data: {
        name: payload.name,
        description: payload.description,
        resource: payload.resource,
        action: payload.action,
        isSystemPermission: payload.isSystemPermission ?? true
      }
    });

    return permission as any;

  } catch (error) {
    console.error('Error creating permission:', error);
    throw error;
  }
}

// ✅ Actualizar un permiso
export async function updatePermission(
  id: string,
  payload: UpdatePermissionPayload
): Promise<Permission> {
  try {
    const permission = await prisma.permission.findUnique({
      where: { id }
    });

    if (!permission) {
      throw new Error('Permiso no encontrado');
    }

    // No permitir modificar permisos del sistema
    if (permission.isSystemPermission && payload.isSystemPermission === false) {
      throw new Error('No se pueden modificar permisos del sistema');
    }

    const updated = await prisma.permission.update({
      where: { id },
      data: payload
    });

    return updated as any;

  } catch (error) {
    console.error('Error updating permission:', error);
    throw error;
  }
}

// ✅ Eliminar un permiso
export async function deletePermission(id: string): Promise<void> {
  try {
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        userPermissions: true
      }
    });

    if (!permission) {
      throw new Error('Permiso no encontrado');
    }

    // No permitir eliminar permisos del sistema
    if (permission.isSystemPermission) {
      throw new Error('No se pueden eliminar permisos del sistema');
    }

    // Verificar que no haya usuarios con este permiso
    if (permission.userPermissions.length > 0) {
      throw new Error('No se puede eliminar un permiso que está asignado a usuarios');
    }

    await prisma.permission.delete({
      where: { id }
    });

  } catch (error) {
    console.error('Error deleting permission:', error);
    throw error;
  }
}

// ✅ Obtener permisos con información de usuarios
export async function getPermissionsWithUsers(): Promise<PermissionWithUsers[]> {
  try {
    const permissions = await prisma.permission.findMany({
      include: {
        userPermissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    return permissions.map((permission: any) => ({
      ...permission,
      userCount: permission.userPermissions.length
    }));

  } catch (error) {
    console.error('Error getting permissions with users:', error);
    throw new Error('Error al obtener permisos con usuarios');
  }
}

// ✅ Inicializar permisos del sistema
export async function initializeSystemPermissions(): Promise<void> {
  try {
    console.log('🔄 Inicializando permisos del sistema...');

    for (const basePermission of ALL_BASE_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: basePermission.name },
        update: {
          description: basePermission.description,
          resource: basePermission.resource,
          action: basePermission.action
        },
        create: {
          name: basePermission.name,
          description: basePermission.description,
          resource: basePermission.resource,
          action: basePermission.action,
          isSystemPermission: basePermission.isSystemPermission
        }
      });
    }

    console.log('✅ Permisos del sistema inicializados correctamente');

  } catch (error) {
    console.error('❌ Error inicializando permisos del sistema:', error);
    throw error;
  }
}

// ✅ Obtener permisos disponibles para un rol
export function getPermissionsForRole(role: SystemRole): PermissionAction[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

// ✅ Verificar si un usuario puede realizar una acción crítica
export async function canPerformCriticalAction(
  userId: string,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  // Para acciones críticas, requerir verificación explícita
  const result = await checkUserPermission(userId, resource, action);
  return result.hasPermission && !!result.userPermission; // Debe ser un permiso explícito
}
