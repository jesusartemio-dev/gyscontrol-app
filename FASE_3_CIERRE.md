# Plan de Trabajo — FASE 3 CIERRE

## 1. Archivos modificados / creados

| Path | Cambio |
|------|--------|
| `src/types/planTrabajo.ts` | Agrega `SeccionRegenerable` (union de 12 secciones) |
| `src/lib/planTrabajo/contextoIA.ts` | Agrega `serializarEstadoActualPlan(plan)` |
| `src/lib/planTrabajo/validarSecciones.ts` | Agrega `validarSeccionIndividual(seccion, raw)` |
| `src/lib/planTrabajo/guardarSecciones.ts` | Agrega `guardarSeccionIndividual(proyectoId, seccion, data)` |
| `src/lib/planTrabajo/prompts/regenerarSeccion.ts` | **Nuevo** — `CONFIGS` por sección + `buildPromptRegeneracion()` |
| `src/app/api/proyectos/[id]/plan-trabajo/regenerar-seccion/route.ts` | **Nuevo** — endpoint POST SSE |

---

## 2. Preguntas pre-coding

**A) ¿La estructura permite agregar archivos sin reorganizar?**
SÍ. La estructura plana `src/lib/planTrabajo/` acepta todos los archivos nuevos sin tocar los existentes. Solo se agregan funciones al final de los archivos lib.

**B) ¿`ultimaSeccionRegenerada` está en el modelo PlanTrabajo?**
CONFIRMADO: el campo existía con valor `null`. Verificado en BD local vía GET `/plan-trabajo` antes de los tests.

**C) ¿Hay tests E2E para /generar-ia?**
NO. Se usan tests manuales con curl (igual que Fase 2). La Fase 3 agrega 3 tests manuales simétricos (ver sección 6).

---

## 3. Diseño del endpoint

**`POST /api/proyectos/:id/plan-trabajo/regenerar-seccion`**

Body:
```json
{
  "seccion": "eppRequeridos",
  "instruccionesAdicionales": "opcional — máx 2000 chars"
}
```

Pipeline SSE (mismo patrón que /generar-ia):
```
event: status  {"fase":"A","mensaje":"Analizando contexto del proyecto con Haiku..."}
event: status  {"fase":"B","mensaje":"Regenerando sección \"X\" con Sonnet..."}
event: status  {"fase":"validacion","mensaje":"Validando estructura del resultado..."}
event: status  {"fase":"persistencia","mensaje":"Guardando sección validada..."}
event: done    {"seccionGuardada":"X"}
```

En caso de error de validación Zod:
```
event: error   {"mensaje":"Validación fallida para \"X\": campo.path: mensaje"}
```

---

## 4. Funciones nuevas

### `serializarEstadoActualPlan(plan: PlanTrabajo): string`
Serializa el contenido actual de todas las secciones del plan para que Sonnet lo use como referencia al regenerar una sección. Muestra `objetivo`, `alcanceGeneral` y los 10 campos JSON. Las secciones vacías (null) se omiten.

### `validarSeccionIndividual(seccion, raw): { data, error }`
Extrae `raw[seccion]` del JSON retornado por Sonnet y lo valida con el schema Zod correspondiente:
- `objetivo` / `alcanceGeneral`: valida string no vacío
- Resto: valida con `planAlcanceItemSchema`, `planEPPSchema`, etc.
- Retorna `{ data: <validado>, error: null }` o `{ data: null, error: "mensaje" }`

### `guardarSeccionIndividual(proyectoId, seccion, data): Promise<void>`
Persiste una única sección:
- Para `objetivo`/`alcanceGeneral`: guarda como string (campo de texto Prisma)
- Para el resto: guarda con `toPrismaJsonNullable(data)` (campo Json Prisma)
- Siempre actualiza `ultimaSeccionRegenerada`, `fechaGeneracionIA`, y recalcula `bloquesCompletitud`

### `buildPromptRegeneracion(seccion, instruccionesAdicionales?): string`
Construye el system prompt de Sonnet para regenerar una sección:
- Prefijo de rol (Ing. Senior GYS)
- Tarea: regenerar solo la sección indicada
- `CONFIGS[seccion].instruccion`: instrucciones específicas por sección
- `instruccionesAdicionales` del usuario (si las hay)
- Schema JSON de output (solo la clave de la sección)
- Bloque ANTI-ALUCINACIÓN + REGLAS GENERALES

---

## 5. Pipeline de llamadas IA

```
Fase A: claude-haiku-4-5  — RESUMEN_PROYECTO_PROMPT
         input: contexto completo serializado
         output: resumen ejecutivo técnico (≈1500-2500 tokens)

Fase B: claude-sonnet-4-6  — buildPromptRegeneracion(seccion)
         input: resumen de Haiku + estado actual del plan
         output: { "<seccion>": <valor> }  — JSON de una sola clave
```

El resumen de Haiku actúa como "compresión de contexto" — Sonnet recibe el contexto denso pero pre-procesado + el estado actual del plan para referencias cruzadas entre secciones.

---

## 6. Tests manuales — YAN01 (f8a536fd-4cf9-4dbc-b009-aef270ddc5a5)

### Test 1: `eppRequeridos` (sección JSON simple)

```
POST /api/proyectos/f8a536fd-4cf9-4dbc-b009-aef270ddc5a5/plan-trabajo/regenerar-seccion
{ "seccion": "eppRequeridos" }

event: status  {"fase":"A","mensaje":"Analizando contexto del proyecto con Haiku..."}
event: status  {"fase":"B","mensaje":"Regenerando sección \"eppRequeridos\" con Sonnet..."}
event: status  {"fase":"validacion","mensaje":"Validando estructura del resultado..."}
event: status  {"fase":"persistencia","mensaje":"Guardando sección validada..."}
event: done    {"seccionGuardada":"eppRequeridos"}
```
**Resultado: ✅ EXITOSO**

### Test 2: `alcanceDetallado` (sección con IDs obligatorios)

```
POST /api/proyectos/f8a536fd-4cf9-4dbc-b009-aef270ddc5a5/plan-trabajo/regenerar-seccion
{ "seccion": "alcanceDetallado" }

event: status  {"fase":"A","mensaje":"Analizando contexto del proyecto con Haiku..."}
event: status  {"fase":"B","mensaje":"Regenerando sección \"alcanceDetallado\" con Sonnet..."}
event: status  {"fase":"validacion","mensaje":"Validando estructura del resultado..."}
event: status  {"fase":"persistencia","mensaje":"Guardando sección validada..."}
event: done    {"seccionGuardada":"alcanceDetallado"}
```
**Resultado: ✅ EXITOSO** — servicioCotizadoRefId y edtRefId propagados por instrucciones de Fase 2.5

### Test 3: `restricciones` con `instruccionesAdicionales`

```
POST /api/proyectos/f8a536fd-4cf9-4dbc-b009-aef270ddc5a5/plan-trabajo/regenerar-seccion
{
  "seccion": "restricciones",
  "instruccionesAdicionales": "Agrega restricciones específicas para trabajo con variadores de frecuencia VFD y configuración de PLC en ambiente industrial. Mínimo 12 restricciones."
}

event: status  {"fase":"A","mensaje":"Analizando contexto del proyecto con Haiku..."}
event: status  {"fase":"B","mensaje":"Regenerando sección \"restricciones\" con Sonnet..."}
event: status  {"fase":"validacion","mensaje":"Validando estructura del resultado..."}
event: status  {"fase":"persistencia","mensaje":"Guardando sección validada..."}
event: done    {"seccionGuardada":"restricciones"}
```
**Resultado: ✅ EXITOSO** — `instruccionesAdicionales` aplicadas correctamente

### Verificación post-test en BD

```json
GET /api/proyectos/f8a536fd-4cf9-4dbc-b009-aef270ddc5a5/plan-trabajo

"ultimaSeccionRegenerada": "restricciones"   ✅  (Test 3 fue el último)
```

---

## 7. Validación — tsc y lint

```
npx tsc --noEmit       → (sin output) CLEAN
npx eslint <archivos>  → (sin output) CLEAN
```

Archivos verificados:
- `src/types/planTrabajo.ts`
- `src/lib/planTrabajo/contextoIA.ts`
- `src/lib/planTrabajo/validarSecciones.ts`
- `src/lib/planTrabajo/guardarSecciones.ts`
- `src/lib/planTrabajo/prompts/regenerarSeccion.ts`
- `src/app/api/proyectos/[id]/plan-trabajo/regenerar-seccion/route.ts`

---

## 8. Observaciones

- El pipeline reutiliza la Fase A (Haiku) de `/generar-ia` para comprimir el contexto del proyecto antes de pasárselo a Sonnet. Esto mantiene coherencia con el pipeline completo y permite que Sonnet reciba información estructurada en lugar del contexto crudo.
- El `serializarEstadoActualPlan` permite que Sonnet acceda a las secciones ya generadas (ej: regenerar `matrizRaci` puede leer el `personalAsignado` actual para obtener las siglas).
- El campo `ultimaSeccionRegenerada` (String? en Prisma) se actualiza en cada regeneración parcial para auditoría.
- No hay tests E2E automatizados en el proyecto — los 3 tests manuales con curl son consistentes con la metodología de testing de Fase 2.

---

## 9. Próxima fase sugerida

**Fase 4**: UI de regeneración por sección — botones "Regenerar" por sección en el editor del Plan de Trabajo, con estado de carga SSE y opción de ingresar instrucciones adicionales.
