import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { RolUsuario } from '@/types/modelos'
import type { PermissionResource, PermissionAction } from '@/types/permissions'

// ✅ Mapeo de rutas a permisos requeridos
const routePermissions: Record<string, { resource: PermissionResource; action: PermissionAction }> = {
  // Administración
  '/admin': { resource: 'users', action: 'view' },

  // Comercial y CRM
  '/comercial': { resource: 'projects', action: 'create' },
  '/crm': { resource: 'crm', action: 'view' },

  // Proyectos
  '/proyectos': { resource: 'projects', action: 'view' },

  // Logística
  '/logistica': { resource: 'orders', action: 'view' },

  // Gestión
  '/gestion': { resource: 'projects', action: 'manage_team' },

  // Aprovisionamiento
  '/finanzas': { resource: 'reports', action: 'view' },
}

// ✅ Función para verificar permisos (simplificada para middleware)
async function checkUserPermission(userId: string, resource: PermissionResource, action: PermissionAction): Promise<boolean> {
  try {
    // Para middleware, usamos una verificación simplificada
    // En producción, esto debería consultar la base de datos
    const role = await getUserRole(userId);

    // Verificar permisos por rol (fallback)
    const rolePermissions = getRolePermissions(role);
    return rolePermissions.includes(action);

  } catch (error) {
    console.error('Error checking permission in middleware:', error);
    return false;
  }
}

// ✅ Función helper para obtener rol del usuario (simplificada)
async function getUserRole(userId: string): Promise<RolUsuario> {
  // En un entorno real, esto consultaría la base de datos
  // Por ahora, usamos el token de NextAuth
  return 'colaborador' as RolUsuario; // fallback
}

// ✅ Función helper para obtener permisos por rol
function getRolePermissions(role: RolUsuario): PermissionAction[] {
  const permissions: Record<RolUsuario, PermissionAction[]> = {
    admin: ['view', 'view_all', 'create', 'edit', 'delete', 'manage_roles', 'manage_permissions', 'manage_team', 'approve', 'export', 'manage_items', 'convert_to_orders', 'track_delivery', 'system'],
    gerente: ['view', 'view_all', 'create', 'edit', 'delete', 'manage_team', 'approve', 'export'],
    comercial: ['view', 'create', 'edit'],
    presupuestos: ['view', 'create', 'edit', 'manage_items'],
    proyectos: ['view', 'create', 'edit', 'manage_team', 'manage_items'],
    coordinador: ['view', 'create', 'edit', 'manage_team', 'approve'],
    logistico: ['view', 'create', 'edit', 'manage_items', 'convert_to_orders', 'track_delivery'],
    gestor: ['view', 'create', 'edit', 'delete', 'manage_team', 'approve', 'manage_permissions'],
    seguridad: ['view', 'view_all', 'manage_team'],
    colaborador: ['view']
  };

  return permissions[role] || [];
}

// ✅ Función para determinar permisos requeridos para una ruta
function getRequiredPermission(path: string): { resource: PermissionResource; action: PermissionAction } | null {
  // Verificar rutas exactas primero
  if (routePermissions[path]) {
    return routePermissions[path];
  }

  // Verificar prefijos de ruta
  for (const [routePrefix, permission] of Object.entries(routePermissions)) {
    if (path.startsWith(routePrefix)) {
      return permission;
    }
  }

  return null;
}

const protectedRoutes = withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Rutas públicas
    if (path.startsWith('/login') || path.startsWith('/api/auth')) {
      return NextResponse.next();
    }

    // Verificar autenticación
    if (!token?.sub) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const userId = token.sub;
    const role = token.role as RolUsuario | undefined;

    // Verificar permisos específicos para la ruta
    const requiredPermission = getRequiredPermission(path);

    if (requiredPermission) {
      // Verificación simplificada usando roles (para middleware)
      // En producción, esto debería hacer una consulta a la base de datos
      const rolePermissions = getRolePermissions(role || 'colaborador');
      const hasPermission = rolePermissions.includes(requiredPermission.action);

      if (!hasPermission) {
        return NextResponse.redirect(new URL('/denied', req.url));
      }
    }

    // Verificaciones específicas por ruta (mantener compatibilidad)
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    if (path.startsWith('/comercial') && !['admin', 'gerente', 'comercial', 'presupuestos'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    if (path.startsWith('/crm') && !['admin', 'gerente', 'comercial', 'presupuestos'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    if (path.startsWith('/proyectos') && !['admin', 'gerente', 'proyectos', 'coordinador', 'gestor'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    if (path.startsWith('/logistica') && !['admin', 'gerente', 'logistico'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    if (path.startsWith('/gestion') && !['admin', 'gerente', 'gestor', 'logistico'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    if (path.startsWith('/finanzas') && !['admin', 'gerente', 'finanzas', 'gestor'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    // Configuración y Catálogos - Solo admin y gerente
    if (path.startsWith('/configuracion') && !['admin', 'gerente'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    if (path.startsWith('/catalogo') && !['admin', 'gerente'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export default protectedRoutes

export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
}
