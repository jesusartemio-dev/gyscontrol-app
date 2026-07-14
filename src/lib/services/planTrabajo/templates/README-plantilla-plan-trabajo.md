# Plantilla Plan de Trabajo (formato Nexa) — Guía de integración

Archivo: `plan-trabajo-nexa-template.docx`
Ubicación sugerida en el repo: `src/lib/services/planTrabajo/templates/plan-trabajo-nexa-template.docx`
Motor: **Docxtemplater** (compatible con el pipeline actual `exportDocx.ts` — PizZip + ImageModule).

---

## 1. Cambios de integración en el código

### 1.1 `descargarPlantilla.ts` — leer del repo primero
Reemplazar la descarga desde Google Drive por lectura local, con Drive como fallback (o eliminarlo):

```ts
import { readFile } from 'fs/promises'
import path from 'path'

const TEMPLATE_LOCAL = path.join(process.cwd(), 'src/lib/services/planTrabajo/templates/plan-trabajo-nexa-template.docx')

export async function obtenerPlantilla(): Promise<Buffer> {
  try {
    return await readFile(TEMPLATE_LOCAL)
  } catch {
    return descargarPlantillaDrive() // fallback temporal, retirar tras validar
  }
}
```

Con esto la plantilla queda **versionada en Git** (resuelve el hallazgo de gobernanza del informe §4.5).

### 1.2 `exportDocx.ts` — habilitar saltos de línea
`{objetivo}` y `{alcanceGeneral}` son textos multipárrafo. Docxtemplater necesita:

```ts
new Docxtemplater(zip, { linebreaks: true, paragraphLoop: true, modules: [imageModule] })
```

`paragraphLoop: true` es necesario para los loops de bloque (`{#alcanceDetallado}`, `{#eppBasico}`, etc.).

### 1.3 Índice (TOC)
El campo TOC es nativo de Word con `updateFields` activado: Word pedirá "¿Actualizar campos?" al abrir y el índice se llena solo. LibreOffice/Google Docs no lo actualizan automáticamente — documentarlo al usuario final o post-procesar con `libreoffice --convert-to docx` en servidor si se requiere.

---

## 2. Mapeo de tags → dataBag

> ⚠️ Los nombres de tags de este documento deben coincidir EXACTAMENTE con
> `plan-trabajo-nexa-template.docx` y con las claves de `construirDataBag.ts`.
> Un nombre distinto no produce error visible: Docxtemplater resuelve el tag
> subiendo al scope del padre y clona sus valores silenciosamente (bug
> corregido en `ac1f0672`). Ante cualquier duda, la plantilla docx es la
> fuente de verdad.

Leyenda de estado: ✅ ya existe en `construirDataBag.ts` (según informe) · 🆕 clave nueva a agregar · 🔧 existe pero cambia de forma.

### Cabecera y carátula (BD, sin IA)
| Tag | Tipo | Estado | Fuente |
|---|---|---|---|
| `{ordenCompra}` | string | ✅/🆕 verificar | `Proyecto` / cabecera del plan |
| `{nombreProyecto}` | string | ✅ | `Proyecto.nombre` |
| `{codigoDocumento}` | string | ✅ | Cabecera (migrar a derivación por regla, cambio #9) |
| `{numeroConsultor}` | string | ✅ implementado | `PlanTrabajo.numeroConsultor` (editable en `CabeceraEditor`), fallback a `PLAN_TRABAJO_NUMERO_CONSULTOR_DEFAULT` (Bloque 4, Tarea 5.2) |
| `{revision}` | string | ✅ | Cabecera |
| `{#revisiones}` → `{rev} {te} {descripcion} {des} {ver} {apr} {aut} {fecha}` | array | ✅ implementado | Histórico real desde `PlanTrabajoGeneracion` (cambio #7). **`des`/`ver`/`apr`/`aut` muestran SIGLAS, no nombres completos** — `aut` sin dato renderiza `"-"`, nunca vacío (Bloque 4, Tarea 5.2) |
| `{#firmantes}` → `{siglas} {nombre}` | array | ✅ implementado | Únicos de des/ver/apr/aut de `revisiones`, deduplicados por nombre normalizado (trim + minúsculas + sin tildes, así "JESÚS MAMANI" y "Jesus Mamani" no salen duplicados) y renderizados en Title Case si venían en mayúsculas (Bloque 4, Tarea 5.2) |

### Secciones con texto fijo (CERO IA — ya embebidas en la plantilla)
Objetivo-bullets, Definiciones generales, **Responsabilidades completas (§5)**, **Capacidad y Experiencia (§7)**, intro EPP con códigos GYS-SST-P-006/007/008/009, **Consideraciones SSOMA (§10)** con GYS-SST-PL-001/002/004, leyenda RACI, textos de Organigrama/Cronograma/Anexos.
→ Permite **eliminar** las llamadas IA de `responsabilidades` y borrar `RESPONSABILIDADES_DEFAULT` como generación (queda solo la plantilla).

### Códigos derivados por regla (🆕, sin IA)
| Tag | Regla |
|---|---|
| `{codigoOR}` | `codigoDocumento.replace(/^PN-/, 'OR-')` |
| `{codigoCR}` | `codigoDocumento.replace(/^PN-/, 'CR-')` |

### Secciones deterministas (BD → cálculo, sin IA — cambios #11, #12, #13)
| Tag | Forma | Fuente |
|---|---|---|
| `{#referencias}` → `{codigo} {descripcion}` | array | Constante de normas (sacadas del prompt, cambio #5) + `ProyectoTdrAnalisis.normasAplicables` + OC/propuesta |
| `{#definicionesEspecificas}` → `{termino} {definicion}` | array | Opcional (TDR o edición manual) |
| `{#personalAsignado}` → `{nombre} {siglas} {empresa} {cargo}` | array | Directo de `ProyectoOrgNodo` con desempate + dedup de siglas server-side |
| `{#matrizRaci}` → `{edtNombre} {rolesTexto}` | array | `ProyectoEdt` × mapeo `cargoLabel→rol`. `rolesTexto` = string precompuesto `"PR: R · JM: A · YA: C"` (evita columnas dinámicas, que Docxtemplater no soporta) |
| `{#histogramaEquipo}` / `{#histogramaHH}` → `{etiqueta} {detalleMeses} {total}` | array | RESUMEN NUMÉRICO de `contextoIA.ts` usado directo. `detalleMeses` = `"2026-06: 240 · 2026-07: 120"` (incluir `valoresPorMes` que hoy se descarta) |
| `{totalHH}` | number | Total del resumen numérico — **misma cifra** que debe citar el alcance |
| `{#cronogramaResumen}` → `{fase} {edt} {actividad} {fechaInicio} {fechaFin} {horasPlan}` | array | Una fila por `ProyectoActividad`, mapeo directo |

### Secciones IA (redacción sobre datos reales)
| Tag | Notas |
|---|---|
| `{objetivo}` | Texto multipárrafo (requiere `linebreaks: true`) |
| `{alcanceGeneral}` | Ídem. Inyectar **`cliente.direccion`** al contexto (quick win #1) — la dirección correcta ya existe en BD (`/comercial/clientes/cli-import-1769535277176-...`) |
| `{#tieneUbicacion}` + `{ubicacionProyecto}` | 🆕 flag + string desde `cliente.direccion` o `ProyectoTdrAnalisis.ubicacionDetectada`. Dato mostrado explícito, no solo dentro de la prosa de IA |
| `{#alcanceDetallado}` → `{numeracion} {edtNombre} {faseNombre} {descripcion} {codigo} {ubicacion}` + `{#subItems}` → `{numeracion} {actividadNombre} {descripcion}` + `{#tareas}` → `{texto}` (anidado dentro de cada subItem, entre descripción e imágenes) + `{#personalRequerido}` → `{cantidad} {cargo}` + `{#imagenes}` → `{%img} {caption}` (EDT y subItem) | ✅ implementado (Bloque 4, Tarea 1/4; `{#tareas}` Bloque 4.2, Tarea 4). Estructura/numeración/`personalRequerido`/`imagenes`/`tareas` **100% servidor, cero IA**; IA solo redacta `descripcion` y el `texto` (viñeta) de cada tarea. `numeracion` es incremental real (`11.1`, `11.1.1`, `11.1.2`, `11.2`, ...), nunca repetida entre subItems consecutivos. `personalRequerido`/`imagenes` solo existen en EDTs de fase EJECUCIÓN con EDT CON/CMN (ver `{tipoDetalle}` más abajo); en el resto llegan como array vacío. `tareas` = las tareas reales del cronograma de esa actividad, como viñetas operativas de 1 línea (fallback = nombre de la tarea) — `[]` en subItems de EDTs `resumido` |
| `{#eppBasico}` / `{#eppRiesgoEspecifico}` / `{#eppBioseguridad}` → `{nombre} {norma}` | Catálogo + selección IA. `{#hayEppBioseguridad}` 🆕 boolean = `eppBioseguridad.length > 0` (resuelve el "título vacío" §4.4) |
| `{#equipos}` / `{#herramientas}` / `{#materiales}` → `{nombre} {cantidad}` | Mixto cotización + IA |
| `{#restricciones}` → `{categoria} {texto}` | Catálogo + selección IA |

### Imagen
| Tag | Notas |
|---|---|
| `{%organigramaPng}` | Va en **Anexo A** (como los manuales). Mantiene `generarOrganigramaPng.ts` + ImageModule; tamaño fijo 600×400px, string base64 plano |
| `{#imagenes}` → `{%img} {caption}` (dentro de `{#alcanceDetallado}` y de `{#subItems}`) | ✅ implementado (Bloque 4, Tarea 4). Imágenes adjuntas por el usuario en la UI del editor (`GaleriaImagenesAlcance.tsx`), **nunca pasan por IA**. Solo EDTs/subItems de fase EJECUCIÓN pueden tener imágenes (hasta 10 por nodo, subidas propias o traídas del catálogo global — Bloque 4.2, Tarea 6). Cada imagen: `{%img}` es un objeto `{data, width, height}` ya resuelto server-side (base64 + dimensiones reales leídas con `sharp`, ver `resolverImagenesAlcance.ts`) — se limita a **~15cm de ancho (566px)** preservando el aspecto real. `{caption}` es texto editable, default = nombre de la actividad/EDT (Bloque 4.2, Tarea 1 — antes era el nombre del archivo subido; `captionEfectivo()` corrige en runtime los captions viejos que quedaron en el filename). Imagen inaccesible en Drive → placeholder 1×1 transparente + warning en consola, **nunca rompe el export**. Array vacío en EDTs/subItems sin imágenes o de otras fases |
| `{#tieneHistogramaEquipoPng}` → `{%histogramaEquipoPng}` / `{#tieneHistogramaHHPng}` → `{%histogramaHHPng}` (sección 13, encima de cada tabla) | ✅ implementado (Bloque 4.2, Tarea 3). Gráficos de barras compuestos a mano en SVG y rasterizados a PNG con `sharp` (`generarHistogramaPng.ts`) desde los MISMOS datos deterministas de `histogramas` (Etapa 1) — **nunca de IA**. `tieneHistograma*Png` en `false` (sin datos suficientes) hace que Docxtemplater no renderice el bloque condicional; las tablas existentes se mantienen debajo del gráfico en ambos casos |

### Notas de implementación — Bloque 4 / 4.2

- **`tipoDetalle`** (`'detallado' | 'resumido'`) es un campo interno de `PlanAlcanceDetalladoEdt` que controla la profundidad de redacción de la IA (1 frase por EDT `resumido` vs. 2-4 frases + `subItems`/`tareas`/`personalRequerido`/`imagenes` en EDTs `detallado` = fase EJECUCIÓN con EDT CON/CMN). **No se expone como tag en la plantilla** — es editable desde la UI (`AlcanceDetalladoEditor.tsx`) para casos borde donde la clasificación automática no aplica.
- Las **horas-hombre por fase** que cita `{alcanceGeneral}` (redactado por IA) se inyectan como hecho inmutable en el bloque `HECHOS YA RESUELTOS (ETAPA 1)` que recibe el prompt — no es un tag de la plantilla, pero garantiza que la cifra que menciona la prosa coincida con `{#histogramaHH}`/`{totalHH}` (cambio #4 del checklist).
- **`fotoSugerida`** (por subItem, Bloque 4.2, Tarea 5) es solo para la UI (hint "📷 Foto sugerida: ..." cuando el subItem tiene 0 imágenes, editable a mano) — **NUNCA llega a `construirDataBag.ts` ni a la plantilla**, confirmado por test explícito.
- **Biblioteca de imágenes** (Bloque 4.2, Tarea 6): catálogo global (`CatalogoImagen`, `/catalogo/imagenes` en el sidebar) en una subcarpeta propia del mismo Drive compartido. Al adjuntar una imagen del catálogo a un plan, se crea un `PlanTrabajoImagen` que **referencia el mismo `driveFileId`** (nunca duplica el archivo) — por eso el export no cambia: `resolverImagenesAlcance.ts` resuelve por `driveFileId` sin importar si la imagen fue subida directamente o viene del catálogo.

---

## 3. Reglas Docxtemplater usadas (para quien edite la plantilla)

- **Loops de fila de tabla:** `{#items}` abre en la primera celda y `{/items}` cierra en la última celda de la MISMA fila → la fila se repite por elemento.
- **Loops de bloque (párrafos):** `{#items}` y `{/items}` en párrafos propios; requiere `paragraphLoop: true`.
- **Condicionales:** misma sintaxis que loops con booleanos (`{#hayEppBioseguridad}...{/hayEppBioseguridad}`).
- **Nunca partir un tag en dos runs:** si se edita la plantilla en Word y un tag deja de reemplazarse, retipearlo completo de una vez (Word fragmenta runs al editar por partes).

## 4. Checklist de validación post-integración
1. Exportar un plan de prueba y verificar que ninguna llave `{...}` quede sin reemplazar (Docxtemplater lanza error con `nullGetter` estricto — recomendable configurarlo para detectar claves faltantes en dev).
2. Abrir en Word → aceptar "Actualizar campos" → índice poblado.
3. `hayEppBioseguridad=false` → el bloque completo (título incluido) desaparece.
4. Sumar `{totalHH}` vs. suma de filas de `{#histogramaHH}` vs. suma de `{horasPlan}` del cronograma: deben coincidir (test automatizable).
5. (Bloque 4) Ningún par de `subItems` consecutivos dentro de un mismo `{#alcanceDetallado}` tiene la misma `{numeracion}` ni la misma `{descripcion}` — regresión cubierta por `alcanceEstructura.test.ts` y `construirDataBag.test.ts`.
6. (Bloque 4) Un EDT de fase EJECUCIÓN con 2+ imágenes subidas exporta ambas dentro de `{#imagenes}` con su `{caption}`, y una imagen con `driveFileId` inválido no rompe el export (placeholder + warning en logs).
7. (Bloque 4) Las columnas `{des}`/`{ver}`/`{apr}`/`{aut}` de `{#revisiones}` muestran siglas (no nombres completos); `{aut}` sin dato muestra `"-"`; la leyenda `{#firmantes}` no repite la misma persona por diferencias de mayúsculas/tildes.
8. (Bloque 4.2) Un subItem de Construcción con varias tareas exporta una viñeta por tarea dentro de `{#tareas}`, todas distintas entre sí y ninguna vacía — regresión cubierta por `alcanceEstructura.test.ts` y `exportDocx.test.ts`.
9. (Bloque 4.2) Un plan con histogramas calculados exporta los dos gráficos de barras (equipo + HH) encima de sus tablas respectivas; un plan sin Etapa 1 calculada no rompe el export y simplemente omite los gráficos.
10. (Bloque 4.2) Adjuntar una imagen desde la Biblioteca a un subItem la exporta igual que una subida directa (mismo `driveFileId`, sin duplicar el archivo en Drive).
