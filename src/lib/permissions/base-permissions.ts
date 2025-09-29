/**
 * 📋 Permisos Base del Sistema GYS
 *
 * Define todos los permisos disponibles en el sistema organizados por recursos.
 * Cada permiso tiene un nombre único, descripción y está asociado a un recurso específico.
 */

export interface BasePermission {
  name: string;
  description: string;
  resource: string;
  action: string;
  isSystemPermission: boolean;
}

// ✅ Permisos de Usuarios
export const USER_PERMISSIONS: BasePermission[] = [
  {
    name: 'users.view',
    description: 'Ver lista de usuarios',
    resource: 'users',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'users.create',
    description: 'Crear nuevos usuarios',
    resource: 'users',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'users.edit',
    description: 'Editar información de usuarios',
    resource: 'users',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'users.delete',
    description: 'Eliminar usuarios',
    resource: 'users',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'users.manage_roles',
    description: 'Asignar y cambiar roles de usuarios',
    resource: 'users',
    action: 'manage_roles',
    isSystemPermission: true
  },
  {
    name: 'users.manage_permissions',
    description: 'Administrar permisos específicos de usuarios',
    resource: 'users',
    action: 'manage_permissions',
    isSystemPermission: true
  }
];

// ✅ Permisos de Proyectos
export const PROJECT_PERMISSIONS: BasePermission[] = [
  {
    name: 'projects.view',
    description: 'Ver lista de proyectos',
    resource: 'projects',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'projects.view_all',
    description: 'Ver todos los proyectos (sin restricciones)',
    resource: 'projects',
    action: 'view_all',
    isSystemPermission: true
  },
  {
    name: 'projects.create',
    description: 'Crear nuevos proyectos',
    resource: 'projects',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'projects.edit',
    description: 'Editar proyectos',
    resource: 'projects',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'projects.delete',
    description: 'Eliminar proyectos',
    resource: 'projects',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'projects.manage_team',
    description: 'Administrar equipo del proyecto',
    resource: 'projects',
    action: 'manage_team',
    isSystemPermission: true
  }
];

// ✅ Permisos de Equipos
export const EQUIPMENT_PERMISSIONS: BasePermission[] = [
  {
    name: 'equipment.view',
    description: 'Ver equipos del proyecto',
    resource: 'equipment',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'equipment.create',
    description: 'Crear nuevos grupos de equipos',
    resource: 'equipment',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'equipment.edit',
    description: 'Editar equipos',
    resource: 'equipment',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'equipment.delete',
    description: 'Eliminar equipos',
    resource: 'equipment',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'equipment.manage_items',
    description: 'Administrar items dentro de equipos',
    resource: 'equipment',
    action: 'manage_items',
    isSystemPermission: true
  }
];

// ✅ Permisos de Listas de Equipo
export const LIST_EQUIPMENT_PERMISSIONS: BasePermission[] = [
  {
    name: 'lists.view',
    description: 'Ver listas de equipo',
    resource: 'lists',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'lists.create',
    description: 'Crear nuevas listas de equipo',
    resource: 'lists',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'lists.edit',
    description: 'Editar listas de equipo',
    resource: 'lists',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'lists.delete',
    description: 'Eliminar listas de equipo',
    resource: 'lists',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'lists.approve',
    description: 'Aprobar listas de equipo',
    resource: 'lists',
    action: 'approve',
    isSystemPermission: true
  },
  {
    name: 'lists.convert_to_orders',
    description: 'Convertir listas en pedidos',
    resource: 'lists',
    action: 'convert_to_orders',
    isSystemPermission: true
  }
];

// ✅ Permisos de Pedidos
export const ORDER_PERMISSIONS: BasePermission[] = [
  {
    name: 'orders.view',
    description: 'Ver pedidos de equipo',
    resource: 'orders',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'orders.create',
    description: 'Crear nuevos pedidos',
    resource: 'orders',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'orders.edit',
    description: 'Editar pedidos',
    resource: 'orders',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'orders.delete',
    description: 'Eliminar pedidos',
    resource: 'orders',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'orders.approve',
    description: 'Aprobar pedidos',
    resource: 'orders',
    action: 'approve',
    isSystemPermission: true
  },
  {
    name: 'orders.track_delivery',
    description: 'Seguimiento de entregas',
    resource: 'orders',
    action: 'track_delivery',
    isSystemPermission: true
  }
];

// ✅ Permisos de Proveedores
export const SUPPLIER_PERMISSIONS: BasePermission[] = [
  {
    name: 'suppliers.view',
    description: 'Ver lista de proveedores',
    resource: 'suppliers',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'suppliers.create',
    description: 'Crear nuevos proveedores',
    resource: 'suppliers',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'suppliers.edit',
    description: 'Editar proveedores',
    resource: 'suppliers',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'suppliers.delete',
    description: 'Eliminar proveedores',
    resource: 'suppliers',
    action: 'delete',
    isSystemPermission: true
  }
];

// ✅ Permisos de Catálogos
export const CATALOG_PERMISSIONS: BasePermission[] = [
  {
    name: 'catalogs.view',
    description: 'Ver catálogos de equipos y servicios',
    resource: 'catalogs',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'catalogs.manage_equipment',
    description: 'Administrar catálogo de equipos',
    resource: 'catalogs',
    action: 'manage_equipment',
    isSystemPermission: true
  },
  {
    name: 'catalogs.manage_services',
    description: 'Administrar catálogo de servicios',
    resource: 'catalogs',
    action: 'manage_services',
    isSystemPermission: true
  },
  {
    name: 'catalogs.import',
    description: 'Importar datos a catálogos',
    resource: 'catalogs',
    action: 'import',
    isSystemPermission: true
  }
];

// ✅ Permisos de Reportes
export const REPORT_PERMISSIONS: BasePermission[] = [
  {
    name: 'reports.view',
    description: 'Ver reportes del sistema',
    resource: 'reports',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'reports.generate',
    description: 'Generar nuevos reportes',
    resource: 'reports',
    action: 'generate',
    isSystemPermission: true
  },
  {
    name: 'reports.export',
    description: 'Exportar reportes',
    resource: 'reports',
    action: 'export',
    isSystemPermission: true
  },
  {
    name: 'reports.advanced',
    description: 'Acceso a reportes avanzados',
    resource: 'reports',
    action: 'advanced',
    isSystemPermission: true
  }
];

// ✅ Permisos de Configuración
export const CONFIG_PERMISSIONS: BasePermission[] = [
  {
    name: 'config.view',
    description: 'Ver configuraciones del sistema',
    resource: 'config',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'config.edit',
    description: 'Editar configuraciones del sistema',
    resource: 'config',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'config.system',
    description: 'Configuraciones críticas del sistema',
    resource: 'config',
    action: 'system',
    isSystemPermission: true
  }
];

// ✅ Permisos de Auditoría
export const AUDIT_PERMISSIONS: BasePermission[] = [
  {
    name: 'audit.view',
    description: 'Ver logs de auditoría',
    resource: 'audit',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'audit.export',
    description: 'Exportar logs de auditoría',
    resource: 'audit',
    action: 'export',
    isSystemPermission: true
  }
];

// ✅ Permisos de CRM
export const CRM_PERMISSIONS: BasePermission[] = [
  {
    name: 'crm.view',
    description: 'Ver datos de CRM',
    resource: 'crm',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'crm.manage_opportunities',
    description: 'Administrar oportunidades',
    resource: 'crm',
    action: 'manage_opportunities',
    isSystemPermission: true
  },
  {
    name: 'crm.manage_clients',
    description: 'Administrar clientes',
    resource: 'crm',
    action: 'manage_clients',
    isSystemPermission: true
  },
  {
    name: 'crm.view_reports',
    description: 'Ver reportes de CRM',
    resource: 'crm',
    action: 'view_reports',
    isSystemPermission: true
  }
];

// ✅ TODOS LOS PERMISOS DEL SISTEMA
export const ALL_BASE_PERMISSIONS: BasePermission[] = [
  ...USER_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
  ...EQUIPMENT_PERMISSIONS,
  ...LIST_EQUIPMENT_PERMISSIONS,
  ...ORDER_PERMISSIONS,
  ...SUPPLIER_PERMISSIONS,
  ...CATALOG_PERMISSIONS,
  ...REPORT_PERMISSIONS,
  ...CONFIG_PERMISSIONS,
  ...AUDIT_PERMISSIONS,
  ...CRM_PERMISSIONS
];

// ✅ Función helper para obtener permisos por recurso
export function getPermissionsByResource(resource: string): BasePermission[] {
  return ALL_BASE_PERMISSIONS.filter(permission => permission.resource === resource);
}

// ✅ Función helper para obtener permisos por acción
export function getPermissionsByAction(action: string): BasePermission[] {
  return ALL_BASE_PERMISSIONS.filter(permission => permission.action === action);
}

// ✅ Función helper para buscar permiso por nombre
export function getPermissionByName(name: string): BasePermission | undefined {
  return ALL_BASE_PERMISSIONS.find(permission => permission.name === name);
}