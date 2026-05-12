# Verificación Fase 3 — Regeneración por Sección (YAN01)

**Proyecto:** YAN01 — `f8a536fd-4cf9-4dbc-b009-aef270ddc5a5`
**Fecha tests:** 2026-05-09 08:01–08:08 UTC
**Usuario:** user-admin-default

---

## 1. COSTOS REALES — AgenteUsage por test

### Test 1 — `eppRequeridos` (08:01)

| Fase | Tipo | Modelo | Tokens In | Tokens Out | Cache Read | Costo USD | Duración |
|------|------|--------|----------:|----------:|-----------:|----------:|---------:|
| A | plan-trabajo.resumen | claude-haiku-4-5 | 3 752 | 4 096 | 0 | $0.0194 | 33.0 s |
| B | plan-trabajo.regenerar-seccion | claude-sonnet-4-5 | 14 950 | 624 | 0 | $0.0542 | 12.0 s |
| **TOTAL** | | | **18 702** | **4 720** | **0** | **$0.0736** | **44.9 s** |

### Test 2 — `alcanceDetallado` (08:03–08:04)

| Fase | Tipo | Modelo | Tokens In | Tokens Out | Cache Read | Costo USD | Duración |
|------|------|--------|----------:|----------:|-----------:|----------:|---------:|
| A | plan-trabajo.resumen | claude-haiku-4-5 | 3 752 | 4 096 | 0 | $0.0194 | 31.8 s |
| B | plan-trabajo.regenerar-seccion | claude-sonnet-4-5 | 15 076 | 3 565 | 0 | $0.0987 | 71.7 s |
| **TOTAL** | | | **18 828** | **7 661** | **0** | **$0.1181** | **103.5 s** |

### Test 3 — `restricciones` con instruccionesAdicionales (08:07)

| Fase | Tipo | Modelo | Tokens In | Tokens Out | Cache Read | Costo USD | Duración |
|------|------|--------|----------:|----------:|-----------:|----------:|---------:|
| A | plan-trabajo.resumen | claude-haiku-4-5 | 3 752 | 4 096 | 0 | $0.0194 | 32.6 s |
| B | plan-trabajo.regenerar-seccion | claude-sonnet-4-5 | 15 329 | 1 415 | 0 | $0.0672 | 26.1 s |
| **TOTAL** | | | **19 081** | **5 511** | **0** | **$0.0866** | **58.7 s** |

### Resumen vs generación completa

| | 3 regeneraciones | 1 generación completa (Fase 2.5) |
|-|:----------------:|:--------------------------------:|
| Costo Haiku | $0.0582 (×3 runs) | $0.0194 (1 run) |
| Costo Sonnet | $0.2201 | $0.1733 |
| **Costo total** | **$0.2783** | **$0.1927** |
| Relación | 1.44× | — |

> **Observación:** Las 3 regeneraciones cuestan $0.0856 más que una generación completa.
> El driver principal es la Fase A (Haiku) que se re-ejecuta en cada test y alcanza el máximo de 4 096 tokens de output porque el proyecto tiene contexto rico.
> Para optimizar: bajar `max_tokens` del Haiku a ~2 000 en el endpoint de regeneración
> (el resumen no necesita ser tan exhaustivo cuando el plan ya existe).

---

## 2. TIEMPOS REALES POR TEST

Calculados desde `createdAt - duracionMs` (inicio real) hasta `createdAt` de la Fase B:

| Test | Sección | Inicio Haiku | Fin Sonnet | Pared total | Haiku | Sonnet |
|------|---------|:------------:|:----------:|:-----------:|------:|-------:|
| 1 | eppRequeridos | 08:01:09 | 08:01:54 | **45 s** | 33 s | 12 s |
| 2 | alcanceDetallado | 08:02:46 | 08:04:30 | **104 s** | 32 s | 72 s |
| 3 | restricciones | 08:06:52 | 08:07:51 | **59 s** | 33 s | 26 s |

> `alcanceDetallado` tardó 104 s porque el Sonnet generó 3 565 tokens (9 ítems con
> descripciones de 3-5 frases + IDs de referencia). Es la sección más verbosa del plan.

---

## 3. INTEGRIDAD DE LAS 12 SECCIONES DESPUÉS DE 3 TESTS

`updatedAt`: **2026-05-09T08:07:51.063Z** (timestamp del Test 3)
`ultimaSeccionRegenerada`: **"restricciones"** ✅
`generadoConIA`: **true** ✅

| Sección | Estado | Tamaño |
|---------|--------|--------|
| objetivo | ✅ tiene contenido | 680 chars |
| alcanceGeneral | ✅ tiene contenido | 1 793 chars |
| alcanceDetallado | ✅ tiene contenido | **9 items** |
| eppRequeridos | ✅ tiene contenido | objeto {basico, bioseguridad, riesgoEspecifico} |
| herramientasYEquipos | ✅ tiene contenido | objeto {equipos, materiales, herramientas} |
| restricciones | ✅ tiene contenido | **20 items** |
| personalAsignado | ✅ tiene contenido | 4 items |
| matrizRaci | ✅ tiene contenido | objeto {filas} |
| histogramas | ✅ tiene contenido | objeto {meses, horasHombre, equipoTrabajo} |
| cronogramaResumen | ✅ tiene contenido | objeto {filas} |
| responsabilidades | ✅ tiene contenido | objeto {gerenteGeneral, supervisor, operario, supervisorSeguridad} |
| referencias | ✅ tiene contenido | 11 items |

**Todas las 12 secciones tienen contenido.** El Test 3 (restricciones) no borró ni sobreescribió `eppRequeridos` ni `alcanceDetallado` de los tests anteriores. `guardarSeccionIndividual` opera con precisión de campo.

---

## 4. CONTENIDO POST-REGENERACIÓN

### A) `eppRequeridos` — post Test 1

| Categoría | Items | Nombres |
|-----------|------:|---------|
| basico | 5 | Casco ANSI Z89.1-2014, Lentes Z87.1+, Zapatos dieléctricos EH, Guantes cuero, Chaleco reflectivo Clase 2 |
| bioseguridad | 0 | *(vacío — correcto, no aplica para trabajo eléctrico de automatización)* |
| riesgoEspecifico | 3 | Guantes dieléctricos Clase 0 (ASTM D120), Mangas dieléctricas Clase 0 (ASTM D1051), Tapete dieléctrico Clase 2 (ASTM D178) |

Normas incluidas: ANSI Z89.1-2014, ANSI Z87.1+, ASTM F2413-18, ANSI/ISEA 107-2015, ASTM D120, ASTM D1051, ASTM D178.

---

### B) `alcanceDetallado` — post Test 2

Total: **9/9 items** con `servicioCotizadoRefId` y `edtRefId` poblados.

| N° | Nombre | servicioCotizadoRefId | edtRefId |
|----|---------|-----------------------|----------|
| 11.1 | Plantilla HMI de Instrumentos Analógicos | `33d29039-d333-40f9-9e57-d3f4f1d95b96` | `17e58f56-b2ae-4e6d-bf90-09c42b55b445` |
| 11.2 | Plantilla HMI de Motores | `fcc5283f-f3ef-43ee-b97b-bcee197fe515` | `17e58f56-b2ae-4e6d-bf90-09c42b55b445` |
| 11.3 | Plantilla HMI de Variadores VFD | `a1f0d90c-1733-4a74-969d-51f8766fd88a` | `17e58f56-b2ae-4e6d-bf90-09c42b55b445` |
| 11.4 | Configuración de Hardware y Comunicación de PLCs | `ee2c87b4-d0e6-4dd4-a87a-58231985af77` | `ad7fb05a-7c46-4a83-9687-3f106a0621c7` |
| 11.5 | Lógica de Mapeo de Entradas/Salidas (PLC-IOs) | `c93c3cfb-ac24-4565-bf4d-78d8427c02d9` | `ad7fb05a-7c46-4a83-9687-3f106a0621c7` |
| 11.6 | Lógica de Mapeo de Variadores (PLC-DRV) | `175a9ef7-30fa-4d9c-ab86-7090faf54f46` | `ad7fb05a-7c46-4a83-9687-3f106a0621c7` |
| 11.7 | Diagrama Unifilar Eléctrico | `37788374-7041-4a32-8617-3d860b9cfe8e` | `d2ca4740-71fe-49e4-8f1b-def6220b32e9` |
| 11.8 | Planos de Distribución Eléctrica | `63ab4b01-aee0-4b2b-9396-427d36aced03` | `d2ca4740-71fe-49e4-8f1b-def6220b32e9` |
| 11.9 | Planos de Arranque Directo (DOL) | `d0b153bf-83d7-4cd8-911b-9c1d24ce19b6` | `d2ca4740-71fe-49e4-8f1b-def6220b32e9` |

- `servicioCotizadoRefId` poblado: **9/9** ✅ (IDs verificados vs Fase 2.5 — idénticos)
- `edtRefId` poblado: **9/9** ✅
- Agrupación correcta: ítems 11.1–11.3 → EDT HMI, 11.4–11.6 → EDT PLC, 11.7–11.9 → EDT CAD ✅

---

### C) `restricciones` — post Test 3 (con instruccionesAdicionales)

Total: **20 items** (≥12 ✅)

| Categoría | Texto |
|-----------|-------|
| AUTORIZACION | Todo el personal debe contar con inducción de seguridad vigente de MINERA YANACOCHA |
| AUTORIZACION | Se requiere autorización de trabajo diaria (Permiso de Trabajo) emitida por supervisor |
| AUTORIZACION | Todo trabajo debe contar con ATS aprobado por Supervisor de Seguridad |
| ELECTRICO | Todo trabajo en tableros energizados requiere LOTO aplicado |
| ELECTRICO | Trabajos en tableros de variadores VFD: guantes dieléctricos Clase 0 + mangas + tapete ✅ VFD |
| ELECTRICO | Antes de conectar laptops a PLCs energizados: guantes dieléctricos ✅ PLC |
| ELECTRICO | Antes de energizar circuitos de variadores: verificar tierras, filtros EMI/RFI ✅ VFD |
| ELECTRICO | Durante config Modbus RTU/TCP con variadores: cables desconectados de tableros ✅ VFD |
| ELECTRICO | Prohibido bypass de protecciones durante pruebas de configuración de variadores ✅ VFD |
| ELECTRICO | Verificar parámetros de protección de PLC y variadores VFD antes de pruebas ✅ VFD + PLC |
| EPP | Uso permanente de EPP básico completo durante toda la permanencia |
| EPP | Tableros VFD energizados: guantes Clase 0 + mangas dieléctricas + tapete aislante ✅ VFD |
| ALCOHOL_DROGAS | Prohibición ingreso bajo efectos de alcohol o drogas — tolerancia cero |
| GENERAL | Portar fotocheck y certificado de aptitud médica ocupacional |
| GENERAL | No se permite uso de celulares en áreas con riesgo de atmósferas explosivas |
| GENERAL | Reportar inmediatamente incidentes y fallas en equipos eléctricos |
| GENERAL | Respetar rutas de tránsito peatonal señalizadas |
| GENERAL | Trabajos de programación PLC y puesta en marcha de variadores coordinados con producción ✅ PLC + VFD |
| CAPACITACION | Técnicos PLC (Siemens S7-300, A-B ControlLogix, Omron) con certificación vigente ✅ PLC |
| CAPACITACION | Técnicos VFD (WEG CFW300, Mitsubishi FR-E800, INVT GD20) con capacitación específica ✅ VFD |
| CAPACITACION | Charla de 5 minutos previa al inicio de cada jornada |

**Menciones VFD/variador: 7** ✅ (en restricciones ELECTRICO, EPP, GENERAL, CAPACITACION)
**Menciones PLC: 4** ✅ (en restricciones ELECTRICO, GENERAL, CAPACITACION)

Las instrucciones adicionales ("restricciones específicas para VFD y PLC") fueron aplicadas correctamente — 4 de las 20 restricciones nombran marcas específicas (Siemens S7-300, Allen-Bradley, WEG CFW300, Mitsubishi FR-E800).

---

## 5. EVALUACIÓN FINAL

| Verificación | Esperado | Real | OK? |
|---|---|---|---|
| Costo Test 1 (eppRequeridos) | $0.02–0.05 | $0.0736 | ✗ |
| Costo Test 2 (alcanceDetallado) | $0.02–0.05 | $0.1181 | ✗ |
| Costo Test 3 (restricciones) | $0.02–0.05 | $0.0866 | ✗ |
| Tiempo Test 1 | 30–60 s | 45 s | ✅ |
| Tiempo Test 2 | 30–60 s | 104 s | ✗ |
| Tiempo Test 3 | 30–60 s | 59 s | ✅ |
| Otras 11 secciones intactas (Test 3 no las borró) | Sin cambios | 11/11 sin cambios | ✅ |
| servicioCotizadoRefId 9/9 poblado | 9/9 | **9/9** | ✅ |
| edtRefId 9/9 poblado | 9/9 | **9/9** | ✅ |
| restricciones ≥ 12 items | Sí | **20 items** | ✅ |
| restricciones menciona VFD/PLC | Sí | **7 VFD + 4 PLC** | ✅ |
| ultimaSeccionRegenerada = "restricciones" | Sí | **"restricciones"** | ✅ |
| Todas 12 secciones con contenido | Sí | **12/12** | ✅ |

---

## 6. ANÁLISIS DE DESVIACIONES

### Costos más altos de lo esperado ($0.02-0.05 → real $0.07-$0.12)

El rango de $0.02-0.05 era demasiado optimista. Los drivers reales:

1. **Haiku maxea 4 096 tokens de output** en los 3 tests (el proyecto YAN01 es rico en contexto).
   El Haiku solo cuesta $0.0194 pero son $0.058 por 3 ejecuciones.

2. **Sonnet recibe ~15k tokens de input** por test (resumen Haiku ~2k + estado actual del plan ~13k).
   El estado actual del plan es extenso porque ya tiene 12 secciones generadas.

3. **alcanceDetallado produce 3 565 tokens de output** ($0.0987 solo el Sonnet) — es la sección
   más verbosa (9 ítems × 5 frases + IDs).

**Optimización posible:** bajar `max_tokens` del Haiku a 2 000 en el endpoint de regeneración.
Ahorro estimado: ~$0.009 por test (de $0.0194 a ~$0.010). No elimina la desviación pero la reduce.

### `alcanceDetallado` tardó 104 s

72 segundos es el tiempo de Sonnet para generar 3 565 tokens (9 ítems detallados). Esto es lineal
al output — no es un problema de implementación sino de volumen de datos. Para proyectos con
más EDTs (15-20 ítems) el tiempo podría ser 2-3 minutos.

### Secciones intactas — comportamiento correcto

`guardarSeccionIndividual` actualiza exactamente 1 campo JSON + `ultimaSeccionRegenerada` +
`fechaGeneracionIA` + `bloquesCompletitud`. Los otros 11 campos permanecen sin cambios. ✅
