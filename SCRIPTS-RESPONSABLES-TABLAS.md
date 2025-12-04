# 🔧 SCRIPTS RESPONSABLES DE TABLAS FALTANTES
## Sistema GYS Control - Análisis de Scripts SQL

**Fecha de Análisis:** 27 de Noviembre de 2025  
**Total de Scripts Identificados:** 8  
**Estado:** Algunos aplicados en NEON, otros faltantes en local

---

## 🚨 SCRIPTS DE ALTO RIESGO - CREAN TABLAS DIRECTAMENTE

### 1. **Script:** `scripts/create-permissions-schema.sql`
**🔴 RIESGO MÁXIMO - TABLAS CRÍTICAS FALTANTES**

#### 📋 **Información General**
- **Archivo:** `scripts/create-permissions-schema.sql`
- **Propósito:** Sistema de permisos granulares
- **Fecha:** No especificada (posiblemente octubre 2025)
- **Estado Local:** ❌ **NO APLICADO**
- **Estado NEON:** ✅ Probablemente aplicado
- **Impacto:** 🔴 CRÍTICO - Sistema de seguridad no funcional

#### 🗄️ **Tablas Creadas**
1. **`permissions`** - Permisos del sistema
2. **`user_permissions`** - Permisos específicos por usuario

#### 📜 **Contenido del Script**
```sql
-- Tabla de permisos del sistema
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

-- Tabla de permisos de usuario (overrides)
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

-- Datos iniciales (60 permisos del sistema)
INSERT INTO permissions VALUES
-- Usuarios y Roles
('users.create', 'users.create', 'Crear nuevos usuarios', 'users', 'create', true),
('users.read', 'users.read', 'Ver lista de usuarios', 'users', 'read', true),
('users.update', 'users.update', 'Editar usuarios existentes', 'users', 'update', true),
('users.delete', 'users.delete', 'Eliminar usuarios', 'users', 'delete', true),
('users.manage', 'users.manage', 'Administrar permisos de usuarios', 'users', 'manage', true),

-- Proyectos
('projects.create', 'projects.create', 'Crear nuevos proyectos', 'projects', 'create', true),
('projects.read', 'projects.read', 'Ver proyectos', 'projects', 'read', true),
('projects.update', 'projects.update', 'Editar proyectos', 'projects', 'update', true),
('projects.delete', 'projects.delete', 'Eliminar proyectos', 'projects', 'delete', true),
('projects.manage', 'projects.manage', 'Administrar todos los aspectos de proyectos', 'projects', 'manage', true),

-- Cotizaciones
('cotizaciones.create', 'cotizaciones.create', 'Crear cotizaciones', 'cotizaciones', 'create', true),
('cotizaciones.read', 'cotizaciones.read', 'Ver cotizaciones', 'cotizaciones', 'read', true),
('cotizaciones.update', 'cotizaciones.update', 'Editar cotizaciones', 'cotizaciones', 'update', true),
('cotizaciones.delete', 'cotizaciones.delete', 'Eliminar cotizaciones', 'cotizaciones', 'delete', true),
('cotizaciones.export', 'cotizaciones.export', 'Exportar cotizaciones', 'cotizaciones', 'export', true),

-- [Continúa con 45 permisos más...]
ON CONFLICT (id) DO NOTHING;
```

#### ⚠️ **Problemas Identificados**
- ❌ Script no aplicado en local
- ❌ Sin Foreign Keys definidas correctamente en Prisma
- ❌ Datos de permisos base faltantes
- ❌ Sistema de permisos no operativo

#### 🔧 **Acciones Requeridas**
```bash
# 1. Ejecutar script manualmente
psql -d gys_db -f scripts/create-permissions-schema.sql

# 2. Agregar modelos a schema.prisma
# 3. Regenerar Prisma Client
npx prisma generate

# 4. Validar funcionamiento
node scripts/test-permissions.js
```

---

### 2. **Script:** `scripts/create-calendario-tables.sql`
**🔴 RIESGO MÁXIMO - SISTEMA DE TIEMPO FALTANTE**

#### 📋 **Información General**
- **Archivo:** `scripts/create-calendario-tables.sql`
- **Propósito:** Sistema de calendario laboral
- **Fecha:** No especificada
- **Estado Local:** ❌ **NO APLICADO**
- **Estado NEON:** ✅ Probablemente aplicado
- **Impacto:** 🔴 CRÍTICO - Cálculos de fechas laborables no funcionan

#### 🗄️ **Tablas Creadas**
1. **`CalendarioLaboral`** - Calendarios laborales
2. **`DiaCalendario`** - Configuración de días
3. **`ExcepcionCalendario`** - Feriados y excepciones
4. **`ConfiguracionCalendario`** - Configuración por entidad

#### 📜 **Contenido del Script**
```sql
-- Enums necesarios
CREATE TYPE "DiaSemana" AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');
CREATE TYPE "TipoExcepcion" AS ENUM ('feriado', 'dia_laboral_extra', 'dia_no_laboral');

-- Calendario Laboral
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

-- Datos de ejemplo
INSERT INTO "CalendarioLaboral" VALUES 
('cal-colombia-gys', 'Colombia - GYS Estándar', 'Calendario laboral estándar para Colombia', 'Colombia', 'GYS', true, 8.0, ARRAY['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], '08:00', '12:00', '13:00', '17:00', NOW(), NOW());

-- [Continúa con las otras tablas...]
```

#### ⚠️ **Problemas Identificados**
- ❌ Enums no definidos en Prisma
- ❌ Tablas con nombres inconsistentes (PascalCase vs snake_case)
- ❌ Datos de feriados faltantes
- ❌ Integración con sistema de cronogramas rota

#### 🔧 **Acciones Requeridas**
```bash
# 1. Ejecutar script
psql -d gys_db -f scripts/create-calendario-tables.sql

# 2. Normalizar nombres de tablas
# 3. Agregar modelos a schema.prisma
# 4. Regenerar cliente
```

---

### 3. **Script:** `scripts/migrate_remove_zones.sql`
**🟡 RIESGO MEDIO - MIGRACIÓN PARCIAL**

#### 📋 **Información General**
- **Archivo:** `scripts/migrate_remove_zones.sql`
- **Propósito:** Eliminar sistema de zonas de cronogramas
- **Fecha:** Octubre 2025
- **Estado Local:** ⚠️ **APLICADO PARCIALMENTE**
- **Estado NEON:** ✅ Aplicado completamente
- **Impacto:** 🟡 MEDIO - Datos huérfanos en tablas backup

#### 🗄️ **Operaciones Realizadas**
- **Eliminadas:** `proyecto_zonas`
- **Modificadas:** `proyecto_actividades`
- **Creadas:** `proyecto_zonas_backup`, `proyecto_actividades_backup`

#### 📜 **Contenido del Script**
```sql
BEGIN;

-- Step 1: Create backup of current data
CREATE TABLE IF NOT EXISTS proyecto_zonas_backup AS SELECT * FROM proyecto_zonas;
CREATE TABLE IF NOT EXISTS proyecto_actividades_backup AS SELECT * FROM proyecto_actividades;

-- Step 2: Reassign activities from zones to their parent EDTs
UPDATE proyecto_actividades
SET proyecto_edt_id = (
  SELECT pz.proyecto_edt_id
  FROM proyecto_zonas pz
  WHERE pz.id = proyecto_actividades.proyecto_zona_id
)
WHERE proyecto_zona_id IS NOT NULL;

-- Step 3: Make proyecto_edt_id NOT NULL for activities
ALTER TABLE proyecto_actividades
ALTER COLUMN proyecto_edt_id SET NOT NULL;

-- Step 4: Drop foreign key constraint for zona
ALTER TABLE proyecto_actividades
DROP CONSTRAINT IF EXISTS proyecto_actividades_proyecto_zona_id_fkey;

-- Step 5: Drop the zona_id column from activities
ALTER TABLE proyecto_actividades
DROP COLUMN IF EXISTS proyecto_zona_id;

-- Step 6: Drop the proyecto_zonas table
DROP TABLE IF EXISTS proyecto_zonas;

COMMIT;
```

#### ⚠️ **Problemas Identificados**
- ⚠️ Tablas de backup sin integrar al schema
- ⚠️ Posibles inconsistencias de datos
- ⚠️ Migración incompleta en local

#### 🔧 **Acciones Requeridas**
```sql
-- 1. Verificar integridad de datos
SELECT COUNT(*) as actividades_sin_edt FROM proyecto_actividades WHERE proyecto_edt_id IS NULL;

-- 2. Integrar tablas backup al schema si es necesario
-- 3. Validar funcionamiento del sistema de cronogramas
```

---

## ⚠️ SCRIPTS DE MEDIO RIESGO - DATOS Y SEEDS

### 4. **Scripts:** `scripts/seed-default-durations.*`
**🟡 RIESGO MEDIO - DATOS FALTANTES**

#### 📋 **Información General**
- **Archivos:**
  - `scripts/seed-default-durations.ts`
  - `scripts/seed-default-durations.js`
  - `scripts/seed-default-durations.sql`
- **Propósito:** Datos de plantillas de duración
- **Estado Local:** ⚠️ **TABLA EXISTE, DATOS FALTANTES**
- **Estado NEON:** ✅ Tabla y datos completos

#### 🗄️ **Tablas Involucradas**
- `plantilla_duracion_cronograma`

#### 📜 **Contenido SQL**
```sql
INSERT INTO plantilla_duracion_cronograma (id, tipoProyecto, nivel, duracionDias, horasPorDia, bufferPorcentaje, activo, createdAt, updatedAt) VALUES
-- Construcción
(gen_random_uuid(), 'construccion', 'fase', 30, 8, 15, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'edt', 15, 8, 10, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'actividad', 3, 8, 5, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'tarea', 1, 8, 3, true, NOW(), NOW()),

-- Instalación
(gen_random_uuid(), 'instalacion', 'fase', 20, 8, 12, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'edt', 10, 8, 8, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'actividad', 2, 8, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'tarea', 0.5, 8, 2, true, NOW(), NOW()),

-- Mantenimiento
(gen_random_uuid(), 'mantenimiento', 'fase', 10, 8, 10, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'edt', 5, 8, 7, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'actividad', 1, 8, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'tarea', 0.25, 8, 1, true, NOW(), NOW())

ON CONFLICT (tipoProyecto, nivel) DO NOTHING;
```

#### 🔧 **Acciones Requeridas**
```bash
# Ejecutar seed
psql -d gys_db -f scripts/seed-default-durations.sql

# O con TypeScript
npx ts-node scripts/seed-default-durations.ts
```

---

### 5. **Scripts de Test Data**
**🟢 RIESGO BAJO - SOLO DATOS DE PRUEBA**

#### 📋 **Scripts Identificados**
- `scripts/create-basic-test-data.ts`
- `scripts/create-simple-test-data.ts`
- `scripts/create-horas-hombre-test-data.ts`

#### 📋 **Información General**
- **Propósito:** Datos de prueba para testing
- **Fecha:** 7 de Noviembre de 2025
- **Estado:** ✅ Aplicados en local (según fechas)
- **Impacto:** 🟢 BAJO - Solo datos de test

#### 📜 **Contenido Principal (create-basic-test-data.ts)**
```typescript
// Crear usuario admin
// Crear cliente test
// Crear proyecto test
// Crear EDTs básicas
// Crear cronograma
// Crear recursos
```

---

## 🔍 SCRIPTS DE ANÁLISIS (NO CREAN TABLAS)

### 6. **Scripts de Diagnóstico**
**🟢 INFORMATIVOS - SIN IMPACTO EN BD**

#### 📋 **Scripts**
- `scripts/analyze-migrations.js`
- `scripts/analyze-dangerous-migrations.js`
- `scripts/compare-schema-migrations.js`
- `scripts/analyze-timeline.js`
- `scripts/get-migration-dates.js`

#### 📋 **Propósito**
- ✅ Análisis de migraciones
- ✅ Detección de problemas
- ✅ Comparación schema vs BD
- ✅ Timeline de cambios

#### 📋 **Hallazgos Principales**
- **5 migraciones** aplicadas el 26 Nov 2025
- **Campo `estadoRelacion`** NOT NULL sin default (CRM)
- **13 modelos faltantes** en schema.prisma
- **Gap de 68 días** (Sep 19 → Nov 26)

---

## 📊 RESUMEN DE IMPACTO POR SCRIPT

| Script | Estado Local | Tablas Afectadas | Impacto | Prioridad |
|--------|--------------|------------------|---------|-----------|
| `create-permissions-schema.sql` | ❌ No aplicado | 2 tablas | 🔴 CRÍTICO | 1 |
| `create-calendario-tables.sql` | ❌ No aplicado | 4 tablas | 🔴 CRÍTICO | 2 |
| `migrate_remove_zones.sql` | ⚠️ Parcial | 3 tablas | 🟡 MEDIO | 3 |
| `seed-default-durations.*` | ⚠️ Parcial | 1 tabla | 🟡 MEDIO | 4 |
| Scripts de test data | ✅ Aplicado | 0 tablas | 🟢 BAJO | 5 |
| Scripts de análisis | ✅ Aplicado | 0 tablas | 🟢 BAJO | 6 |

---

## 🚀 PLAN DE EJECUCIÓN DE SCRIPTS

### **Orden de Prioridad**

#### **1. FASE CRÍTICA (Día 1)**
```bash
# Script 1: Permisos
psql -d gys_db -f scripts/create-permissions-schema.sql

# Script 2: Calendario
psql -d gys_db -f scripts/create-calendario-tables.sql

# Script 3: Duraciones
psql -d gys_db -f scripts/seed-default-durations.sql
```

#### **2. FASE CORRECCIÓN (Día 2)**
```bash
# Script 4: Verificar migración de zonas
psql -d gys_db -c "SELECT COUNT(*) as zonas_restantes FROM information_schema.tables WHERE table_name = 'proyecto_zonas';"

# Script 5: Verificar integridad
node scripts/analyze-dangerous-migrations.js
```

#### **3. FASE VALIDACIÓN (Día 3)**
```bash
# Regenerar Prisma
npx prisma generate

# Verificar conexión
npx prisma db seed

# Testing
npm run test:integration
```

---

## ⚠️ RIESGOS Y CONTINGENCIAS

### **Riesgos Identificados**
1. **Conflicto de Foreign Keys:** Scripts aplicados en diferente orden
2. **Datos Inconsistentes:** NEON vs Local desincronizados
3. **Performance:** Creación masiva de índices
4. **Downtime:** Posibles interrupciones durante migración

### **Plan de Contingencia**
```bash
# Backup antes de empezar
pg_dump gys_db > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Rollback si algo falla
psql gys_db < backup_pre_migration_YYYYMMDD_HHMMSS.sql

# Verificación paso a paso
psql gys_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

---

**Documento generado:** 27 de Noviembre de 2025  
**Scripts analizados:** 8  
**Scripts críticos faltantes:** 2  
**Acciones requeridas:** 15+ comandos SQL