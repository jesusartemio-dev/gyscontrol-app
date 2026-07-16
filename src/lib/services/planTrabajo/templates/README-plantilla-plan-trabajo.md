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

### 1.3 Logo de Nexa en la carátula (🆕 2026-07-15)
`word/header1.xml` embebe el logo de Nexa (`rId1` → `word/media/nexa_logo.png`, 194×48 px, extent 1000919×247650 EMU ≈ 1.095" × 0.271"). Antes esa celda tenía el texto `GYS CONTROL INDUSTRIAL SAC` en naranja de Office: el cajetín del cliente lleva el logo de **Nexa**, no el de GYS (el contratista se identifica por el `4GYS` del código y por la columna "empresa" de §6). **Si se regenera la plantilla desde cero, hay que preservar el logo, su relationship en `header1.xml.rels` y la declaración de `png` en `[Content_Types].xml`.**

### 1.4 Índice (TOC)
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
| `{-w:tc raciPersonas}{sigla}{/raciPersonas}` (cabecera, fuera de `{#matrizRaci}`) | array | Columnas de la grilla RACI — una por persona. SIEMPRE tomado de `raci.filas[0].asignaciones` (mismo orden/largo que `roles` de cada fila, ver construirDataBag.ts) |
| `{#matrizRaci}` → `{edtNombre}` + `{-w:tc roles}{rol}{/roles}` | array | `ProyectoEdt` × mapeo `cargoLabel→rol`. `roles[i]` corresponde posicionalmente a `raciPersonas[i]` — grilla real por columna (loop `{-w:tc}` duplica la celda `<w:tc>`; requiere post-proceso de `tblGrid`, ver exportDocx.ts) |
| `{#histogramaEquipo}` / `{#histogramaHH}` → `{etiqueta} {detalleMeses} {total}` | array | RESUMEN NUMÉRICO de `contextoIA.ts` usado directo. `detalleMeses` = `"2026-06: 240 · 2026-07: 120"` (incluir `valoresPorMes` que hoy se descarta) |
| `{totalHH}` | number | Total del resumen numérico — **misma cifra** que debe citar el alcance |
| `{#cronogramaResumen}` → `{fase} {edt} {actividad} {fechaInicio} {fechaFin} {horasPlan}` | array | Una fila por `ProyectoActividad`, mapeo directo |

### Secciones IA (redacción sobre datos reales)
| Tag | Notas |
|---|---|
| `{objetivo}` | Texto multipárrafo (requiere `linebreaks: true`) |
| `{alcanceGeneral}` | Ídem. Inyectar **`cliente.direccion`** al contexto (quick win #1) — la dirección correcta ya existe en BD (`/comercial/clientes/cli-import-1769535277176-...`) |
| `{#tieneUbicacion}` + `{ubicacionProyecto}` | 🆕 flag + string desde `cliente.direccion` o `ProyectoTdrAnalisis.ubicacionDetectada`. Dato mostrado explícito, no solo dentro de la prosa de IA |
| `{#alcanceDetallado}` → `{numeracion} {edtNombre} {faseNombre} {descripcion}` + `{#subItems}` → `{numeracion} {actividadNombre} {descripcion}` + `{#tareas}` → `{texto}` + `{#imagenes}` → `{%img} {caption}` (anidado DENTRO de cada tarea) + `{#imagenesSubItem}` → `{%img} {caption}` (después de `{/tareas}`, mismo nivel del subItem) + `{#tienePersonalRequerido}...{/tienePersonalRequerido}` (envuelve la línea introductoria fija + `{#personalRequerido}` → `{cantidad} {cargo}`) + `{#imagenes}` → `{%img} {caption}` (a nivel EDT) | ✅ implementado (Bloque 4, Tarea 1/4; `{#tareas}` Bloque 4.2, Tarea 4; `{#imagenes}` por tarea, `{#imagenesSubItem}` y `{#tienePersonalRequerido}` Bloque 4.2 sesión 2, Tareas 0/3/4/micro-fix). Estructura/numeración/`personalRequerido`/`imagenes`/`imagenesSubItem`/`tareas` **100% servidor, cero IA**; IA solo redacta `descripcion` y el `texto` (viñeta) de cada tarea. `numeracion` es incremental real (`11.1`, `11.1.1`, `11.1.2`, `11.2`, ...), nunca repetida entre subItems consecutivos. `personalRequerido`/`tareas` solo existen en EDTs de fase EJECUCIÓN con EDT CON/CMN (ver `{tipoDetalle}` más abajo); en el resto llegan como array vacío. `tareas` = las tareas reales del cronograma de esa actividad, como viñetas operativas de 1 línea (fallback = nombre de la tarea) — `[]` en subItems de EDTs `resumido`. Los tres niveles de imagen (EDT/subItem/tarea) son mutuamente excluyentes por diseño — ver sección "Imagen" abajo |
| `{#eppBasico}` / `{#eppRiesgoEspecifico}` / `{#eppBioseguridad}` → `{nombre} {norma}` | Catálogo + selección IA. `{#hayEppBioseguridad}` 🆕 boolean = `eppBioseguridad.length > 0` (resuelve el "título vacío" §4.4) |
| `{#equipos}` / `{#herramientas}` / `{#materiales}` → `{nombre} {cantidad}` | Mixto cotización + IA |
| `{#restricciones}` → `{texto}` | Catálogo + selección IA. ⚠️ **`{categoria}` ya NO se renderiza** (2026-07-15): la plantilla imprimía `[{categoria}] {texto}` con corchetes literales, y `categoria` es un enum interno (`AUTORIZACION`, `EPP`, `ALTURA`…) que se filtraba al documento del cliente. El dataBag sigue enviando `categoria` (`construirDataBag.ts:354`) — queda como clave no consumida. Para reponerla como etiqueta legible hace falta un mapa `categoria → label` en código (hoy no existe en el repo; `RestriccionesView.tsx` también muestra el enum crudo) |

### Imagen
| Tag | Notas |
|---|---|
| `{%organigramaPng}` | Va en **Anexo A** (como los manuales). Mantiene `generarOrganigramaPng.ts` + ImageModule; tamaño fijo 600×400px, string base64 plano |
| `{#imagenes}` → `{%img} {caption}` a nivel EDT (dentro de `{#alcanceDetallado}`, después de `{/subItems}`) | ✅ implementado (Bloque 4, Tarea 4). Imágenes adjuntas por el usuario en la UI del editor (`GaleriaImagenesAlcance.tsx`, sin `tareaRef`/`subItemRef`), **nunca pasan por IA**. Solo EDTs de fase EJECUCIÓN pueden tener imágenes propias (hasta 10, subidas propias o traídas del catálogo global — Bloque 4.2, Tarea 6). Cada imagen: `{%img}` es un objeto `{data, width, height}` ya resuelto server-side (base64 + dimensiones reales leídas con `sharp`, ver `resolverImagenesAlcance.ts`) — se limita a **~15cm de ancho (566px)** preservando el aspecto real. `{caption}` es texto editable, default = nombre del EDT. Imagen inaccesible en Drive → placeholder 1×1 transparente + warning en consola, **nunca rompe el export**. Array vacío en EDTs sin imágenes o de otras fases |
| `{#imagenes}` → `{%img} {caption}` por TAREA (anidado dentro de `{#tareas}`, intercalado después de cada viñeta) | ✅ implementado (Bloque 4.2 sesión 2, Tarea 3). Misma mecánica y componente (`GaleriaImagenesAlcance.tsx` con prop `tareaRef`) que a nivel EDT — **exactamente uno de `edtRef`-solo / `subItemRef` / `tareaRef` por imagen** (invariante de `PlanTrabajoImagen`, nunca los tres a la vez). `{caption}` default = **nombre corto de la tarea del cronograma** (`tarea.nombre`), NO la viñeta redactada por IA (`tarea.texto`). Array vacío en tareas sin imágenes |
| `{#imagenesSubItem}` → `{%img} {caption}` por SUBITEM (dentro de `{#subItems}`, DESPUÉS de `{/tareas}`, antes de `{/subItems}`) | ✅ implementado (Bloque 4.2 sesión 2, micro-fix). Tag propio (no `{#imagenes}`) para no colisionar con el loop anidado dentro de cada tarea — la plantilla v6 soporta así los tres niveles del modelo (`edtRef` / `subItemRef` / `tareaRef`) sin ambigüedad. Mismo componente (`GaleriaImagenesAlcance.tsx`, sin `tareaRef`) y mismo filtro que antes (`subItemRef` sin `tareaRef`) — es el nivel más usado para fotos generales del área/actividad. `{caption}` default = nombre de la actividad. Array vacío en subItems sin imágenes propias |
| `{#tieneHistogramaEquipoPng}` → `{%histogramaEquipoPng}` / `{#tieneHistogramaHHPng}` → `{%histogramaHHPng}` (sección 13, encima de cada tabla) | ✅ implementado (Bloque 4.2, Tarea 3). Gráficos de barras compuestos a mano en SVG y rasterizados a PNG con `sharp` (`generarHistogramaPng.ts`) desde los MISMOS datos deterministas de `histogramas` (Etapa 1) — **nunca de IA**. `tieneHistograma*Png` en `false` (sin datos suficientes) hace que Docxtemplater no renderice el bloque condicional; las tablas existentes se mantienen debajo del gráfico en ambos casos |

### Notas de implementación — Bloque 4 / 4.2

- **`tipoDetalle`** (`'detallado' | 'resumido'`) es un campo interno de `PlanAlcanceDetalladoEdt` que controla la profundidad de redacción de la IA (1 frase por EDT `resumido` vs. 2-4 frases + `subItems`/`tareas`/`personalRequerido`/`imagenes` en EDTs `detallado` = fase EJECUCIÓN con EDT CON/CMN). **No se expone como tag en la plantilla** — es editable desde la UI (`AlcanceDetalladoEditor.tsx`) para casos borde donde la clasificación automática no aplica.
- Las **horas-hombre por fase** que cita `{alcanceGeneral}` (redactado por IA) se inyectan como hecho inmutable en el bloque `HECHOS YA RESUELTOS (ETAPA 1)` que recibe el prompt — no es un tag de la plantilla, pero garantiza que la cifra que menciona la prosa coincida con `{#histogramaHH}`/`{totalHH}` (cambio #4 del checklist).
- **`fotoSugerida`** (por subItem, Bloque 4.2, Tarea 5; por tarea, Bloque 4.2 sesión 2, Tarea 2) es solo para la UI (hint "📷 Foto sugerida: ..." cuando el subItem/tarea tiene 0 imágenes, editable a mano) — **NUNCA llega a `construirDataBag.ts` ni a la plantilla**, confirmado por test explícito en ambos niveles. La IA la redacta en la MISMA llamada Sonnet del detalle del EDT (junto con `descripcion`/`texto`), con validación estructural por id igual que el resto de campos por tarea.
- **`tienePersonalRequerido`** (Bloque 4.2 sesión 2, Tarea 0/4) = `personalRequerido.length > 0`, calculado 100% en `construirDataBag.ts` (cero IA). Controla el bloque condicional `{#tienePersonalRequerido}` que envuelve la línea introductoria fija ("Para el desarrollo de los trabajos se necesitará la intervención del siguiente personal:") + el loop `{#personalRequerido}` — con el flag en `false` desaparece el bloque COMPLETO (línea y lista), no solo la lista.
- **Biblioteca de imágenes** (Bloque 4.2, Tarea 6): catálogo global (`CatalogoImagen`, `/catalogo/imagenes` en el sidebar) en una subcarpeta propia del mismo Drive compartido. Al adjuntar una imagen del catálogo a un plan, se crea un `PlanTrabajoImagen` que **referencia el mismo `driveFileId`** (nunca duplica el archivo) — por eso el export no cambia: `resolverImagenesAlcance.ts` resuelve por `driveFileId` sin importar si la imagen fue subida directamente o viene del catálogo.

---

## 3. Reglas Docxtemplater usadas (para quien edite la plantilla)

- **Loops de fila de tabla:** `{#items}` abre en la primera celda y `{/items}` cierra en la última celda de la MISMA fila → la fila se repite por elemento.
- **Loops de bloque (párrafos):** `{#items}` y `{/items}` en párrafos propios; requiere `paragraphLoop: true`.
  - ⚠️ **Esta regla es estructural, no de estilo, y romperla FALLA EN SILENCIO.** Docxtemplater activa `paragraphLoop` sólo si `isEnclosedByParagraphs()` da true, es decir si `{#tag}` es el ÚNICO contenido de su párrafo. Si el tag se fusiona con el contenido (`{#tag}{campo}` en el mismo párrafo), el loop igual funciona y el docx abre perfecto — pero el `<w:pPr>` (viñeta `<w:numPr>`, sangría, estilo) **no se clona en las iteraciones 2+**: sale el primer ítem con viñeta y el resto sin. No hay error, ni warning, ni lo detecta el `nullGetter` estricto.
  - Ocurrió en 3 loops a la vez (`{#referencias}`, `{#restricciones}`, `{#definicionesEspecificas}`) y llegó a producción; se corrigió el 2026-07-15. Los loops de FILA de tabla son la excepción y no aplican: ahí `{#tag}` va fusionado en la primera celda, que es lo correcto (`{#revisiones}`, `{#personalAsignado}`, `{#matrizRaci}`, `{#histogramaEquipo}`, `{#histogramaHH}`, `{#cronogramaResumen}`).
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
11. (Bloque 4.2 sesión 2) Un subItem CON personalRequerido exporta la línea introductoria + la lista completa; un subItem SIN personalRequerido no exporta ni la línea ni la lista (bloque `{#tienePersonalRequerido}` completo ausente) — cubierto por `exportDocx.test.ts`.
12. (Bloque 4.2 sesión 2) Una tarea con imágenes las exporta intercaladas después de su propia viñeta (dentro de `{#tareas}/{#imagenes}`), y esas imágenes NO aparecen en el array de imágenes del subItem que la contiene — cubierto por `construirDataBag.test.ts`.
13. (Bloque 4.2 sesión 2) `fotoSugerida` de tarea (igual que la de subItem) nunca llega al dataBag ni al docx — solo hint de UI — cubierto por `construirDataBag.test.ts`.
14. (Bloque 4.2 sesión 2, micro-fix) Una imagen de subItem exporta dentro de `{#imagenesSubItem}` (nunca dentro de `{#imagenes}` de una tarea ni del EDT) y viceversa — los tres niveles (EDT/subItem/tarea) nunca se mezclan — cubierto por `construirDataBag.test.ts`.
