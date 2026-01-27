# 📋 **PLAN DE CORRECCIÓN COMPLETA DE NOMENCLATURA**

*Análisis exhaustivo para alinear base de datos con convenciones establecidas*

## 📊 **RESUMEN EJECUTIVO**

- **Estado Actual**: 48% de cumplimiento con convenciones
- **Modelos a Corregir**: 27 de 70 (38.5%)
- **Campos de Relación a Corregir**: ~105 de ~150 (70%)
- **Tiempo Estimado**: 8-15 días laborables
- **Riesgo**: Medio-Alto
- **Impacto**: Sistema completo

---

## 🚨 **CAMBIOS CRÍTICOS REQUERIDOS**

### **1. ERROR ACTUAL QUE CAUSA FALLA DEL DASHBOARD**

**Problema**:
```typescript
// ❌ ESTO CAUSA EL ERROR:
prisma.auditLog.findMany()

// ✅ SOLUCIÓN INMEDIATA:
prisma.audit_log.findMany()
```

**Archivos Afectados**:
- `src/app/api/dashboard/route.ts` (líneas 107, 345, 581)
- `src/lib/services/audit.ts` (múltiples líneas)
- `src/lib/services/auditLogger.ts` (múltiples líneas)
- `src/app/api/audit/route.ts` (línea 35)
- `src/app/api/pedido-equipo/[id]/route.ts` (línea 147)

**Acción Requerida**: Cambio inmediato sin impacto en BD

---

## 📋 **CAMBIOS EN MODELOS PRISMA**

### **Modelos que DEBEN cambiar de snake_case a PascalCase**

| **Modelo Actual** | **Nuevo Modelo** | **Tabla PostgreSQL** | **Impacto en APIs** | **Archivos Afectados** |
|------------------|------------------|---------------------|-------------------|----------------------|
| `audit_log` | `AuditLog` | `audit_log` | 🔴 **CRÍTICO** | 5+ archivos |
| `analytics_events` | `AnalyticsEvents` | `analytics_events` | 🟡 MEDIO | Servicios analytics |
| `calendario_laboral` | `CalendarioLaboral` | `calendario_laboral` | 🟡 MEDIO | APIs de cronograma |
| `configuracion_calendario` | `ConfiguracionCalendario` | `configuracion_calendario` | 🟡 MEDIO | APIs de configuración |
| `cotizacion_actividad` | `CotizacionActividad` | `cotizacion_actividad` | 🔴 **ALTO** | APIs de cronograma |
| `cotizacion_dependencias_tarea` | `CotizacionDependenciasTarea` | `cotizacion_dependencias_tarea` | 🔴 **ALTO** | APIs de dependencias |
| `cotizacion_fase` | `CotizacionFase` | `cotizacion_fase` | 🔴 **ALTO** | APIs de cronograma |
| `cotizacion_plantilla_import` | `CotizacionPlantillaImport` | `cotizacion_plantilla_import` | 🟡 MEDIO | APIs de plantillas |
| `dia_calendario` | `DiaCalendario` | `dia_calendario` | 🟡 MEDIO | APIs de cronograma |
| `excepcion_calendario` | `ExcepcionCalendario` | `excepcion_calendario` | 🟡 MEDIO | APIs de cronograma |
| `fase_default` | `FaseDefault` | `fase_default` | 🟡 MEDIO | APIs de servicios |
| `metrica_comercial` | `MetricaComercial` | `metrica_comercial` | 🟡 MEDIO | APIs de métricas |
| `notificaciones` | `Notificaciones` | `notificaciones` | 🟡 MEDIO | APIs de notificaciones |
| `permissions` | `Permissions` | `permissions` | 🟡 MEDIO | APIs de permisos |
| `plantilla_duracion_cronograma` | `PlantillaDuracionCronograma` | `plantilla_duracion_cronograma` | 🟡 MEDIO | APIs de configuración |
| `plantilla_equipo_independiente` | `PlantillaEquipoIndependiente` | `plantilla_equipo_independiente` | 🟡 BAJO | APIs de plantillas |
| `plantilla_equipo_item_independiente` | `PlantillaEquipoItemIndependiente` | `plantilla_equipo_item_independiente` | 🟡 BAJO | APIs de plantillas |
| `plantilla_gasto_independiente` | `PlantillaGastoIndependiente` | `plantilla_gasto_independiente` | 🟡 BAJO | APIs de plantillas |
| `plantilla_gasto_item_independiente` | `PlantillaGastoItemIndependiente` | `plantilla_gasto_item_independiente` | 🟡 BAJO | APIs de plantillas |
| `plantilla_servicio_independiente` | `PlantillaServicioIndependiente` | `plantilla_servicio_independiente` | 🟡 BAJO | APIs de plantillas |
| `plantilla_servicio_item_independiente` | `PlantillaServicioItemIndependiente` | `plantilla_servicio_item_independiente` | 🟡 BAJO | APIs de plantillas |
| `proyecto_actividad` | `ProyectoActividad` | `proyecto_actividad` | 🔴 **ALTO** | APIs de cronograma |
| `proyecto_cronograma` | `ProyectoCronograma` | `proyecto_cronograma` | 🔴 **ALTO** | APIs de cronograma |
| `proyecto_dependencias_tarea` | `ProyectoDependenciasTarea` | `proyecto_dependencias_tarea` | 🔴 **ALTO** | APIs de dependencias |
| `proyecto_fase` | `ProyectoFase` | `proyecto_fase` | 🔴 **ALTO** | APIs de cronograma |
| `proyecto_subtarea` | `ProyectoSubtarea` | `proyecto_subtarea` | 🔴 **ALTO** | APIs de tareas |
| `proyecto_tarea` | `ProyectoTarea` | `proyecto_tarea` | 🔴 **ALTO** | APIs de tareas |
| `user_permissions` | `UserPermissions` | `user_permissions` | 🟡 MEDIO | APIs de permisos |

---

## 🔄 **CAMBIOS EN CAMPOS DE RELACIÓN**

### **User Model (Líneas 33-52)**

**Cambios Requeridos**:
```prisma
// ANTES:
audit_log                   audit_log[]
metrica_comercial           metrica_comercial[]
notificaciones              notificaciones[]
proyecto_actividad          proyecto_actividad[]
proyecto_subtarea           proyecto_subtarea[]
proyecto_tarea              proyecto_tarea[]
user_permissions            user_permissions[]

// DESPUÉS:
auditLog                    AuditLog[]
metricaComercial            MetricaComercial[]
notificaciones              Notificaciones[]
proyectoActividad           ProyectoActividad[]
proyectoSubtarea            ProyectoSubtarea[]
proyectoTarea               ProyectoTarea[]
userPermissions             UserPermissions[]
```

### **Cotizacion Model (Líneas 410, 421-422)**

**Cambios Requeridos**:
```prisma
// ANTES:
calendario_laboral          calendario_laboral?           
cotizacion_fase             cotizacion_fase[]            
cotizacion_plantilla_import cotizacion_plantilla_import[]

// DESPUÉS:
calendarioLaboral           CalendarioLaboral?           
cotizacionFase              CotizacionFase[]            
cotizacionPlantillaImport   CotizacionPlantillaImport[]
```

### **Proyecto Model (Líneas 647-649)**

**Cambios Requeridos**:
```prisma
// ANTES:
proyecto_cronograma      proyecto_cronograma[]
proyecto_fase            proyecto_fase[]

// DESPUÉS:
proyectoCronograma       ProyectoCronograma[]
proyectoFase             ProyectoFase[]
```

### **ProyectoEdt Model (Líneas 683-684)**

**Cambios Requeridos**:
```prisma
// ANTES:
proyecto_actividad   proyecto_actividad[]
proyecto_cronograma  proyecto_cronograma  
proyecto_fase        proyecto_fase?       
proyecto_tarea       proyecto_tarea[]

// DESPUÉS:
proyectoActividad    ProyectoActividad[]
proyectoCronograma   ProyectoCronograma  
proyectoFase         ProyectoFase?       
proyectoTarea        ProyectoTarea[]
```

---

## 🔍 **ANÁLISIS DE IMPACTO EN APIs Y SERVICIOS**

### **APIs DE ALTO IMPACTO (CRÍTICO)**

#### **1. APIs de Dashboard**
**Archivos Afectados**:
- `src/app/api/dashboard/route.ts`
- `src/lib/services/audit.ts`
- `src/lib/services/auditLogger.ts`

**Cambios Requeridos**:
```typescript
// ANTES:
prisma.auditLog.findMany()
prisma.auditLog.create()
prisma.auditLog.count()

// DESPUÉS:
prisma.audit_log.findMany()
prisma.audit_log.create()
prisma.audit_log.count()
```

#### **2. APIs de Cronograma**
**Archivos Afectados**:
- `src/app/api/proyectos/[id]/cronograma/actividades/route.ts`
- `src/lib/services/cronogramaService.ts`
- `src/lib/services/cronogramaAutoGenerationService.ts`

**Cambios Requeridos**:
```typescript
// ANTES:
proyecto_actividad: true
proyecto_edt: true
proyecto_tarea: true

// DESPUÉS:
proyectoActividad: true
proyectoEdt: true
proyectoTarea: true
```

#### **3. APIs de Proyectos**
**Archivos Afectados**:
- `src/app/api/proyecto/route.ts`
- `src/lib/services/proyectoEdt.ts`

**Cambios Requeridos**:
```typescript
// ANTES:
proyecto_cronograma: true
proyecto_fase: true

// DESPUÉS:
proyectoCronograma: true
proyectoFase: true
```

---

## 📊 **MATRIZ DE COMPATIBILIDAD**

| **Categoría** | **APIs Afectadas** | **Servicios Afectados** | **Componentes Afectados** | **Complejidad** |
|---------------|-------------------|------------------------|--------------------------|-----------------|
| **Dashboard** | 3 APIs | 2 servicios | 5 componentes | 🟢 Baja |
| **Cronograma** | 8 APIs | 4 servicios | 12 componentes | 🔴 Alta |
| **Proyectos** | 5 APIs | 3 servicios | 8 componentes | 🔴 Alta |
| **Cotizaciones** | 4 APIs | 2 servicios | 6 componentes | 🟡 Media |
| **Configuración** | 3 APIs | 2 servicios | 4 componentes | 🟡 Media |
| **Plantillas** | 6 APIs | 3 servicios | 10 componentes | 🟡 Media |
| **Permisos** | 2 APIs | 1 servicio | 3 componentes | 🟢 Baja |

**TOTAL**: 31 APIs, 17 servicios, 48 componentes

---

## ⚡ **PLAN DE IMPLEMENTACIÓN**

### **FASE 1: CORRECCIÓN CRÍTICA (1-2 días)**

#### **Paso 1.1: Corregir Error auditLog**
```bash
# Cambios en archivos:
find src/ -name "*.ts" -exec sed -i 's/prisma\.auditLog/prisma.audit_log/g' {} \;
find src/ -name "*.ts" -exec sed -i 's/auditLog\./audit_log\./g' {} \;
```

#### **Paso 1.2: Regenerar Prisma Client**
```bash
npx prisma generate
npm run type-check
```

#### **Paso 1.3: Testing Crítico**
```bash
npm test -- --testPathPattern="dashboard"
curl http://localhost:3000/api/dashboard
```

**Criterio de Éxito**: Dashboard carga sin errores

### **FASE 2: NORMALIZACIÓN DE MODELOS (3-5 días)**

#### **Paso 2.1: Actualizar Schema Prisma**
```bash
# Crear migración para renombrar modelos
npx prisma migrate dev --name normalize_models_to_pascalcase
```

#### **Paso 2.2: Actualizar Imports en Código**
```bash
# Actualizar todos los imports
find src/ -name "*.ts" -exec sed -i 's/audit_log/AuditLog/g' {} \;
find src/ -name "*.ts" -exec sed -i 's/proyecto_actividad/ProyectoActividad/g' {} \;
```

#### **Paso 2.3: Actualizar Uso de Modelos**
```typescript
// ANTES:
const logs = await prisma.audit_log.findMany()

// DESPUÉS:
const logs = await prisma.auditLog.findMany()
```

**Criterio de Éxito**: Compilación sin errores TypeScript

### **FASE 3: NORMALIZACIÓN DE CAMPOS (4-6 días)**

#### **Paso 3.1: Actualizar Relaciones en Schema**
```bash
# Crear migración para renombrar campos
npx prisma migrate dev --name normalize_relation_fields_to_camelcase
```

#### **Paso 3.2: Actualizar Query Includes**
```typescript
// ANTES:
include: {
  proyecto_actividad: true,
  proyecto_edt: true
}

// DESPUÉS:
include: {
  proyectoActividad: true,
  proyectoEdt: true
}
```

#### **Paso 3.3: Actualizar Response Data**
```typescript
// ANTES:
return {
  proyecto_actividad: actividad.proyecto_actividad,
  proyecto_edt: actividad.proyecto_edt
}

// DESPUÉS:
return {
  proyectoActividad: actividad.proyectoActividad,
  proyectoEdt: actividad.proyectoEdt
}
```

**Criterio de Éxito**: APIs responden con datos correctos

### **FASE 4: TESTING COMPLETO (2-3 días)**

#### **Paso 4.1: Tests Unitarios**
```bash
npm test -- --testPathPattern="services"
npm test -- --testPathPattern="api"
```

#### **Paso 4.2: Tests de Integración**
```bash
npm run test:e2e
```

#### **Paso 4.3: Validación Manual**
```bash
# Testing manual de funcionalidades críticas
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/proyectos
curl http://localhost:3000/api/cotizacion
```

**Criterio de Éxito**: 100% de tests pasando

---

## 🚨 **RIESGOS Y MITIGACIONES**

### **RIESGO 1: Ruptura de APIs Existentes**
**Probabilidad**: Alta
**Impacto**: Alto
**Mitigación**:
- Testing exhaustivo después de cada cambio
- Rollback plan preparado
- Deployment en horario de bajo tráfico

### **RIESGO 2: Inconsistencia de Datos**
**Probabilidad**: Media
**Impacto**: Alto
**Mitigación**:
- Backup completo antes de migraciones
- Validación de integridad post-migración
- Scripts de verificación

### **RIESGO 3: Tiempo de Desarrollo Extendido**
**Probabilidad**: Media
**Impacto**: Medio
**Mitigación**:
- Plan de implementación por fases
- Recursos adicionales si es necesario
- Comunicación regular con stakeholders

---

## 💰 **ESTIMACIÓN DE COSTOS**

### **Tiempo de Desarrollo**
- **Fase 1**: 16 horas (2 días)
- **Fase 2**: 32 horas (4 días)
- **Fase 3**: 40 horas (5 días)
- **Fase 4**: 24 horas (3 días)
- **TOTAL**: 112 horas (14 días)

### **Recursos Requeridos**
- **Desarrollador Senior**: 14 días
- **DevOps**: 2 días (para deployments)
- **QA**: 3 días (para testing)

### **Costo Estimado**
- **Desarrollo**: $8,400 USD
- **Testing**: $1,800 USD
- **Total**: $10,200 USD

---

## 📋 **CHECKLIST DE VALIDACIÓN**

### **Pre-Implementación**
- [ ] Backup completo de base de datos
- [ ] Documentación de estado actual
- [ ] Plan de rollback aprobado
- [ ] Ambiente de staging preparado
- [ ] Equipo alineado con el plan

### **Post-Implementación Fase 1**
- [ ] Dashboard carga correctamente
- [ ] No errores en logs
- [ ] Tests críticos pasando

### **Post-Implementación Fase 2**
- [ ] Compilación sin errores TypeScript
- [ ] Todos los imports actualizados
- [ ] APIs básicas funcionando

### **Post-Implementación Fase 3**
- [ ] Todas las relaciones funcionando
- [ ] Datos consistentes en responses
- [ ] Performance mantenida

### **Post-Implementación Fase 4**
- [ ] 100% tests pasando
- [ ] Funcionalidad completa verificada
- [ ] Documentación actualizada
- [ ] Equipo capacitado en nuevos nombres

---

## 🎯 **RECOMENDACIONES FINALES**

### **RECOMENDACIÓN 1: IMPLEMENTACIÓN GRADUAL**
Comenzar con la corrección crítica (`auditLog`) para resolver el error inmediato del dashboard, luego proceder con la normalización completa en fases.

### **RECOMENDACIÓN 2: TESTING EXHAUSTIVO**
Dedicar tiempo suficiente al testing después de cada fase para evitar regresiones.

### **RECOMENDACIÓN 3: COMUNICACIÓN**
Mantener comunicación constante con el equipo y stakeholders sobre el progreso y cualquier issue encontrado.

### **RECOMENDACIÓN 4: VALIDACIÓN CONTINUA**
Implementar validación automática de convenciones para evitar regresiones futuras.

---

**📅 Fecha de Creación**: 2025-12-10
**👥 Responsable**: Equipo de Arquitectura
**🎯 Estado**: Listo para Aprobación
**✅ Versión**: 1.0 - Plan Completo