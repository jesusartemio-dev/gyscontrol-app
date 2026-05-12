# DIAGNÓSTICO YAN01 — Plan de Trabajo

> Fecha: 2026-05-09 | Proyecto: `f8a536fd-4cf9-4dbc-b009-aef270ddc5a5`
> Modo: solo SELECTs, sin modificaciones de código ni nuevas generaciones.

---

## 1. DATOS DE CABECERA DEL PROYECTO YAN01

| Campo | Valor |
|-------|-------|
| `codigo` | YAN01 |
| `nombre` | Migracion de Horno |
| `descripcion` | null |
| `fechaInicio` | 2026-01-27 |
| `fechaFin` | 2026-04-08 |
| **Días (fechaInicio→fechaFin)** | **71** |
| `numeroContrato` | null |
| `ordenCompraCliente` | null |
| `fechaFirmaContrato` | null |
| `fechaInicioContrato` | null |
| `fechaFinContrato` | null |
| **Días (fechaInicioContrato→fechaFinContrato)** | **N/A (ambas null)** |
| `estado` | creado |
| `cliente.nombre` | MINERA YANACOCHA |
| `cliente.codigo` | YAN |

### Respuesta a la pregunta clave

**¿El proyecto tiene fechas de contrato definidas?** No. `fechaInicioContrato`, `fechaFinContrato`, `numeroContrato` y `ordenCompraCliente` están todos en `null`. El contrato no se ha formalizado aún (el `estado` es `creado`).

**¿Cuántos días dura?** Los campos `fechaInicio`/`fechaFin` sí existen y marcan **71 días** (27-ene-2026 → 08-abr-2026), pero corresponden a la estimación del proyecto, no a fechas contractuales. Los "71 días del contrato" que citó el reporte anterior vienen de estos campos de planificación, no de un contrato firmado.

---

## 2. COTIZACIÓN — VOLUMEN Y COMPLETITUD

| Tipo | Grupos | Items totales | Total horas (servicios) |
|------|--------|---------------|------------------------|
| Servicios | 3 | 9 | **76 h** |
| Equipos | 2 | 7 | N/A |
| Gastos | 0 | 0 | N/A |

### Servicios — Detalle por grupo

| Grupo | Items | Horas |
|-------|-------|-------|
| Desarrollo de Pantallas HMI | 3 | 18 h |
| Programacion de PLC | 3 | 36 h |
| Desarrollo de Planos | 3 | 22 h |
| **TOTAL** | **9** | **76 h** |

### Servicios — Items individuales (IDs completos)

| Item | cantidadHoras | ID |
|------|---------------|----|
| Plantilla HMI de Instrumentos Analógicos | 6 h | `33d29039-d333-40f9-9e57-d3f4f1d95b96` |
| Plantilla HMI de Motores | 6 h | `fcc5283f-f3ef-43ee-b97b-bcee197fe515` |
| Plantilla HMI de Variadores VFD | 6 h | `a1f0d90c-1733-4a74-969d-51f8766fd88a` |
| Configuración de hardware y comunicación | 10 h | `ee2c87b4-d0e6-4dd4-a87a-58231985af77` |
| Logica de Mapeo de I/Os (PLC-IOs) | 14 h | `c93c3cfb-ac24-4565-bf4d-78d8427c02d9` |
| Logica de Mapeo de Variadores (PLC-DRV) | 12 h | `175a9ef7-30fa-4d9c-ab86-7090faf54f46` |
| Diagrama Unifilar | 8 h | `37788374-7041-4a32-8617-3d860b9cfe8e` |
| Planos de Distribución Eléctrica | 8 h | `63ab4b01-aee0-4b2b-9396-427d36aced03` |
| Planos de Arranque Directo (DOL) | 6 h | `d0b153bf-83d7-4cd8-911b-9c1d24ce19b6` |

### Respuesta a la pregunta clave

**¿Cuántas horas TOTALES están realmente cotizadas?** **76 h exactas** (HMI 18h + PLC 36h + CAD 22h). Coincide al 100% con los "76h cotizadas" del reporte anterior.

---

## 3. CRONOGRAMA DE PLANIFICACIÓN — VOLUMEN Y FECHAS

### A) Conteo total

| Entidad | Cantidad |
|---------|---------|
| Fases | 5 |
| EDTs | 3 (todos en fase INGENIERIA) |
| Actividades | 3 |
| Tareas | 9 |

> Las otras 4 fases (PLANIFICACION, PROCURA, EJECUCION, CIERRE) existen con fechas pero **no tienen EDTs** definidos. Solo la fase INGENIERIA tiene EDTs, actividades y tareas.

### B) Por fase — fechas

| Fase | fechaInicioPlan | fechaFinPlan | Días |
|------|-----------------|--------------|------|
| PLANIFICACION | 2026-01-27 | 2026-02-02 | 6 |
| INGENIERIA | 2026-02-03 | 2026-02-17 | 14 |
| PROCURA | 2026-02-12 | 2026-03-03 | 19 |
| EJECUCION | 2026-03-04 | 2026-04-01 | 28 |
| CIERRE | 2026-04-02 | 2026-04-08 | 6 |
| **TOTAL proyecto** | **2026-01-27** | **2026-04-08** | **71** |

### C) Por EDT — fechas y horas

| EDT | fechaInicioPlan | fechaFinPlan | horasPlan |
|-----|-----------------|--------------|-----------|
| HMI | 2026-02-03 | 2026-02-05 | 18 |
| PLC | 2026-02-08 | 2026-02-12 | 36 |
| CAD | 2026-02-15 | 2026-02-17 | 22 |

### D) Rango total del cronograma (EDTs)

| Métrica | Valor |
|---------|-------|
| Fecha más temprana (min fechaInicioPlan EDTs) | 2026-02-03 |
| Fecha más tardía (max fechaFinPlan EDTs) | 2026-02-17 |
| **Días entre ambas** | **14** |

> Las 5 fases del proyecto cubren los 71 días completos. Pero el cronograma con EDTs/actividades/tareas definidos solo cubre la fase INGENIERIA (**14 días**, 03-feb → 17-feb). Las otras fases tienen fechas de fase definidas pero sin EDTs debajo.

### E) Tareas — completitud de campos críticos

| Métrica | Cantidad |
|---------|---------|
| Tareas totales | 9 |
| Tareas con horasEstimadas != null | **9 / 9** |
| Tareas con horasEstimadas > 0 | **9 / 9** |
| Tareas con personasEstimadas != null | **9 / 9** |
| Tareas con personasEstimadas > 0 | **9 / 9** |
| Tareas con fechaInicio definida | **9 / 9** |
| Tareas con fechaFin definida | **9 / 9** |

### F) Suma total de horas

| Métrica | Valor |
|---------|-------|
| Suma horasEstimadas (todas las tareas) | **76 h** |
| Suma (horasEstimadas × personasEstimadas) | **76 HH** |

> **Nota crítica**: `personasEstimadas = 1` en las **9 de 9 tareas**. Ángel Palomino es la única persona asignada en el cronograma técnico. El total de HH según la BD es exactamente **76**, no 370.

### G) Detalle de tareas por actividad

| EDT | Tarea | horasEst | personasEst | fechaInicio | fechaFin |
|-----|-------|----------|-------------|-------------|----------|
| HMI | Plantilla HMI Instrumentos Analógicos | 6 | 1 | 2026-02-03 | 2026-02-03 |
| HMI | Plantilla HMI de Motores | 6 | 1 | 2026-02-03 | 2026-02-03 |
| HMI | Plantilla HMI de Variadores VFD | 6 | 1 | 2026-02-03 | 2026-02-03 |
| PLC | Configuración de hardware y comunicación | 10 | 1 | 2026-02-08 | 2026-02-09 |
| PLC | Logica de Mapeo de I/Os (PLC-IOs) | 14 | 1 | 2026-02-09 | 2026-02-10 |
| PLC | Logica de Mapeo de Variadores (PLC-DRV) | 12 | 1 | 2026-02-10 | 2026-02-11 |
| CAD | Diagrama Unifilar | 8 | 1 | 2026-02-15 | 2026-02-15 |
| CAD | Planos de Distribución Eléctrica | 8 | 1 | 2026-02-15 | 2026-02-15 |
| CAD | Planos de Arranque Directo (DOL) | 6 | 1 | 2026-02-15 | 2026-02-15 |

**Problemas de datos observados en tareas:**
- Las 3 tareas HMI tienen `fechaInicio = fechaFin = 2026-02-03` (mismo día para las 3, imposible si son secuenciales)
- Las 3 tareas CAD tienen `fechaInicio = fechaFin = 2026-02-15` (mismo día para las 3)
- Solo las 3 tareas PLC tienen fechas progresivas y razonables
- Como resultado, el **serializer muestra `( → )` vacío** para las tareas HMI y CAD

### Respuestas a las preguntas clave

**¿Cuántos días dura el cronograma de planificación?**
- Fases completas: 71 días (27-ene → 08-abr)
- EDTs con actividades/tareas: **14 días** (03-feb → 17-feb, solo fase INGENIERIA)

**¿Coincide con los "71 días del contrato"?** El rango de fases coincide con los 71 días del proyecto. Pero los EDTs técnicos (lo que la IA puede ver como cronograma estructurado) solo cubren 14 días. El IA generó 23 días en su output, que no coincide ni con 14 ni con 71.

**¿Coincide con los "23 días" del output IA?** No. El output IA generó 27-ene→18-feb (23 días). La BD muestra EDTs en 03-feb→17-feb (14 días). El serializador no expone las fechas EDT del HMI (muestra blancos), lo que hizo que la IA tomara la fecha de inicio del proyecto (27-ene) para el primer ítem.

**¿Cuál es el total de HH según las tareas?** **76 HH** (76h × 1 persona). No 370.

**¿Los campos `personasEstimadas` están bien poblados?** Sí, `personasEstimadas = 1` en las 9 tareas. El problema es que refleja la realidad: el trabajo técnico cotizado (76h) es de 1 persona (AP). El histograma de 370h que generó la IA inventó horas de gestión y SSOMA que no están en el cronograma.

---

## 4. ORGANIGRAMA — COMPLETITUD

| Métrica | Cantidad |
|---------|---------|
| Nodos totales | 8 |
| Nodos con user (usuario real asignado) | 5 |
| Nodos con recurso (perfil tipo cargo) | 1 |
| Nodos con cipOverride / telefonoOverride / emailOverride | 0 |
| Nodos sin asignación (solo cargoLabel) | **3** |

### Primeros 10 nodos (son 8 en total)

| cargoLabel | user.name | recurso.nombre | id |
|-----------|-----------|----------------|-----|
| GERENCIA GENERAL | — | — | `cmovztqvg0006...` |
| COMERCIAL | — | — | `cmovztqvl0008...` |
| GERENCIA DE PROYECTOS | Jesus Mamani | — | `cmovztqvn000a...` |
| HSEQ | YONY APAZA | — | `cmovztqvp000c...` |
| Gestor de Proyecto | Jesus Mamani | — | `cmovztqvv000e...` |
| Residente / Ing. Programador | Angel Palomino | Programador Senior | `cmovztqvx000g...` |
| Cadista | — | — | `cmovztqvz000i...` |
| Supervisor de Seguridad (HSEQ) | Alonso Piscoya | — | `cmovztqw1000k...` |

**Observaciones:**
- Jesus Mamani aparece en **dos nodos**: `GERENCIA DE PROYECTOS` (nivel corporativo) y `Gestor de Proyecto` (nivel proyecto). La IA eligió el nodo "Gestor de Proyecto" (correcto), pero como ambos tienen el mismo `user.name`, la referencia es ambigua sin el ID.
- Nodos sin user: GERENCIA GENERAL, COMERCIAL, Cadista. Son posiciones vacantes o del cliente.
- Yony Apaza aparece en el nodo `HSEQ` (nivel corporativo), no en el nivel proyecto.

### Respuestas a las preguntas clave

**¿Cuántas personas reales hay en el organigrama?**
5 nodos tienen user asignado: Jesus Mamani (×2 nodos), YONY APAZA, Angel Palomino, Alonso Piscoya → **4 personas únicas**.

**¿Coinciden con las que la IA listó en `personalAsignado`?** Sí exactamente: JM, AP, APS, YA son los 4 que aparecen tanto en el organigrama como en el `personalAsignado` generado.

---

## 5. CONTEXTO SERIALIZADO — INSPECCIÓN

### Métricas del contexto

| Métrica | Valor |
|---------|-------|
| Total líneas del contexto serializado | 81 |
| Total caracteres | 5,815 |

> El contexto es compacto (5.8KB). Esto es el texto que recibe la Fase A (Haiku) como input. Haiku leyó 3,632 tokens de input en producción, lo que sugiere que el prompt del sistema de resumir sumó ~2,400 tokens más.

### Contexto serializado completo (81 líneas)

```
# DATOS DEL CLIENTE Y PROYECTO
- Cliente: MINERA YANACOCHA
- RUC: 20100070958
- Código del proyecto: YAN01
- Nombre: Migracion de Horno
- Descripción: N/A
- Orden de compra: N/A
- N° Contrato: N/A
- Fecha inicio: Tue Jan 27 2026 07:00:00 GMT-0500 (hora estándar de Colombia)
- Fecha fin: Wed Apr 08 2026 17:00:00 GMT-0500 (hora estándar de Colombia)
- Gestor: Jesus Mamani
- Supervisor: Alonso Piscoya
- Líder: Angel Palomino

# COTIZACIÓN — SERVICIOS
- Servicio: Desarrollo de Pantallas HMI (edtId: bfdda5f1-..., id: 892e5b2e-...)
  · Plantilla HMI de Instrumentos Analógicos — 6h (id: 33d29039-..., edtId: bfdda5f1-...)
  · Plantilla HMI de Motores — 6h (id: fcc5283f-..., edtId: bfdda5f1-...)
  · Plantilla HMI de Variadores VFD — 6h (id: a1f0d90c-..., edtId: bfdda5f1-...)
- Servicio: Programacion de PLC (edtId: 266cb07d-..., id: f64c8315-...)
  · Configuración de hardware y comunicación — 10h (id: ee2c87b4-..., edtId: 266cb07d-...)
  · Logica de Mapeo de I/Os (PLC-IOs) — 14h (id: c93c3cfb-..., edtId: 266cb07d-...)
  · Logica de Mapeo de Variadores (PLC-DRV) — 12h (id: 175a9ef7-..., edtId: 266cb07d-...)
- Servicio: Desarrollo de Planos (edtId: 4613ef85-..., id: 5b03afa9-...)
  · Diagrama Unifilar — 8h (id: 37788374-..., edtId: 4613ef85-...)
  · Planos de Distribución Eléctrica — 8h (id: 63ab4b01-..., edtId: 4613ef85-...)
  · Planos de Arranque Directo (DOL) — 6h (id: d0b153bf-..., edtId: 4613ef85-...)

# COTIZACIÓN — EQUIPOS
Grupo: Tablero Fuerza
  · WEG-CFW300-2.2kW — CFW300 2.2kW — Categoría: Drives — Cantidad: 1
  · MIT-FR-E820-2.2K — FR-E800 2.2kW — Categoría: Drives — Cantidad: 1
  · INVT-GD20-4kW — GD20 4kW — Categoría: Drives — Cantidad: 1
Grupo: Tablero Control CLX
  · SIEM-6ES7314-6EH04 — CPU S7-300 314C — Categoría: PLC — Cantidad: 1
  · AB-1756-L81E — CPU ControlLogix — Categoría: PLC — Cantidad: 1
  · AB-1769-L30ER — CompactLogix L30ER — Categoría: PLC — Cantidad: 1
  · OMR-NX1P2-9024DT1 — NX1P2 CPU — Categoría: PLC — Cantidad: 1

# COTIZACIÓN — GASTOS
(Sin gastos cotizados)

# CRONOGRAMA DE PLANIFICACIÓN
Fase: PLANIFICACION (estado: planificado)
Fase: INGENIERIA (estado: planificado)
  EDT: HMI (id: 17e58f56-..., edtId: bfdda5f1-..., horas: 18,  → )      ← ⚠️ SIN FECHAS
    Actividad: Desarrollo de Pantallas HMI (id: 4699cea1-..., horas: 18,  → )
      Tarea: Plantilla HMI de Instrumentos Analógicos — 6h, 1 personas ( → )
      Tarea: Plantilla HMI de Motores — 6h, 1 personas ( → )
      Tarea: Plantilla HMI de Variadores VFD — 6h, 1 personas ( → )
  EDT: PLC (id: ad7fb05a-..., edtId: 266cb07d-..., horas: 36, Sun Feb 08 2026 → )  ← ⚠️ SIN fechaFin
    Actividad: Programacion de PLC (id: 11703514-..., horas: 36, Sun Feb 08 → )
      Tarea: Configuración de hardware y comunicación — 10h, 1 personas (Sun Feb 08 → Mon Feb 09)
      Tarea: Logica de Mapeo de I/Os (PLC-IOs) — 14h, 1 personas (Mon Feb 09 → )
      Tarea: Logica de Mapeo de Variadores (PLC-DRV) — 12h, 1 personas ( → Wed Feb 11)
  EDT: CAD (id: d2ca4740-..., edtId: 4613ef85-..., horas: 22, Sun Feb 15 → )  ← ⚠️ SIN fechaFin
    Actividad: Desarrollo de Planos (id: 5b293249-..., horas: 22, Sun Feb 15 → )
      Tarea: Diagrama Unifilar — 8h, 1 personas (Sun Feb 15 → Sun Feb 15)
      Tarea: Planos de Distribución Eléctrica — 8h, 1 personas (Sun Feb 15 → Sun Feb 15)
      Tarea: Planos de Arranque Directo (DOL) — 6h, 1 personas (Sun Feb 15 → Sun Feb 15)
Fase: PROCURA (estado: planificado)
Fase: EJECUCION (estado: planificado)
Fase: CIERRE (estado: planificado)

# ORGANIGRAMA DEL PROYECTO
- GERENCIA GENERAL [id: cmovztqvg0006l8mglkinqch0]
  - COMERCIAL [id: cmovztqvl0008l8mgsp84d05e]
  - GERENCIA DE PROYECTOS — Jesus Mamani (Email: ...) [id: cmovztqvn000al8mgprs5cfee]
    - Gestor de Proyecto — Jesus Mamani (Email: ...) [id: cmovztqvv000el8mgrqntvwcj]
      - Residente / Ing. Programador — Angel Palomino (Tel: 9999999, ...) [id: cmovztqvx000gl8mgshps6rrl]
      - Cadista [id: cmovztqvz000il8mgn9a621g4]
      - Supervisor de Seguridad (HSEQ) — Alonso Piscoya (CIP: 3234234234, ...) [id: cmovztqw1000kl8mgt5tlwvnt]
  - HSEQ — YONY APAZA (Email: ...) [id: cmovztqvp000cl8mgbkjbgj24]

# MATRIZ DE COMUNICACIONES
- Info: HMI | Emisor: | Receptores: [...] | Medio: E | Frecuencia: S
- Info: PLC | Emisor: | Receptores: [...] | Medio: E | Frecuencia: S
- Info: CAD | Emisor: | Receptores: [...] | Medio: IE | Frecuencia: E

# TDR (si existe)
(Sin TDR analizado)
```

### Presencia de IDs en el serializado

| Tipo de ID | Total | Presentes en serializado | Veredicto |
|-----------|-------|------------------------|-----------|
| Items de servicios cotizados | 9 | **9 / 9** | ✅ Todos expuestos |
| Grupos de servicios cotizados | 3 | **3 / 3** | ✅ Todos expuestos |
| Nodos del organigrama | 8 | **8 / 8** | ✅ Todos expuestos |
| EDTs del cronograma | 3 | **3 / 3** | ✅ Todos expuestos |

**Ejemplo de ID de servicio cotizado en el serializado:**
```
· Plantilla HMI de Instrumentos Analógicos — 6h (id: 33d29039-d333-40f9-9e57-d3f4f1d95b96, edtId: bfdda5f1-...)
```

**Ejemplo de ID de nodo de organigrama en el serializado:**
```
- Gestor de Proyecto — Jesus Mamani [id: cmovztqvv000el8mgrqntvwcj]
- Residente / Ing. Programador — Angel Palomino [id: cmovztqvx000gl8mgshps6rrl]
```

### Respuesta a la pregunta clave

**¿El serializador está exponiendo los IDs en formato copiable por la IA?** **Sí, todos los IDs están presentes** — 9/9 items de servicios, 8/8 nodos, 3/3 EDTs. El formato es `(id: UUID)` para servicios e items, y `[id: CUID]` para nodos del organigrama.

El problema **no es la ausencia de IDs** en el contexto serializado. La IA los tiene disponibles. Los campos `servicioCotizadoRefId` y `proyectoOrgNodoRefId` están vacíos porque el **prompt de generación no instruyó explícitamente al modelo a copiar esos IDs** en esos campos del schema de output.

**Problema adicional detectado**: El serializador usa `Date.toString()` (formato verboso con timezone: `Sun Feb 08 2026 08:00:00 GMT-0500`) en lugar de `toISOString().slice(0,10)`. Esto dificulta la lectura para el modelo y provoca que las fechas incompletas (fechaFin null) aparezcan como `→ )` en lugar de `→ null`.

---

## 6. MATRIZ DE COMUNICACIONES Y TDR

### Matriz de comunicaciones

La matriz **existe** con **3 filas** (visible en el serializado):
- Fila 1: Info HMI | Receptores: JM(DV), AP(ER), YA(D), API(D) | Medio: Email | Frecuencia: Semanal
- Fila 2: Info PLC | Receptores: JM(DV), AP(ER), YA(D), API(D) | Medio: Email | Frecuencia: Semanal
- Fila 3: Info CAD | Receptores: JM(D), AP(ER), YA(D), API(D) | Medio: Informe+Email | Frecuencia: Entregable

> Nota: El modelo Prisma `proyectoMatrizComunicacion` no tiene `findMany` directo con `proyectoId` en la forma estándar. Los datos se obtuvieron del serializado donde aparecen correctamente.

### TDR (ProyectoTdrAnalisis)

**No existe** `ProyectoTdrAnalisis` para el proyecto YAN01 en la BD local.

El serializer refleja esto correctamente mostrando `(Sin TDR analizado)`. La IA generó el Plan de Trabajo sin información del TDR, lo que explica que algunas referencias en el alcanceGeneral sean razonadas (no extraídas del TDR).

---

## RESUMEN FINAL DEL DIAGNÓSTICO

| Problema reportado | Veredicto | Justificación con números reales |
|---|---|---|
| **Histogramas inflados 4.87×** (370h vs 76h) | **BUG — Prompt** | La BD muestra 76h × 1 persona = **76 HH** en todas las tareas. La IA generó JM:140h + AP:160h + APS:70h = 370h inventando horas de gestión y SSOMA que no están en el cronograma. El prompt no especificó que los histogramas deben basarse en las horas del cronograma de planificación (76HH), no en el esfuerzo total estimado del equipo. |
| **Cronograma comprimido** (23 vs 71 días) | **BUG — Prompt + Serializer** | El rango de EDTs en BD es **14 días** (03-feb→17-feb). Las 5 fases suman **71 días** pero solo INGENIERIA tiene EDTs. El serializer muestra fechas en formato verboso (`Sun Feb 08 2026 08:00:00 GMT-0500`) y las fechas de HMI aparecen como blancos `( → )` porque `fechaInicio = fechaFin` en esas tareas, que el serializer no renderiza. La IA tomó la fecha de inicio del proyecto (27-ene) para el primer ítem HMI por no tener mejor referencia, generando un rango de 23 días que no coincide ni con 14 ni con 71. Bugs duales: (1) el serializer no formatea bien las fechas; (2) el prompt no instruyó al modelo a usar las fechas del EDT. |
| **`servicioCotizadoRefId` vacío** | **BUG — Prompt** | Los **9/9 IDs** de items de servicios cotizados están presentes en el serializado en formato `(id: UUID)`. La IA los leyó (por eso nombró correctamente cada actividad) pero no los copió al campo `servicioCotizadoRefId`. El prompt de generación y el schema JSON no instruyen explícitamente al modelo a asignar el ID del item de servicio a `servicioCotizadoRefId`. No es un problema de datos. |
| **`proyectoOrgNodoRefId` vacío** | **BUG — Prompt** | Los **8/8 IDs** de nodos del organigrama están en el serializado en formato `[id: CUID]`. La IA identificó correctamente a JM, AP, APS y YA desde el organigrama, pero no copió sus IDs a `proyectoOrgNodoRefId`. El prompt no especifica la instrucción: "para cada persona en `personalAsignado`, copia el `id` del nodo del organigrama al campo `proyectoOrgNodoRefId`". No es un problema de datos. |

---

### Conclusión general

Los **4 problemas son bugs de prompt**, no de datos incompletos en la BD local.

Los datos de YAN01 están completos para esta fase del proyecto:
- Cotización: ✅ 76h confirmadas en 9 items
- Cronograma: ✅ Estructurado (aunque con fechas de tarea problemáticas en HMI y CAD)
- Organigrama: ✅ 8 nodos, 4 personas reales identificadas
- IDs en contexto: ✅ Todos expuestos por el serializer

Las correcciones necesarias son todas en el **sistema prompt** de `generarPlan.ts` y opcionalmente en el **serializer** (`contextoIA.ts`) para formatear fechas correctamente. Ninguna requiere datos adicionales en la BD ni migración de schema.

---

*Archivo generado: 2026-05-09 | Sin modificaciones de código.*
