# ADDENDUM al Bloque 4 — Correcciones de la auditoría del PT generado (PT_CJM47 Rev A)

> Pegar este bloque INMEDIATAMENTE DESPUÉS del prompt del Bloque 4, en la misma sesión.
> Además: reemplazar la plantilla del repo por `plan-trabajo-nexa-template-v3.docx`
> (renombrar a `plan-trabajo-nexa-template.docx`). La v3 incluye los tags de imágenes
> del Bloque 4 Y corrige el loop de firmantes de la carátula (ahora es loop de bloque,
> un párrafo por firmante — antes salían concatenados sin separador).

Se auditó el docx generado con los Bloques 1-3 contra los planes manuales Nexa. Confirmado OK (no tocar): triple igualdad de HH (385=385=385), ubicación real, texto fijo §5/§7/§10, códigos OR-/CR-, dedup de siglas. Corrige lo siguiente como parte de esta sesión:

## A. Bug de subItems en alcanceDetallado (prioridad 1 — encaja con tu Tarea 1)
Síntoma en el docx: cada subItem sale como "### 11.1" (numeración del padre, sin incrementar), `{actividadNombre}` vacío, y `{descripcion}` = la descripción del EDT padre repetida N veces.
Causa probable: el mapeo de subItems en `construirDataBag.ts` (o en la salida de IA previa) no está poblando `numeracion` incremental (11.x.1, 11.x.2...), ni `actividadNombre`, y hereda la descripción del padre.
Como la Tarea 1 del Bloque 4 hace que el SERVIDOR arme la jerarquía completa, garantiza ahí: numeración de subItems `11.{i}.{j}` correcta, `actividadNombre` = nombre real de la actividad del cronograma, y descripciones INDIVIDUALES por subItem (no la del padre). Agrega un test que falle si dos subItems consecutivos tienen numeración o descripción idéntica.

## B. Desglose de HH por fase inventado por la IA
El total 385 se respetó, pero el alcance general escribió "planificación 118.5, ingeniería 32, ejecución 212.5, cierre 22" cuando los valores reales del histograma son 118.5 / 62 / 161 / 43.5.
Fix: incluir en el bloque `HECHOS YA RESUELTOS (ETAPA 1 — INMUTABLES)` el desglose de HH POR FASE (calculado de la misma fuente que totalHH) con la instrucción: "si mencionas horas por fase, usa exactamente estos valores; no inventes ninguna otra distribución de horas".

## C. Carátula / firmantes
1. Dedup de firmantes con normalización: comparar por nombre normalizado (trim + lowercase + sin tildes) — hoy "JESUS MAMANI" y "Jesus Mamani" salen como dos firmantes.
2. Las columnas Des./Ver./Apr./Aut. de la tabla de revisiones deben mostrar SIGLAS (formato Nexa), no nombres completos; los nombres completos van solo en la leyenda de firmantes de abajo.
3. `numeroConsultor` salió vacío: darle default configurable (env o constante) y campo editable en `CabeceraEditor`.
4. La columna Aut. vacía: si no hay autorizador definido, dejar "-" en vez de vacío.
(El typo "Heber COnza" es dato de origen: corregirlo en BD/cabecera, no en código — solo normaliza el render a Title Case si el dato viene todo en mayúsculas/mixto.)

## D. Reglas RACI (afinar `raciReglas.ts`)
1. El cargo "SSOMA" no matcheó la regla de Seguridad → salió I en todo. Ampliar el matching de la regla de seguridad a: /seguridad|ssoma|sso|hseq|hse/i → C en todos los EDTs y R en el EDT de Seguridad.
2. Hoy salen DOS Aprobadores por fila (Gerencia General y Gerencia de Proyectos, ambos → A). Regla: máximo un A por EDT; prioridad Gerencia de Proyectos > Gerencia General; el desplazado queda como C (Gerencia General → C, no I).
3. El Residente (Alonso Piscoya) salió I en Construcción: cargos /residente/i → R en EDTs de EJECUCIÓN (CON/CMN), C en el resto.

## E. Cronograma resumen — columna ACTIVIDAD vacía
Al agregarse una fila por EDT, `actividad` quedó vacía. Poblarla con un resumen: si el EDT tiene 1 actividad, su nombre; si tiene varias, "{n} actividades" o la lista abreviada de las 2 primeras + "…". No dejar celdas vacías.

## F. Verificación adicional al plan de prueba
Agregar al plan de prueba manual del Bloque 4: (d) los firmantes de la carátula salen uno por línea, sin duplicados por mayúsculas, y las columnas Des/Ver/Apr muestran siglas; (e) el alcance general menciona horas por fase idénticas a las del histograma (no solo el total).
