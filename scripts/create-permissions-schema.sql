-- ===================================================
-- 📋 SCRIPT DE MIGRACIÓN: SISTEMA DE PERMISOS GRANULARES
-- Crear tablas necesarias para el sistema de permisos
-- ===================================================

-- ✅ Tabla de permisos del sistema
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  is_system_permission BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Tabla de permisos de usuario (overrides)
CREATE TABLE IF NOT EXISTS user_permissions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  permission_id VARCHAR(255) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('grant', 'deny')) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(user_id, permission_id)
);

-- ✅ Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);

-- ✅ Insertar permisos base del sistema
INSERT INTO permissions (id, name, description, resource, action, is_system_permission) VALUES
-- 👥 Usuarios y Roles
('users.create', 'users.create', 'Crear nuevos usuarios', 'users', 'create', true),
('users.read', 'users.read', 'Ver lista de usuarios', 'users', 'read', true),
('users.update', 'users.update', 'Editar usuarios existentes', 'users', 'update', true),
('users.delete', 'users.delete', 'Eliminar usuarios', 'users', 'delete', true),
('users.manage', 'users.manage', 'Administrar permisos de usuarios', 'users', 'manage', true),

-- 🎭 Roles y Permisos
('roles.create', 'roles.create', 'Crear roles personalizados', 'roles', 'create', true),
('roles.read', 'roles.read', 'Ver roles y permisos', 'roles', 'read', true),
('roles.update', 'roles.update', 'Editar roles y permisos', 'roles', 'update', true),
('roles.delete', 'roles.delete', 'Eliminar roles personalizados', 'roles', 'delete', true),

-- 📋 Proyectos
('projects.create', 'projects.create', 'Crear nuevos proyectos', 'projects', 'create', true),
('projects.read', 'projects.read', 'Ver proyectos', 'projects', 'read', true),
('projects.update', 'projects.update', 'Editar proyectos', 'projects', 'update', true),
('projects.delete', 'projects.delete', 'Eliminar proyectos', 'projects', 'delete', true),
('projects.manage', 'projects.manage', 'Administrar todos los aspectos de proyectos', 'projects', 'manage', true),

-- 💰 Cotizaciones
('cotizaciones.create', 'cotizaciones.create', 'Crear cotizaciones', 'cotizaciones', 'create', true),
('cotizaciones.read', 'cotizaciones.read', 'Ver cotizaciones', 'cotizaciones', 'read', true),
('cotizaciones.update', 'cotizaciones.update', 'Editar cotizaciones', 'cotizaciones', 'update', true),
('cotizaciones.delete', 'cotizaciones.delete', 'Eliminar cotizaciones', 'cotizaciones', 'delete', true),
('cotizaciones.export', 'cotizaciones.export', 'Exportar cotizaciones', 'cotizaciones', 'export', true),

-- 🏢 Clientes
('clientes.create', 'clientes.create', 'Crear clientes', 'clientes', 'create', true),
('clientes.read', 'clientes.read', 'Ver clientes', 'clientes', 'read', true),
('clientes.update', 'clientes.update', 'Editar clientes', 'clientes', 'update', true),
('clientes.delete', 'clientes.delete', 'Eliminar clientes', 'clientes', 'delete', true),

-- 🚛 Proveedores
('proveedores.create', 'proveedores.create', 'Crear proveedores', 'proveedores', 'create', true),
('proveedores.read', 'proveedores.read', 'Ver proveedores', 'proveedores', 'read', true),
('proveedores.update', 'proveedores.update', 'Editar proveedores', 'proveedores', 'update', true),
('proveedores.delete', 'proveedores.delete', 'Eliminar proveedores', 'proveedores', 'delete', true),

-- 🔧 Equipos
('equipos.create', 'equipos.create', 'Crear equipos', 'equipos', 'create', true),
('equipos.read', 'equipos.read', 'Ver equipos', 'equipos', 'read', true),
('equipos.update', 'equipos.update', 'Editar equipos', 'equipos', 'update', true),
('equipos.delete', 'equipos.delete', 'Eliminar equipos', 'equipos', 'delete', true),

-- ⚙️ Servicios
('servicios.create', 'servicios.create', 'Crear servicios', 'servicios', 'create', true),
('servicios.read', 'servicios.read', 'Ver servicios', 'servicios', 'read', true),
('servicios.update', 'servicios.update', 'Editar servicios', 'servicios', 'update', true),
('servicios.delete', 'servicios.delete', 'Eliminar servicios', 'servicios', 'delete', true),

-- 💸 Gastos
('gastos.create', 'gastos.create', 'Crear gastos', 'gastos', 'create', true),
('gastos.read', 'gastos.read', 'Ver gastos', 'gastos', 'read', true),
('gastos.update', 'gastos.update', 'Editar gastos', 'gastos', 'update', true),
('gastos.delete', 'gastos.delete', 'Eliminar gastos', 'gastos', 'delete', true),

-- 📋 Listas
('listas.create', 'listas.create', 'Crear listas de equipo', 'listas', 'create', true),
('listas.read', 'listas.read', 'Ver listas de equipo', 'listas', 'read', true),
('listas.update', 'listas.update', 'Editar listas de equipo', 'listas', 'update', true),
('listas.delete', 'listas.delete', 'Eliminar listas de equipo', 'listas', 'delete', true),

-- 📦 Pedidos
('pedidos.create', 'pedidos.create', 'Crear pedidos', 'pedidos', 'create', true),
('pedidos.read', 'pedidos.read', 'Ver pedidos', 'pedidos', 'read', true),
('pedidos.update', 'pedidos.update', 'Editar pedidos', 'pedidos', 'update', true),
('pedidos.delete', 'pedidos.delete', 'Eliminar pedidos', 'pedidos', 'delete', true),

-- 📊 Valorizaciones
('valorizaciones.create', 'valorizaciones.create', 'Crear valorizaciones', 'valorizaciones', 'create', true),
('valorizaciones.read', 'valorizaciones.read', 'Ver valorizaciones', 'valorizaciones', 'read', true),
('valorizaciones.update', 'valorizaciones.update', 'Editar valorizaciones', 'valorizaciones', 'update', true),
('valorizaciones.delete', 'valorizaciones.delete', 'Eliminar valorizaciones', 'valorizaciones', 'delete', true),

-- 📈 Reportes
('reportes.read', 'reportes.read', 'Ver reportes', 'reportes', 'read', true),
('reportes.export', 'reportes.export', 'Exportar reportes', 'reportes', 'export', true),

-- ⚙️ Configuración
('configuracion.read', 'configuracion.read', 'Ver configuración del sistema', 'configuracion', 'read', true),
('configuracion.update', 'configuracion.update', 'Editar configuración del sistema', 'configuracion', 'update', true),

-- 📋 Auditoría
('auditoria.read', 'auditoria.read', 'Ver registros de auditoría', 'auditoria', 'read', true)

ON CONFLICT (id) DO NOTHING;

-- ✅ Actualizar timestamps
UPDATE permissions SET updated_at = NOW() WHERE updated_at IS NULL;

-- ✅ Comentarios en las tablas
COMMENT ON TABLE permissions IS 'Permisos del sistema - base para control de acceso granular';
COMMENT ON TABLE user_permissions IS 'Permisos específicos por usuario (overrides)';
COMMENT ON COLUMN permissions.is_system_permission IS 'Indica si es un permiso base del sistema (no se puede eliminar)';
COMMENT ON COLUMN user_permissions.type IS 'Tipo de override: grant (conceder) o deny (denegar)';