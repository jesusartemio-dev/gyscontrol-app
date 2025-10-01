/**
 * 🎣 Hooks para el Sistema de Permisos
 *
 * Hooks de React para facilitar el uso del sistema de permisos
 * en componentes y páginas del sistema GYS.
 */

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import type {
  PermissionCheck,
  PermissionCheckResult,
  UserWithPermissions,
  PermissionResource,
  PermissionAction
} from '@/types/permissions';

// ✅ Hook para verificar un permiso específico
export function usePermission(
  resource: PermissionResource,
  action: PermissionAction
) {
  const { data: session } = useSession();
  const [result, setResult] = useState<PermissionCheckResult>({
    hasPermission: false,
    reason: 'Verificando...'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setResult({
        hasPermission: false,
        reason: 'Usuario no autenticado'
      });
      setLoading(false);
      return;
    }

    // Use API endpoint instead of direct service call
    fetch('/api/permissions/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resource, action }),
      credentials: 'include'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to check permission');
        }
        return response.json();
      })
      .then(setResult)
      .catch((error) => {
        console.error('Error checking permission:', error);
        setResult({
          hasPermission: false,
          reason: 'Error al verificar permiso'
        });
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id, resource, action]);

  return { ...result, loading };
}

// ✅ Hook para verificar múltiples permisos
export function usePermissions(checks: PermissionCheck[]) {
  const { data: session } = useSession();
  const [results, setResults] = useState<PermissionCheckResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      const noAuthResults = checks.map(() => ({
        hasPermission: false,
        reason: 'Usuario no autenticado'
      }));
      setResults(noAuthResults);
      setLoading(false);
      return;
    }

    // Use API endpoint for multiple permission checks
    Promise.all(
      checks.map(check =>
        fetch('/api/permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resource: check.resource, action: check.action }),
          credentials: 'include'
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to check permission');
          }
          return response.json();
        })
      )
    )
      .then(setResults)
      .catch((error) => {
        console.error('Error checking permissions:', error);
        const errorResults = checks.map(() => ({
          hasPermission: false,
          reason: 'Error al verificar permisos'
        }));
        setResults(errorResults);
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id, checks]);

  return { results, loading };
}

// ✅ Hook para obtener todos los permisos de un usuario
export function useUserPermissions(userId?: string) {
  const { data: session } = useSession();
  const [userPermissions, setUserPermissions] = useState<UserWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || session?.user?.id;

  useEffect(() => {
    if (!targetUserId) {
      setUserPermissions(null);
      setLoading(false);
      return;
    }

    // Use API endpoint instead of direct service call
    fetch('/api/permissions/user', {
      method: 'GET',
      credentials: 'include'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to get user permissions');
        }
        return response.json();
      })
      .then(setUserPermissions)
      .catch((error) => {
        console.error('Error getting user permissions:', error);
        setError('Error al obtener permisos del usuario');
      })
      .finally(() => setLoading(false));
  }, [targetUserId]);

  return { userPermissions, loading, error };
}

// ✅ Hook para verificar si el usuario puede realizar una acción
export function useCanPerformAction(
  resource: PermissionResource,
  action: PermissionAction
) {
  const permission = usePermission(resource, action);
  return {
    canPerform: permission.hasPermission,
    loading: permission.loading,
    reason: permission.reason
  };
}

// ✅ Hook para verificar permisos críticos
export function useCriticalPermission(
  resource: PermissionResource,
  action: PermissionAction
) {
  const permission = usePermission(resource, action);

  // Para acciones críticas, requerir que sea un permiso explícito
  const isCriticalAction = ['delete', 'manage_roles', 'manage_permissions', 'system'].includes(action);
  const isCriticalResource = ['users', 'config', 'audit'].includes(resource);

  const requiresExplicitPermission = isCriticalAction || isCriticalResource;

  return {
    hasPermission: permission.hasPermission && (!requiresExplicitPermission || !!permission.userPermission),
    loading: permission.loading,
    reason: permission.reason,
    requiresExplicitPermission
  };
}

// ✅ Hook para condicional rendering basado en permisos
export function usePermissionGuard(
  resource: PermissionResource,
  action: PermissionAction,
  fallback: React.ReactNode = null
) {
  const { canPerform, loading } = useCanPerformAction(resource, action);

  if (loading) {
    return { render: false, loading: true, content: null };
  }

  if (canPerform) {
    return { render: true, loading: false, content: null };
  }

  return { render: false, loading: false, content: fallback };
}

// ✅ Hook para múltiples verificaciones de permisos
export function usePermissionMatrix(
  permissions: Array<{
    resource: PermissionResource;
    action: PermissionAction;
    label?: string;
  }>
) {
  const checks: PermissionCheck[] = permissions.map(p => ({
    resource: p.resource,
    action: p.action
  }));

  const { results, loading } = usePermissions(checks);

  const matrix = permissions.map((perm, index) => ({
    ...perm,
    hasPermission: results[index]?.hasPermission || false,
    reason: results[index]?.reason
  }));

  return { matrix, loading };
}

// ✅ Hook para verificar permisos de administrador
export function useAdminPermissions() {
  const userPerms = useUserPermissions();

  const isAdmin = userPerms.userPermissions?.role === 'admin';
  const canManageUsers = usePermission('users', 'manage_permissions');
  const canManageSystem = usePermission('config', 'system');

  return {
    isAdmin,
    canManageUsers: canManageUsers.hasPermission,
    canManageSystem: canManageSystem.hasPermission,
    loading: userPerms.loading || canManageUsers.loading || canManageSystem.loading
  };
}

// ✅ Hook personalizado para permisos de proyectos
export function useProjectPermissions(projectId?: string) {
  const canViewProjects = usePermission('projects', 'view');
  const canCreateProjects = usePermission('projects', 'create');
  const canEditProjects = usePermission('projects', 'edit');
  const canDeleteProjects = usePermission('projects', 'delete');
  const canManageTeam = usePermission('projects', 'manage_team');

  return {
    canView: canViewProjects.hasPermission,
    canCreate: canCreateProjects.hasPermission,
    canEdit: canEditProjects.hasPermission,
    canDelete: canDeleteProjects.hasPermission,
    canManageTeam: canManageTeam.hasPermission,
    loading: [
      canViewProjects.loading,
      canCreateProjects.loading,
      canEditProjects.loading,
      canDeleteProjects.loading,
      canManageTeam.loading
    ].some(Boolean)
  };
}

// ✅ Hook personalizado para permisos de equipos
export function useEquipmentPermissions() {
  const canView = usePermission('equipment', 'view');
  const canCreate = usePermission('equipment', 'create');
  const canEdit = usePermission('equipment', 'edit');
  const canDelete = usePermission('equipment', 'delete');
  const canManageItems = usePermission('equipment', 'manage_items');

  return {
    canView: canView.hasPermission,
    canCreate: canCreate.hasPermission,
    canEdit: canEdit.hasPermission,
    canDelete: canDelete.hasPermission,
    canManageItems: canManageItems.hasPermission,
    loading: [canView.loading, canCreate.loading, canEdit.loading, canDelete.loading, canManageItems.loading].some(Boolean)
  };
}

// ✅ Hook personalizado para permisos de reportes
export function useReportPermissions() {
  const canView = usePermission('reports', 'view');
  const canGenerate = usePermission('reports', 'generate');
  const canExport = usePermission('reports', 'export');
  const canAdvanced = usePermission('reports', 'advanced');

  return {
    canView: canView.hasPermission,
    canGenerate: canGenerate.hasPermission,
    canExport: canExport.hasPermission,
    canAdvanced: canAdvanced.hasPermission,
    loading: [canView.loading, canGenerate.loading, canExport.loading, canAdvanced.loading].some(Boolean)
  };
}

// ✅ Hook para verificar si el usuario actual puede acceder a una ruta
export function useRouteAccess(requiredPermissions: Array<{
  resource: PermissionResource;
  action: PermissionAction;
}>) {
  const { results, loading } = usePermissions(requiredPermissions);

  const hasAccess = results.every(result => result.hasPermission);
  const deniedReasons = results
    .filter(result => !result.hasPermission)
    .map(result => result.reason)
    .filter(Boolean);

  return {
    hasAccess,
    deniedReasons,
    loading
  };
}

// ✅ Hook para cache de permisos (para mejorar performance)
export function usePermissionCache() {
  const [cache, setCache] = useState<Map<string, PermissionCheckResult>>(new Map());

  const getCachedPermission = useCallback((key: string) => {
    return cache.get(key);
  }, [cache]);

  const setCachedPermission = useCallback((key: string, result: PermissionCheckResult) => {
    setCache(prev => new Map(prev.set(key, result)));
  }, []);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return {
    getCachedPermission,
    setCachedPermission,
    clearCache
  };
}
