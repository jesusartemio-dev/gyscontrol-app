# 📊 TABLAS FALTANTES EN BASE DE DATOS LOCAL
## Sistema GYS Control - Comparación 64 vs 91 Tablas

**Estado Actual:** 64 tablas en local  
**Estado Esperado:** 91 tablas  
**Faltantes:** 27 tablas (29.7%)

---

## 🔴 TABLAS CRÍTICAS FALTANTES

### 1. **Sistema de Permisos (2 tablas)**

#### `permissions` - Tabla de Permisos del Sistema
```sql
CREATE TABLE permissions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  is_system_permission BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);

-- Datos iniciales (60 permisos base)
INSERT INTO permissions VALUES
('users.create', 'users.create', 'Crear nuevos usuarios', 'users', 'create', true),
('users.read', 'users.read', 'Ver lista de usuarios', 'users', 'read', true),
('users.update', 'users.update', 'Editar usuarios existentes', 'users', 'update', true),
('users.delete', 'users.delete', 'Eliminar usuarios', 'users', 'delete', true),
-- ... 56 permisos más
ON CONFLICT (id) DO NOTHING;
```

#### `user_permissions` - Permisos Específicos por Usuario
```sql
CREATE TABLE user_permissions (
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

-- Índices
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);
```

### 2. **Sistema de Calendario (4 tablas)**

#### `CalendarioLaboral` - Calendarios Laborales
```sql
-- Enums necesarios
CREATE TYPE "DiaSemana" AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');
CREATE TYPE "TipoExcepcion" AS ENUM ('feriado', 'dia_laboral_extra', 'dia_no_laboral');

CREATE TABLE "CalendarioLaboral" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "pais" TEXT,
  "empresa" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "horasPorDia" DECIMAL(5,2) NOT NULL DEFAULT 8.0,
  "diasLaborables" "DiaSemana"[],
  "horaInicioManana" TEXT NOT NULL DEFAULT '08:00',
  "horaFinManana" TEXT NOT NULL DEFAULT '12:00',
  "horaInicioTarde" TEXT NOT NULL DEFAULT '13:00',
  "horaFinTarde" TEXT NOT NULL DEFAULT '17:00',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "CalendarioLaboral_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "CalendarioLaboral_nombre_key" ON "CalendarioLaboral"("nombre");
```

#### `DiaCalendario` - Días de la Semana
```sql
CREATE TABLE "DiaCalendario" (
  "id" TEXT NOT NULL,
  "calendarioLaboralId" TEXT NOT NULL,
  "diaSemana" "DiaSemana" NOT NULL,
  "esLaborable" BOOLEAN NOT NULL DEFAULT true,
  "horaInicioManana" TEXT,
  "horaFinManana" TEXT,
  "horaInicioTarde" TEXT,
  "horaFinTarde" TEXT,
  "horasTotales" DECIMAL(5,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "DiaCalendario_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "DiaCalendario_calendarioLaboralId_diaSemana_key" ON "DiaCalendario"("calendarioLaboralId", "diaSemana");
CREATE INDEX "DiaCalendario_calendarioLaboralId_idx" ON "DiaCalendario"("calendarioLaboralId");

-- Foreign Keys
ALTER TABLE "DiaCalendario" ADD CONSTRAINT "DiaCalendario_calendarioLaboralId_fkey" 
FOREIGN KEY ("calendarioLaboralId") REFERENCES "CalendarioLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

#### `ExcepcionCalendario` - Feriados y Excepciones
```sql
CREATE TABLE "ExcepcionCalendario" (
  "id" TEXT NOT NULL,
  "calendarioLaboralId" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "tipo" "TipoExcepcion" NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "horaInicio" TEXT,
  "horaFin" TEXT,
  "horasTotales" DECIMAL(5,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "ExcepcionCalendario_pkey" PRIMARY KEY ("id")
);

-- Datos de ejemplo (Feriados Colombia 2025)
INSERT INTO "ExcepcionCalendario" VALUES
('feriados-2025-01-01', 'cal-colombia-gys', '2025-01-01', 'feriado', 'Año Nuevo', 'Celebración del año nuevo', NOW(), NOW()),
('feriados-2025-11-03', 'cal-colombia-gys', '2025-11-03', 'feriado', 'Todos los Santos', 'Celebración religiosa', NOW(), NOW()),
('feriados-2025-11-17', 'cal-colombia-gys', '2025-11-17', 'feriado', 'Independencia de Cartagena', 'Celebración histórica', NOW(), NOW());
```

#### `ConfiguracionCalendario` - Configuración de Calendarios
```sql
CREATE TABLE "ConfiguracionCalendario" (
  "id" TEXT NOT NULL,
  "calendarioLaboralId" TEXT NOT NULL,
  "entidadTipo" TEXT NOT NULL,
  "entidadId" TEXT NOT NULL,
  "calendarioPredeterminado" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "ConfiguracionCalendario_pkey" PRIMARY KEY ("id")
);

-- Datos predeterminados
INSERT INTO "ConfiguracionCalendario" VALUES 
('config-gys-default', 'cal-colombia-gys', 'empresa', 'GYS', true, NOW(), NOW());
```

### 3. **Sistema de EDT/Categorías (1 tabla)**

#### `edt` - Categorías de Servicio/EDT
```sql
CREATE TABLE edt (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  orden INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Datos de ejemplo
INSERT INTO edt VALUES
(gen_random_uuid()::text, 'Ingeniería Mecánica', 'Diseño y desarrollo mecánico', true, 1, NOW(), NOW()),
(gen_random_uuid()::text, 'Ingeniería Eléctrica', 'Diseño y desarrollo eléctrico', true, 2, NOW(), NOW()),
(gen_random_uuid()::text, 'Montaje e Instalación', 'Montaje e instalación de equipos', true, 3, NOW(), NOW());
```

### 4. **Sistema de Cronogramas (3 tablas)**

#### `proyecto_cronograma` - Cronogramas de Proyecto
```sql
CREATE TABLE proyecto_cronograma (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_id VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'comercial' | 'planificacion' | 'ejecucion'
  nombre VARCHAR(255) NOT NULL,
  es_baseline BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  estado VARCHAR(50) DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (proyecto_id) REFERENCES "Proyecto"(id) ON DELETE CASCADE,
  UNIQUE(proyecto_id, tipo)
);
```

#### `proyecto_actividades` - Actividades del Proyecto
```sql
CREATE TABLE proyecto_actividades (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_edt_id VARCHAR(255) NOT NULL,
  proyecto_cronograma_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  responsable_id VARCHAR(255),
  fecha_inicio_plan TIMESTAMP,
  fecha_fin_plan TIMESTAMP,
  fecha_inicio_real TIMESTAMP,
  fecha_fin_real TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'pendiente',
  porcentaje_avance INTEGER DEFAULT 0,
  horas_plan DECIMAL(10,2) DEFAULT 0,
  horas_reales DECIMAL(10,2) DEFAULT 0,
  prioridad VARCHAR(50) DEFAULT 'media',
  orden INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (proyecto_edt_id) REFERENCES "proyecto_edt"(id) ON DELETE CASCADE,
  FOREIGN KEY (proyecto_cronograma_id) REFERENCES proyecto_cronograma(id) ON DELETE CASCADE,
  FOREIGN KEY (responsable_id) REFERENCES "User"(id)
);
```

#### `proyecto_tareas` - Tareas del Proyecto
```sql
CREATE TABLE proyecto_tareas (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_actividad_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  responsable_id VARCHAR(255),
  fecha_inicio_plan TIMESTAMP,
  fecha_fin_plan TIMESTAMP,
  fecha_inicio_real TIMESTAMP,
  fecha_fin_real TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'pendiente',
  porcentaje_avance INTEGER DEFAULT 0,
  horas_plan DECIMAL(10,2) DEFAULT 0,
  horas_reales DECIMAL(10,2) DEFAULT 0,
  prioridad VARCHAR(50) DEFAULT 'media',
  orden INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (proyecto_actividad_id) REFERENCES proyecto_actividades(id) ON DELETE CASCADE,
  FOREIGN KEY (responsable_id) REFERENCES "User"(id)
);
```

### 5. **Sistema de Tracking de Horas (5+ tablas)**

#### `registro_tiempo` - Registro de Tiempo
```sql
CREATE TABLE registro_tiempo (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  proyecto_id VARCHAR(255),
  actividad_id VARCHAR(255),
  fecha DATE NOT NULL,
  horas DECIMAL(5,2) NOT NULL,
  descripcion TEXT,
  tipo_registro VARCHAR(50) DEFAULT 'manual', -- 'manual' | 'automatico' | 'importado'
  estado VARCHAR(50) DEFAULT 'pendiente', -- 'pendiente' | 'aprobado' | 'rechazado'
  aprobado_por VARCHAR(255),
  fecha_aprobacion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (usuario_id) REFERENCES "User"(id),
  FOREIGN KEY (proyecto_id) REFERENCES "Proyecto"(id)
);
```

#### `proyecto_hitos` - Hitos del Proyecto
```sql
CREATE TABLE proyecto_hitos (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_plan TIMESTAMP,
  fecha_real TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'planificado',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (proyecto_id) REFERENCES "Proyecto"(id) ON DELETE CASCADE
);
```

#### `configuracion_horas` - Configuración de Horas
```sql
CREATE TABLE configuracion_horas (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_id VARCHAR(255),
  tipo_configuracion VARCHAR(50) NOT NULL, -- 'proyecto' | 'global' | 'usuario'
  clave VARCHAR(255) NOT NULL,
  valor TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (proyecto_id) REFERENCES "Proyecto"(id) ON DELETE CASCADE,
  UNIQUE(proyecto_id, tipo_configuracion, clave)
);
```

#### `tipo_actividad` - Tipos de Actividad
```sql
CREATE TABLE tipo_actividad (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  color VARCHAR(7), -- Hex color
  icono VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Datos de ejemplo
INSERT INTO tipo_actividad VALUES
(gen_random_uuid()::text, 'Desarrollo', 'Actividades de desarrollo', '#3B82F6', 'code', true, NOW(), NOW()),
(gen_random_uuid()::text, 'Revisión', 'Actividades de revisión', '#10B981', 'eye', true, NOW(), NOW()),
(gen_random_uuid()::text, 'Reunión', 'Actividades de reunión', '#F59E0B', 'users', true, NOW(), NOW());
```

#### `recurso_tipo` - Tipos de Recurso
```sql
CREATE TABLE recurso_tipo (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. **Sistema de Reportes (3 tablas)**

#### `reportes` - Configuración de Reportes
```sql
CREATE TABLE reportes (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL, -- 'cronograma' | 'costos' | 'tiempo' | 'recursos'
  configuracion JSONB,
  creado_por VARCHAR(255) NOT NULL,
  compartido BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (creado_por) REFERENCES "User"(id)
);
```

#### `reporte_ejecuciones` - Ejecuciones de Reportes
```sql
CREATE TABLE reporte_ejecuciones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reporte_id VARCHAR(255) NOT NULL,
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP NOT NULL,
  estado VARCHAR(50) DEFAULT 'procesando', -- 'procesando' | 'completado' | 'error'
  resultado JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (reporte_id) REFERENCES reportes(id) ON DELETE CASCADE
);
```

#### `dashboard_widgets` - Widgets del Dashboard
```sql
CREATE TABLE dashboard_widgets (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'grafico' | 'tabla' | 'indicador' | 'mapa'
  configuracion JSONB,
  posicion_x INTEGER DEFAULT 0,
  posicion_y INTEGER DEFAULT 0,
  ancho INTEGER DEFAULT 4,
  alto INTEGER DEFAULT 3,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (usuario_id) REFERENCES "User"(id) ON DELETE CASCADE
);
```

### 7. **Sistema de Auditoría (2 tablas)**

#### `auditoria_log` - Log de Auditoría
```sql
CREATE TABLE auditoria_log (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255),
  accion VARCHAR(50) NOT NULL, -- 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  entidad VARCHAR(100) NOT NULL,
  entidad_id VARCHAR(255),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (usuario_id) REFERENCES "User"(id)
);

-- Índices para performance
CREATE INDEX idx_auditoria_usuario ON auditoria_log(usuario_id);
CREATE INDEX idx_auditoria_entidad ON auditoria_log(entidad);
CREATE INDEX idx_auditoria_fecha ON auditoria_log(created_at);
```

#### `sesion_actividad` - Actividad de Sesión
```sql
CREATE TABLE sesion_actividad (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sesion_id VARCHAR(255) NOT NULL,
  usuario_id VARCHAR(255) NOT NULL,
  accion VARCHAR(100) NOT NULL, -- 'page_view' | 'button_click' | 'form_submit' | 'api_call'
  pagina VARCHAR(500),
  detalles JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (usuario_id) REFERENCES "User"(id)
);

CREATE INDEX idx_sesion_usuario ON sesion_actividad(usuario_id);
CREATE INDEX idx_sesion_timestamp ON sesion_actividad(timestamp);
```

---

## 🟡 TABLAS DE PRIORIDAD MEDIA

### 8. **Sistema de Notificaciones (2 tablas)**

#### `notificaciones` - Notificaciones de Usuario
```sql
CREATE TABLE notificaciones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'info', -- 'info' | 'warning' | 'error' | 'success'
  leida BOOLEAN DEFAULT false,
  entidad VARCHAR(100),
  entidad_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (usuario_id) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
```

#### `configuracion_notificaciones` - Configuración de Notificaciones
```sql
CREATE TABLE configuracion_notificaciones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  canal VARCHAR(50) NOT NULL, -- 'email' | 'push' | 'sms'
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (usuario_id) REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, tipo, canal)
);
```

### 9. **Sistema de Integración (2 tablas)**

#### `integracion_config` - Configuración de Integraciones
```sql
CREATE TABLE integracion_config (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'api' | 'webhook' | 'ftp' | 'email'
  configuracion JSONB,
  credenciales JSONB, -- Encriptadas
  activo BOOLEAN DEFAULT true,
  ultima_sincronizacion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `log_sincronizacion` - Log de Sincronización
```sql
CREATE TABLE log_sincronizacion (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  integracion_id VARCHAR(255) NOT NULL,
  tipo_operacion VARCHAR(50) NOT NULL, -- 'import' | 'export' | 'sync'
  estado VARCHAR(50) DEFAULT 'iniciado', -- 'iniciado' | 'procesando' | 'completado' | 'error'
  registros_procesados INTEGER DEFAULT 0,
  registros_exitosos INTEGER DEFAULT 0,
  registros_error INTEGER DEFAULT 0,
  mensaje TEXT,
  detalles JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (integracion_id) REFERENCES integracion_config(id) ON DELETE CASCADE
);
```

---

## 🟢 TABLAS DE PRIORIDAD BAJA

### 10. **Sistema de Plantillas Avanzadas (2 tablas)**

#### `plantilla_proyecto` - Plantillas de Proyecto
```sql
CREATE TABLE plantilla_proyecto (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100),
  configuracion JSONB,
  es_publica BOOLEAN DEFAULT false,
  creado_por VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (creado_por) REFERENCES "User"(id)
);
```

#### `plantilla_cronograma` - Plantillas de Cronograma
```sql
CREATE TABLE plantilla_cronograma (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estructura JSONB,
  duraciones JSONB,
  dependencias JSONB,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 11. **Configuración Global (1 tabla)**

#### `configuracion_global` - Configuración Global del Sistema
```sql
CREATE TABLE configuracion_global (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clave VARCHAR(255) UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'string', -- 'string' | 'number' | 'boolean' | 'json'
  descripcion TEXT,
  categoria VARCHAR(100),
  editable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Datos de ejemplo
INSERT INTO configuracion_global VALUES
(gen_random_uuid()::text, 'empresa_nombre', 'GYS Control', 'string', 'Nombre de la empresa', 'general', true, NOW(), NOW()),
(gen_random_uuid()::text, 'horas_laborales_dia', '8', 'number', 'Horas laborales por día', 'tiempo', true, NOW(), NOW()),
(gen_random_uuid()::text, 'backup_automatico', 'true', 'boolean', 'Backup automático habilitado', 'sistema', true, NOW(), NOW());
```

### 12. **Sistema de Backup (1 tabla)**

#### `backup_historico` - Historial de Backups
```sql
CREATE TABLE backup_historico (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tipo VARCHAR(50) NOT NULL, -- 'completo' | 'tabla' | 'incremental'
  tablas JSONB, -- Lista opcional de tablas
  archivo VARCHAR(500) NOT NULL,
  tamaño BIGINT,
  estado VARCHAR(50) DEFAULT 'completado', -- 'en_proceso' | 'completado' | 'error'
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 RESUMEN DE TABLAS FALTANTES

| Categoría | Tablas | Prioridad | Líneas SQL |
|-----------|--------|-----------|------------|
| **Sistema de Permisos** | 2 | 🔴 CRÍTICA | ~80 |
| **Sistema de Calendario** | 4 | 🔴 CRÍTICA | ~120 |
| **Sistema de EDT** | 1 | 🔴 CRÍTICA | ~15 |
| **Sistema de Cronogramas** | 3 | 🟡 ALTA | ~100 |
| **Sistema de Tracking** | 5+ | 🟡 ALTA | ~150 |
| **Sistema de Reportes** | 3 | 🟡 ALTA | ~80 |
| **Sistema de Auditoría** | 2 | 🟢 MEDIA | ~60 |
| **Sistema de Notificaciones** | 2 | 🟢 BAJA | ~40 |
| **Sistema de Integración** | 2 | 🟢 BAJA | ~50 |
| **Sistema de Plantillas** | 2 | 🟢 BAJA | ~30 |
| **Configuración Global** | 1 | 🟢 BAJA | ~20 |
| **Sistema de Backup** | 1 | 🟢 BAJA | ~20 |

### 🎯 **TOTAL: 27 TABLAS FALTANTES (~765 líneas SQL)**

---

## 🚀 ORDEN DE IMPLEMENTACIÓN SUGERIDO

### **Fase 1 - Día 1 (Crítica)**
1. ✅ `permissions`
2. ✅ `user_permissions`
3. ✅ `CalendarioLaboral`
4. ✅ `DiaCalendario`
5. ✅ `ExcepcionCalendario`
6. ✅ `ConfiguracionCalendario`
7. ✅ `edt`

### **Fase 2 - Día 2 (Alta Prioridad)**
8. ✅ `proyecto_cronograma`
9. ✅ `proyecto_actividades`
10. ✅ `proyecto_tareas`
11. ✅ `registro_tiempo`
12. ✅ `proyecto_hitos`
13. ✅ `configuracion_horas`
14. ✅ `tipo_actividad`
15. ✅ `recurso_tipo`
16. ✅ `reportes`
17. ✅ `reporte_ejecuciones`
18. ✅ `dashboard_widgets`

### **Fase 3 - Día 3-5 (Media/Baja Prioridad)**
19. ✅ `auditoria_log`
20. ✅ `sesion_actividad`
21. ✅ `notificaciones`
22. ✅ `configuracion_notificaciones`
23. ✅ `integracion_config`
24. ✅ `log_sincronizacion`
25. ✅ `plantilla_proyecto`
26. ✅ `plantilla_cronograma`
27. ✅ `configuracion_global`
28. ✅ `backup_historico`

---

**Documento generado:** 27 de Noviembre de 2025  
**Total de tablas faltantes:** 27  
**Líneas SQL estimadas:** ~765