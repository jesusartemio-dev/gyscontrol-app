# 🚀 RECOMENDACIONES RECUPERACIÓN SCHEMA26NOV

**Fecha:** 27 de Noviembre de 2025  
**Objetivo:** Plan de trabajo para recuperar BD local al nivel de NEON + Schema26Nov  
**Estado Actual:** 🔴 **CRÍTICO** - 29.7% del sistema perdido en local  

---

## 📊 EVALUACIÓN DE ALINEACIÓN

### 🎯 **NEON vs SCHEMA26NOV: ALINEACIÓN PERFECTA**

#### ✅ **PORCENTAJE DE ALINEACIÓN: 100%**

**Resultado:** NEON mantiene **EXACTAMENTE** el sistema completo del 26Nov
- **Schema 26Nov:** 91+ modelos esperados
- **NEON Real:** 91 tablas existentes
- **Diferencia:** 0 tablas faltantes
- **Sistemas Preservados:** 8/8 sistemas completos

#### 🏆 **SISTEMAS COMPLETAMENTE INTACTOS EN NEON**

| Sistema | Tablas Esperadas | Tablas NEON | Estado |
|---------|------------------|-------------|--------|
| **Plantillas Independientes** | 6 | 6 | ✅ 100% |
| **Calendario Laboral** | 4 | 4 | ✅ 100% |
| **Permisos Granulares** | 2 | 2 | ✅ 100% |
| **Cronogramas Avanzados** | 7 | 7 | ✅ 100% |
| **Analytics/Auditoría** | 3 | 3 | ✅ 100% |
| **Sistema Base** | 4 | 4 | ✅ 100% |
| **CRM Completo** | 7 | 7 | ✅ 100% |
| **Cotizaciones** | 12 | 12 | ✅ 100% |
| **Proyectos** | 12 | 12 | ✅ 100% |
| **Logística** | 7 | 7 | ✅ 100% |
| **Registro Horas** | 8 | 8 | ✅ 100% |
| **Otros** | 19 | 19 | ✅ 100% |

### 🔴 **LOCAL vs SCHEMA26NOV: DESALINEACIÓN CRÍTICA**

#### ❌ **PORCENTAJE DE ALINEACIÓN: 70.3%**

**Resultado:** Local perdió **29.7%** del sistema completo
- **Schema 26Nov:** 91+ modelos esperados  
- **Local Real:** 64 tablas existentes
- **Diferencia:** 27 tablas faltantes
- **Sistemas Completos:** 4/8 sistemas presentes

---

## 🎯 PARTES DEL SISTEMA 26NOV EN NEON

### ✅ **SISTEMAS COMPLETOS Y OPERATIVOS**

#### 🏆 **1. SISTEMA DE PLANTILLAS INDEPENDIENTES**
**Estado:** ✅ **COMPLETO EN NEON**
- 6 tablas totalmente funcionales
- Plantillas flexibles de equipos/servicios/gastos
- **Funcionalidad:** Disponible para usar inmediatamente

#### 🏆 **2. SISTEMA DE CALENDARIO LABORAL**
**Estado:** ✅ **COMPLETO EN NEON**  
- 4 tablas con configuración completa
- Cálculos de fechas laborables, feriados
- **Funcionalidad:** Sistema de tiempo completamente operativo

#### 🏆 **3. SISTEMA DE PERMISOS GRANULARES**
**Estado:** ✅ **COMPLETO EN NEON**
- 2 tablas con permisos por recurso/acción
- Control de acceso granular
- **Funcionalidad:** Seguridad avanzada disponible

#### 🏆 **4. CRONOGRAMAS DE 6 NIVELES**
**Estado:** ✅ **COMPLETO EN NEON**
- 7 tablas para cronograma completo
- Fases → EDT → Tareas → Subtareas
- **Funcionalidad:** Gestión avanzada de proyectos

#### 🏆 **5. ANALYTICS Y AUDITORÍA**
**Estado:** ✅ **COMPLETO EN NEON**
- 3 tablas para tracking y auditoría
- Eventos de sistema, logs, importaciones
- **Funcionalidad:** Monitoreo completo

### ❌ **SISTEMAS FALTANTES EN LOCAL**

#### 🚫 **1. PLANTILLAS INDEPENDIENTES**
**Estado en Local:** ❌ **AUSENTE COMPLETAMENTE**
- 0/6 tablas presentes
- **Impacto:** Sin plantillas flexibles

#### 🚫 **2. CALENDARIO LABORAL**
**Estado en Local:** ❌ **AUSENTE COMPLETAMENTE**
- 0/4 tablas presentes  
- **Impacto:** Sin cálculos de fechas

#### 🚫 **3. PERMISOS GRANULARES**
**Estado en Local:** ❌ **AUSENTE COMPLETAMENTE**
- 0/2 tablas presentes
- **Impacto:** Sin control granular

#### 🚫 **4. CRONOGRAMAS AVANZADOS**
**Estado en Local:** ❌ **AUSENTE COMPLETAMENTE**
- 0/7 tablas presentes
- **Impacto:** Solo cronograma básico

---

## 📋 LISTA PRIORIZADA DE RECUPERACIÓN

### 🔥 **PRIORIDAD CRÍTICA (RECUPERAR INMEDIATAMENTE)**

#### **1. PERMISOS GRANULARES (2 tablas)**
```
1. permissions
2. user_permissions
```
**Razón:** Seguridad básica del sistema
**Impacto:** Control de acceso granular
**Tiempo:** 1-2 horas

#### **2. NOTIFICACIONES (1 tabla)**
```
3. notificaciones
```
**Razón:** Sistema de alertas básicas
**Impacto:** Comunicación interna
**Tiempo:** 30 minutos

#### **3. CALENDARIO LABORAL (4 tablas)**
```
4. calendario_laboral
5. dia_calendario  
6. excepcion_calendario
7. configuracion_calendario
```
**Razón:** Cálculos de tiempo esenciales
**Impacto:** Fechas, feriados, scheduling
**Tiempo:** 2-3 horas

### 🟡 **PRIORIDAD ALTA (RECUPERAR ESTA SEMANA)**

#### **4. CRONOGRAMAS AVANZADOS (7 tablas)**
```
8. proyecto_cronograma
9. proyecto_fase
10. fase_default
11. proyecto_dependencias_tarea
12. proyecto_subtarea
13. cotizacion_fase
14. plantilla_duracion_cronograma
```
**Razón:** Gestión avanzada de proyectos
**Impacto:** Cronogramas de 6 niveles
**Tiempo:** 4-6 horas

#### **5. PLANTILLAS INDEPENDIENTES (6 tablas)**
```
15. plantilla_equipo_independiente
16. plantilla_equipo_item_independiente
17. plantilla_servicio_independiente
18. plantilla_servicio_item_independiente
19. plantilla_gasto_independiente
20. plantilla_gasto_item_independiente
```
**Razón:** Plantillas flexibles
**Impacto:** Modularidad de plantillas
**Tiempo:** 3-4 horas

#### **6. ANALYTICS Y AUDITORÍA (3 tablas)**
```
21. analytics_events
22. audit_log
23. cotizacion_plantilla_import
```
**Razón:** Monitoreo y trazabilidad
**Impacto:** Analytics, auditoría, imports
**Tiempo:** 2-3 horas

### 🟢 **PRIORIDAD MEDIA (RECUPERAR PRÓXIMA SEMANA)**

#### **7. MÉTRICAS DETALLADAS (2 tablas)**
```
24. metrica_comercial
```
**Razón:** Reportes comerciales avanzados
**Impacto:** Métricas detalladas por tipo
**Tiempo:** 1 hora

#### **8. ACTIVIDADES (3 tablas)**
```
25. cotizacion_actividad
26. cotizacion_dependencias_tarea  
27. proyecto_actividad
```
**Razón:** Seguimiento de actividades
**Impacto:** Tracking detallado
**Tiempo:** 2 horas

---

## 🛠️ PLAN DE TRABAJO LÓGICO

### 📅 **FASE 1: PREPARACIÓN (Hacer primero)**

#### **1.1 Backup Completo**
```bash
# Backup de NEON
pg_dump -h ep-cool-pine-ad9tij4p.c-2.us-east-1.aws.neon.tech -U neondb_owner -d neondb > neon_backup_$(date +%Y%m%d).sql

# Backup de Local actual  
pg_dump -h localhost -U postgres -d gys_db > local_backup_before_recovery_$(date +%Y%m%d).sql
```

#### **1.2 Análisis de Migraciones**
```bash
# Verificar migraciones existentes
SELECT * FROM _prisma_migrations ORDER BY created_at;

# Analizar estructura de NEON
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;
```

#### **1.3 Identificar Scripts de Migración**
```
Revisar en scripts/:
- create-permissions-schema.sql
- create-calendario-tables.sql  
- migrate_remove_zones.sql
- Scripts de duración de plantillas
```

### 📅 **FASE 2: RECUPERACIÓN CRÍTICA (Día 1-2)**

#### **2.1 Permisos Granulares**
```sql
-- Aplicar create-permissions-schema.sql
-- Crear permisos base del sistema
-- Asignar permisos por defecto a usuarios existentes
```

#### **2.2 Sistema de Notificaciones**
```sql
-- Recrear tabla notificaciones
-- Configurar triggers básicos
-- Asignar notificaciones existentes si las hay
```

#### **2.3 Calendario Laboral**
```sql
-- Aplicar create-calendario-tables.sql
-- Crear calendario por defecto (Perú/Lima)
-- Configurar días laborables estándar
```

### 📅 **FASE 3: SISTEMAS AVANZADOS (Día 3-5)**

#### **3.1 Cronogramas de 6 Niveles**
```sql
-- Recrear tablas de cronograma
-- Aplicar duraciones predeterminadas
-- Migrar datos existentes si los hay
```

#### **3.2 Plantillas Independientes**
```sql
-- Recrear estructura de plantillas
-- Configurar relaciones con plantillas base
-- Validar integridad referencial
```

#### **3.3 Analytics y Auditoría**
```sql
-- Recrear tablas de tracking
-- Configurar logs básicos
-- Implementar eventos iniciales
```

### 📅 **FASE 4: VALIDACIÓN Y OPTIMIZACIÓN (Día 6-7)**

#### **4.1 Verificación de Integridad**
```bash
# Verificar conteo de tablas
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

# Verificar relaciones FK
SELECT 
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY';
```

#### **4.2 Actualización de Schema.prisma**
```bash
# Regenerar desde NEON
npx prisma db pull --from-neon

# Generar cliente actualizado
npx prisma generate

# Validar seed
npx prisma db seed
```

#### **4.3 Testing Funcional**
```bash
# Probar APIs básicas
npm run test:api

# Verificar integridad de datos
npm run test:integration

# Validar funcionalidades críticas
npm run test:e2e
```

---

## 🎯 MODELOS A REINTRODUCIR

### 📝 **LISTA COMPLETA DE 27 TABLAS FALTANTES**

#### **Grupo 1: Seguridad y Notificaciones (3 tablas)**
```
permissions
user_permissions  
notificaciones
```

#### **Grupo 2: Calendario y Tiempo (4 tablas)**
```
calendario_laboral
dia_calendario
excepcion_calendario
configuracion_calendario
```

#### **Grupo 3: Cronogramas Avanzados (7 tablas)**
```
proyecto_cronograma
proyecto_fase
fase_default
proyecto_dependencias_tarea
proyecto_subtarea
cotizacion_fase
plantilla_duracion_cronograma
```

#### **Grupo 4: Plantillas Independientes (6 tablas)**
```
plantilla_equipo_independiente
plantilla_equipo_item_independiente
plantilla_servicio_independiente
plantilla_servicio_item_independiente
plantilla_gasto_independiente
plantilla_gasto_item_independiente
```

#### **Grupo 5: Analytics y Auditoría (3 tablas)**
```
analytics_events
audit_log
cotizacion_plantilla_import
```

#### **Grupo 6: Métricas y Actividades (4 tablas)**
```
metrica_comercial
cotizacion_actividad
cotizacion_dependencias_tarea
proyecto_actividad
```

---

## 🚨 CONSIDERACIONES ESPECIALES

### ⚠️ **RIESGOS IDENTIFICADOS**

#### **1. Conflictos de Datos**
- **Riesgo:** Datos en local que no existen en NEON
- **Mitigación:** Backup completo antes de empezar
- **Plan:** Merging manual si es necesario

#### **2. Dependencias de Código**
- **Riesgo:** Código que espera las tablas faltantes
- **Mitigación:** Revisar todas las referencias en código
- **Plan:** Actualizar imports y referencias

#### **3. Índices y Performance**
- **Riesgo:** Índices faltantes afectan performance
- **Mitigación:** Recrear índices desde NEON
- **Plan:** Optimización post-migración

#### **4. Permisos y Seguridad**
- **Riesgo:** Configuración de permisos incorrecta
- **Mitigación:** Configurar permisos por defecto seguros
- **Plan:** Testing de acceso post-migración

### 🔄 **ESTRATEGIA DE ROLLBACK**

```bash
# En caso de problemas críticos
# Restaurar backup local
psql -h localhost -U postgres -d gys_db < local_backup_before_recovery_20251127.sql

# Verificar integridad
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
```

---

## 📊 MÉTRICAS DE ÉXITO

### ✅ **CRITERIOS DE RECUPERACIÓN EXITOSA**

#### **1. Cuantitativos**
- **91 tablas** presentes en local (vs 64 actuales)
- **100%** de sistemas del 26Nov恢复ados
- **0 errores** en validaciones de integridad
- **Prisma Client** generado sin errores

#### **2. Cualitativos**  
- **Funcionalidades** del 26Nov operativas
- **Performance** similar o mejor que NEON
- **APIs** funcionando con nuevos modelos
- **Frontend** sin errores de tipos

#### **3. Funcionales**
- Sistema de permisos granular operativo
- Cronogramas de 6 niveles funcionales  
- Plantillas independientes disponibles
- Calendario laboral calculando fechas
- Analytics capturando eventos

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

### 📅 **HOY MISMO**
1. **✅ Completado:** Análisis de situación
2. **🔄 Siguiente:** Crear backup de NEON y local
3. **📋 Pendiente:** Revisar scripts de migración existentes
4. **🛠️ Pendiente:** Identificar dependencias de código

### 📅 **ESTA SEMANA**
1. **Día 1-2:** Aplicar Fase 1 (crítico)
2. **Día 3-5:** Aplicar Fase 2 (avanzado)  
3. **Día 6-7:** Validación y testing

### 📅 **PRÓXIMA SEMANA**
1. **Optimización** de performance
2. **Actualización** de código frontend
3. **Documentación** de nuevas funcionalidades
4. **Capacitación** del equipo

---

## 💡 VALOR DE LA RECUPERACIÓN

### 🎯 **BENEFICIOS ESPERADOS**

#### **Funcionales**
- **Sistema completo** del 26Nov operativo
- **Funcionalidades avanzadas** disponibles
- **Escalabilidad** mejorada
- **Flexibilidad** de plantillas

#### **Técnicos**
- **Paridad** completa con NEON
- **Schema sincronizado** con BD real
- **Mantenimiento** simplificado
- **Desarrollo** sin limitaciones

#### **Operacionales**
- **Capacidades completas** para usuarios
- **Competitividad** del sistema restaurada
- **Roadmap** de desarrollo desbloqueado
- **ROI** de inversión en desarrollo preservado

### 💰 **COSTO DE NO RECUPERAR**

#### **Riesgos de Mantener Estado Actual**
- **30% funcionalidad** permanentemente perdida
- **Desarrollo limitado** por schema incompleto
- **Frustración usuario** por funciones faltantes
- **Deuda técnica** creciente
- **Pérdida de competitividad** del sistema

---

## ✅ CONCLUSIÓN

### 🏆 **RESUMEN EJECUTIVO**

**Estado Actual:** 🔴 CRÍTICO - 29.7% del sistema perdido  
**Solución:** 🟢 NEON como fuente de recuperación completa  
**Esfuerzo:** 🟡 Moderado - 27 tablas en 1-2 semanas  
**Beneficio:** 🟢 Sistema 100% operativo como el 26Nov  

### 🚀 **RECOMENDACIÓN FINAL**

**PROCEDER INMEDIATAMENTE** con la recuperación utilizando NEON como fuente. El costo-beneficio es altamente favorable y la complejidad es manejable.

**NEON preservó perfectamente el sistema del 26Nov y puede servir como referencia completa para la recuperación local.**

---

**Documento generado:** 27 de Noviembre de 2025  
**Plan:** Recuperación Schema26Nov → Local  
**Estado:** 🚀 **LISTO PARA EJECUTAR**  
**Responsable:** Equipo Técnico GYS  
**Duración estimada:** 1-2 semanas  
**Complejidad:** 🟡 Media-Alta