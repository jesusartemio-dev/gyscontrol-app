/**
 * 📋 Interfaces TypeScript para el Sistema de Permisos
 *
 * Define las interfaces y tipos utilizados en el sistema de permisos
 * granulares del sistema GYS.
 */

// ✅ Tipos base
export type PermissionType = 'grant' | 'deny';
export type PermissionAction =
  | 'view' | 'view_all' | 'create' | 'edit' | 'delete'
  | 'manage_roles' | 'manage_permissions' | 'manage_team'
  | 'manage_items' | 'approve' | 'convert_to_orders'
  | 'track_delivery' | 'manage_equipment' | 'manage_services'
  | 'import' | 'generate' | 'export' | 'advanced'
  | 'system' | 'manage_opportunities' | 'manage_clients'
  | 'view_reports';

export type PermissionResource =
  | 'users' | 'projects' | 'equipment' | 'lists' | 'orders'
  | 'suppliers' | 'catalogs' | 'reports' | 'config' | 'audit' | 'crm';

// ✅ Interface principal de Permiso
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: PermissionResource;
  action: PermissionAction;
  isSystemPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

// ✅ Interface de Permiso de Usuario (override)
export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  type: PermissionType;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relaciones
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
  permission: Permission;
}

// ✅ Interface para permisos con información completa
export interface PermissionWithUsers extends Permission {
  userPermissions: UserPermission[];
  userCount: number;
}

// ✅ Interface para usuarios con permisos
export interface UserWithPermissions {
  id: string;
  name?: string;
  email: string;
  role: string;
  userPermissions: UserPermission[];
  effectivePermissions: Permission[];
}

// ✅ Payloads para operaciones CRUD
export interface CreatePermissionPayload {
  name: string;
  description: string;
  resource: PermissionResource;
  action: PermissionAction;
  isSystemPermission?: boolean;
}

export interface UpdatePermissionPayload {
  name?: string;
  description?: string;
  resource?: PermissionResource;
  action?: PermissionAction;
  isSystemPermission?: boolean;
}

export interface AssignPermissionPayload {
  userId: string;
  permissionId: string;
  type: PermissionType;
}

export interface BulkAssignPermissionsPayload {
  userId: string;
  permissions: {
    permissionId: string;
    type: PermissionType;
  }[];
}

// ✅ Interfaces para respuestas de API
export interface PermissionListResponse {
  permissions: Permission[];
  total: number;
  page: number;
  limit: number;
}

export interface UserPermissionsResponse {
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
  permissions: Permission[];
  userPermissions: UserPermission[];
  effectivePermissions: Permission[];
}

// ✅ Interfaces para filtros y búsqueda
export interface PermissionFilters {
  resource?: PermissionResource;
  action?: PermissionAction;
  isSystemPermission?: boolean;
  search?: string;
}

export interface UserPermissionFilters {
  userId?: string;
  permissionId?: string;
  type?: PermissionType;
  resource?: PermissionResource;
}

// ✅ Interfaces para validación de permisos
export interface PermissionCheck {
  resource: PermissionResource;
  action: PermissionAction;
  userId?: string;
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  permission?: Permission;
  userPermission?: UserPermission;
  reason?: string;
}

// ✅ Interfaces para gestión de roles y permisos
export interface RolePermissions {
  role: string;
  permissions: Permission[];
  description: string;
}

export interface PermissionTemplate {
  name: string;
  description: string;
  permissions: {
    resource: PermissionResource;
    actions: PermissionAction[];
  }[];
}

// ✅ Tipos para auditoría de permisos
export interface PermissionAuditLog {
  id: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'revoke';
  entityType: 'permission' | 'user_permission';
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ✅ Constantes para roles del sistema
export const SYSTEM_ROLES = {
  COLABORADOR: 'colaborador',
  COMERCIAL: 'comercial',
  PRESUPUESTOS: 'presupuestos',
  PROYECTOS: 'proyectos',
  COORDINADOR: 'coordinador',
  LOGISTICO: 'logistico',
  GESTOR: 'gestor',
  GERENTE: 'gerente',
  ADMIN: 'admin'
} as const;

export type SystemRole = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

// ✅ Permisos por defecto para cada rol
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, PermissionAction[]> = {
  [SYSTEM_ROLES.COLABORADOR]: ['view'],
  [SYSTEM_ROLES.COMERCIAL]: ['view', 'create', 'edit'],
  [SYSTEM_ROLES.PRESUPUESTOS]: ['view', 'create', 'edit', 'manage_items'],
  [SYSTEM_ROLES.PROYECTOS]: ['view', 'create', 'edit', 'manage_team', 'manage_items'],
  [SYSTEM_ROLES.COORDINADOR]: ['view', 'create', 'edit', 'manage_team', 'approve'],
  [SYSTEM_ROLES.LOGISTICO]: ['view', 'create', 'edit', 'manage_items', 'convert_to_orders', 'track_delivery'],
  [SYSTEM_ROLES.GESTOR]: ['view', 'create', 'edit', 'delete', 'manage_team', 'approve', 'manage_permissions'],
  [SYSTEM_ROLES.GERENTE]: ['view', 'view_all', 'create', 'edit', 'delete', 'manage_team', 'approve', 'manage_permissions', 'export', 'advanced'],
  [SYSTEM_ROLES.ADMIN]: ['view', 'view_all', 'create', 'edit', 'delete', 'manage_roles', 'manage_permissions', 'system', 'export', 'advanced']
};

// ✅ Recursos críticos que requieren permisos especiales
export const CRITICAL_RESOURCES: PermissionResource[] = [
  'users',
  'config',
  'audit'
];

// ✅ Acciones críticas que requieren permisos especiales
export const CRITICAL_ACTIONS: PermissionAction[] = [
  'delete',
  'manage_roles',
  'manage_permissions',
  'system'
];
