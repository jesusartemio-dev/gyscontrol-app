# Plan de Trabajo — FASE 2 CIERRE

## 1. Archivos creados/modificados

### Creados
| Path | Descripción |
|------|-------------|
| `src/lib/planTrabajo/cargarContexto.ts` | Shared loader: 11 queries paralelas + prerrequisitos |
| `src/lib/planTrabajo/contextoIA.ts` | Serializador de `PlanTrabajoContexto` → string para IA |
| `src/lib/planTrabajo/prompts/resumirProyecto.ts` | System prompt Haiku (resumen ejecutivo técnico) |
| `src/lib/planTrabajo/prompts/generarPlan.ts` | System prompts Sonnet (instrucciones + schema JSON) |
| `src/lib/planTrabajo/validarSecciones.ts` | Validación Zod por sección, persistencia parcial |
| `src/lib/planTrabajo/guardarSecciones.ts` | Persistencia con `toPrismaJsonNullable` + completitud |
| `src/app/api/proyectos/[id]/plan-trabajo/generar-ia/route.ts` | Endpoint SSE principal |

### Modificados
| Path | Cambio |
|------|--------|
| `src/types/planTrabajo.ts` | +`riesgosCriticos: unknown` en `TdrContexto` |
| `src/app/api/proyectos/[id]/plan-trabajo/contexto/route.ts` | Refactorizado: usa `cargarContextoPlanTrabajo()` |

---

## 2. Respuestas a preguntas pre-código

**A) Tracking**: `trackUsage()` en `src/lib/agente/usageTracker.ts`. Fire-and-forget, sin await. Campos: `userId`, `tipo`, `modelo`, `tokensInput`, `tokensOutput`, `tokensCacheCreation?`, `tokensCacheRead?`, `duracionMs?`, `metadata?`. Los tokens de caché se extraen con cast `as unknown as Record<string, number>` (igual que Matriz).

**B) Anthropic client**: Local por endpoint — `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`. Sin cliente compartido. `MODELS.haiku = 'claude-haiku-4-5-20251001'`, `MODELS.sonnet = 'claude-sonnet-4-5-20250929'`.

**C) Items cotización**: Equipo items no tienen `unidad` en el select actual → serializer adaptado para usar `codigo`, `descripcion`, `categoria`, `cantidad`. Servicio items tienen `cantidadHoras` y `nombre` ✅.

**D) TDR**: `resumenTdr` ✅. `riesgosCriticos` existe en schema pero faltaba en el select y en `TdrContexto` — agregado en ambos lugares como parte del refactor de `cargarContexto.ts`.

---

## 3. Output de comandos

### `npx tsc --noEmit`
```
(sin output) → CLEAN
```

### `npm run lint` (nuestros archivos)
```
(sin output) → CLEAN
```

---

## 4. Test manual — Proyecto YAN01 (f8a536fd...)

**Prerrequisitos verificados**: cotización aprobada, 8 nodos de organigrama, cronograma planificación con actividades y tareas.

### Paso 1 — POST `/plan-trabajo` (crear registro)
```
HTTP 201
{
  "id": "cmoxwp7xw0001l82k9icug17j",
  "codigoDocumento": "PT-YAN01-GYS-001",
  "numeroRevision": "A",
  "generadoConIA": false,
  "bloquesCompletitud": { todos false }
}
```

### Paso 2 — GET `/plan-trabajo/contexto`
```
puedeGenerar: true
bloqueantesFaltantes: []
planTrabajo: existe ✅
```

### Paso 3 — POST `/plan-trabajo/generar-ia` (SSE)

**Eventos recibidos en orden:**
```
event: status  {"fase":"A","mensaje":"Analizando contexto del proyecto con Haiku..."}
event: status  {"fase":"B","mensaje":"Generando Plan de Trabajo con Sonnet..."}
event: status  {"fase":"validacion","mensaje":"Validando estructura del resultado..."}
event: status  {"fase":"persistencia","mensaje":"Guardando secciones validadas..."}
event: done    {
  "seccionesGuardadas": [
    "objetivo","alcanceGeneral","alcanceDetallado","eppRequeridos",
    "herramientasYEquipos","restricciones","personalAsignado","matrizRaci",
    "histogramas","cronogramaResumen","responsabilidades","referencias"
  ],
  "seccionesConError": []
}
```

**Tiempo total: 186 segundos** (Haiku 30s + Sonnet 156s)

**12/12 secciones generadas, 0 errores.**

### Paso 4 — Verificación en BD (`plan_trabajo`)
```
generadoConIA: true
fechaGeneracion: 2026-05-09T05:34:55Z
completitud: 12/12
objetivo: "Ejecutar la migración del sistema de control del horno de Minera
          Yanacocha mediante el desarrollo de ingeniería de detalle..."
```

### Paso 5 — Verificación en BD (`agente_usage`)
```
tipo                   modelo              tokensInput  tokensOutput  cacheCreation  costoUSD   duracionMs
plan-trabajo.resumen   claude-haiku-4-5    3,632        4,096         0              $0.01929   29,579
plan-trabajo.generar   claude-sonnet-4-5   4,125        10,698        2,132          $0.18084   155,869
```

---

## 5. Costo estimado de la generación

| Llamada | Modelo | Input | Output | Cache Write | Costo USD |
|---------|--------|-------|--------|-------------|-----------|
| Fase A (resumen) | Haiku | 3,632 | 4,096 | 0 | $0.0193 |
| Fase B (plan) | Sonnet | 4,125 | 10,698 | 2,132 | $0.1808 |
| **Total** | | | | | **$0.2001** |

En llamadas subsecuentes, los 2,132 tokens de cache write en Sonnet se leerán como cache read (~90% más baratos), bajando el costo de Fase B a ~$0.16.

---

## 6. Deviaciones del prompt original

| Item | Decisión |
|------|----------|
| `riesgosCriticos` en TDR | Agregado al select de `cargarContexto.ts` y a `TdrContexto`. Campo existía en schema pero faltaba en la capa de datos. |
| `item.unidad` en equipos | No está en el select actual de `EquipoCotizadoContexto.items`. El serializador usa `codigo`, `descripcion`, `categoria`, `cantidad` en su lugar. |
| Refactor `contexto/route.ts` | Necesario para compartir lógica con `generar-ia`. El comportamiento externo del endpoint no cambió. |
| `guardarSecciones` usa cast parcial | El spread de `jsonUpdate` sobre `prisma.planTrabajo.update data` requiere cast de tipo porque `Record<string, T>` no mapea directamente a los campos Prisma específicos. Zod ya validó el shape. |

---

## 7. Próxima fase

**Fase 3**: Regeneración por sección individual (endpoint `/regenerar-seccion` con SSE). Permite rehacer solo `alcanceDetallado`, `personalAsignado`, etc. sin regenerar todo el plan.
