# Prompt listo para pegar — SOLO BLOQUE 4 (alcance detallado asimétrico + imágenes)

> ANTES DE PEGAR: reemplaza la plantilla del repo por la nueva versión
> `plan-trabajo-nexa-template-v2.docx` → renombrar a `plan-trabajo-nexa-template.docx`
> en `src/lib/services/planTrabajo/templates/`. La v2 agrega dentro del loop
> `{#alcanceDetallado}` un sub-loop de imágenes: `{#imagenes} {%img} {caption} {/imagenes}`.
> Commitea ese reemplazo antes de iniciar la sesión.

---

Continuamos la mejora del generador de Plan de Trabajo. Contexto que debes conocer antes de tocar nada:

**Ya completado (NO rehacer):**
- Bloques 1-2: plantilla Docxtemplater local en `src/lib/services/planTrabajo/templates/` (con README de tags), `nullGetter` estricto, dataBag completo, anti-alucinación (ubicación inyectada, retry por truncamiento, siglas dedup en `src/lib/planTrabajo/siglas.ts`, `REFERENCIAS_BASE`).
- Bloque 3: generación en dos etapas. Etapa 1 sin IA (`calcularDatos.ts` + `raciReglas.ts`, endpoint `POST /plan-trabajo/calcular-datos`): `personalAsignado` desde `ProyectoOrgNodo`, `matrizRaci` por tabla `cargoLabel→rol`, `histogramas`/`cronogramaResumen` deterministas con `totalHH` = Σ histograma = Σ horasPlan garantizado por construcción. Etapa 2 (`generar-ia`) solo redacta: objetivo, alcanceGeneral, alcanceDetallado, eppRequeridos, herramientasYEquipos, restricciones; bloqueada con 409 sin Etapa 1; recibe bloque `HECHOS YA RESUELTOS (ETAPA 1 — INMUTABLES)`. `regenerar-seccion` distingue recalcular (sin IA) de regenerar (IA). UI con 3 botones.
- Documentación: `docs/investigacion-plan-trabajo.md` y el README de la plantilla. Léelos.
- Tests preexistentes rotos en `validarAsignacion.test.ts` y `resolverAprobador.test.ts` (módulos no relacionados): ignóralos.
- La plantilla docx YA incluye los tags de imágenes (ver nota arriba) — NO edites el binario de la plantilla; tu trabajo es alimentarlos desde código.

**Alcance de esta sesión:** SOLO el alcance detallado asimétrico por fase + imágenes por EDT. NO implementes round-trip de docx editado (bloque futuro).

Principio rector: la IA redacta, no calcula ni decide estructura.

## Requisito de negocio

El nivel de detalle de `alcanceDetallado` depende de la fase, porque el cliente revisa en campo la EJECUCIÓN:

- **FASE EJECUCIÓN — EDTs con código `CON` (Construcción) y `CMN` (Comisionamiento): detalle MÁXIMO.** Para cada uno: subItems por actividad (respetando la agrupación existente), descripción técnica de 2-4 oraciones estilo plan Nexa (ej.: "Se realizará el tendido de cable de fuerza desde la sala eléctrica X mediante bandejas existentes; para esta actividad se armará andamio de N cuerpos..."), lista `personalRequerido` `{cantidad, cargo}` inferida de `personasEstimadas` de las tareas + cargos del organigrama, e imágenes adjuntas (ver Tarea 3).
- **PLANIFICACIÓN, INGENIERÍA, PROCURA, CIERRE: detalle MÍNIMO.** Una entrada por EDT con descripción de 1 oración, sin subItems (salvo EDT con >1 actividad claramente distinta), sin personalRequerido, sin imágenes.

## Tareas

### Tarea 1 — Estructura por código, redacción por IA
Separar estructura de redacción (cambio #17 del informe):
- El servidor arma la jerarquía completa Fase→EDT→subItems desde el cronograma: numeración 11.x.y, nombres, fases, clasificación `detallado` (CON/CMN en EJECUCIÓN) vs `resumido` (resto), y `personalRequerido` calculado (sin IA).
- La IA recibe esa estructura YA RESUELTA e inmutable y SOLO completa los campos `descripcion`:
  - Una llamada batch (Haiku) para todos los EDTs `resumido`: 1 oración cada uno.
  - Una llamada individual (Sonnet) por cada EDT `detallado`, con las tareas completas de ese EDT como contexto, límite de tokens holgado, y el bloque de HECHOS de Etapa 1. Esto elimina el JSON gigante y su riesgo de truncamiento.
- Validar en servidor que la respuesta de IA no agregó/eliminó/renumeró nodos: si la estructura devuelta no coincide con la enviada, descartar y reintentar 1 vez; si falla, mergear solo las descripciones que sí matchean por id.

### Tarea 2 — Modelo de imágenes
Migración Prisma: tabla `PlanTrabajoImagen` — id, planId (FK), edtRef (id o código del EDT del alcance), subItemRef (nullable), storageKey/url, caption, orden, createdAt/By. Propón la migración y aplícala.

### Tarea 3 — UI de imágenes
En el editor del alcance detallado (`SeccionContainer` o equivalente): para EDTs/subItems de fase EJECUCIÓN, permitir subir 1-N imágenes (jpg/png, límite razonable de tamaño, redimensionar server-side a máx ~1600px de ancho). Reusar el mecanismo de upload de archivos existente en la app; si no existe ninguno, subir al Drive del proyecto (mismo flujo que los docx exportados). Caption editable con default = nombre de la actividad. Reordenar y eliminar. Las imágenes NUNCA pasan por la IA.

### Tarea 4 — Export
En `construirDataBag.ts`: cada elemento de `alcanceDetallado` lleva `imagenes: [{img, caption}]` (vacío para los resumidos). En `exportDocx.ts`: extender el ImageModule ya usado para el organigrama para resolver el tag `{%img}` — `getImage` descarga/lee el buffer por storageKey, `getSize` limita a ~15 cm de ancho manteniendo aspecto. Manejar imagen inaccesible con placeholder + warning, sin romper el export.

### Tarea 5 — Documentación
Actualizar `src/lib/services/planTrabajo/templates/README.md` con los tags nuevos (`{#imagenes}`, `{%img}`, `{caption}`) y las claves de dataBag agregadas.

## Reglas
- Commits pequeños por tarea, typecheck y lint limpios.
- Si un dato no existe en el schema, propón la migración antes de implementarla.
- Al terminar: plan de prueba manual de 4-6 pasos que incluya: (a) un EDT CON con 2 imágenes exportadas correctamente al docx con caption; (b) un EDT de PROCURA que salga con 1 sola oración y sin bloque de imágenes; (c) la triple igualdad de HH sigue cumpliéndose (regresión del Bloque 3).
