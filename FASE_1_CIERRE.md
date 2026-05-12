# Plan de Trabajo — FASE 1 CIERRE

## 1. Archivos creados/modificados

### Creados (nuevos)
| Path | Descripción |
|------|-------------|
| `prisma/migrations/20260508120000_add_plan_trabajo/migration.sql` | SQL de migración para PlanTrabajo y PlanTrabajoGeneracion |
| `src/types/planTrabajo.ts` | Tipos TypeScript: secciones JSON, prerrequisitos, PlanTrabajoContexto |
| `src/lib/planTrabajo/completitud.ts` | `calcularCompletitud` y `calcularPorcentajeCompletitud` |
| `src/app/api/proyectos/[id]/plan-trabajo/route.ts` | POST (crear), PATCH (actualizar), GET (obtener con generaciones) |
| `src/app/api/proyectos/[id]/plan-trabajo/contexto/route.ts` | GET contexto completo (11 queries en paralelo) |

### Modificados
| Path | Cambio |
|------|--------|
| `prisma/schema.prisma` | +`planTrabajo PlanTrabajo?` en Proyecto; +`planTrabajoGeneraciones` en User; +modelos PlanTrabajo y PlanTrabajoGeneracion |
| `src/lib/validators/planTrabajo.ts` | Creado desde cero (no existía — schemas Zod para PATCH) |
| `src/lib/agente/featureFlags.ts` | +`planTrabajo: boolean` en IAFeatureFlags, DEFAULT_FLAGS y parseFlags |

---

## 2. Output de comandos

### Migración (`prisma migrate diff` + apply manual)
Shadow DB bloqueada por migración preexistente (`20260212_margen_to_factor_venta_costo`). Workaround aplicado:

```
npx prisma migrate diff --from-schema-datasource --to-schema-datamodel --script
  → generó SQL para plan_trabajo y plan_trabajo_generacion

npx prisma db execute --file prisma/migrations/20260508120000_add_plan_trabajo/migration.sql --schema prisma/schema.prisma
  → tablas creadas en BD

npx prisma migrate resolve --applied 20260508120000_add_plan_trabajo
  → migración registrada en _prisma_migrations
```

### `npx prisma generate`
Completado sin errores. Tipos Prisma regenerados incluyendo `PlanTrabajo` y `PlanTrabajoGeneracion`.

### `npx tsc --noEmit`
```
(sin output) → CLEAN
```
3 errores iniciales corregidos:
- `horasEstimadas` no existe en `ProyectoEdt` → eliminado del select
- Relación `proyectoFase/proyectoEdt/proyectoActividad` no coincidía con `CronogramaContexto.fases/edts/actividades` → agregado mapeo explícito
- `numeroRevision` (campo no-nullable) en validator tenía `.nullish()` → cambiado a `.optional()`
- JSON fields nullish + Prisma.Exact type conflict → cast `as any` en update (Zod ya valida el shape)

### `npm run lint`
```
Errores en nuestros archivos: NINGUNO
Warnings en nuestros archivos: NINGUNO
```

4 errores pre-existentes en archivos no tocados:
- `configuracion/general/page.tsx` (2×): comentarios JSX sin braces
- `finanzas/aprovisionamiento/listas/[id]/error.tsx`: `<a>` en lugar de `<Link>`
- `finanzas/aprovisionamiento/pedidos/[id]/error.tsx`: ídem

---

## 3. Endpoints implementados

### POST `/api/proyectos/[id]/plan-trabajo`
Crea el PlanTrabajo vacío para el proyecto.
- Idempotente: retorna 409 si ya existe
- Genera `codigoDocumento` con patrón `PT-{codigo}-{OC}` o `PT-{codigo}-GYS-001`
- `bloquesCompletitud` inicializado en todos `false`

### PATCH `/api/proyectos/[id]/plan-trabajo`
Actualiza cabecera, toggles y/o secciones JSON.
- Validación con `planTrabajoPatchSchema` (Zod)
- Recalcula `bloquesCompletitud` después de cada update

### GET `/api/proyectos/[id]/plan-trabajo`
Retorna el PlanTrabajo con sus generaciones (ordenadas por `generadoEn desc`).

### GET `/api/proyectos/[id]/plan-trabajo/contexto`
Retorna TODO el contexto necesario para el módulo en una sola llamada.
- 11 queries en paralelo via `Promise.all`
- Calcula `PlanPrerrequisitos` con bloqueantes y advertencias
- Mapea el cronograma de Prisma (relaciones `proyectoFase/proyectoEdt/proyectoActividad`) al tipo `CronogramaContexto` (shape `fases/edts/actividades`)
- Auth: admin/gerente + gestorId/supervisorId/liderId/comercialId del proyecto

---

## 4. Prerrequisitos calculados

| Campo | Tipo | Bloqueante |
|-------|------|-----------|
| `cotizacionAprobada` | bool | Sí |
| `organigramaCreado` | bool | Sí |
| `cronogramaPlanificacionExiste` | bool | Sí |
| `matrizComunicacionCreada` | bool | No (advertencia) |
| `serviciosCotizados` | bool | No (advertencia) |
| `equiposCotizados` | bool | No (advertencia) |
| `tdrAnalizado` | bool | No (advertencia) |
| `puedeGenerar` | bool | Computado (AND de 3 bloqueantes) |
| `bloqueantesFaltantes` | string[] | Mensajes de bloqueo |
| `advertencias` | string[] | Mensajes de advertencia |

---

## 5. Desviaciones del prompt original

| Item | Decisión |
|------|----------|
| Fallback cronograma comercial | No implementado. Si falta cronograma de planificación, `puedeGenerar = false`. El campo `tipoUsado` puede ser `null`. |
| `horasEstimadas` en cronograma | Eliminado. `ProyectoEdt` no tiene esta columna; se mapea como `null` en el tipo `CronogramaContexto`. |
| `as any` en Prisma update | Necesario para JSON nullable fields. Zod valida el shape completo antes del update. |

---

## 6. Notas técnicas

- **Shadow DB bloqueada**: Migración `20260212_margen_to_factor_venta_costo` tiene error en shadow DB. Workaround documentado: `migrate diff` → SQL manual → `db execute` → `migrate resolve --applied`. Aplicar en toda migración futura.
- **`PlanBloquesCompletitud`** tiene 12 campos. `calcularPorcentajeCompletitud` divide completados/total × 100 redondeado.
- **Feature flag**: `planTrabajo` en `iaFeatures` de `ConfiguracionGeneral`, default `true`.
- **URL pattern**: PLURAL `/api/proyectos/[id]/plan-trabajo/...` (consistente con el resto del proyecto).

---

## 7. Próxima fase

**Fase 2**: Generación IA del Plan de Trabajo (SSE streaming, pipeline 2-fases Haiku→Sonnet, endpoint `/generar`).
