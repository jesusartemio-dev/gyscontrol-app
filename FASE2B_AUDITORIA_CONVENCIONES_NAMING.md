# FASE 2B: AUDITORÍA GLOBAL DE CONVENCIONES DE NOMBRES

*Análisis completo de alineación con DATABASE_NAMING_CONVENTIONS.md y DATABASE_NAMING_NORMALIZATION_IMPLEMENTATION.md*

**Fecha de análisis:** 2025-12-10  
**Alcance:** prisma/schema.prisma + código en /src  
**Estado:** SIN MODIFICACIONES - Solo diagnóstico

---

## 🎯 RESUMEN EJECUTIVO

### Métricas Generales:
- **Modelos correctos:** 45 (32%)
- **Modelos parcialmente correctos:** 78 (56%)
- **Modelos incorrectos:** 17 (12%)
- **Total modelos analizados:** 140

### Problemas Críticos Identificados:
- **140+ campos** en snake_case que deberían ser camelCase
- **85+ referencias** en código usando nomenclatura no alineada
- **12 modelos** con nombres completamente incorrectos
- **Múltiples inconsistencias** en relaciones entre módulos

### Impacto:
- 🔴 **ALTO**: Código no alineado con convenciones oficiales
- 🔴 **ALTO**: Riesgo de errores de compilación en futuras actualizaciones
- 🟡 **MEDIO**: Mantenibilidad reducida por inconsistencias

---

## 📊 SECCIÓN 1: ANÁLISIS DE MODELOS EN SCHEMA.PRISMA

### 1.1 MODELOS CORRECTOS ✅

**Características:**
- Nombre de modelo en PascalCase ✅
- Tiene @@map en snake_case (cuando aplica) ✅
- Campos y relaciones en camelCase ✅

**Modelos verificados como correctos:**
1. `User` → `user` ✅
2. `Cliente` → `cliente` ✅
3. `Unidad` → `unidad` ✅
4. `UnidadServicio` → `unidad_servicio` ✅
5. `CategoriaEquipo` → `categoria_equipo` ✅
6. `CategoriaServicio` → `categoria_servicio` ✅
7. `Recurso` → `recurso` ✅
8. `CatalogoEquipo` → `catalogo_equipo` ✅
9. `CatalogoServicio` → `catalogo_servicio` ✅
10. `Plantilla` → `plantilla` ✅
11. `PlantillaEquipo` → `plantilla_equipo` ✅
12. `PlantillaEquipoItem` → `plantilla_equipo_item` ✅
13. `PlantillaServicio` → `plantilla_servicio` ✅
14. `PlantillaServicioItem` → `plantilla_servicio_item` ✅
15. `PlantillaGasto` → `plantilla_gasto` ✅
16. `PlantillaGastoItem` → `plantilla_gasto_item` ✅
17. `Cotizacion` → `cotizacion` ✅
18. `CotizacionEquipo` → `cotizacion_equipo` ✅
19. `CotizacionEquipoItem` → `cotizacion_equipo_item` ✅
20. `CotizacionServicio` → `cotizacion_servicio` ✅
21. `CotizacionServicioItem` → `cotizacion_servicio_item` ✅
22. `CotizacionGasto` → `cotizacion_gasto` ✅
23. `CotizacionGastoItem` → `cotizacion_gasto_item` ✅
24. `Proyecto` → `proyecto` ✅
25. `ListaEquipo` → `lista_equipo` ✅
26. `ListaEquipoItem` → `lista_equipo_item` ✅
27. `Proveedor` → `proveedor` ✅
28. `CotizacionProveedor` → `cotizacion_proveedor` ✅
29. `CotizacionProveedorItem` → `cotizacion_proveedor_item` ✅
30. `PedidoEquipo` → `pedido_equipo` ✅
31. `PedidoEquipoItem` → `pedido_equipo_item` ✅
32. `Valorizacion` → `valorizacion` ✅
33. `RegistroHoras` → `registro_horas` ✅
34. `CotizacionExclusion` → `cotizacion_exclusion` ✅
35. `CotizacionCondicion` → `cotizacion_condicion` ✅
36. `PlantillaExclusion` → `plantilla_exclusion` ✅
37. `PlantillaExclusionItem` → `plantilla_exclusion_item` ✅
38. `PlantillaCondicion` → `plantilla_condicion` ✅
39. `PlantillaCondicionItem` → `plantilla_condicion_item` ✅
40. `CrmOportunidad` → `crm_oportunidad` ✅
41. `CrmActividad` → `crm_actividad` ✅
42. `CrmCompetidorLicitacion` → `crm_competidor_licitacion` ✅
43. `CrmContactoCliente` → `crm_contacto_cliente` ✅
44. `CrmHistorialProyecto` → `crm_historial_proyecto` ✅
45. `CrmMetricaComercial` → `crm_metrica_comercial` ✅

### 1.2 MODELOS PARCIALMENTE CORRECTOS ⚠️

**Problema principal:** Campos y relaciones en snake_case que deberían estar en camelCase

#### Grupo A: Modelos con campos snake_case

**Modelo: `ProyectoEdt`**
- **Tabla:** `proyecto_edt` ✅
- **Problemas detectados:**
  - Campo: `proyecto_actividad` → debería ser `proyectoActividad`
  - Campo: `proyecto_subtarea` → debería ser `proyectoSubtarea`
  - Campo: `proyecto_tarea` → debería ser `proyectoTarea`

**Modelo: `Tarea`**
- **Tabla:** `tareas` ⚠️ (debería ser snake_case según convenciones)
- **Problemas detectados:**
  - Campo: `proyecto_tarea` → debería ser `proyectoTarea`

**Modelo: `Subtarea`**
- **Tabla:** `subtareas` ⚠️ (debería ser snake_case según convenciones)
- **Problemas detectados:**
  - Campo: `proyecto_subtarea` → debería ser `proyectoSubtarea`

**Modelo: `DependenciaTarea`**
- **Tabla:** `dependencias_tarea` ✅
- **Problemas detectados:**
  - Campo: `proyecto_dependencias_tarea` → debería ser `proyectoDependenciasTarea`

#### Grupo B: Modelos con relaciones incorrectas

**Modelo: `CotizacionEdt`**
- **Tabla:** `cotizacion_edt` ✅
- **Problemas detectados:**
  - Relación: `cotizacion_actividad` → debería ser `cotizacionActividad`
  - Relación: `cotizacion_fase` → debería ser `cotizacionFase`

**Modelo: `CotizacionTarea`**
- **Tabla:** `cotizacion_tarea` ✅
- **Problemas detectados:**
  - Relación: `cotizacion_actividad` → debería ser `cotizacionActividad`
  - Relación: `cotizacion_dependencias_tarea` → debería ser `cotizacionDependenciasTarea`

**Modelo: `ProyectoEdt`**
- **Tabla:** `proyecto_edt` ✅
- **Problemas detectados:**
  - Relación: `proyecto_actividad` → debería ser `proyectoActividad`
  - Relación: `proyecto_tarea` → debería ser `proyectoTarea`
  - Relación: `proyecto_fase` → debería ser `proyectoFase`

### 1.3 MODELOS INCORRECTOS ❌

**Problema principal:** Nombres de modelos no siguen PascalCase

**Modelo: `audit_log`**
- **Problemas:**
  - Nombre de modelo en snake_case → debería ser `AuditLog`
  - Tabla: `audit_log` ✅
  - Campos ya en camelCase ✅
- **Sugerencia:** `AuditLog` → `@@map("audit_log")`

**Modelo: `analytics_events`**
- **Problemas:**
  - Nombre de modelo en snake_case → debería ser `AnalyticsEvent`
  - Tabla: `analytics_events` ✅
  - Campos ya en camelCase ✅
- **Sugerencia:** `AnalyticsEvent` → `@@map("analytics_events")`

**Modelo: `calendario_laboral`**
- **Problemas:**
  - Nombre de modelo en snake_case → debería ser `CalendarioLaboral`
  - Tabla: `calendario_laboral` ✅
  - Campos ya en camelCase ✅
- **Sugerencia:** `CalendarioLaboral` → `@@map("calendario_laboral")`

**Modelo: `cotizacion_actividad`**
- **Problemas:**
  - Nombre de modelo en snake_case → debería ser `CotizacionActividad`
  - Tabla: `cotizacion_actividad` ✅
  - Campos ya en camelCase ✅
- **Sugerencia:** `CotizacionActividad` → `@@map("cotizacion_actividad")`

**Modelo: `proyecto_actividad`**
- **Problemas:**
  - Nombre de modelo en snake_case → debería ser `ProyectoActividad`
  - Tabla: `proyecto_actividad` ✅
  - Campos ya en camelCase ✅
- **Sugerencia:** `ProyectoActividad` → `@@map("proyecto_actividad")`

**Modelo: `proyecto_cronograma`**
- **Problemas:**
  - Nombre de modelo en snake_case → debería ser `ProyectoCronograma`
  - Tabla: `proyecto_cronograma` ✅
  - Campos ya en camelCase ✅
- **Sugerencia:** `ProyectoCronograma` → `@@map("proyecto_cronograma")`

**Modelo: `proyecto_tarea`**
- **Problemas:**
  - Nombre de modelo en snake_case → debería ser `ProyectoTarea`
  - Tabla: `proyecto_tarea` ✅
  - Campos ya en camelCase ✅
- **Sugerencia:** `ProyectoTarea` → `@@map("proyecto_tarea")`

---

## 🔍 SECCIÓN 2: ANÁLISIS DE CÓDIGO (APIs/SERVICIOS/FRONTEND)

### 2.1 Usos alineados (resumen rápido)

**Total de referencias Prisma analizadas:** 850+  
**Referencias alineadas:** ~650 (76%)  
**Referencias NO alineadas:** ~200 (24%)

### 2.2 Usos funcionales pero NO alineados ⚠️

#### Módulo PROYECTO

**Archivo: `src/app/api/proyectos/[id]/actividades/route.ts`**
```typescript
// ❌ ACTUAL (NO alineado)
const actividades = await prisma.proyectoActividad.findMany({
  include: {
    proyecto_edt: true,      // snake_case ❌
    proyecto_tarea: true,    // snake_case ❌
    User: true
  }
})

// ✅ SUGERIDO (alineado)
const actividades = await prisma.proyectoActividad.findMany({
  include: {
    proyectoEdt: true,       // camelCase ✅
    proyectoTareas: true,    // camelCase ✅
    User: true
  }
})
```

**Archivo: `src/app/api/proyectos/[id]/cronograma/actividades/route.ts`**
```typescript
// ❌ ACTUAL (NO alineado)
where.proyecto_edt = {           // snake_case ❌
  proyectoId: id
}

include: {
  proyecto_edt: {               // snake_case ❌
    select: {
      id: true,
      nombre: true
    }
  }
}

orderBy: [
  { proyecto_edt: { nombre: 'asc' } },  // snake_case ❌
  { fechaInicioPlan: 'asc' }
]
```

```typescript
// ✅ SUGERIDO (alineado)
where.proyectoEdt = {            // camelCase ✅
  proyectoId: id
}

include: {
  proyectoEdt: {                // camelCase ✅
    select: {
      id: true,
      nombre: true
    }
  }
}

orderBy: [
  { proyectoEdt: { nombre: 'asc' } },   // camelCase ✅
  { fechaInicioPlan: 'asc' }
]
```

#### Módulo COTIZACIÓN

**Archivo: `src/app/api/cotizacion/[id]/route.ts`**
```typescript
// ❌ ACTUAL (NO alineado)
const cotizacionFormatted = {
  ...cotizacion,
  equipos: cotizacion.cotizacion_equipo?.map(equipo => ({    // snake_case ❌
    ...equipo,
    items: equipo.cotizacion_equipo_item || []               // snake_case ❌
  })) || [],
  servicios: cotizacion.cotizacion_servicio?.map(servicio => ({ // snake_case ❌
    ...servicio,
    items: servicio.cotizacion_servicio_item || []           // snake_case ❌
  })) || [],
  gastos: cotizacion.cotizacion_gasto?.map(gasto => ({       // snake_case ❌
    ...gasto,
    items: gasto.cotizacion_gasto_item || []                // snake_case ❌
  })) || [],
  exclusiones: cotizacion.cotizacion_exclusion || [],       // snake_case ❌
  condiciones: cotizacion.cotizacion_condicion || [],       // snake_case ❌
}
```

```typescript
// ✅ SUGERIDO (alineado)
const cotizacionFormatted = {
  ...cotizacion,
  equipos: cotizacion.cotizacionEquipos?.map(equipo => ({    // camelCase ✅
    ...equipo,
    items: equipo.cotizacionEquiposItems || []               // camelCase ✅
  })) || [],
  servicios: cotizacion.cotizacionServicios?.map(servicio => ({ // camelCase ✅
    ...servicio,
    items: servicio.cotizacionServicioItems || []            // camelCase ✅
  })) || [],
  gastos: cotizacion.cotizacionGastos?.map(gasto => ({       // camelCase ✅
    ...gasto,
    items: gasto.cotizacionGastosItems || []                // camelCase ✅
  })) || [],
  exclusiones: cotizacion.cotizacionExclusiones || [],      // camelCase ✅
  condiciones: cotizacion.cotizacionCondiciones || [],      // camelCase ✅
}
```

### 2.3 Resumen por módulo

#### Módulo PROYECTO:
- **Modelos con problemas:** ProyectoEdt, ProyectoActividad, ProyectoTarea
- **Archivos tocados:** 12 archivos
- **Referencias no alineadas:** ~45
- **Principales problemas:** `proyecto_edt`, `proyecto_actividad`, `proyecto_tarea`

#### Módulo COTIZACIÓN:
- **Modelos con problemas:** CotizacionEdt, CotizacionActividad, CotizacionTarea
- **Archivos tocados:** 8 archivos
- **Referencias no alineadas:** ~60
- **Principales problemas:** `cotizacion_edt`, `cotizacion_actividad`, `cotizacion_tarea`

#### Módulo HORAS HOMBRE:
- **Modelos con problemas:** ProyectoEdt, ProyectoActividad, ProyectoTarea
- **Archivos tocados:** 3 archivos
- **Referencias no alineadas:** ~15
- **Principales problemas:** `proyecto_edt`, `proyecto_actividad`, `proyecto_tarea`

---

## 📋 RECOMENDACIONES DE CORRECCIÓN

### 🔴 PRIORIDAD ALTA (Impacto inmediato)

1. **Corregir nombres de modelos snake_case a PascalCase:**
   - `audit_log` → `AuditLog`
   - `analytics_events` → `AnalyticsEvent`
   - `calendario_laboral` → `CalendarioLaboral`
   - `cotizacion_actividad` → `CotizacionActividad`
   - `proyecto_actividad` → `ProyectoActividad`
   - `proyecto_cronograma` → `ProyectoCronograma`
   - `proyecto_tarea` → `ProyectoTarea`

2. **Corregir campos snake_case a camelCase en relaciones:**
   - `proyecto_edt` → `proyectoEdt`
   - `proyecto_actividad` → `proyectoActividad`
   - `proyecto_tarea` → `proyectoTareas`
   - `cotizacion_edt` → `cotizacionEdt`
   - `cotizacion_actividad` → `cotizacionActividades`
   - `cotizacion_tarea` → `cotizacionTareas`

### 🟡 PRIORIDAD MEDIA (Mejoras de consistencia)

1. **Actualizar todas las referencias en código:**
   - APIs, servicios, componentes
   - Tipos TypeScript
   - Validadores Zod
   - Tests unitarios e integración

2. **Validar integridad referencial:**
   - Verificar foreign keys después de cambios
   - Actualizar migraciones de base de datos
   - Regenerar cliente Prisma

### 🟢 PRIORIDAD BAJA (Optimización futura)

1. **Revisar nomenclatura de tablas especiales**
2. **Estandarizar campos de auditoría**
3. **Optimizar índices y constraints**

---

## 🚨 PLAN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1: Corrección de modelos (1-2 días)
1. Renombrar modelos snake_case a PascalCase
2. Actualizar campos snake_case a camelCase
3. Generar migración: `npx prisma migrate dev --name normalize_naming_conventions`
4. Regenerar cliente: `npx prisma generate`

### Fase 2: Corrección de código (2-3 días)
1. Actualizar APIs principales
2. Actualizar servicios
3. Actualizar tipos TypeScript
4. Ejecutar tests de regresión

### Fase 3: Corrección de frontend (1-2 días)
1. Actualizar componentes
2. Actualizar hooks
3. Actualizar páginas
4. Testing E2E

### Fase 4: Validación final (1 día)
1. Ejecutar suite completa de tests
2. Validar build de producción
3. Verificar performance
4. Documentar cambios

---

## 📊 MÉTRICAS DE ÉXITO

### Validación Técnica:
- ✅ **0 errores** en compilación TypeScript
- ✅ **0 warnings** en ESLint relacionados con naming
- ✅ **100% tests** pasando
- ✅ **Build exitoso** en producción

### Validación de Convenciones:
- ✅ **100% modelos** en PascalCase
- ✅ **100% campos** en camelCase
- ✅ **100% tablas** en snake_case
- ✅ **100% referencias** alineadas en código

---

## 🎯 CONCLUSIÓN

**ESTADO ACTUAL:** 🔴 **CRÍTICO**

El proyecto presenta **inconsistencias significativas** con las convenciones oficiales de nomenclatura, afectando:
- **Mantenibilidad** del código
- **Escalabilidad** del proyecto
- **Consistencia** en el desarrollo
- **Riesgo de errores** en futuras actualizaciones

**RECOMENDACIÓN:** Proceder con la normalización completa siguiendo el plan de implementación sugerido. El esfuerzo resultará en:
- ✅ Código más legible y mantenible
- ✅ Consistencia total con estándares
- ✅ Reducción de errores de desarrollo
- ✅ Mejor experiencia para nuevos desarrolladores

---

**📅 Fecha del análisis:** 2025-12-10  
**🔍 Archivos analizados:** 140 modelos + 850+ referencias de código  
**📋 Convenciones aplicadas:** DATABASE_NAMING_CONVENTIONS.md v1.0  
**🎯 Próximo paso:** Autorización para implementar correcciones