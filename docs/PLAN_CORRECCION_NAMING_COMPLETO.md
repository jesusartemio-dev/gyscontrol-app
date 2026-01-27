# 📋 PLAN DE CORRECCIÓN COMPLETA DE NAMING CONVENTIONS

**Fecha:** 2026-01-13
**Objetivo:** Cumplir al 100% con `DATABASE_NAMING_CONVENTIONS.md`
**Estado Actual:** 47% de modelos incorrectos (44 de 93)

---

## 🎯 RESUMEN EJECUTIVO

### Problema Identificado
44 modelos están en `snake_case` cuando deberían estar en `PascalCase` según las convenciones establecidas.

### Convención a Seguir
```prisma
// ✅ CORRECTO
model UserProfile {
  id String @id
  // campos en camelCase
  firstName String
  lastName String

  @@map("user_profile")  // Mapea a tabla PostgreSQL
}

// ❌ INCORRECTO (estado actual)
model user_profile {
  id String @id
  first_name String  // También incorrecto
  last_name String
}
```

---

## 📊 MODELOS A CORREGIR (44 total)

### Grupo 1: Modelos de Sistema (8)
| Modelo Actual | Modelo Correcto | Tabla PostgreSQL |
|---------------|----------------|------------------|
| `analytics_events` | `AnalyticsEvent` | `analytics_events` |
| `audit_log` | `AuditLog` | `audit_log` |
| `notificaciones` | `Notificacion` | `notificaciones` |
| `permissions` | `Permission` | `permissions` |
| `user_permissions` | `UserPermission` | `user_permissions` |
| `metrica_comercial` | `MetricaComercial` | `metrica_comercial` |
| `asignaciones_recurso` | `AsignacionRecurso` | `asignaciones_recurso` |
| `registros_progreso` | `RegistroProgreso` | `registros_progreso` |

### Grupo 2: Modelos de Calendario (4)
| Modelo Actual | Modelo Correcto | Tabla PostgreSQL |
|---------------|----------------|------------------|
| `calendario_laboral` | `CalendarioLaboral` | `calendario_laboral` |
| `configuracion_calendario` | `ConfiguracionCalendario` | `configuracion_calendario` |
| `dia_calendario` | `DiaCalendario` | `dia_calendario` |
| `excepcion_calendario` | `ExcepcionCalendario` | `excepcion_calendario` |

### Grupo 3: Modelos de Cotización (9)
| Modelo Actual | Modelo Correcto | Tabla PostgreSQL |
|---------------|----------------|------------------|
| `cotizacion_actividad` | `CotizacionActividad` | `cotizacion_actividad` |
| `cotizacion_condicion` | `CotizacionCondicion` | `cotizacion_condicion` |
| `cotizacion_dependencias_tarea` | `CotizacionDependenciasTarea` | `cotizacion_dependencias_tarea` |
| `cotizacion_edt` | `CotizacionEdt` | `cotizacion_edt` |
| `cotizacion_exclusion` | `CotizacionExclusion` | `cotizacion_exclusion` |
| `cotizacion_fase` | `CotizacionFase` | `cotizacion_fase` |
| `cotizacion_plantilla_import` | `CotizacionPlantillaImport` | `cotizacion_plantilla_import` |
| `cotizacion_tarea` | `CotizacionTarea` | `cotizacion_tarea` |
| `cotizacion_version` | `CotizacionVersion` | `cotizacion_version` |

### Grupo 4: Modelos de Plantilla Independiente (8)
| Modelo Actual | Modelo Correcto | Tabla PostgreSQL |
|---------------|----------------|------------------|
| `plantilla_equipo_independiente` | `PlantillaEquipoIndependiente` | `plantilla_equipo_independiente` |
| `plantilla_equipo_item_independiente` | `PlantillaEquipoItemIndependiente` | `plantilla_equipo_item_independiente` |
| `plantilla_servicio_independiente` | `PlantillaServicioIndependiente` | `plantilla_servicio_independiente` |
| `plantilla_servicio_item_independiente` | `PlantillaServicioItemIndependiente` | `plantilla_servicio_item_independiente` |
| `plantilla_gasto_independiente` | `PlantillaGastoIndependiente` | `plantilla_gasto_independiente` |
| `plantilla_gasto_item_independiente` | `PlantillaGastoItemIndependiente` | `plantilla_gasto_item_independiente` |
| `plantilla_condicion` | `PlantillaCondicion` | `plantilla_condicion` |
| `plantilla_condicion_item` | `PlantillaCondicionItem` | `plantilla_condicion_item` |

### Grupo 5: Modelos de Plantilla (Otros) (3)
| Modelo Actual | Modelo Correcto | Tabla PostgreSQL |
|---------------|----------------|------------------|
| `plantilla_duracion_cronograma` | `PlantillaDuracionCronograma` | `plantilla_duracion_cronograma` |
| `plantilla_exclusion` | `PlantillaExclusion` | `plantilla_exclusion` |
| `plantilla_exclusion_item` | `PlantillaExclusionItem` | `plantilla_exclusion_item` |

### Grupo 6: Modelos de Proyecto (7)
| Modelo Actual | Modelo Correcto | Tabla PostgreSQL |
|---------------|----------------|------------------|
| `proyecto_actividad` | `ProyectoActividad` | `proyecto_actividad` |
| `proyecto_cronograma` | `ProyectoCronograma` | `proyecto_cronograma` |
| `proyecto_dependencias_tarea` | `ProyectoDependenciasTarea` | `proyecto_dependencias_tarea` |
| `proyecto_edt` | `ProyectoEdt` | `proyecto_edt` |
| `proyecto_fase` | `ProyectoFase` | `proyecto_fase` |
| `proyecto_subtarea` | `ProyectoSubtarea` | `proyecto_subtarea` |
| `proyecto_tarea` | `ProyectoTarea` | `proyecto_tarea` |

### Grupo 7: Modelos de Tareas (3)
| Modelo Actual | Modelo Correcto | Tabla PostgreSQL |
|---------------|----------------|------------------|
| `tareas` | `Tarea` | `tareas` |
| `subtareas` | `Subtarea` | `subtareas` |
| `dependencias_tarea` | `DependenciasTarea` | `dependencias_tarea` |

### Grupo 8: Otros Modelos (2)
| Modelo Actual | Modelo Correcto | Tabla PostgreSQL |
|---------------|----------------|------------------|
| `edt` | `Edt` | `edt` |
| `fase_default` | `FaseDefault` | `fase_default` |

---

## 🔧 PLAN DE EJECUCIÓN

### FASE 1: Preparación (15 min)
- [x] Crear backup del schema actual
- [ ] Validar que tenemos 93 modelos
- [ ] Crear script de validación automática
- [ ] Notificar al equipo del cambio

### FASE 2: Corrección por Grupos (2-3 horas)

#### Estrategia de Corrección
Para cada modelo:
1. Renombrar modelo de `snake_case` a `PascalCase`
2. Agregar `@@map("nombre_tabla")` al final
3. Actualizar todas las relaciones que lo referencian
4. Verificar que compile sin errores

#### Orden de Corrección
1. **Grupo 1: Sistema** (menos dependencias)
2. **Grupo 8: Otros** (independientes)
3. **Grupo 2: Calendario** (pocas relaciones)
4. **Grupo 7: Tareas** (base para proyectos)
5. **Grupo 6: Proyecto** (depende de tareas)
6. **Grupo 3: Cotización** (depende de proyectos)
7. **Grupo 4 y 5: Plantillas** (depende de cotización)

### FASE 3: Validación (30 min)
- [ ] Ejecutar `npx prisma validate`
- [ ] Regenerar cliente: `npx prisma generate`
- [ ] Verificar que no hay errores TypeScript
- [ ] Probar endpoints críticos

### FASE 4: Testing (1 hora)
- [ ] Probar CRM
- [ ] Probar Cotizaciones
- [ ] Probar Proyectos
- [ ] Probar Plantillas
- [ ] Verificar que no hay regresiones

---

## 📝 EJEMPLO DE CORRECCIÓN

### Antes
```prisma
model cotizacion_actividad {
  id              String
  cotizacionEdtId String
  nombre          String
  orden           Int
  createdAt       DateTime
  updatedAt       DateTime
  cotizacion_edt  cotizacion_edt @relation(fields: [cotizacionEdtId], references: [id])
  cotizacion_tarea cotizacion_tarea[]

  @@index([cotizacionEdtId, orden])
}
```

### Después
```prisma
model CotizacionActividad {
  id              String
  cotizacionEdtId String
  nombre          String
  orden           Int
  createdAt       DateTime
  updatedAt       DateTime
  cotizacionEdt   CotizacionEdt @relation(fields: [cotizacionEdtId], references: [id])
  cotizacionTarea CotizacionTarea[]

  @@index([cotizacionEdtId, orden])
  @@map("cotizacion_actividad")
}
```

### Cambios Necesarios
1. ✅ Nombre del modelo: `cotizacion_actividad` → `CotizacionActividad`
2. ✅ Campo de relación: `cotizacion_edt` → `cotizacionEdt`
3. ✅ Tipo de relación: `cotizacion_edt` → `CotizacionEdt`
4. ✅ Campo de relación array: `cotizacion_tarea` → `cotizacionTarea`
5. ✅ Tipo de relación array: `cotizacion_tarea[]` → `CotizacionTarea[]`
6. ✅ Agregar: `@@map("cotizacion_actividad")`

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgos
1. **Alto:** Romper relaciones entre modelos
2. **Medio:** Errores de TypeScript en el código
3. **Bajo:** Pérdida de datos (no debería ocurrir)

### Mitigaciones
1. **Backup completo** del schema antes de empezar
2. **Validación continua** con `prisma validate`
3. **Testing incremental** después de cada grupo
4. **Git commits** después de cada grupo exitoso
5. **No tocar la base de datos** - solo el schema

---

## 🎯 MÉTRICAS DE ÉXITO

- [ ] 93 modelos en total (sin pérdidas)
- [ ] 0 modelos en snake_case
- [ ] 93 modelos en PascalCase
- [ ] Todos los modelos tienen `@@map()` correcto
- [ ] `npx prisma validate` pasa sin errores
- [ ] `npx prisma generate` funciona
- [ ] Aplicación funciona sin regresiones

---

## 🚀 COMANDOS ÚTILES

```bash
# Validar schema
npx prisma validate

# Regenerar cliente
npx prisma generate

# Contar modelos actuales
grep -E "^model " prisma/schema.prisma | wc -l

# Ver modelos en snake_case
grep -E "^model [a-z_]" prisma/schema.prisma

# Ver modelos en PascalCase
grep -E "^model [A-Z]" prisma/schema.prisma

# Verificar que todos tienen @@map
grep -A 20 "^model " prisma/schema.prisma | grep "@@map"
```

---

## 📅 CRONOGRAMA ESTIMADO

| Fase | Duración | Descripción |
|------|----------|-------------|
| Fase 1 | 15 min | Preparación y backup |
| Fase 2 | 2-3 horas | Corrección de los 44 modelos |
| Fase 3 | 30 min | Validación técnica |
| Fase 4 | 1 hora | Testing funcional |
| **TOTAL** | **4-5 horas** | Tiempo completo estimado |

---

## ✅ CHECKLIST DE VALIDACIÓN FINAL

### Pre-corrección
- [x] Backup del schema creado
- [ ] Equipo notificado
- [ ] Git commit de seguridad creado

### Durante corrección
- [ ] Grupo 1 completado y validado
- [ ] Grupo 2 completado y validado
- [ ] Grupo 3 completado y validado
- [ ] Grupo 4 completado y validado
- [ ] Grupo 5 completado y validado
- [ ] Grupo 6 completado y validado
- [ ] Grupo 7 completado y validado
- [ ] Grupo 8 completado y validado

### Post-corrección
- [ ] `npx prisma validate` pasa
- [ ] `npx prisma generate` funciona
- [ ] No hay errores TypeScript
- [ ] CRM funciona
- [ ] Cotizaciones funcionan
- [ ] Proyectos funcionan
- [ ] Plantillas funcionan

---

## 🎓 CONCLUSIÓN

Este plan corrige sistemáticamente los 44 modelos que no cumplen con las convenciones de naming, llevando el schema de 53% a 100% de cumplimiento.

**Siguiente paso:** Decidir cuándo ejecutar este plan (ahora o en un momento planificado).
