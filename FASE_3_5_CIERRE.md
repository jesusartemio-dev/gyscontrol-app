# Plan de Trabajo — FASE 3.5 CIERRE

## 1. Archivos modificados

| Path | Cambio |
|------|--------|
| `src/lib/planTrabajo/contextoIA.ts` | + `SECCIONES_RELEVANTES_POR_SECCION`; reemplaza `serializarEstadoActualPlan(plan)` por `serializarEstadoActualPlan(plan, seccionRegenerar)` con filtrado por relevancia |
| `src/app/api/proyectos/[id]/plan-trabajo/regenerar-seccion/route.ts` | Elimina Haiku; nuevo `ejecutarSonnetRegeneracion` con `PLAN_TRABAJO_SYSTEM_INSTRUCCIONES` cacheado en system; user message = instrucciones + contexto + plan state filtrado |

---

## 2. Diagnóstico: por qué cache_read era 0 en Fase 3

**Causa raíz 1 — sistema demasiado corto (< 1 024 tokens):**
El system prompt en `/regenerar-seccion` era `buildPromptRegeneracion(seccion)`, que produce ~400-600 tokens. Anthropic ignora silenciosamente `cache_control: ephemeral` en bloques por debajo del mínimo de **1 024 tokens**. Resultado: `tokensCacheCreation: 0` — el cache nunca se escribió.

**Causa raíz 2 — contenido dinámico en el sistema:**
`buildPromptRegeneracion('eppRequeridos')` ≠ `buildPromptRegeneracion('alcanceDetallado')`. Cada sección produce un system prompt diferente → cache miss garantizado entre secciones, incluso si el prompt fuera lo suficientemente largo.

**Evidencia:** `tokensCacheCreation: 0` en los 3 tests de Fase 3. Contraste con `/generar-ia` donde `tokensCacheCreation: 3 189` porque `PLAN_TRABAJO_SYSTEM_INSTRUCCIONES + PLAN_TRABAJO_OUTPUT_SCHEMA` suman ~3 189 tokens (muy por encima del umbral de 1 024).

---

## 3. Qué cambió para que el cache funcione

### Cambio A — Sistema constante y suficientemente largo

**Antes:** `system = [{ text: buildPromptRegeneracion(seccion), cache_control: ephemeral }]`
- Dinámico (cambia por sección) + corto (~400-600 tokens) → cache nunca creado

**Después:** `system = [{ text: PLAN_TRABAJO_SYSTEM_INSTRUCCIONES, cache_control: ephemeral }]`
- Constante (igual para todas las secciones) + largo (~2 275 tokens) → cache creado en Test 1, leído en Tests 2-4

### Cambio B — Eliminación de Haiku

El resumen de Haiku (~33s, $0.019/call) fue el mayor overhead de la Fase 3. Se eliminó porque:
1. Sonnet recibe ahora el contexto directamente (`serializarContextoParaIA`) en el user message
2. El contexto del proyecto (~3 500 tokens) es mucho más manejable sin necesidad de compresión previa
3. El input total bajó de ~15 000 → ~3 600 tokens por llamada

### Cambio C — Estado del plan filtrado por relevancia

`serializarEstadoActualPlan(plan, seccionRegenerar)` solo incluye las secciones que la IA realmente necesita como contexto:

| Sección a regenerar | Secciones del plan incluidas |
|--------------------|------------------------------|
| objetivo, alcanceGeneral, alcanceDetallado, personalAsignado, histogramas, cronogramaResumen, responsabilidades | *(ninguna)* |
| eppRequeridos, restricciones, herramientasYEquipos | alcanceDetallado (compacto: numero, nombre, flags de riesgo) |
| matrizRaci | personalAsignado (compacto: nombre, cargo, siglas) + cronogramaResumen (compacto: fase, edt, fechas, horas) |
| referencias | alcanceDetallado |

La representación compacta (vs JSON completo) reduce el plan state de ~10 000 → ~200-500 tokens.

---

## 4. Resultados de los 4 tests — AgenteUsage

**Fecha:** 2026-05-09 08:55–08:57 UTC | YAN01 | sin Haiku, con cache

| Test | Sección | Tokens In | Tokens Out | Cache Create | Cache Read | Costo USD | Duración |
|------|---------|----------:|----------:|:------------:|:----------:|----------:|---------:|
| 1 | eppRequeridos | 3 743 | 543 | **2 275** | 0 | $0.0279 | 9.2 s |
| 2 | eppRequeridos | 3 743 | 667 | 0 | **2 275** | $0.0219 | 11.6 s |
| 3 | alcanceDetallado | 3 601 | 3 000 | 0 | **2 275** | $0.0565 | 44.9 s |
| 4 | restricciones | 3 738 | 1 076 | 0 | **2 275** | $0.0280 | 20.2 s |
| **TOTAL** | | **14 825** | **5 286** | | | **$0.1343** | **85.9 s** |

- Test 1: crea el cache → `tokensCacheCreation: 2 275` (= PLAN_TRABAJO_SYSTEM_INSTRUCCIONES)
- Tests 2-4: leen el cache → `tokensCacheRead: 2 275` en todos ✅
- Test 2 (mismo sección que Test 1): costo $0.0219 < $0.0279 → cache hace efecto incluso entre calls idénticas ✅

---

## 5. Tabla comparativa Fase 3 vs Fase 3.5

| Métrica | Antes — Fase 3 | Después — Fase 3.5 | Mejora |
|---|---|---|---|
| Costo eppRequeridos (1ª vez) | $0.0736 | $0.0279 | **−62%** |
| Costo eppRequeridos (2ª vez, cache) | $0.0736 | **$0.0219** | **−70%** |
| Costo alcanceDetallado | $0.1181 | $0.0565 | **−52%** |
| Costo restricciones | $0.0866 | $0.0280 | **−68%** |
| Costo 4 tests total | ~$0.352 | **$0.1343** | **−62%** |
| Tiempo eppRequeridos | 45 s (33s Haiku + 12s Sonnet) | **9.2 s** | **−80%** |
| Tiempo alcanceDetallado | 104 s (32s Haiku + 72s Sonnet) | **44.9 s** | **−57%** |
| Tiempo restricciones | 59 s (33s Haiku + 26s Sonnet) | **20.2 s** | **−66%** |
| Tiempo 4 tests total | ~254 s | **85.9 s** | **−66%** |
| Tokens input promedio | 15 118 | **3 706** | **−75%** |
| cache_read promedio | 0 tokens | **2 275 tokens** | **∞** |
| Fases de IA por regeneración | 2 (Haiku + Sonnet) | **1 (solo Sonnet)** | −1 fase |

---

## 6. Calidad del output post-Fase 3.5

| Verificación | Esperado | Real | OK? |
|---|---|---|---|
| servicioCotizadoRefId en alcanceDetallado | 9/9 | **9/9** | ✅ |
| restricciones ≥ 12 items | Sí | **15 items** | ✅ |
| restricciones con VFD/PLC | Sí | **VFD: 5, PLC: 5** | ✅ |
| ultimaSeccionRegenerada = "restricciones" | Sí | **"restricciones"** | ✅ |
| Secciones no regeneradas intactas | Sin cambios | Todas intactas | ✅ |

---

## 7. Reglas no violadas

- `/generar-ia` no fue tocado ✅
- `INSTRUCCIONES_POR_SECCION` (CONFIGS en regenerarSeccion.ts) no fue tocado ✅
- Firmas públicas `validarSeccionIndividual` y `guardarSeccionIndividual` sin cambios ✅

---

## 8. tsc + lint

```
npx tsc --noEmit       → (sin output) CLEAN
npx eslint <archivos>  → (sin output) CLEAN
```

---

## 9. Observaciones

### Cache compartido entre /generar-ia y /regenerar-seccion
`PLAN_TRABAJO_SYSTEM_INSTRUCCIONES` es el mismo texto en ambos endpoints. Si el usuario genera el plan completo y luego regenera una sección dentro de los 5 minutos siguientes, Tests 2 en adelante leen el cache creado por la generación completa. Beneficio doble sin código adicional.

### alcanceDetallado sigue siendo la sección más costosa
3 000 tokens de output (9 ítems detallados con descripciones, IDs, flags de riesgo) en 44.9s. Esto es proporcional al volumen de datos — no hay bug. Para proyectos con 20+ ítems, esperar 90-120s.

### tokensCacheCreation en el primer test = 2 275 tokens
Eso es el tamaño real de `PLAN_TRABAJO_SYSTEM_INSTRUCCIONES` en tokens. Las llamadas siguientes pagan 2 275 tokens al precio de cache read ($0.30/MTok) en vez de al precio de input ($3/MTok) → ahorro de $2.70/MTok × 2 275 = $0.006 por call. Pequeño en absoluto pero el ahorro principal viene de eliminar Haiku ($0.019/call × N calls).
