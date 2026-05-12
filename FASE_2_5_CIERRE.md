# Plan de Trabajo — FASE 2.5 CIERRE

## 1. Archivos modificados

| Path | Cambio |
|------|--------|
| `src/lib/planTrabajo/contextoIA.ts` | Formato ISO de fechas, IDs en `[id=...]`, resumen numérico al final |
| `src/lib/planTrabajo/prompts/generarPlan.ts` | Instrucciones de IDs, reglas histograma basadas en datos reales, anti-alucinación |
| `src/lib/planTrabajo/prompts/resumirProyecto.ts` | Instrucción de reproducir IDs en el resumen ejecutivo |

---

## 2. Bug root-cause: fechas en Tuesday/Thursday → string vacío

El serializer original usaba `.toString().split('T')[0]` para formatear fechas.
`Date.toString()` devuelve strings como `"Tue Feb 03 2026 08:00:00 GMT-0500"`.
Cuando la fecha cae en **martes ("Tue")** o **jueves ("Thu")**, el primer `'T'` de la
string está en el nombre del día: `"Tue".split('T') = ["", "ue"]` → índice `[0]` = `""`.

Por eso las fechas de los EDT HMI (martes 3-feb) aparecían vacías en el contexto
serializado, y la IA usaba la fecha de inicio del proyecto (27-ene) como fallback.

**Fix**: helper `fmtDate(d)` con `date.toISOString().slice(0, 10)`.

---

## 3. Cambios en contextoIA.ts

1. **Helper `fmtDate`**: `date.toISOString().slice(0, 10)` — devuelve siempre `YYYY-MM-DD`.
   - null/undefined → `"(sin fecha)"`
   - invalid date → `"(fecha inválida)"`

2. **IDs visibles**: servicios en `ITEM DE SERVICIO [id=UUID]`, nodos en `NODO [id=CUID]`,
   EDTs en `EDT [id=UUID]`. El formato `[id=...]` es el que instruyó el prompt para copiar.

3. **Resumen numérico al final**: bloque `# RESUMEN NUMÉRICO PARA HISTOGRAMAS Y CRONOGRAMA`
   con totales pre-calculados que la IA ya no tiene que inferir.

---

## 4. Cambios en generarPlan.ts

- Sección 2 ALCANCE DETALLADO: instrucción explícita de copiar ID del `ITEM DE SERVICIO [id=...]`.
- Sección 6 PERSONAL: instrucción de copiar ID del `NODO [id=...]`.
- Sección 8 HISTOGRAMAS: reescrita — usa el "RESUMEN NUMÉRICO", construye meses desde rango
  del cronograma (no del proyecto), valida que sum(HH) ≈ Total HH, retorna `[]` si faltan datos.
- Sección 9 CRONOGRAMA RESUMEN: instrucción de usar fechas exactas del cronograma, omitir filas
  con `(sin fecha)`.
- Bloque **ANTI-ALUCINACIÓN**: agrega la regla antes de REGLAS GENERALES.

---

## 5. Cambios en resumirProyecto.ts

- Instrucción de incluir IDs en el resumen al mencionar EDTs, ITEMS DE SERVICIO y NODOS,
  para que Sonnet los vea en el input de la Fase B.

---

## 6. Validación — tsc y lint

```
npx tsc --noEmit       → (sin output) CLEAN
npx eslint <archivos>  → (sin output) CLEAN
```

---

## 7. Test de validación — Regeneración YAN01

**POST `/api/proyectos/f8a536fd-4cf9-4dbc-b009-aef270ddc5a5/plan-trabajo/generar-ia`**

```
event: status  {"fase":"A","mensaje":"Analizando contexto del proyecto con Haiku..."}
event: status  {"fase":"B","mensaje":"Generando Plan de Trabajo con Sonnet..."}
event: status  {"fase":"validacion","mensaje":"Validando estructura del resultado..."}
event: status  {"fase":"persistencia","mensaje":"Guardando secciones validadas..."}
event: done    {"seccionesGuardadas":["objetivo","alcanceGeneral","alcanceDetallado","eppRequeridos",
               "herramientasYEquipos","restricciones","personalAsignado","matrizRaci","histogramas",
               "cronogramaResumen","responsabilidades","referencias"],"seccionesConError":[]}
```

**Tiempo total: 184 segundos** | **12/12 secciones, 0 errores**

---

## 8. Resultados por bug

### A) cronogramaResumen

| EDT | fechaInicio | fechaFin | horasPlan |
|-----|-------------|----------|-----------|
| HMI | **2026-02-03** | **2026-02-05** | 18 |
| PLC | **2026-02-08** | **2026-02-12** | 36 |
| CAD | **2026-02-15** | **2026-02-17** | 22 |

- Fecha mínima: **2026-02-03** ✅
- Fecha máxima: **2026-02-17** ✅
- Días entre ambas: **14** ✅ (antes: 23 días con fecha inventada 27-ene)
- Suma horasPlan: **76h** ✅

### B) histogramas

- Meses: `["2026-02"]` — **1 mes** ✅ (rango real del cronograma, antes: 4 meses del proyecto)
- Estrategia: la IA generó una fila por cada tarea individual (9 filas)
- Suma total HH: **76 HH** ✅ (antes: 370 HH inventados)

| Etiqueta | Total |
|---------|-------|
| HMI - Instrumentos Analógicos | 6 |
| HMI - Motores | 6 |
| HMI - Variadores VFD | 6 |
| PLC - Configuración Hardware | 10 |
| PLC - Mapeo I/Os | 14 |
| PLC - Mapeo Variadores | 12 |
| CAD - Diagrama Unifilar | 8 |
| CAD - Distribución Eléctrica | 8 |
| CAD - Arranque Directo DOL | 6 |
| **TOTAL** | **76** |

### C) servicioCotizadoRefId

- **9/9 poblados** ✅ (antes: 0/9)
- Todos verificados contra BD: IDs existen en `ProyectoServicioCotizadoItem`

| Ítem | servicioCotizadoRefId | BD ✓ |
|------|----------------------|------|
| 11.1 Pantilla HMI Analógicos | `33d29039-d333-40f9-9e57-d3f4f1d95b96` | ✅ |
| 11.2 Pantilla HMI Motores | `fcc5283f-f3ef-43ee-b97b-bcee197fe515` | ✅ |
| 11.3 Pantilla HMI VFD | `a1f0d90c-1733-4a74-969d-51f8766fd88a` | ✅ |
| 11.4 Config Hardware PLC | `ee2c87b4-d0e6-4dd4-a87a-58231985af77` | ✅ |
| 11.5 Mapeo I/Os | `c93c3cfb-ac24-4565-bf4d-78d8427c02d9` | ✅ |
| 11.6 Mapeo Variadores | `175a9ef7-30fa-4d9c-ab86-7090faf54f46` | ✅ |
| 11.7 Diagrama Unifilar | `37788374-7041-4a32-8617-3d860b9cfe8e` | ✅ |
| 11.8 Planos Distribución | `63ab4b01-aee0-4b2b-9396-427d36aced03` | ✅ |
| 11.9 Planos DOL | `d0b153bf-83d7-4cd8-911b-9c1d24ce19b6` | ✅ |

### D) proyectoOrgNodoRefId

- **4/4 poblados** ✅ (antes: 0/4)
- Todos verificados contra BD: IDs existen en `ProyectoOrgNodo`

| Nombre | siglas | proyectoOrgNodoRefId | BD ✓ |
|--------|--------|----------------------|------|
| Jesus Mamani | JM | `cmovztqvv000el8mgrqntvwcj` | ✅ "Gestor de Proyecto" |
| Angel Palomino | AP | `cmovztqvx000gl8mgshps6rrl` | ✅ "Residente / Ing. Programador" |
| Alonso Piscoya | API | `cmovztqw1000kl8mgt5tlwvnt` | ✅ "Supervisor de Seguridad (HSEQ)" |
| Yony Apaza | YA | `cmovztqvp000cl8mgbkjbgj24` | ✅ "HSEQ" |

---

## 9. Tabla resumen de bugs — antes vs. después

| Bug | Antes | Después | Veredicto |
|-----|-------|---------|-----------|
| Histogramas inflados | 370 HH (4.87×) | **76 HH** ✅ | RESUELTO |
| Cronograma comprimido | 23 días (27-ene→18-feb) | **14 días** (03-feb→17-feb) ✅ | RESUELTO |
| `servicioCotizadoRefId` | 0 / 9 poblados | **9 / 9** ✅ todos válidos en BD | RESUELTO |
| `proyectoOrgNodoRefId` | 0 / 4 poblados | **4 / 4** ✅ todos válidos en BD | RESUELTO |

---

## 10. Observaciones de la nueva generación

- Los **histogramas** usan una fila por tarea en lugar de una fila por persona. Es válido según
  el schema y correcto en total. Para la Fase 3 (regeneración por sección), si se quiere
  consolidar por persona habría que refinar la instrucción de histogramas.
- La **sigla** de Alonso Piscoya fue generada como `API` (en vez de `APS` de la generación anterior).
  Ambas son igualmente válidas; es elección libre del modelo.
- Los **cronograma y histograma** ahora coinciden exactamente con los datos del cronograma de BD.

---

## 11. Próxima fase

**Fase 3**: Endpoint `/regenerar-seccion` — permite rehacer solo una sección del plan
(ej: `alcanceDetallado`, `personalAsignado`) sin regenerar el plan completo, con SSE y
mismo pipeline de validación/persistencia parcial.
