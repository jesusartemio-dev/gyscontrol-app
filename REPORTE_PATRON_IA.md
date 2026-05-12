# REPORTE — Patrón de IA en TDR y MatrizComunicacion
## Para implementar en módulo Plan de Trabajo

> Generado el 2026-05-08. Análisis de lectura directa del código fuente.

---

## 1. PROVEEDOR DE IA Y CLIENTE

**Proveedor:** Anthropic (`@anthropic-ai/sdk: ^0.74.0`)
**No hay wrapper propio:** Se instancia directamente `new Anthropic({ apiKey })`.

**Dos patrones de instanciación según módulo:**

- **TDR (`analizar-pdf/route.ts` línea 197):** La instancia se crea dentro del handler, tomando la API key en tiempo de ejecución:
  ```ts
  // src/app/api/proyecto/[id]/tdr-analisis/analizar-pdf/route.ts:197
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
  }
  const client = new Anthropic({ apiKey })
  ```

- **Matriz (`matriz-comunicacion/route.ts` línea 12):** La instancia es un singleton a nivel de módulo:
  ```ts
  // src/app/api/proyectos/[id]/matriz-comunicacion/route.ts:12
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  ```

**Selector de modelos centralizado:** `src/lib/agente/models.ts`

```ts
export const MODELS = {
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku:  'claude-haiku-4-5-20251001',
}
```

| Task ID | Modelo default | Override ENV |
|---|---|---|
| `chat` | Sonnet | `AI_CHAT_MODEL` |
| `chat-simple` | Haiku | `AI_CHAT_SIMPLE_MODEL` |
| `pdf-extraction` | Haiku | `AI_EXTRACT_MODEL` |
| `excel-extraction` | Haiku | `AI_EXTRACT_MODEL` |
| `ocr` | Haiku | `AI_OCR_MODEL` |
| `ssoma-iperc` | Sonnet | `AI_SSOMA_IPERC_MODEL` |
| `ssoma-document` | Sonnet | `AI_SSOMA_DOCUMENT_MODEL` |
| `ssoma-epp` | Haiku | `AI_SSOMA_EPP_MODEL` |

**Variables de entorno:**
```
ANTHROPIC_API_KEY="sk-ant-..."          # REQUERIDA
AI_CHAT_MODEL=...                        # Opcional — override del modelo de chat
AI_EXTRACT_MODEL=...                     # Opcional — override del modelo de extracción
AI_OCR_MODEL=...                         # Opcional — override del modelo OCR
AGENTE_LIMITE_MENSUAL_USD=25            # Opcional — límite mensual (default 25 USD)
```

**Timeouts:** El endpoint TDR define `export const maxDuration = 300` (línea 12) — configura Vercel para esperar hasta 5 minutos. La Matriz NO define `maxDuration` — usa el default del plan (generalmente 10-60 s en Vercel Free/Pro).

**Sin retries propios:** Ambos módulos dejan que el SDK de Anthropic maneje los reintentos automáticos internos.

**Feature flags (verificar antes de cada llamada):**
```ts
// src/lib/agente/featureFlags.ts:74
export async function isIAFeatureEnabled(feature: keyof IAFeatureFlags): Promise<boolean>
// Flags relevantes: 'analisisTdr', 'matrizComunicacion'
```

---

## 2. PATRÓN DE GENERACIÓN — TDR

**Endpoint:** `POST /api/proyecto/[id]/tdr-analisis/analizar-pdf`
**Archivo:** `src/app/api/proyecto/[id]/tdr-analisis/analizar-pdf/route.ts`

### Contexto de entrada

El usuario sube un PDF vía `FormData`. No se lee contexto adicional del proyecto. El PDF completo se envía como `base64` directamente a Claude.

```ts
const formData = await request.formData()
const file = formData.get('file') as File | null
// Validaciones: type='application/pdf', size <= 20MB
const arrayBuffer = await file.arrayBuffer()
const base64Data = Buffer.from(arrayBuffer).toString('base64')
```

### Pipeline en 2 fases (secuencial)

**FASE 1 — Lectura del PDF con Haiku (`pdf-extraction`):**
- Modelo: `claude-haiku-4-5-20251001`
- `max_tokens`: 4096
- Input: El PDF como `document` (base64) + `PDF_SUMMARY_PROMPT`
- Output: texto libre resumido (no JSON)

```ts
// src/app/api/proyecto/[id]/tdr-analisis/analizar-pdf/route.ts:207-222
const pdfResponse = await client.messages.create({
  model: haikuModel,
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
      },
      { type: 'text', text: PDF_SUMMARY_PROMPT },
    ],
  }],
})
```

**FASE 2 — Conversión a JSON estructurado con Sonnet (`chat`):**
- Modelo: `claude-sonnet-4-5-20250929`
- `max_tokens`: 8192
- System: `JSON_EXTRACTION_SYSTEM` + `JSON_EXTRACTION_SCHEMA` (ambos con `cache_control: { type: 'ephemeral' }`)
- Input: El texto libre producido por Haiku en Fase 1
- Output: JSON válido con el esquema completo del TDR

```ts
// src/app/api/proyecto/[id]/tdr-analisis/analizar-pdf/route.ts:243-260
const jsonResponse = await client.messages.create({
  model: sonnetModel,
  max_tokens: 8192,
  system: [
    { type: 'text', text: JSON_EXTRACTION_SYSTEM, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: JSON_EXTRACTION_SCHEMA, cache_control: { type: 'ephemeral' } },
  ],
  messages: [{
    role: 'user',
    content: `Extrae los datos de este resumen de TDR:\n\n${textSummary}`,
  }],
})
```

### Validación del JSON

`parseJsonResponse()` (líneas 102-129) — intenta 3 estrategias en orden:
1. `JSON.parse(texto.trim())`
2. Extrae del bloque markdown ` ```json ... ``` `
3. Busca el primer `{` y último `}` en el texto

Si falla las 3 → emite `event: error` al SSE y aborta.

### Respuesta al cliente (SSE)

Retorna `ReadableStream` con `Content-Type: text/event-stream`. Emite:

```
event: status
data: {"fase":"leyendo","mensaje":"Leyendo PDF (N pág.)…"}

event: status
data: {"fase":"extrayendo","mensaje":"Extrayendo datos estructurados…"}

event: status
data: {"fase":"guardando","mensaje":"Guardando análisis…"}

event: done
data: {"analisis": { ...ProyectoTdrAnalisis completo... }}

event: error
data: {"mensaje":"El mensaje de error"}
```

### Persistencia

1. Busca `ProyectoTdrAnalisis` por `proyectoId` — si no existe, lo crea con datos vacíos
2. Actualiza con `ALLOWED_AI_FIELDS` (19 campos) filtrados del JSON extraído
3. Calcula completitud con `calcularCompletitudGeneral()` y actualiza `bloquesCompletitud`

```ts
// src/app/api/proyecto/[id]/tdr-analisis/analizar-pdf/route.ts:303
for (const field of ALLOWED_AI_FIELDS) {
  if (extracted[field] !== undefined) {
    updateData[field] = extracted[field]
  }
}
```

---

## 3. PATRÓN DE GENERACIÓN — MATRIZ

**Endpoint:** `POST /api/proyectos/[id]/matriz-comunicacion` con body `{ generarConIA: true }`
**Archivo:** `src/app/api/proyectos/[id]/matriz-comunicacion/route.ts`

### Contexto de entrada (rico, del proyecto)

El handler recopila **tres fuentes** antes de llamar a IA:

1. **Proyecto:** nombre, código, cliente
2. **Organigrama:** `orgNodos` con usuarios, cargos, empresa, teléfono — deduplicado por `userId`
3. **EDTs:** `proyectoEdt` con nombre y fase, hasta 60 registros, deduplicados por nombre

```ts
// src/app/api/proyectos/[id]/matriz-comunicacion/route.ts:62-105
const proyecto = await prisma.proyecto.findUnique({
  where: { id: proyectoId },
  select: {
    id: true, nombre: true, codigo: true,
    cliente: { select: { nombre: true } },
    orgNodos: {
      where: { userId: { not: null } },
      orderBy: { orden: 'asc' },
      select: {
        userId: true, cargoLabel: true, empresaOverride: true,
        telefonoOverride: true, cipOverride: true,
        user: { select: { name: true, email: true, empleado: true } }
      }
    },
  },
})
const proyectoEdtsRaw = await prisma.proyectoEdt.findMany({
  where: { proyectoId },
  include: { proyectoFase: { select: { nombre: true, orden: true } } },
  orderBy: [{ proyectoFase: { orden: 'asc' } }, { orden: 'asc' }],
  take: 60,
})
```

### Llamada a Claude

- Modelo: `getModelForTask('ssoma-document')` → Sonnet
- `max_tokens`: 4096
- **Sin streaming** — espera la respuesta completa

```ts
// src/app/api/proyectos/[id]/matriz-comunicacion/route.ts:148-153
response = await anthropic.messages.create({
  model: modelo,
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
})
```

### Validación del JSON

Strip de backtick markdown + `JSON.parse()` directo. Acepta `{ filas: [...] }` o directamente `[...]`:

```ts
const raw = response.content[0].type === 'text' ? response.content[0].text : ''
const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
const parsed = JSON.parse(text)
const filas: MatrizFilaIA[] = Array.isArray(parsed) ? parsed : (parsed.filas ?? [])
```

### Persistencia

Crea `MatrizComunicacion` + todas las `MatrizComunicacionFila` en una sola operación nested:

```ts
const matriz = await prisma.matrizComunicacion.create({
  data: {
    proyectoId,
    generadoConIA,
    ...(filasData.length > 0 && { filas: { create: filasData } }),
  },
  include: { filas: { orderBy: { orden: 'asc' } } },
})
```

Los `celdas` se almacenan como JSON string en `receptores`:
```ts
filasData = filas.map(f => ({
  orden: f.orden,
  informacion: f.edtNombre,
  emisor: '',
  receptores: JSON.stringify(f.celdas),  // CeldaIA[] → JSON string
  medio: f.medio,
  frecuencia: f.frecuencia,
  formato: '',
  notas: null,
}))
```

**Diferencia clave con TDR:** La Matriz NO usa streaming — la respuesta se envía toda de una vez (status 201). No hay `maxDuration`. Esto puede causar timeout en proyectos grandes.

---

## 4. REGENERACIÓN POR SECCIÓN

### TDR: infraestructura lista, NO conectada en UI del proyecto

Existe preparación arquitectónica:

**`src/lib/tdr/extraccionPorBloque.ts`** define `INSTRUCCIONES_POR_BLOQUE` con instrucciones específicas para cada uno de los 8 bloques:

```ts
// src/lib/tdr/extraccionPorBloque.ts:14
export const INSTRUCCIONES_POR_BLOQUE: Record<BloqueId, string> = {
  identificacion: `Extrae los datos de identificación...`,
  alcance:        `Extrae los datos de alcance...`,
  suministros:    `Extrae los suministros mencionados...`,
  personal:       `Extrae los requerimientos de personal...`,
  plazos:         `Extrae la información de plazos...`,
  ssoma:          `Extrae los requisitos de SSOMA...`,
  comercial:      `Extrae los datos comerciales...`,
  entregables:    `Extrae los entregables...`,
}
```

Cada componente `BloqueXxx` acepta `onExtraerConIA?: () => Promise<void>` prop. El componente `BloqueAccionesIA` tiene el botón "Extraer con IA" pero `disabled={!onExtraerConIA}` — **siempre deshabilitado** porque la prop no se pasa en `page.tsx` del módulo proyecto.

El endpoint `POST /api/proyecto/[id]/tdr-analisis/extraer-bloque` **no existe** — está pendiente de implementar.

### Matriz: no existe regeneración parcial

El flujo es: "Eliminar y regenerar" (DELETE + POST con `generarConIA: true`). No hay endpoint de regeneración por sección.

---

## 5. PROMPTS Y SYSTEM MESSAGES

### TDR — Prompts inline en el handler

**Ubicación:** `src/app/api/proyecto/[id]/tdr-analisis/analizar-pdf/route.ts` (líneas 18–88)

**`PDF_SUMMARY_PROMPT`** (para Haiku, Fase 1):
```
Extrae una síntesis completa y estructurada de este documento TDR/especificación técnica.

Incluye TODOS los detalles en los siguientes apartados (en español):

CLIENTE Y PROYECTO: nombre del cliente, nombre/código del proyecto, ubicación geográfica.

ALCANCE Y REQUERIMIENTOS: descripción del alcance, lista completa de requerimientos técnicos con criticidad (alta/media/baja), sistemas solicitados, cantidades y especificaciones.

EQUIPOS Y MATERIALES: equipos identificados con nombre, cantidad, especificación, precio estimado si se menciona, quién los suministra (contratista/cliente), marcas sugeridas.

SERVICIOS TÉCNICOS: servicios de ingeniería, programación, comisionamiento, etc. con horas estimadas.

PERSONAL REQUERIDO: roles, cantidad mínima, años de experiencia, certificaciones requeridas, si es obligatorio.

CRONOGRAMA Y PLAZOS: fases del proyecto con duración, hitos contractuales (KOM/FAT/SAT/comisionamiento/as-built) con fechas o días desde inicio.

SSOMA Y NORMAS: normas aplicables (código + nombre + categoría), documentos previos requeridos antes del inicio (con días de anticipación y responsable), riesgos críticos identificados.

CONDICIONES COMERCIALES: presupuesto estimado (equipos/servicios/gastos/total en USD), penalidades (causa/tipo/valor/tope), garantías (fiel cumplimiento, adelanto, responsabilidad civil, servicio).

ENTREGABLES DEL DOSSIER: documentos a entregar por fase (ingeniería/construcción/cierre) con formato (físico/digital/ambos).

Sé exhaustivo. Incluye todos los detalles técnicos, números, especificaciones y cantidades.
```

**`JSON_EXTRACTION_SYSTEM`** (para Sonnet, Fase 2 — system block con cache):
```
Eres un extractor de datos estructurados de documentos TDR.
Recibes un resumen de texto de un TDR y debes convertirlo a JSON estructurado.
IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON. Sin texto adicional, sin markdown, sin explicaciones.
```

**`JSON_EXTRACTION_SCHEMA`** (para Sonnet, Fase 2 — segundo system block con cache):
```json
Devuelve SOLO este objeto JSON con los datos extraídos del resumen. Usa null para campos no encontrados, [] para listas vacías:

{
  "clienteDetectado": null,
  "proyectoDetectado": null,
  "ubicacionDetectada": null,
  "resumenTdr": "",
  "alcanceDetectado": null,
  "resumenEjecutivoNarrativa": null,
  "resumenEjecutivoPuntos": [],
  "requerimientos": [],
  "equiposIdentificados": [],
  "serviciosIdentificados": [],
  "personalRequerido": [],
  "cronogramaEstimado": [],
  "hitosContractuales": [],
  "normasAplicables": [],
  "documentosPrevios": [],
  "riesgosCriticos": [],
  "presupuestoEstimado": null,
  "penalidades": [],
  "garantias": null,
  "entregablesDossier": []
}
[tipos detallados por campo ...]
```

**Prompts de extracción por bloque:**
`src/lib/tdr/extraccionPorBloque.ts` — 8 prompts individuales por bloque, usados como instrucciones al enviar contexto de texto ya disponible.

### Matriz — Prompt en función builder

**Ubicación:** `src/lib/matrizComunicacion/prompt.ts` — función `buildPromptMatriz(data: MatrizPromptData): string`

El prompt es dinámico: interpola nombre y código del proyecto, lista de personal con siglas/nombre/cargo, lista de EDTs del proyecto, y número exacto de filas esperadas.

Inicia con: `"Eres el Gestor de Proyectos de GYS CONTROL INDUSTRIAL SAC."`

Incluye un **ejemplo JSON embebido** en el prompt para guiar el formato de salida (few-shot).

---

## 6. TIPOS JSON DE LA RESPUESTA

### Tipos TDR — `src/types/tdr.ts` (185 líneas)

```ts
export type Criticidad = 'alta' | 'media' | 'baja'
export type EstadoBloque = 'completo' | 'parcial' | 'vacio'

export interface EquipoIdentificado {
  nombre: string
  cantidad?: number
  especificacion?: string
  estimadoUsd?: number
  suministra?: 'contratista' | 'cliente'
  marcaSugerida?: string
}

export interface ServicioIdentificado {
  nombre: string
  descripcion?: string
  horasEstimadas?: number
}

export interface Requerimiento {
  descripcion: string
  cantidad?: number
  especificacion?: string
  criticidad?: Criticidad
}

export interface PersonalRequerido {
  rol: string
  cantidad: number
  experienciaAnios?: number
  certificaciones?: string[]
  obligatorio: boolean
}

export interface FaseCronograma {
  fase: string
  duracion?: string
  observaciones?: string
}

export interface HitoContractual {
  nombre: string
  tipo: 'kom' | 'fat' | 'sat' | 'comisionamiento' | 'as-built' | 'otro'
  fechaEstimada?: string
  diasDesdeInicio?: number
  entregablesAsociados?: string[]
}

export interface NormaAplicable {
  codigo: string
  nombre: string
  categoria?: 'electrica' | 'mecanica' | 'ssoma' | 'calidad' | 'otro'
}

export interface DocumentoPrevio {
  nombre: string
  diasAnticipacion?: number
  responsable?: 'contratista' | 'cliente'
  obligatorio: boolean
}

export interface RiesgoCritico {
  riesgo: string
  probabilidad?: Criticidad
  impacto?: Criticidad
  mitigacion?: string
}

export interface Penalidad {
  causa: string
  tipo: 'porcentaje-diario' | 'monto-fijo' | 'porcentaje-total'
  valor: number
  topeMaximo?: number
}

export interface Garantias {
  fielCumplimiento?: { porcentaje: number; vigencia: string }
  adelanto?: { porcentaje: number; vigencia: string }
  responsabilidadCivil?: { monto: number; moneda: string }
  servicio?: { duracionMeses: number }
}

export interface EntregableDossier {
  nombre: string
  formato?: 'fisico' | 'digital' | 'ambos'
  fase: 'ingenieria' | 'construccion' | 'cierre'
}

export interface ResumenEjecutivoPunto {
  categoria: 'entregable' | 'ubicacion' | 'plazo' | 'condicion' | 'otro'
  texto: string
}

export interface PresupuestoEstimado {
  equipos?: number
  servicios?: number
  gastos?: number
  total?: number
}

// Tipo core (30+ campos — compartido entre CotizacionTdrAnalisis y ProyectoTdrAnalisis)
export interface TdrAnalisisCore {
  clienteDetectado?: string | null
  proyectoDetectado?: string | null
  ubicacionDetectada?: string | null
  resumenTdr?: string | null
  alcanceDetectado?: string | null
  resumenEjecutivoNarrativa?: string | null
  resumenEjecutivoPuntos?: ResumenEjecutivoPunto[] | null
  requerimientos?: Requerimiento[] | null
  equiposIdentificados?: EquipoIdentificado[] | null
  serviciosIdentificados?: ServicioIdentificado[] | null
  personalRequerido?: PersonalRequerido[] | null
  cronogramaEstimado?: FaseCronograma[] | null
  hitosContractuales?: HitoContractual[] | null
  normasAplicables?: NormaAplicable[] | null
  documentosPrevios?: DocumentoPrevio[] | null
  riesgosCriticos?: RiesgoCritico[] | null
  presupuestoEstimado?: PresupuestoEstimado | null
  penalidades?: Penalidad[] | null
  garantias?: Garantias | null
  entregablesDossier?: EntregableDossier[] | null
  generadoConIA?: boolean
  bloquesCompletitud?: Record<string, EstadoBloque> | null
}
```

### Tipos Matriz — No hay archivo dedicado

Los tipos viven dispersos:

```ts
// src/lib/matrizComunicacion/prompt.ts
export interface MatrizFilaIA {
  orden: number
  edtNombre: string
  frecuencia: string
  medio: string
  celdas: CeldaIA[]
}

export interface CeldaIA {
  siglas: string    // iniciales del responsable (ej: "JR")
  valor: string     // 'E' = Emisor, 'R' = Receptor, '' = sin responsabilidad
}

// Tipos locales de page.tsx:
interface MatrizFila {
  id: string
  orden: number
  informacion: string
  receptores: string    // JSON.stringify(CeldaIA[]) — string TEXT en BD
  medio: string
  frecuencia: string
}

interface Matriz {
  id: string
  proyectoId: string
  version: string
  generadoConIA: boolean
  filas: MatrizFila[]
}
```

**Nota:** `receptores` se persiste como columna `String @db.Text` en Prisma (no `Json`). Requiere `JSON.parse` en cada lectura.

---

## 7. UI DE GENERACIÓN

### TDR — Botón de IA y estados de carga

**Archivo:** `src/app/proyectos/[id]/tdr/page.tsx`

**Estado local:** `analizandoPdf: boolean` + `faseAnalisis: string | null`

```tsx
// src/app/proyectos/[id]/tdr/page.tsx:239-250
<Button onClick={() => inputPdfRef.current?.click()} disabled={analizandoPdf}>
  {analizandoPdf ? (
    <>
      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
      {faseAnalisis ?? 'Analizando…'}
    </>
  ) : (
    <>
      <Upload className="mr-2 h-4 w-4" />
      Analizar PDF con IA
    </>
  )}
</Button>
<input
  ref={inputPdfRef}
  type="file"
  accept=".pdf,application/pdf"
  className="hidden"
  onChange={e => { const file = e.target.files?.[0]; if (file) analizarConIA(file) }}
/>
```

**Lectura del SSE** (líneas 169-199):

```ts
const reader = res.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''
  let event = 'message'
  for (const line of lines) {
    if (line.startsWith('event: ')) { event = line.slice(7).trim() }
    else if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      if (event === 'status') setFaseAnalisis(data.mensaje ?? null)
      else if (event === 'done') { setAnalisis(data.analisis); toast.success('...') }
      else if (event === 'error') toast.error(data.mensaje ?? '...')
    }
  }
}
```

**Mensajes de progreso visibles al usuario:**
- "Leyendo PDF (N pág.)…"
- "Extrayendo datos estructurados…"
- "Guardando análisis…"

**No hay confirmación antes de regenerar** — sobreescribe directamente.

### Matriz — Botón de IA

**Archivo:** `src/app/proyectos/[id]/matriz-comunicacion/page.tsx`

**Estado:** `generating: boolean` (separado de `creating: boolean`)

```tsx
// src/app/proyectos/[id]/matriz-comunicacion/page.tsx:268-275
<Button
  onClick={() => handleCrear(true)}
  disabled={creating || generating}
  className="bg-indigo-600 hover:bg-indigo-700 text-white"
>
  {generating
    ? <><Loader2 className="animate-spin mr-2" size={14} />Generando con IA…</>
    : <><Sparkles size={14} className="mr-2" />Generar con IA</>}
</Button>
```

**Sin SSE.** El spinner aparece durante la espera síncrona del `fetch`. Si la API tarda más del timeout de Vercel, el request fallará silenciosamente.

**Badge distintivo en la Matriz generada con IA:**
```tsx
{matriz.generadoConIA && (
  <span className="ml-2 text-indigo-500"><Sparkles size={10} /> IA</span>
)}
```

---

## 8. COSTOS Y LÍMITES

### Tracking de uso en BD

**Tabla Prisma:** `AgenteUsage` → mapeada a `agente_usage`
**Archivo helper:** `src/lib/agente/usageTracker.ts`

```prisma
model AgenteUsage {
  id                  String   @id
  userId              String
  conversacionId      String?
  tipo                String   // 'tdr-proyecto-pdf-lectura' | 'tdr-proyecto-pdf-extraccion' | 'matriz-comunicacion' | ...
  modelo              String
  tokensInput         Int
  tokensOutput        Int
  tokensCacheCreation Int      @default(0)
  tokensCacheRead     Int      @default(0)
  costoEstimado       Float    // USD calculado
  duracionMs          Int?
  metadata            Json?    // { fileName, proyectoId, pages, edtsTotal, personalTotal }
  createdAt           DateTime
}
```

**Tipos de registro en TDR:**
- `tipo: 'tdr-proyecto-pdf-lectura'` — llamada Haiku (Fase 1)
- `tipo: 'tdr-proyecto-pdf-extraccion'` — llamada Sonnet (Fase 2)

**Tipo de registro en Matriz:** `tipo: 'matriz-comunicacion'`

**Cálculo de costo** (`src/lib/agente/usageTracker.ts:14-35`):

```ts
const MODEL_COSTS = {
  'claude-sonnet-4-5-20250929': { input: 3.0,  output: 15.0 },  // USD/M tokens
  'claude-haiku-4-5-20251001':  { input: 0.80, output:  4.0 },
}
// Formula:
const costo = (
  inputTokens    * costs.input  +
  cacheCreation  * costs.input  * 1.25 +
  cacheRead      * costs.input  * 0.10 +
  outputTokens   * costs.output
) / 1_000_000
```

**Límite mensual:** `configuracionGeneral.agenteLimiteMensualUsd` (BD) o `AGENTE_LIMITE_MENSUAL_USD` (env). Default: $25 USD/mes.

**La Matriz registra tanto éxito como errores** (`trackUsageError` en el catch del `anthropic.messages.create`).

**El TDR Fase 2 usa prompt caching de Anthropic** — el system prompt (JSON schema) se cachea con `cache_control: { type: 'ephemeral' }`, reduciendo costos ~90% en llamadas repetidas.

**Rate limiting:** No implementado en código. Depende de los límites de la cuenta Anthropic.

---

## 9. EDICIÓN POSTERIOR DEL CONTENIDO GENERADO

### TdrEditableTable — Componente genérico reutilizable

**Archivo:** `src/components/tdr/TdrEditableTable.tsx`

```ts
export interface ColumnaTabla<T> {
  key: keyof T
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean'
  options?: Array<{ value: string; label: string }>
  required?: boolean
  width?: string
  placeholder?: string
}

interface Props<T extends object> {
  data: T[]
  columns: ColumnaTabla<T>[]
  filaVacia: () => T
  onSave: (data: T[]) => Promise<void>
  onCancel: () => void
}
```

**Flujo de guardado:** usuario edita en tabla → `setFilas()` local → click "Guardar cambios" → `onSave(filas)` → `PATCH /api/proyecto/[id]/tdr-analisis` con el campo completo reemplazado → el endpoint recalcula `bloquesCompletitud`.

**Edición de `equiposIdentificados`** (`src/components/tdr/bloques/BloqueSuministros.tsx:134-151`):

```tsx
<TdrEditableTable<EquipoIdentificado>
  data={equipos}
  columns={[
    { key: 'nombre',       label: 'Nombre',        type: 'text',   required: true },
    { key: 'cantidad',     label: 'Cantidad',       type: 'number', width: '100px' },
    { key: 'especificacion', label: 'Especificación', type: 'text' },
    { key: 'estimadoUsd', label: 'Estimado USD',   type: 'number', width: '120px' },
    { key: 'suministra',  label: 'Suministra',     type: 'select', options: SUMINISTRA_OPTS },
    { key: 'marcaSugerida', label: 'Marca',         type: 'text' },
  ]}
  filaVacia={() => ({ nombre: '' })}
  onSave={async filas => {
    setEquipos(filas)
    await onGuardar({ equiposIdentificados: filas, serviciosIdentificados: servicios })
    handleClose()
  }}
  onCancel={handleClose}
/>
```

**Patrón de edición en bloques TDR:**
- Todos los `BloqueXxx` usan `Sheet` (panel lateral) de shadcn/ui para la edición
- `TdrEditableTable` para arrays (equipos, servicios, personal, normas, etc.)
- Inputs simples para campos escalares (cliente, resumen, etc.)
- El botón "Editar" y el botón "Extraer con IA" coexisten en `TdrBloqueCard`

**Edición de Matriz:** Inline en cada fila de la tabla, con `<select>` nativos para frecuencia/medio e `<input>` para celdas de responsabilidad. Guarda vía `PATCH /api/proyectos/[id]/matriz-comunicacion/filas/[filaId]`.

---

## 10. RECOMENDACIONES PARA PLAN DE TRABAJO

### A) ¿Cuál patrón imitar?

**Imitar el patrón TDR (con SSE), NO el de Matriz.**

Razones:
- La Matriz no tiene `maxDuration` → puede timeout en proyectos con muchos EDTs/personal
- El TDR con SSE da feedback de progreso al usuario (muestra en qué fase va)
- El pipeline de 2 fases es más robusto y económico para contenido extenso
- Para un "Plan de Trabajo" el contexto puede ser muy grande; SSE es esencial

**Estructura de archivos recomendada:**
```
src/app/api/proyecto/[id]/plan-trabajo/
  route.ts                    # GET / POST / PATCH / DELETE
  generar-ia/
    route.ts                  # POST — SSE stream (imitar analizar-pdf/route.ts)
src/lib/planTrabajo/
  completitud.ts              # (imitar src/lib/tdr/completitud.ts)
  prompt.ts                   # Prompts inline o exportados
  extraccionPorSeccion.ts     # (imitar src/lib/tdr/extraccionPorBloque.ts)
src/types/planTrabajo.ts      # (imitar src/types/tdr.ts — centralizar desde el inicio)
src/components/planTrabajo/
  bloques/                    # Un componente por sección
src/app/proyectos/[id]/plan-trabajo/
  page.tsx
```

**Agregar el feature flag:**
```ts
// src/lib/agente/featureFlags.ts
planTrabajo: boolean   // nuevo flag
```

**Agregar el task en `models.ts`:**
```ts
'plan-trabajo': MODELS.sonnet,  // contexto complejo → Sonnet
```

### B) Deuda técnica a evitar en Plan de Trabajo

1. **`BloqueAccionesIA` siempre deshabilitado en proyecto:** La prop `onExtraerConIA` nunca se conecta en `page.tsx` del módulo proyecto. Implementar el endpoint `POST /api/proyecto/[id]/plan-trabajo/regenerar-seccion` Y conectar la prop desde el inicio.

2. **Tipos de Matriz dispersos:** No hay `src/types/matrizComunicacion.ts`. Los tipos `MatrizFilaIA` y `CeldaIA` viven en `prompt.ts` y los de página en `page.tsx`. Para Plan de Trabajo, centralizar todo en `src/types/planTrabajo.ts`.

3. **`receptores` como JSON string en BD:** La Matriz usa `String @db.Text` (no `Json`). Para Plan de Trabajo, usar directamente columna `Json` de Prisma donde sea apropiado.

4. **Sin `maxDuration` en Matriz:** Agregar `export const maxDuration = 300` al endpoint del Plan de Trabajo.

5. **Sin SSE en Matriz:** Migrar al patrón SSE con progreso para el Plan de Trabajo desde el inicio.

### C) Cómo manejar el contexto grande del proyecto

Para Plan de Trabajo el contexto no viene de un PDF sino de la BD. Estrategia recomendada:

1. **Recopilar datos de BD** (como hace Matriz, pero más amplio): proyecto + cliente + equipo directivo + EDTs + actividades del cronograma de planificación + nodos del organigrama + campos del TDR (`equiposIdentificados`, `personalRequerido`, `normasAplicables`, `hitosContractuales`)
2. **Serializar como texto estructurado** en el prompt: fechas, duraciones, responsables con nombres
3. **Una sola llamada a Sonnet** con `max_tokens` alto (8192-16000)
4. **Usar `cache_control: { type: 'ephemeral' }`** en el system prompt con el esquema JSON de salida — reduce costos ~90% en llamadas repetidas (exactamente como hace TDR Fase 2)
5. **Añadir SSE** para dar feedback: "Recopilando datos…", "Generando plan…", "Guardando…"
6. Si el contexto supera ~100k tokens: usar pipeline de 2 fases (Haiku resume → Sonnet estructura)

### D) Patrón de regeneración por sección

Implementar lo que TDR tiene preparado pero no activado:

1. En `src/lib/planTrabajo/extraccionPorSeccion.ts`: definir `INSTRUCCIONES_POR_SECCION: Record<SeccionId, string>` con instrucciones específicas por sección del plan
2. Endpoint `POST /api/proyecto/[id]/plan-trabajo/regenerar-seccion`: recibe `{ seccion: SeccionId }`, construye prompt con datos actuales del proyecto + instrucciones de la sección, llama a Claude, devuelve solo los campos de esa sección
3. En cada componente de sección: prop `onRegenerarConIA?: () => Promise<void>` **conectada desde `page.tsx` desde el inicio** (no dejarlo pendiente como TDR)
4. La llamada puede ser más barata: Haiku para secciones simples, Sonnet para cronograma/riesgos

---

## RESUMEN EJECUTIVO

1. **Proveedor único: Anthropic SDK** (`@anthropic-ai/sdk`). Sin wrapper. API key en `ANTHROPIC_API_KEY`. Selector de modelos centralizado en `src/lib/agente/models.ts`.

2. **Dos modelos en uso:** Haiku (barato, rápido) para extracción/OCR; Sonnet (potente) para razonamiento estructurado y generación. Configurables por task con env var de override.

3. **TDR usa pipeline de 2 fases + SSE:** Haiku lee el PDF → Sonnet estructura en JSON. El cliente consume Server-Sent Events mostrando progreso en tiempo real. El endpoint define `maxDuration = 300`.

4. **Matriz usa llamada única sin SSE:** Más simple pero con riesgo de timeout. Contexto enriquecido con organigrama + EDTs. El prompt incluye ejemplo JSON embebido (few-shot).

5. **Feature flags en BD:** Cada módulo IA tiene su flag en `configuracionGeneral.iaFeatures`. Verificar con `isIAFeatureEnabled('nombreDelFlag')` antes de proceder.

6. **Tracking completo de costos:** Toda llamada registra tokens (input/output/cache), costo USD estimado, duración y metadatos en tabla `agente_usage`. Hay límite mensual configurable.

7. **Prompt caching activo en TDR Fase 2:** El system prompt con el esquema JSON usa `cache_control: { type: 'ephemeral' }` en ambos bloques → reduce costos ~90% en cache hits.

8. **`TdrEditableTable` es un componente genérico reutilizable** para cualquier array de objetos tipados. Para Plan de Trabajo, se puede importar directamente sin modificar.

9. **Regeneración por sección: infraestructura en `extraccionPorBloque.ts` lista pero sin endpoint ni conexión en UI del módulo proyecto.** Para Plan de Trabajo, implementar el endpoint Y conectar la prop desde el inicio.

10. **Para Plan de Trabajo: imitar TDR (SSE + `maxDuration` + feature flag + tipos centralizados en `src/types/planTrabajo.ts`)**. Usar `cache_control` en el schema JSON del system prompt para reducir costos en regeneraciones repetidas.
