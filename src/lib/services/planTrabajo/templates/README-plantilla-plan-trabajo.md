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

Leyenda de estado: ✅ ya existe en `construirDataBag.ts` (según informe) · 🆕 clave nueva a agregar · 🔧 existe pero cambia de forma.

### Cabecera y carátula (BD, sin IA)
| Tag | Tipo | Estado | Fuente |
|---|---|---|---|
| `{ordenCompra}` | string | ✅/🆕 verificar | `Proyecto` / cabecera del plan |
| `{nombreProyecto}` | string | ✅ | `Proyecto.nombre` |
| `{codigoDocumento}` | string | ✅ | Cabecera (migrar a derivación por regla, cambio #9) |
| `{numeroConsultor}` | string | 🆕 | Nuevo campo de cabecera (constante GYS: `1092538` o por cliente) |
| `{revision}` | string | ✅ | Cabecera |
| `{#revisiones}` → `{rev} {te} {descripcion} {des} {ver} {apr} {aut} {fecha}` | array | 🔧 | Hoy 1 elemento; poblar histórico desde `PlanTrabajoGeneracion` (cambio #7) |
| `{#firmantes}` → `{siglas} {nombre}` | array | 🆕 | Derivar de des/ver/apr/aut únicos de `revisiones` |

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
| `{#alcanceDetallado}` → `{numeracion} {edtNombre} {faseNombre} {descripcion}` + `{#subItems}` (anidado) + `{#personalRequerido}` → `{cantidad} {cargo}` | Estructura/numeración por código (cambio #17); IA solo `descripcion` |
| `{#eppBasico}` / `{#eppRiesgoEspecifico}` / `{#eppBioseguridad}` → `{nombre} {norma}` | Catálogo + selección IA. `{#hayEppBioseguridad}` 🆕 boolean = `eppBioseguridad.length > 0` (resuelve el "título vacío" §4.4) |
| `{#equipos}` / `{#herramientas}` / `{#materiales}` → `{nombre} {cantidad}` | Mixto cotización + IA |
| `{#restricciones}` → `{categoria} {texto}` | Catálogo + selección IA |

### Imagen
| Tag | Notas |
|---|---|
| `{%organigramaPng}` | Va en **Anexo A** (como los manuales). Mantener `generarOrganigramaPng.ts` + ImageModule; agregar try/catch visible en `BotonExportarDocx.tsx` (§4.6) |

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
