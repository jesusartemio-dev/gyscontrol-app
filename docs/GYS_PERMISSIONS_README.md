# 🔐 Sistema de Permisos Granulares GYS

## 📋 Descripción

**Ubicación**: `docs/PERMISSIONS_README.md`
**Última actualización**: Octubre 2025
**Versión**: 2.0 - Implementación completa con UI

El sistema de permisos granulares permite controlar el acceso a recursos específicos del sistema de manera detallada, más allá de los roles tradicionales. Cada usuario puede tener permisos específicos asignados individualmente.

## 🏗️ Arquitectura

### Componentes Principales

1. **Base de Permisos** (`src/lib/permissions/base-permissions.ts`)
   - Define todos los permisos disponibles en el sistema
   - Organizados por recursos (users, projects, equipment, etc.)
   - Acciones específicas (view, create, edit, delete, etc.)

2. **Servicio de Permisos** (`src/lib/services/permissions.ts`)
   - Lógica de negocio para verificar y gestionar permisos
   - Integración con base de datos
   - Verificación de permisos por usuario

3. **Hooks de React** (`src/hooks/usePermissions.ts`)
   - `usePermission()` - Verificar un permiso específico
   - `usePermissions()` - Verificar múltiples permisos
   - `useUserPermissions()` - Obtener todos los permisos de un usuario
   - `useCanPerformAction()` - Verificar si puede realizar una acción
   - `useAdminPermissions()` - Verificar permisos administrativos

4. **APIs REST** (`src/app/api/`)
   - `GET /api/admin/permissions` - Obtener todos los permisos del sistema
   - `POST /api/admin/user-permissions` - Asignar permisos bulk a usuario
   - `DELETE /api/admin/user-permissions` - Revocar permisos de usuario
   - `GET /api/permissions/user` - Obtener permisos de un usuario específico
   - `POST /api/permissions/check` - Verificar permisos individuales

5. **Interfaz de Usuario** (`src/components/admin/UserPermissionsManager.tsx`)
   - Gestión completa de usuarios y permisos
   - Interfaz visual intuitiva con estados claros
   - Asignación granular de permisos por usuario
   - Override de permisos por rol

6. **Página de Administración** (`src/app/admin/permisos/page.tsx`)
   - Acceso directo a gestión de permisos
   - Protegido para usuarios con rol `admin`
   - Integrado en navegación lateral

7. **Middleware** (`src/middleware.ts`)
   - Control de acceso basado en permisos
   - Verificación automática en cada ruta

8. **Auditoría** (`src/lib/services/auditLogger.ts`)
   - Registro de todos los cambios de permisos
   - Historial de accesos denegados
   - Estadísticas de uso

## 📊 Permisos Disponibles

### Usuarios
- `users.view` - Ver lista de usuarios
- `users.create` - Crear nuevos usuarios
- `users.edit` - Editar información de usuarios
- `users.delete` - Eliminar usuarios
- `users.manage_roles` - Asignar y cambiar roles
- `users.manage_permissions` - Administrar permisos específicos

### Proyectos
- `projects.view` - Ver lista de proyectos
- `projects.view_all` - Ver todos los proyectos (sin restricciones)
- `projects.create` - Crear nuevos proyectos
- `projects.edit` - Editar proyectos
- `projects.delete` - Eliminar proyectos
- `projects.manage_team` - Administrar equipo del proyecto

### Equipos
- `equipment.view` - Ver equipos del proyecto
- `equipment.create` - Crear nuevos grupos de equipos
- `equipment.edit` - Editar equipos
- `equipment.delete` - Eliminar equipos
- `equipment.manage_items` - Administrar items dentro de equipos

### Listas de Equipo
- `lists.view` - Ver listas de equipo
- `lists.create` - Crear nuevas listas
- `lists.edit` - Editar listas
- `lists.delete` - Eliminar listas
- `lists.approve` - Aprobar listas
- `lists.convert_to_orders` - Convertir listas en pedidos

### Pedidos
- `orders.view` - Ver pedidos de equipo
- `orders.create` - Crear nuevos pedidos
- `orders.edit` - Editar pedidos
- `orders.delete` - Eliminar pedidos
- `orders.approve` - Aprobar pedidos
- `orders.track_delivery` - Seguimiento de entregas

### Catálogos
- `catalogs.view` - Ver catálogos
- `catalogs.manage_equipment` - Administrar catálogo de equipos
- `catalogs.manage_services` - Administrar catálogo de servicios
- `catalogs.import` - Importar datos

### Reportes
- `reports.view` - Ver reportes
- `reports.generate` - Generar reportes
- `reports.export` - Exportar reportes
- `reports.advanced` - Acceso a reportes avanzados

### Configuración
- `config.view` - Ver configuraciones
- `config.edit` - Editar configuraciones
- `config.system` - Configuraciones críticas del sistema

### Auditoría
- `audit.view` - Ver logs de auditoría
- `audit.export` - Exportar logs de auditoría

### CRM
- `crm.view` - Ver datos de CRM
- `crm.manage_opportunities` - Administrar oportunidades
- `crm.manage_clients` - Administrar clientes
- `crm.view_reports` - Ver reportes de CRM

## 🚀 Uso en Código

### Verificar un Permiso Específico

```tsx
import { usePermission } from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, loading } = usePermission('projects', 'create');

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {hasPermission ? (
        <button>Crear Proyecto</button>
      ) : (
        <p>No tienes permisos para crear proyectos</p>
      )}
    </div>
  );
}
```

### Verificar Múltiples Permisos

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function ProjectActions() {
  const checks = [
    { resource: 'projects', action: 'edit' },
    { resource: 'projects', action: 'delete' },
    { resource: 'projects', action: 'manage_team' }
  ];

  const { results, loading } = usePermissions(checks);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {results[0].hasPermission && <button>Editar</button>}
      {results[1].hasPermission && <button>Eliminar</button>}
      {results[2].hasPermission && <button>Gestionar Equipo</button>}
    </div>
  );
}
```

### Obtener Todos los Permisos de un Usuario

```tsx
import { useUserPermissions } from '@/hooks/usePermissions';

function UserProfile({ userId }: { userId: string }) {
  const { userPermissions, loading, error } = useUserPermissions(userId);

  if (loading) return <div>Cargando permisos...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Permisos de {userPermissions?.name}</h3>
      <ul>
        {userPermissions?.effectivePermissions.map(perm => (
          <li key={perm.id}>
            {perm.resource}:{perm.action}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Control de Acceso Condicional

```tsx
import { useCanPerformAction } from '@/hooks/usePermissions';

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const { canPerform, reason } = useCanPerformAction('projects', 'delete');

  if (!canPerform) {
    return (
      <span title={reason} className="text-gray-400 cursor-not-allowed">
        Eliminar (Sin permisos)
      </span>
    );
  }

  return <button onClick={onDelete}>Eliminar</button>;
}
```

### Gestión de Permisos en Componentes Admin

```tsx
import UserPermissionsManager from '@/components/admin/UserPermissionsManager';

function AdminPage() {
  return (
    <div>
      <h1>Gestión de Usuarios y Permisos</h1>
      <UserPermissionsManager />
    </div>
  );
}
```

## 🎨 Interfaz de Usuario

### Página de Administración
- **URL**: `/admin/permisos`
- **Acceso**: Solo usuarios con rol `admin`
- **Ubicación**: Configuración → Permisos (en sidebar)

### Características de la UI

#### Estados Visuales Claros
- 🟢 **ACTIVO**: Permiso concedido (fondo verde, indicador animado)
- 🔴 **BLOQUEADO**: Permiso denegado (fondo rojo)
- 🔵 **POR ROL**: Heredado del rol (fondo azul)
- ⚪ **INACTIVO**: Sin configuración (fondo gris)

#### Funcionalidades
- **Selección de usuario**: Click en ícono de configuración
- **Vista por recursos**: Permisos agrupados por módulo
- **Cambios pendientes**: Indicador visual de modificaciones no guardadas
- **Guardar bulk**: Aplicar múltiples cambios simultáneamente
- **Leyenda integrada**: Guía visual siempre visible

#### Navegación
- **Tabs principales**: Usuarios | Permisos
- **Breadcrumb**: Inicio → Administración → Usuarios y Permisos
- **Botón guardar**: Se resalta cuando hay cambios pendientes

## 🔧 Configuración Inicial

### 1. Ejecutar Migración de Base de Datos

```bash
# Crear las tablas de permisos
npx prisma db execute --schema prisma/schema.prisma --file scripts/create-permissions-schema.sql

# Regenerar cliente de Prisma
npx prisma generate
```

### 2. Inicializar Permisos del Sistema

```typescript
import { initializeSystemPermissions } from '@/lib/services/permissions';

// En un script de inicialización o API route
await initializeSystemPermissions();
```

### 3. Probar el Sistema

```bash
# Ejecutar pruebas
npx tsx scripts/test-permissions.ts
```

## 🔒 Permisos por Rol (Fallback)

Cuando un usuario no tiene permisos específicos asignados, el sistema verifica los permisos basados en su rol:

- **Colaborador**: `view`
- **Comercial**: `view`, `create`, `edit`
- **Presupuestos**: `view`, `create`, `edit`, `manage_items`
- **Proyectos**: `view`, `create`, `edit`, `manage_team`, `manage_items`
- **Coordinador**: `view`, `create`, `edit`, `manage_team`, `approve`
- **Logístico**: `view`, `create`, `edit`, `manage_items`, `convert_to_orders`, `track_delivery`
- **Gestor**: `view`, `create`, `edit`, `delete`, `manage_team`, `approve`, `manage_permissions`
- **Gerente**: `view`, `view_all`, `create`, `edit`, `delete`, `manage_team`, `approve`, `manage_permissions`, `export`, `advanced`
- **Admin**: Todos los permisos

## 📊 Auditoría

Todos los cambios de permisos se registran automáticamente:

- Asignación/revocación de permisos
- Cambios en permisos del sistema
- Accesos denegados
- Cambios críticos de permisos

### Ver Historial de Auditoría

```typescript
import { getPermissionAuditHistory } from '@/lib/services/auditLogger';

const history = await getPermissionAuditHistory({
  userId: 'user-id',
  limit: 50
});
```

## 🚨 Permisos Críticos

Algunos permisos requieren verificación especial:

- `delete` - Eliminar recursos
- `manage_roles` - Gestionar roles de usuarios
- `manage_permissions` - Gestionar permisos específicos
- `system` - Configuraciones críticas del sistema

## 🔄 Migración desde Roles

El sistema es backward-compatible. Los roles existentes siguen funcionando como fallback, pero ahora puedes asignar permisos específicos por usuario.

## 🐛 Solución de Problemas

### Error: "Property 'permission' does not exist"

Asegúrate de que el cliente de Prisma esté regenerado:

```bash
npx prisma generate
```

### Error: "Column 'user_id' does not exist"

Verifica que las tablas de permisos estén creadas en la base de datos.

### Permisos no se aplican

1. Verifica que el usuario tenga el permiso asignado directamente
2. Si no, verifica los permisos de su rol
3. Revisa el middleware para rutas específicas

## 📈 Estado de Implementación

### ✅ Completado
- [x] **UI completa para gestión de permisos** - Interfaz visual intuitiva
- [x] **Página de administración** - `/admin/permisos` con acceso protegido
- [x] **APIs REST completas** - CRUD de permisos y asignación bulk
- [x] **Estados visuales claros** - Indicadores intuitivos de estado
- [x] **Integración en navegación** - Acceso desde sidebar
- [x] **Sistema de auditoría** - Registro de cambios
- [x] **Compatibilidad backward** - Funciona con roles existentes

### 🔄 Próximos Pasos
- [ ] Agregar permisos condicionales basados en ownership
- [ ] Implementar permisos temporales con expiración
- [ ] Crear dashboard de métricas de permisos y accesos
- [ ] Agregar notificaciones automáticas para cambios críticos
- [ ] Implementar import/export de configuraciones de permisos
- [ ] Crear reportes de uso de permisos por usuario/rol