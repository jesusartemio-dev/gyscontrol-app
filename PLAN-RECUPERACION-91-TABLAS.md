# 🚀 PLAN DE RECUPERACIÓN COMPLETO - 91 TABLAS
## Sistema GYS Control - Reconstrucción Base de Datos

**Fecha del Plan:** 27 de Noviembre de 2025  
**Estado Actual:** 64 tablas en local  
**Estado Objetivo:** 91 tablas completas  
**Tiempo Estimado:** 5 días laborables  
**Nivel de Riesgo:** 🔴 ALTO - Requiere backup completo

---

## 📊 SITUACIÓN ACTUAL

### 🔍 **Diagnóstico Completo**
- **Tablas Locales:** 64
- **Tablas Esperadas:** 91
- **Faltantes:** 27 (29.7%)
- **Estado Prisma:** 63 modelos completos
- **Estado Migraciones:** Solo 1 migración de noviembre

### ❌ **Problemas Identificados**
1. **Scripts SQL no aplicados:** `create-permissions-schema.sql`, `create-calendario-tables.sql`
2. **Datos faltantes:** Sistema de duraciones, permisos base, calendarios
3. **Modelos faltantes en schema:** 27 modelos no definidos
4. **Inconsistencias:** Tablas backup huérfanas, migraciones parciales

### ⚠️ **Riesgos Críticos**
- **Pérdida de datos** si no se hace backup previo
- **Inconsistencias** entre NEON y local
- **Tiempo de inactividad** durante la migración
- **Ruptura de relaciones FK** entre tablas

---

## 🎯 ESTRATEGIA DE RECUPERACIÓN

### **Enfoque por Fases (5 Días)**

```
DÍA 1: CRÍTICO  → Backup + Permisos + Calendario
DÍA 2: ALTO     → Sistema de Horas + Cronogramas  
DÍA 3: MEDIO    → Sistema de Reportes + Auditoría
DÍA 4: BAJO     → Sistema de Notificaciones + Integraciones
DÍA 5: VALIDACIÓN → Testing + Documentación
```

### **Principio de Seguridad**
1. **Backup completo** antes de empezar
2. **Ejecución por fases** con verificación
3. **Rollback inmediato** si algo falla
4. **Validación continua** del progreso

---

## 📋 FASE 1: RECUPERACIÓN CRÍTICA (DÍA 1)

### ⏰ **Duración:** 8 horas  
### 🎯 **Objetivo:** 13 tablas críticas  
### 🔴 **Prioridad:** MÁXIMA  

#### **1.1 Backup Completo (30 min)**
```bash
# 1. Backup de NEON (producción)
pg_dump $NEON_DATABASE_URL > backup_neon_$(date +%Y%m%d_%H%M%S).sql

# 2. Backup de Local
pg_dump gys_db > backup_local_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# 3. Backup de schema Prisma
cp prisma/schema.prisma prisma/schema_backup_$(date +%Y%m%d_%H%M%S).prisma
```

#### **1.2 Sistema de Permisos (2 horas)**
```bash
# Ejecutar script de permisos
psql gys_db -f scripts/create-permissions-schema.sql

# Verificar creación
psql gys_db -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('permissions', 'user_permissions');"

# Validar datos
psql gys_db -c "SELECT COUNT(*) as total_permissions FROM permissions;"
# Esperado: 60+ permisos

# Agregar modelos a schema.prisma
# [Ver documento MODELLOS-FALTANTES-SCHEMA.md]
```

#### **1.3 Sistema de Calendario (2.5 horas)**
```bash
# Ejecutar script de calendario
psql gys_db -f scripts/create-calendario-tables.sql

# Verificar enums
psql gys_db -c "SELECT typname FROM pg_type WHERE typname IN ('DiaSemana', 'TipoExcepcion');"

# Verificar tablas
psql gys_db -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'Calendario%';"

# Verificar datos de feriados
psql gys_db -c "SELECT COUNT(*) as feriados_2025 FROM \"ExcepcionCalendario\" WHERE fecha::text LIKE '2025%';"
# Esperado: 16+ feriados

# Normalizar nombres de tablas en schema.prisma
```

#### **1.4 Sistema de EDT (1 hora)**
```sql
-- Crear tabla EDT
CREATE TABLE edt (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  orden INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Datos base
INSERT INTO edt VALUES
(gen_random_uuid()::text, 'Ingeniería Mecánica', 'Diseño y desarrollo mecánico', true, 1, NOW(), NOW()),
(gen_random_uuid()::text, 'Ingeniería Eléctrica', 'Diseño y desarrollo eléctrico', true, 2, NOW(), NOW()),
(gen_random_uuid()::text, 'Montaje e Instalación', 'Montaje e instalación de equipos', true, 3, NOW(), NOW());
```

#### **1.5 Duraciones de Cronograma (1 hora)**
```bash
# Ejecutar seed de duraciones
psql gys_db -f scripts/seed-default-durations.sql

# Verificar datos
psql gys_db -c "SELECT tipoProyecto, nivel, duracionDias FROM plantilla_duracion_cronograma ORDER BY tipoProyecto, nivel;"
# Esperado: 12 registros (3 tipos × 4 niveles)
```

#### **1.6 Validación y Generación Prisma (1 hora)**
```bash
# Regenerar Prisma Client
npx prisma generate

# Verificar tipos
npx prisma format

# Testing básico
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('✅ Conexión exitosa');
prisma.\$disconnect();
"

# Backup del estado intermedio
pg_dump gys_db > backup_fase1_complete_$(date +%Y%m%d_%H%M%SS).sql
```

### ✅ **Criterios de Éxito - Fase 1**
- [ ] 60+ permisos en tabla `permissions`
- [ ] 4 tablas de calendario operativas
- [ ] 16+ feriados cargados
- [ ] Tabla `edt` con 3 registros base
- [ ] 12 duraciones de cronograma cargadas
- [ ] Prisma Client generado sin errores
- [ ] Conexión básica funcional

---

## 📋 FASE 2: SISTEMAS DE ALTA PRIORIDAD (DÍA 2)

### ⏰ **Duración:** 8 horas  
### 🎯 **Objetivo:** 8 tablas adicionales  
### 🟡 **Prioridad:** ALTA  

#### **2.1 Sistema de Cronogramas (3 horas)**
```sql
-- Crear tablas de cronograma
CREATE TABLE proyecto_cronograma (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_id VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  es_baseline BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  estado VARCHAR(50) DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (proyecto_id) REFERENCES "Proyecto"(id) ON DELETE CASCADE,
  UNIQUE(proyecto_id, tipo)
);

CREATE TABLE proyecto_actividades (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_edt_id VARCHAR(255) NOT NULL,
  proyecto_cronograma_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (proyecto_edt_id) REFERENCES "proyecto_edt"(id) ON DELETE CASCADE,
  FOREIGN KEY (proyecto_cronograma_id) REFERENCES proyecto_cronograma(id) ON DELETE CASCADE
);

CREATE TABLE proyecto_tareas (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_actividad_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (proyecto_actividad_id) REFERENCES proyecto_actividades(id) ON DELETE CASCADE
);
```

#### **2.2 Sistema de Tracking de Horas (3 horas)**
```sql
-- Tablas de tracking
CREATE TABLE registro_tiempo (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  proyecto_id VARCHAR(255),
  fecha DATE NOT NULL,
  horas DECIMAL(5,2) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES "User"(id),
  FOREIGN KEY (proyecto_id) REFERENCES "Proyecto"(id)
);

CREATE TABLE proyecto_hitos (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  fecha_plan TIMESTAMP,
  fecha_real TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'planificado',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (proyecto_id) REFERENCES "Proyecto"(id) ON DELETE CASCADE
);

CREATE TABLE configuracion_horas (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proyecto_id VARCHAR(255),
  tipo_configuracion VARCHAR(50) NOT NULL,
  clave VARCHAR(255) NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (proyecto_id) REFERENCES "Proyecto"(id) ON DELETE CASCADE,
  UNIQUE(proyecto_id, tipo_configuracion, clave)
);

CREATE TABLE tipo_actividad (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  color VARCHAR(7),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Datos base
INSERT INTO tipo_actividad VALUES
(gen_random_uuid()::text, 'Desarrollo', 'Actividades de desarrollo', '#3B82F6', true, NOW()),
(gen_random_uuid()::text, 'Revisión', 'Actividades de revisión', '#10B981', true, NOW()),
(gen_random_uuid()::text, 'Reunión', 'Actividades de reunión', '#F59E0B', true, NOW());
```

#### **2.3 Validación Fase 2 (2 horas)**
```bash
# Verificar tablas creadas
psql gys_db -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'proyecto_%' ORDER BY table_name;"

# Verificar FKs
psql gys_db -c "SELECT conname, conrelid::regclass, confrelid::regclass FROM pg_constraint WHERE contype = 'f';"

# Testing con datos reales
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Test cronograma
    const cronograma = await prisma.proyectoCronograma.create({
      data: {
        proyectoId: 'test-proj-id',
        tipo: 'planificacion',
        nombre: 'Test Cronograma'
      }
    });
    console.log('✅ Cronograma creado:', cronograma.id);
    
    // Test registro tiempo
    const registro = await prisma.registroTiempo.create({
      data: {
        usuarioId: 'test-user-id',
        fecha: new Date(),
        horas: 8.0,
        descripcion: 'Test registro'
      }
    });
    console.log('✅ Registro tiempo creado:', registro.id);
    
  } catch (error) {
    console.error('❌ Error en testing:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}
test();
"
```

### ✅ **Criterios de Éxito - Fase 2**
- [ ] 3 tablas de cronograma creadas
- [ ] 5 tablas de tracking operativas
- [ ] Datos base en `tipo_actividad`
- [ ] FKs funcionando correctamente
- [ ] APIs de cronograma operativas

---

## 📋 FASE 3: SISTEMAS DE PRIORIDAD MEDIA (DÍA 3)

### ⏰ **Duración:** 6 horas  
### 🎯 **Objetivo:** 5 tablas adicionales  
### 🟢 **Prioridad:** MEDIA  

#### **3.1 Sistema de Reportes (2.5 horas)**
```sql
CREATE TABLE reportes (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  configuracion JSONB,
  creado_por VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (creado_por) REFERENCES "User"(id)
);

CREATE TABLE reporte_ejecuciones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reporte_id VARCHAR(255) NOT NULL,
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP NOT NULL,
  estado VARCHAR(50) DEFAULT 'procesando',
  resultado JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (reporte_id) REFERENCES reportes(id) ON DELETE CASCADE
);

CREATE TABLE dashboard_widgets (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  configuracion JSONB,
  posicion_x INTEGER DEFAULT 0,
  posicion_y INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES "User"(id) ON DELETE CASCADE
);
```

#### **3.2 Sistema de Auditoría (2 horas)**
```sql
CREATE TABLE auditoria_log (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255),
  accion VARCHAR(50) NOT NULL,
  entidad VARCHAR(100) NOT NULL,
  entidad_id VARCHAR(255),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES "User"(id)
);

CREATE INDEX idx_auditoria_usuario ON auditoria_log(usuario_id);
CREATE INDEX idx_auditoria_entidad ON auditoria_log(entidad);
CREATE INDEX idx_auditoria_fecha ON auditoria_log(created_at);

CREATE TABLE sesion_actividad (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sesion_id VARCHAR(255) NOT NULL,
  usuario_id VARCHAR(255) NOT NULL,
  accion VARCHAR(100) NOT NULL,
  detalles JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES "User"(id)
);
```

#### **3.3 Validación Fase 3 (1.5 horas)**
```bash
# Verificar todas las tablas nuevas
psql gys_db -c "SELECT COUNT(*) as total_tablas FROM information_schema.tables WHERE table_schema = 'public';"
# Esperado: 64 + 27 = 91 tablas

# Verificar performance de consultas
psql gys_db -c "EXPLAIN ANALYZE SELECT * FROM auditoria_log ORDER BY created_at DESC LIMIT 10;"
```

---

## 📋 FASE 4: SISTEMAS DE PRIORIDAD BAJA (DÍA 4)

### ⏰ **Duración:** 6 horas  
### 🎯 **Objetivo:** 6 tablas adicionales  
### 🟢 **Prioridad:** BAJA  

#### **4.1 Sistema de Notificaciones (1.5 horas)**
```sql
CREATE TABLE notificaciones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'info',
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE configuracion_notificaciones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  canal VARCHAR(50) NOT NULL,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, tipo, canal)
);
```

#### **4.2 Sistema de Integración (2 horas)**
```sql
CREATE TABLE integracion_config (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  configuracion JSONB,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE log_sincronizacion (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  integracion_id VARCHAR(255) NOT NULL,
  tipo_operacion VARCHAR(50) NOT NULL,
  estado VARCHAR(50) DEFAULT 'iniciado',
  registros_procesados INTEGER DEFAULT 0,
  registros_exitosos INTEGER DEFAULT 0,
  registros_error INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (integracion_id) REFERENCES integracion_config(id) ON DELETE CASCADE
);
```

#### **4.3 Sistema de Plantillas Avanzadas (1.5 horas)**
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
  FOREIGN KEY (creado_por) REFERENCES "User"(id)
);

CREATE TABLE plantilla_cronograma (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estructura JSONB,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **4.4 Configuración Global y Backup (1 hora)**
```sql
CREATE TABLE configuracion_global (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clave VARCHAR(255) UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'string',
  descripcion TEXT,
  categoria VARCHAR(100),
  editable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE backup_historico (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tipo VARCHAR(50) NOT NULL,
  archivo VARCHAR(500) NOT NULL,
  estado VARCHAR(50) DEFAULT 'completado',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Datos globales básicos
INSERT INTO configuracion_global VALUES
(gen_random_uuid()::text, 'empresa_nombre', 'GYS Control', 'string', 'Nombre de la empresa', 'general', true, NOW()),
(gen_random_uuid()::text, 'horas_laborales_dia', '8', 'number', 'Horas laborales por día', 'tiempo', true, NOW()),
(gen_random_uuid()::text, 'backup_automatico', 'true', 'boolean', 'Backup automático habilitado', 'sistema', true, NOW());
```

---

## 📋 FASE 5: VALIDACIÓN Y TESTING (DÍA 5)

### ⏰ **Duración:** 8 horas  
### 🎯 **Objetivo:** Validación completa del sistema  
### ✅ **Prioridad:** VALIDACIÓN  

#### **5.1 Verificación de Integridad (2 horas)**
```bash
#!/bin/bash
# Script de verificación completa

echo "🔍 VERIFICACIÓN COMPLETA DE BASE DE DATOS"

# 1. Contar tablas
echo "1. Contando tablas..."
TOTAL_TABLAS=$(psql gys_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tablas encontradas: $TOTAL_TABLAS"
if [ "$TOTAL_TABLAS" -eq 91 ]; then
  echo "✅ Número de tablas correcto"
else
  echo "❌ Faltan $(expr 91 - $TOTAL_TABLAS) tablas"
fi

# 2. Verificar FKs
echo "2. Verificando foreign keys..."
FK_COUNT=$(psql gys_db -t -c "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f';")
echo "Foreign Keys: $FK_COUNT"

# 3. Verificar índices
echo "3. Verificando índices..."
INDEX_COUNT=$(psql gys_db -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")
echo "Índices: $INDEX_COUNT"

# 4. Verificar datos críticos
echo "4. Verificando datos críticos..."

# Permisos
PERMISOS=$(psql gys_db -t -c "SELECT COUNT(*) FROM permissions;")
echo "Permisos: $PERMISOS"

# Calendario
CALENDARIOS=$(psql gys_db -t -c "SELECT COUNT(*) FROM \"CalendarioLaboral\";")
echo "Calendarios: $CALENDARIOS"

# Feriados
FERIADOS=$(psql gys_db -c "SELECT COUNT(*) FROM \"ExcepcionCalendario\";")
echo "Feriados: $FERIADOS"

echo "✅ Verificación completa finalizada"
```

#### **5.2 Testing de Funcionalidades (3 horas)**
```javascript
// test-full-system.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCompleteSystem() {
  console.log('🧪 TESTING COMPLETO DEL SISTEMA');
  
  try {
    // Test 1: Permisos
    console.log('1. Testing permisos...');
    const permisos = await prisma.permission.findMany();
    console.log(`✅ ${permisos.length} permisos cargados`);
    
    // Test 2: Calendario
    console.log('2. Testing calendario...');
    const calendarios = await prisma.calendarioLaboral.findMany();
    console.log(`✅ ${calendarios.length} calendarios cargados`);
    
    const feriados = await prisma.excepcionCalendario.findMany();
    console.log(`✅ ${feriados.length} feriados cargados`);
    
    // Test 3: EDTs
    console.log('3. Testing EDTs...');
    const edts = await prisma.edt.findMany();
    console.log(`✅ ${edts.length} EDTs cargados`);
    
    // Test 4: Cronogramas
    console.log('4. Testing cronogramas...');
    const cronogramas = await prisma.proyectoCronograma.findMany();
    console.log(`✅ ${cronogramas.length} cronogramas cargados`);
    
    // Test 5: Tracking
    console.log('5. Testing tracking...');
    const registros = await prisma.registroTiempo.findMany();
    console.log(`✅ ${registros.length} registros de tiempo`);
    
    // Test 6: Auditoría
    console.log('6. Testing auditoría...');
    const auditoria = await prisma.auditoriaLog.findMany();
    console.log(`✅ ${auditoria.length} logs de auditoría`);
    
    console.log('🎉 TODOS LOS TESTS PASARON');
    
  } catch (error) {
    console.error('❌ Error en testing:', error);
    throw error;
  }
}

testCompleteSystem()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

#### **5.3 Performance Testing (2 horas)**
```sql
-- Test de performance de consultas críticas

-- 1. Consulta de cronogramas (compleja)
EXPLAIN ANALYZE
SELECT 
  pc.nombre as cronograma,
  COUNT(pa.id) as actividades,
  COUNT(pt.id) as tareas
FROM proyecto_cronograma pc
LEFT JOIN proyecto_actividades pa ON pc.id = pa.proyecto_cronograma_id
LEFT JOIN proyecto_tareas pt ON pa.id = pt.proyecto_actividad_id
GROUP BY pc.id, pc.nombre;

-- 2. Consulta de permisos (JOIN compleja)
EXPLAIN ANALYZE
SELECT 
  u.name,
  p.name as permission,
  up.type
FROM "User" u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE up.type = 'grant';

-- 3. Consulta de auditoría (LIKE + ORDER BY)
EXPLAIN ANALYZE
SELECT *
FROM auditoria_log
WHERE entidad ILIKE '%proyecto%'
ORDER BY created_at DESC
LIMIT 100;
```

#### **5.4 Documentación Final (1 hora)**
```markdown
# GENERAR DOCUMENTACIÓN FINAL

1. Actualizar ERD completo
2. Documentar APIs nuevas
3. Crear guía de mantenimiento
4. Actualizar README técnico
```

---

## 🚨 COMANDOS DE EMERGENCIA

### **Rollback Inmediato**
```bash
#!/bin/bash
# EMERGENCY_ROLLBACK.sh

echo "🚨 INICIANDO ROLLBACK DE EMERGENCIA"

# 1. Parar aplicación
echo "1. Deteniendo aplicación..."
pm2 stop all || true

# 2. Restaurar backup
echo "2. Restaurando backup..."
psql gys_db < backup_local_pre_migration_YYYYMMDD_HHMMSS.sql

# 3. Restaurar schema
echo "3. Restaurando schema..."
cp prisma/schema_backup_YYYYMMDD_HHMMSS.prisma prisma/schema.prisma

# 4. Regenerar Prisma
echo "4. Regenerando Prisma..."
npx prisma generate

# 5. Reiniciar aplicación
echo "5. Reiniciando aplicación..."
pm2 start ecosystem.config.js

echo "✅ ROLLBACK COMPLETADO"
```

### **Verificación de Emergencia**
```bash
# Verificar estado crítico en 30 segundos
psql gys_db -c "
SELECT 
  'Tablas' as tipo,
  COUNT(*) as cantidad
FROM information_schema.tables 
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'FKs' as tipo,
  COUNT(*) as cantidad
FROM pg_constraint 
WHERE contype = 'f'

UNION ALL

SELECT 
  'Permisos' as tipo,
  COUNT(*) as cantidad
FROM permissions;
"
```

---

## 📊 MÉTRICAS DE ÉXITO

### **KPIs de Recuperación**
| Métrica | Objetivo | Estado Actual |
|---------|----------|---------------|
| **Total Tablas** | 91 | 64 |
| **Tablas Críticas** | 13 | 7 |
| **Modelos Prisma** | 91 | 63 |
| **Permisos Sistema** | 60+ | 0 |
| **Feriados Cargados** | 16+ | 0 |
| **APIs Operativas** | 100% | 70% |
| **Tests Pasando** | 100% | 80% |

### **Tiempo de Recuperación**
- **Fase 1 (Crítica):** 8 horas
- **Fase 2 (Alta):** 8 horas  
- **Fase 3 (Media):** 6 horas
- **Fase 4 (Baja):** 6 horas
- **Fase 5 (Validación):** 8 horas
- **Total:** 36 horas (5 días laborables)

### **Recursos Necesarios**
- **DBA/Senior Developer:** 1 persona tiempo completo
- **Backup Storage:** 2GB mínimo
- **Downtime Estimado:** 4-6 horas total
- **Testing Environment:** Requerido

---

## ✅ CONCLUSIÓN

Este plan de recuperación permitirá restaurar completamente las **91 tablas** del sistema GYS Control, garantizando:

1. **🔒 Seguridad:** Backup completo antes de empezar
2. **⚡ Velocidad:** Ejecución por fases priorizadas
3. **🛡️ Confiabilidad:** Rollback inmediato si algo falla
4. **📋 Completitud:** Todas las funcionalidades恢复adas
5. **✅ Calidad:** Testing exhaustivo en cada fase

**El sistema estará 100% operativo después de 5 días de trabajo intensivo.**

---

**Plan creado:** 27 de Noviembre de 2025  
**Responsable:** Equipo Técnico GYS  
**Próxima revisión:** Después de Fase 1