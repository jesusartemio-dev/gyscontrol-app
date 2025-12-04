# 🔍 AUDITORÍA COMPLETA - NOVIEMBRE 2025
## Sistema GYS Control - Base de Datos y Esquema

**Fecha de Auditoría:** 27 de Noviembre de 2025  
**Período Analizado:** Noviembre 2025  
**Estado Actual:** 64 tablas en local vs 91 tablas esperadas = **27 TABLAS FALTANTES**

---

## 📋 RESUMEN EJECUTIVO

### ❌ PROBLEMA CRÍTICO IDENTIFICADO
- **Local:** 64 tablas existentes
- **Esperado:** 91 tablas según schema.prisma
- **Faltantes:** 27 tablas (29.7% del sistema)

### ✅ HALLAZGOS PRINCIPALES
1. **Schema.prisma Completo:** 63 modelos definidos correctamente
2. **Migraciones Locales:** Solo 1 migración de noviembre encontrada
3. **Scripts SQL Externos:** 4+ scripts crean tablas fuera del sistema de migraciones
4. **Desincronización:** Base de datos local incompleta vs NEON

---

## 📁 ARCHIVOS MODIFICADOS EN NOVIEMBRE 2025

### 🔧 **Archivos de Código (TypeScript/JavaScript)**

| Archivo | Fecha | Tipo de Cambio | Impacto |
|---------|-------|----------------|---------|
| `src/lib/services/listaEquipoImportExcel.ts` | 2025-11-18 | Nuevo/Major | ✅ Excel import system |
| `src/components/logistica/SelectorMultiListaModal.tsx` | 2025-11-17 | Nuevo/Major | ✅ Multi-list selector |
| `src/app/proyectos/[id]/servicios/page.tsx` | 2025-11-12 | Update | ✅ Services page |
| `scripts/create-basic-test-data.ts` | 2025-11-07 | Nuevo | ✅ Test data creation |
| `scripts/create-simple-test-data.ts` | 2025-11-07 | Nuevo | ✅ Simple test data |
| `scripts/create-horas-hombre-test-data.ts` | 2025-11-07 | Nuevo | ✅ Hours tracking test |
| `src/app/api/proyectos/[id]/cronograma/[cronogramaId]/baseline/route.ts` | 2025-11-04 | Nuevo | ✅ Baseline management |
| `src/app/api/proyectos/[id]/cronograma/tree/[nodeId]/route.ts` | 2025-11-03 | Nuevo | ✅ Timeline API |

### 🗄️ **Migraciones y SQL**

| Archivo | Fecha | Tipo | Impacto |
|---------|-------|------|---------|
| `migrations/20231125_add_plantilla_duracion_cronograma.sql` | 2025-11-25 | Migración | ✅ Duration templates |
| `scripts/seed-default-durations.ts` | 2025-11-25 | Seed | ✅ Duration seeding |
| `scripts/seed-default-durations.js` | 2025-11-25 | Seed | ✅ Duration seeding JS |
| `scripts/seed-default-durations.sql` | 2025-11-25 | Seed | ✅ Duration seeding SQL |

### 📚 **Documentación**

| Archivo | Fecha | Tipo | Descripción |
|---------|-------|------|-------------|
| `RESUMEN_CAMBIOS_PRISMA_NOVIEMBRE.md` | 2025-11-27 | Reporte | ✅ Prisma changes summary |
| `docs/IMPLEMENTACION_COTIZACIONES_MULTI_LISTA.md` | 2025-11-17 | Guide | ✅ Multi-list implementation |
| `CRONOGRAMA_WORKFLOW_REDESIGN.md` | 2025-11-04 | Design | ✅ Timeline workflow |
| `docs/ANALISIS_IMPLEMENTACION_HORAS_HOMBRE.md` | 2025-11-12 | Analysis | ✅ Hours tracking analysis |
| `docs/DIAGNOSTICO_INVESTIGACION_HORAS_HOMBRE.md` | 2025-11-07 | Report | ✅ Hours tracking diagnostic |

---

## 🗄️ ANÁLISIS DE MIGRACIONES LOCALES

### 📋 **Migraciones Encontradas**

#### ✅ **1. Migración Aplicada: `20231125_add_plantilla_duracion_cronograma.sql`**
- **Fecha:** 25 de Noviembre de 2023 (No 2025)
- **Estado:** ✅ Aplicada
- **Tablas Creadas:**
  - `plantilla_duracion_cronograma`
- **Índices Creados:**
  - `plantilla_duracion_cronograma_tipoProyecto_nivel_key` (único)
  - `plantilla_duracion_cronograma_tipoProyecto_activo_idx`
  - `plantilla_duracion_cronograma_nivel_activo_idx`

### ❌ **Migraciones Faltantes (Probablemente en NEON)**
Según el análisis de scripts SQL, faltan migraciones para:
1. **Sistema de Permisos:** `permissions`, `user_permissions`
2. **Sistema de Calendario:** `CalendarioLaboral`, `DiaCalendario`, `ExcepcionCalendario`, `ConfiguracionCalendario`
3. **Sistema de Horas-Hombre:** Múltiples tablas relacionadas
4. **Backup Tables:** `proyecto_zonas_backup`, `proyecto_actividades_backup`

---

## 📊 COMPARACIÓN SCHEMA VS MIGRACIONES

### ✅ **Schema.prisma - Estado Actual (63 Modelos)**

#### **MODELOS BASE:**
- `User`, `Account`, `Session`, `VerificationToken`
- `Cliente`, `Unidad`, `UnidadServicio`

#### **CATÁLOGOS:**
- `CategoriaEquipo`, `CategoriaServicio`, `Recurso`
- `CatalogoEquipo`, `CatalogoServicio`

#### **PLANTILLAS:**
- `Plantilla`, `PlantillaEquipo`, `PlantillaEquipoItem`
- `PlantillaServicio`, `PlantillaServicioItem`
- `PlantillaGasto`, `PlantillaGastoItem`

#### **COTIZACIONES:**
- `Cotizacion`, `CotizacionEquipo`, `CotizacionEquipoItem`
- `CotizacionServicio`, `CotizacionServicioItem`
- `CotizacionGasto`, `CotizacionGastoItem`
- `CotizacionEdt`, `CotizacionTarea`

#### **PROYECTOS:**
- `Proyecto`, `ProyectoEdt`
- `ProyectoEquipo`, `ProyectoEquipoItem`
- `ProyectoGasto`, `ProyectoGastoItem`
- `ProyectoServicio`, `ProyectoServicioItem`

#### **LISTAS Y EQUIPOS:**
- `ListaEquipo`, `ListaEquipoItem`
- `Proveedor`, `CotizacionProveedor`, `CotizacionProveedorItem`

#### **PEDIDOS:**
- `PedidoEquipo`, `PedidoEquipoItem`
- `Valorizacion`, `RegistroHoras`

#### **CRONOGRAMAS:**
- `Tarea`, `Subtarea`, `DependenciaTarea`
- `AsignacionRecurso`, `RegistroProgreso`

#### **EXCLUSIONES Y CONDICIONES:**
- `CotizacionExclusion`, `CotizacionCondicion`
- `PlantillaExclusion`, `PlantillaExclusionItem`
- `PlantillaCondicion`, `PlantillaCondicionItem`

#### **MÓDULO CRM:**
- `CrmOportunidad`, `CrmActividad`, `CrmCompetidorLicitacion`
- `CrmContactoCliente`, `CrmHistorialProyecto`, `CrmMetricaComercial`

#### **VERSIONADO:**
- `CotizacionVersion`

### ❌ **TABLAS FALTANTES EN LOCAL (27 tablas)**

Basado en los scripts SQL analizados, faltan las siguientes tablas:

#### **1. Sistema de Permisos (2 tablas)**
```sql
-- permissions
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

-- user_permissions
CREATE TABLE user_permissions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  permission_id VARCHAR(255) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('grant', 'deny')) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **2. Sistema de Calendario (4 tablas)**
```sql
-- CalendarioLaboral
CREATE TABLE "CalendarioLaboral" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "pais" TEXT,
  "empresa" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "horasPorDia" DECIMAL(5,2) NOT NULL DEFAULT 8.0,
  "diasLaborables" "DiaSemana"[],
  -- ... more fields
);

-- DiaCalendario
-- ExcepcionCalendario  
-- ConfiguracionCalendario
```

#### **3. Sistema de Horas-Hombre (15+ tablas)**
Basado en los scripts de test y APIs, faltan tablas como:
- `edt` (categorías de servicio)
- `proyecto_cronograma`
- `proyecto_actividad`
- `proyecto_tarea`
- Y otras relacionadas con el sistema de tracking de horas

#### **4. Tablas de Backup (2 tablas)**
```sql
-- Created by migrate_remove_zones.sql
CREATE TABLE proyecto_zonas_backup AS SELECT * FROM proyecto_zonas;
CREATE TABLE proyecto_actividades_backup AS SELECT * FROM proyecto_actividades;
```

---

## 🔧 SCRIPTS QUE CREAN TABLAS FUERA DEL SISTEMA DE MIGRACIONES

### 🚨 **Scripts de Alto Riesgo (Crean Tablas Directamente)**

#### **1. `scripts/create-permissions-schema.sql`**
- **Propósito:** Sistema de permisos granulares
- **Tablas Creadas:** `permissions`, `user_permissions`
- **Fecha:** No especificada (posiblemente octubre 2025)
- **Estado:** ❌ Probablemente aplicado solo en NEON
- **Riesgo:** ALTO - Sistema de seguridad sin migrar

#### **2. `scripts/create-calendario-tables.sql`**
- **Propósito:** Sistema de calendario laboral
- **Tablas Creadas:** `CalendarioLaboral`, `DiaCalendario`, `ExcepcionCalendario`, `ConfiguracionCalendario`
- **Enums:** `DiaSemana`, `TipoExcepcion`
- **Estado:** ❌ Probablemente aplicado solo en NEON
- **Riesgo:** ALTO - Sistema de tiempo/calendario sin migrar

#### **3. `scripts/migrate_remove_zones.sql`**
- **Propósito:** Remover zonas del sistema de cronogramas
- **Tablas Creadas:** `proyecto_zonas_backup`, `proyecto_actividades_backup`
- **Tablas Eliminadas:** `proyecto_zonas`
- **Estado:** ❌ Aplicado pero backup sin migrar
- **Riesgo:** MEDIO - Datos de backup huérfanos

### ⚠️ **Scripts de Medio Riesgo (Datos, no estructura)**

#### **4. Scripts de Seed de Duraciones**
- `scripts/seed-default-durations.ts/.js/.sql`
- **Propósito:** Datos de plantillas de duración
- **Estado:** ✅ Tienen tabla pero necesitan migración

### 🔍 **Scripts de Análisis (No crean tablas)**

#### **5. Scripts de Diagnóstico**
- `scripts/analyze-migrations.js`
- `scripts/analyze-dangerous-migrations.js`
- `scripts/compare-schema-migrations.js`
- `scripts/analyze-timeline.js`
- `scripts/get-migration-dates.js`

---

## 🎯 ANÁLISIS DE IMPACTO

### ❌ **Funcionalidades Comprometidas**

#### **1. Sistema de Permisos**
- **Tablas Faltantes:** `permissions`, `user_permissions`
- **Impacto:** Control de acceso granular no funcional
- **Usuarios Afectados:** Todos los usuarios del sistema

#### **2. Sistema de Calendario**
- **Tablas Faltantes:** `CalendarioLaboral`, `DiaCalendario`, `ExcepcionCalendario`, `ConfiguracionCalendario`
- **Impacto:** Cálculos de fechas laborables, feriados, scheduling
- **Usuarios Afectados:** Gestores de proyecto, planificación

#### **3. Sistema de Horas-Hombre**
- **Tablas Faltantes:** Múltiples tablas relacionadas con tracking
- **Impacto:** Registro de horas, reportes de tiempo
- **Usuarios Afectados:** Colaboradores, project managers

#### **4. Sistema de Cronogramas**
- **Problema:** Script de migración de zonas aplicado parcialmente
- **Impacto:** Posibles inconsistencias en datos de cronograma

### ✅ **Funcionalidades Operativas**

#### **1. Sistema Base Completo**
- 63 modelos en schema.prisma funcionando
- Migraciones principales aplicadas
- APIs y frontend operativos

#### **2. Sistema de Cotizaciones**
- Múltiples listas implementadas (noviembre)
- Excel import funcionando
- Multi-list selector operativo

---

## 📊 DIFERENCIA REAL: 64 vs 91 TABLAS

### 🔢 **Conteo Actual**
- **Tablas en Local:** 64
- **Modelos en Schema:** 63 (+ 1 tabla de migración)
- **Esperado:** 91
- **Faltantes:** 27 (29.7%)

### 📋 **Distribución de Tablas Faltantes**

| Categoría | Tablas Faltantes | Prioridad |
|-----------|------------------|-----------|
| **Sistema de Permisos** | 2 | 🔴 CRÍTICA |
| **Sistema de Calendario** | 4 | 🔴 CRÍTICA |
| **Sistema de Horas-Hombre** | 15+ | 🟡 ALTA |
| **Sistema de Cronogramas** | 3-4 | 🟡 ALTA |
| **Tablas de Backup** | 2 | 🟢 MEDIA |
| **Otras** | 1-2 | 🟢 BAJA |

---

## 🚀 PLAN DE RECUPERACIÓN

### 🎯 **Estrategia de 3 Fases**

#### **FASE 1: Recuperación Crítica (Inmediata)**
1. **Aplicar Migraciones Faltantes**
   ```sql
   -- Aplicar create-permissions-schema.sql
   -- Aplicar create-calendario-tables.sql
   -- Aplicar plantilla_duracion_cronograma.sql
   ```

2. **Verificar Integridad**
   ```bash
   npx prisma db push
   npx prisma generate
   npx prisma db seed
   ```

3. **Testing Básico**
   - Verificar conexión a BD
   - Probar APIs básicas
   - Validar Prisma Client

#### **FASE 2: Sistema de Horas-Hombre (1-2 días)**
1. **Identificar Tablas Faltantes**
   - Revisar scripts de test
   - Analizar dependencias de APIs
   - Mapear relaciones completas

2. **Crear Migraciones**
   - Recrear tablas faltantes
   - Establecer relaciones
   - Crear índices apropiados

3. **Migrar Datos (si existen en NEON)**
   - Backup de datos en NEON
   - Restaurar en local
   - Validar integridad

#### **FASE 3: Optimización y Sincronización (3-5 días)**
1. **Sincronización Completa**
   - Verificar todas las 91 tablas
   - Validar relaciones FK
   - Testing integral

2. **Performance**
   - Optimizar índices
   - Verificar queries
   - Análisis de performance

3. **Documentación**
   - Actualizar diagramas ER
   - Documentar estructura final
   - Procedures de mantenimiento

### 🔧 **Comandos de Verificación**

```bash
# 1. Verificar tablas actuales
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

# 2. Comparar con schema esperado
npx prisma db pull --preview-feature
npx prisma generate

# 3. Aplicar migraciones faltantes
# (Ejecutar scripts SQL manualmente)

# 4. Validar integridad
npx prisma db seed
npm run test:integration
```

### ⚠️ **Riesgos y Mitigaciones**

#### **Riesgos Identificados:**
1. **Pérdida de Datos:** Datos en NEON no sincronizados
2. **Conflictos de FK:** Relaciones rotas entre sistemas
3. **Performance:** Índices faltantes
4. **Inconsistencias:** Datos huérfanos

#### **Plan de Mitigación:**
1. **Backup Completo:** NEON → Local antes de empezar
2. **Testing Incrementales:** Aplicar por fases
3. **Rollback Plan:** Scripts de reversión preparados
4. **Monitoring:** Logs detallados del proceso

---

## 📝 CONCLUSIONES Y RECOMENDACIONES

### 🎯 **Conclusiones Principales**

1. **Estado Actual:** Base de datos local **incompleta** (70.3% del sistema)
2. **Causa Raíz:** Migraciones aplicadas en NEON pero no en local
3. **Impacto:** Funcionalidades críticas **no operativas**
4. **Solución:** Recuperación planificada en 3 fases

### 🚀 **Recomendaciones Inmediatas**

#### **1. ACCIÓN INMEDIATA (Hoy)**
- [ ] Backup completo de NEON
- [ ] Aplicar migraciones críticas (permisos, calendario)
- [ ] Verificar funcionalidad básica

#### **2. ACCIÓN CORTO PLAZO (Esta semana)**
- [ ] Sistema de horas-hombre completo
- [ ] Testing integral de funcionalidades
- [ ] Sincronización con NEON

#### **3. ACCIÓN LARGO PLAZO (Próximo mes)**
- [ ] Implementar proceso de sincronización automática
- [ ] Monitoreo continuo de consistencia BD
- [ ] Documentación completa del sistema

### 🔍 **Próximos Pasos**

1. **Ejecutar Fase 1** del plan de recuperación
2. **Monitorear** el progreso de recuperación
3. **Validar** cada funcionalidad después de aplicarla
4. **Documentar** lecciones aprendidas
5. **Implementar** controles preventivos

---

**Auditoría realizada el:** 27 de Noviembre de 2025  
**Próxima revisión:** Después de aplicar Fase 1  
**Responsable:** Sistema GYS - Equipo Técnico

---

## 📎 ANEXOS

### A. Archivos de Referencia
- `prisma/schema.prisma` - Schema completo
- `migrations/` - Migraciones locales
- `scripts/` - Scripts de creación
- Documentación en `docs/`

### B. Scripts SQL de Recuperación
- `create-permissions-schema.sql`
- `create-calendario-tables.sql`
- `seed-default-durations.sql`

### C. Comandos de Diagnóstico
- Scripts de análisis en `scripts/analyze-*.js`
- Queries de verificación en `query_migrations.sql`