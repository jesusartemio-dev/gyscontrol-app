// src/lib/agente/excelExtractor.ts
// Lee Excel de cotización interna GYS con SheetJS y usa Claude para extraer datos estructurados
// Extracción por hoja individual para manejar Excels grandes sin truncar respuestas

import * as XLSX from 'xlsx'
import Anthropic from '@anthropic-ai/sdk'
import { getModelForTask, MODELS } from './models'
import { trackUsage } from './usageTracker'

// ── Tipos de datos extraídos ──────────────────────────────

export interface ExcelEquipoItem {
  descripcion: string
  codigo?: string
  categoria?: string
  unidad?: string
  marca?: string
  cantidad: number
  precioLista: number
  precioInterno: number
  precioCliente: number
  factorCosto: number
  factorVenta: number
}

export interface ExcelEquipoGrupo {
  grupo: string
  hoja: string
  items: ExcelEquipoItem[]
}

export interface ExcelRecursoHoras {
  recursoNombre: string
  tipo: 'oficina' | 'campo'
  costoHora: number
  horas: number
}

export interface ExcelServicioActividad {
  nombre: string
  descripcion?: string
  recursos: ExcelRecursoHoras[]
  horasTotal: number
  costoInterno: number
  costoCliente: number
}

export interface ExcelServicioGrupo {
  grupo: string
  hoja: string
  edtSugerido?: string
  factorSeguridad?: number
  margen?: number
  actividades: ExcelServicioActividad[]
}

export interface ExcelGastoItem {
  nombre: string
  descripcion?: string
  cantidad: number
  precioUnitario: number
  costoInterno: number
  costoCliente: number
}

export interface ExcelGastoGrupo {
  grupo: string
  hoja: string
  items: ExcelGastoItem[]
}

export interface ExcelResumen {
  totalInterno: number
  totalCliente: number
  moneda?: string
  margenGlobal?: number
  nombreProyecto?: string
  clienteNombre?: string
}

export interface ExcelExtraido {
  equipos: ExcelEquipoGrupo[]
  servicios: ExcelServicioGrupo[]
  gastos: ExcelGastoGrupo[]
  resumen: ExcelResumen
  recursosUnicos: string[]
  edtsUnicos: string[]
  hojas: string[]
}

// ── Progress callback ────────────────────────────────────

export type ProgressCallback = (message: string) => void

// ── Lectura de Excel con SheetJS ──────────────────────────

export interface SheetTextData {
  name: string
  csv: string
  rowCount: number
}

const MAX_SHEETS = 12
const MAX_CHARS_PER_SHEET = 80_000

/**
 * Una celda como texto de una sola línea. Las cabeceras de la plantilla traen
 * saltos de línea dentro de la celda ("TOTAL\nPRICE"), y `sheet_to_csv` los
 * conserva: la fila de cabecera se partía en cinco "líneas" y tanto el troceado
 * como el modelo perdían la correspondencia entre columna y valor.
 */
function celdaATexto(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  const texto = String(valor).replace(/\s*\n\s*/g, ' ').trim()
  if (!texto.includes(',') && !texto.includes('"')) return texto
  return `"${texto.replace(/"/g, '""')}"`
}

export function readExcelSheets(buffer: Buffer): SheetTextData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheets: SheetTextData[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue

    const filas = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
    })

    const csv = filas.map((fila) => fila.map(celdaATexto).join(',')).join('\n')
    const rowCount = filas.length

    if (rowCount <= 1) continue

    sheets.push({
      name,
      csv: csv.substring(0, MAX_CHARS_PER_SHEET),
      rowCount,
    })
  }

  sheets.sort((a, b) => b.rowCount - a.rowCount)
  return sheets.slice(0, MAX_SHEETS)
}

// ── Sheet classification ─────────────────────────────────

type SheetGroupType = 'equipos' | 'servicios' | 'gastos' | 'resumen'

function classifySheet(name: string): SheetGroupType {
  const upper = name.toUpperCase().trim()
  if (upper.includes('RESUMEN')) return 'resumen'
  if (upper.includes('MAT') || upper.includes('SOFTWARE')) return 'equipos'
  if (upper.includes('SERV')) return 'servicios'
  return 'gastos'
}

interface SheetGroups {
  resumen: SheetTextData[]
  equipos: SheetTextData[]
  servicios: SheetTextData[]
  gastos: SheetTextData[]
}

/** Rótulos de sección que aparecen dentro de la hoja, en su propia fila. */
const PATRONES_SECCION: Array<[Exclude<SheetGroupType, 'resumen'>, RegExp]> = [
  ['equipos', /^(materiales|equipos|suministros?|bienes)\b/i],
  ['servicios', /^(servicios?|mano de obra)\b/i],
  ['gastos', /^(gastos|movilizaci[oó]n)\b/i],
]

/**
 * Secciones rotuladas dentro de la hoja. Las cotizaciones antiguas meten
 * SERVICIOS, MATERIALES y GASTOS en una sola hoja, y clasificar solo por el
 * nombre del archivo mandaba toda la hoja a un único extractor: lo que no
 * coincidía con ese tipo no se le llegaba a pedir al modelo.
 */
function seccionesEnContenido(csv: string): SheetGroupType[] {
  const encontradas = new Set<SheetGroupType>()

  for (const linea of celdasPorFila(csv)) {
    // Un rótulo ocupa su propia fila: sin cifras y con poco texto. Sin esto, una
    // actividad como "Movilización y desmovilización de materiales" se confundía
    // con el encabezado de una sección de gastos.
    if (linea.some((c) => /^-?[\d,.]+$/.test(c) && /\d/.test(c))) continue

    for (const valor of linea.slice(0, 3)) {
      if (!valor || valor.length > 30) continue
      for (const [tipo, patron] of PATRONES_SECCION) {
        if (patron.test(valor)) encontradas.add(tipo)
      }
    }
  }

  return [...encontradas]
}

/** Divide el CSV respetando las comillas de los valores con coma. */
function celdasPorFila(csv: string): string[][] {
  return csv.split('\n').map((linea) => {
    const celdas: string[] = []
    let actual = ''
    let entreComillas = false
    for (const ch of linea) {
      if (ch === '"') entreComillas = !entreComillas
      else if (ch === ',' && !entreComillas) {
        celdas.push(actual.trim())
        actual = ''
      } else actual += ch
    }
    celdas.push(actual.trim())
    return celdas
  })
}

function groupSheets(sheets: SheetTextData[]): SheetGroups {
  const groups: SheetGroups = { resumen: [], equipos: [], servicios: [], gastos: [] }
  for (const sheet of sheets) {
    const porNombre = classifySheet(sheet.name)
    if (porNombre === 'resumen') {
      groups.resumen.push(sheet)
      continue
    }

    // Una hoja con varias secciones rotuladas se manda a cada extractor. El tipo
    // que sugiere el nombre siempre se mantiene: una detección de más solo agrega
    // una llamada, una de menos deja una sección sin extraer.
    const destinos = new Set<SheetGroupType>([porNombre])
    const porContenido = seccionesEnContenido(sheet.csv)
    if (porContenido.length > 1) for (const t of porContenido) destinos.add(t)

    for (const destino of destinos) groups[destino].push(sheet)
  }
  return groups
}

// ── Sheet chunking for large sheets ──────────────────────

const CHUNK_MAX_ROWS = 120

function chunkSheet(sheet: SheetTextData): SheetTextData[] {
  const lines = sheet.csv.split('\n')
  const header = lines[0] || ''
  const dataLines = lines.slice(1).filter((l) => l.trim())

  if (dataLines.length <= CHUNK_MAX_ROWS) return [sheet]

  const chunks: SheetTextData[] = []
  for (let i = 0; i < dataLines.length; i += CHUNK_MAX_ROWS) {
    const slice = dataLines.slice(i, i + CHUNK_MAX_ROWS)
    chunks.push({
      name: sheet.name,
      csv: [header, ...slice].join('\n'),
      rowCount: slice.length + 1,
    })
  }
  return chunks
}

// ── JSON repair utilities ────────────────────────────────

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function repairTruncatedJson(text: string): string {
  let result = text.trim()
  result = result.replace(/,\s*$/, '')

  const stack: string[] = []
  let inString = false
  let escape = false

  for (const ch of result) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    if (ch === '}' || ch === ']') stack.pop()
  }

  // Close open string
  if (inString) result += '"'

  // Remove trailing partial key-value pair
  result = result.replace(/,?\s*"[^"]*"?\s*:?\s*("[^"]*)?$/, '')
  result = result.replace(/,\s*$/, '')

  // Close open brackets/braces in correct (reverse) order
  while (stack.length > 0) {
    const open = stack.pop()!
    result += open === '{' ? '}' : ']'
  }

  return result
}

function extractJsonSubstring(text: string): string {
  // Step A: Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Step B: Strip BOM and leading non-JSON characters
  let cleaned = text.replace(/^\uFEFF/, '').trim()

  // Step C: Find the first { or [ and last } or ]
  const firstOpen = findFirstJsonChar(cleaned)
  const lastClose = findLastJsonChar(cleaned)

  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1)
  }

  return cleaned
}

function findFirstJsonChar(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') return i
  }
  return -1
}

function findLastJsonChar(text: string): number {
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '}' || text[i] === ']') return i
  }
  return -1
}

function findLargestJsonBlock(text: string): string | null {
  // Try to find the largest parseable JSON block line by line
  const lines = text.split('\n')
  let bestJson: string | null = null
  let bestLength = 0

  for (let start = 0; start < lines.length; start++) {
    const line = lines[start].trim()
    if (!line.startsWith('{') && !line.startsWith('[')) continue

    for (let end = lines.length; end > start; end--) {
      const candidate = lines.slice(start, end).join('\n').trim()
      if (candidate.length <= bestLength) continue
      if (tryParseJson(candidate) !== null) {
        bestJson = candidate
        bestLength = candidate.length
        break // Found largest block starting at this line
      }
    }
  }

  return bestJson
}

function parseJsonRobust(rawText: string): unknown {
  // Step 0: Clean and extract JSON substring
  const text = extractJsonSubstring(rawText)

  // Step 1: Direct parse
  const direct = tryParseJson(text)
  if (direct !== null) return direct

  // Step 2: Repair truncated JSON (bracket stack)
  const repaired = repairTruncatedJson(text)
  const repairedResult = tryParseJson(repaired)
  if (repairedResult !== null) {
    console.warn('[excelExtractor] JSON repaired (truncated response)')
    return repairedResult
  }

  // Step 3: Aggressive truncation to last complete structure
  const lastClose = findLastJsonChar(text)
  if (lastClose > text.length * 0.3) {
    const truncated = text.substring(0, lastClose + 1)
    const truncatedRepaired = repairTruncatedJson(truncated)
    const truncatedResult = tryParseJson(truncatedRepaired)
    if (truncatedResult !== null) {
      console.warn('[excelExtractor] JSON repaired by aggressive truncation')
      return truncatedResult
    }
  }

  // Step 4: Line-by-line search for largest JSON block
  const blockJson = findLargestJsonBlock(rawText)
  if (blockJson) {
    const blockResult = tryParseJson(blockJson)
    if (blockResult !== null) {
      console.warn('[excelExtractor] JSON extracted from largest block')
      return blockResult
    }
  }

  // Step 5: Give up — log diagnostic info
  const len = rawText.length
  const first200 = rawText.substring(0, 200)
  const last200 = len > 200 ? rawText.substring(len - 200) : ''
  console.error(`[excelExtractor] Unparseable response (${len} chars)`)
  console.error(`[excelExtractor] First 200 chars: ${first200}`)
  if (last200) console.error(`[excelExtractor] Last 200 chars: ${last200}`)
  throw new Error('Error al interpretar la respuesta del modelo (JSON inválido)')
}

// ── System prompt (shared across all calls) ──────────────

const SYSTEM_PROMPT = `You are a JSON extraction API. You ONLY respond with valid JSON. Never include explanations, markdown formatting, code fences, or any text outside the JSON object.

You are an expert in industrial automation quotations from GYS Control Industrial (Peru). You extract structured data from internal quotation Excel files.

SHEET STRUCTURE:
- A sheet usually starts with a "RESUMEN ECONÓMICO TOTAL" block: an INDEX listing each
  block of the sheet with its total. It is NOT a list of items — never extract items from it.
  Use it to know which blocks carry an amount in this quotation.
- After it come one or more BLOCKS. Each block = a title row in the first column, then a
  header row (It, CAT, DESCRIPCION, UNID, QTY, UNIT PRICE, TOTAL PRICE, UNIT PRICE,
  TOTAL PRICE, Renta %, LIST PRICE, COD., INTEGRADOR, CLIENTE), then numbered rows, then a
  "TOTAL US ($)" row with the block total.
- The first UNIT PRICE / TOTAL PRICE pair is under "CLIENTE". The second pair is under
  "GYS CONTROL IND." (internal cost).

COLUMN MAPPING (equipos/materiales):
- cantidad = QTY
- precioCliente = UNIT PRICE under CLIENTE
- precioInterno = UNIT PRICE under GYS CONTROL IND.
- precioLista = LIST PRICE when present, otherwise precioInterno
- factorCosto = INTEGRADOR column, factorVenta = CLIENTE column (the numeric factors near the end)

HARD RULES — the workbook is a REUSED TEMPLATE and contains leftovers:
1. NEVER invent a value. There are no default prices or factors. Missing data = 0 or null.
2. Only the columns under the header row are valid. IGNORE any number sitting in columns to
   the RIGHT of the CLIENTE factor column: those are leftovers from previous quotations and
   are NOT prices. This is the single most common mistake — do not take a price from an
   unlabeled column.
3. "TOTAL PRICE" decides whether a row belongs to this quotation. A row with QTY empty or 0,
   or with TOTAL PRICE 0, is NOT part of it. If such a row still has a description or a code,
   return it with cantidad 0 and ALL prices 0, so the user can see it was left out. NEVER use
   its UNIT PRICE as the price.
4. Skip rows with no description AND no code: they are empty template rows.
5. The sum of (precioCliente × cantidad) over a block MUST equal that block's "TOTAL US ($)".
   If your extraction does not add up, re-read the columns before answering.
6. A block whose total is 0 must come back with every item at 0. Never fill it in.

SERVICIOS sheets (SERV. ING., SERV. CON, SERV. PRO): a matrix of activities × resources.
- The header names the resources, split into TRABAJOS OFICINA and TRABAJO CAMPO.
- The "COSTO POR HH" row gives each resource's hourly rate. Use it verbatim.
- Each numbered row is an activity; the numbers under the resource columns are HOURS.
- Rows in caps with no number (e.g. "PUESTA EN MARCHA") are section titles, not activities.
- Only activities with at least one hour > 0 count. An activity whose TOTAL shows "$-" has no
  hours: leave it out.
- The "TOTALES" row is the ground truth: hours per resource and the total amount.

GASTOS sheets (MOVIL., OPERAT., COVID): same rules as equipos — the total column decides.

ONE SHEET MAY HOLD SEVERAL SECTIONS: older quotations put SERVICIOS, MATERIALES and
GASTOS OPERATIVOS in a single sheet, each under its own banner row. Extract ONLY the
section you are asked for and ignore the others — a materials row is not an expense.

OLD LAYOUT (columns: Descripción, cantidad, hh, costos unitarios, Subtotal, Total):
- The per-row amount is "Subtotal" = cantidad × costo unitario. A row belongs to the
  quotation when cantidad > 0 and Subtotal > 0.
- "Total" is the total of the WHOLE SECTION, written once in a merged cell: it shows up in
  one row and is EMPTY in the others. An empty "Total" does NOT mean the row is excluded.
  Never zero a row because its Total cell is empty, and never use that Total as a row price.
- There is a single price column ("costos unitarios"): use it for both precioCliente and
  precioInterno, with factorVenta = 1.
- Check yourself: the sum of the Subtotals of a section must equal that section's Total.

- Preserve resource names exactly as they appear
- CRITICAL: Respond ONLY with the raw JSON object. No text before or after. No markdown. No code fences. Just the JSON.`

// ── Per-type prompt builders ─────────────────────────────

function buildResumenPrompt(sheet: SheetTextData): string {
  return `Extrae los datos del resumen de esta cotización:

--- HOJA: "${sheet.name}" (${sheet.rowCount} filas) ---
${sheet.csv}

Responde ÚNICAMENTE con el JSON. No agregues texto antes ni después. No uses markdown. Solo el JSON puro:
{"resumen":{"totalInterno":0,"totalCliente":0,"moneda":"USD","margenGlobal":null,"nombreProyecto":"nombre o null","clienteNombre":"nombre o null"}}`
}

function buildEquipoPrompt(sheet: SheetTextData, resumenCtx: string): string {
  return `Extrae los EQUIPOS/MATERIALES de esta hoja, un "grupo" por cada bloque.
Si la hoja trae además secciones de SERVICIOS o GASTOS, ignóralas: aquí solo van equipos y materiales.

Recuerda: la columna TOTAL PRICE manda. Los ítems con QTY 0 o TOTAL PRICE 0 van con
cantidad 0 y precios 0. No tomes números de columnas sin cabecera: son restos de la
plantilla. La suma de cada bloque debe dar su "TOTAL US ($)".
${resumenCtx}
--- HOJA: "${sheet.name}" (${sheet.rowCount} filas) ---
${sheet.csv}

Responde ÚNICAMENTE con el JSON. No agregues texto antes ni después. No uses markdown. Solo el JSON puro con TODOS los items:
{"equipos":[{"grupo":"nombre descriptivo","hoja":"${sheet.name}","items":[{"descripcion":"...","codigo":"...o null","categoria":"...","unidad":"Und","marca":"...","cantidad":1,"precioLista":100,"precioInterno":100,"precioCliente":125,"factorCosto":1.00,"factorVenta":1.25}]}]}`
}

function buildServicioPrompt(sheet: SheetTextData, resumenCtx: string): string {
  return `Extrae los SERVICIOS de esta hoja: actividades con su horas×recurso.
Si la hoja trae además secciones de MATERIALES o GASTOS, ignóralas: aquí solo van servicios.
En las hojas antiguas cada actividad lista sus recursos (Supervisor, Técnicos…) con cantidad,
hh y costo unitario: ahí el recurso es el nombre de la fila y las horas son cantidad × hh.

Solo cuentan las actividades que tienen al menos una hora > 0. Las tarifas salen de la fila
"COSTO POR HH". La suma de tus actividades debe dar el monto de la fila "TOTALES".
${resumenCtx}
--- HOJA: "${sheet.name}" (${sheet.rowCount} filas) ---
${sheet.csv}

Responde ÚNICAMENTE con el JSON. No agregues texto antes ni después. No uses markdown. Solo el JSON puro:
{"servicios":[{"grupo":"nombre descriptivo","hoja":"${sheet.name}","edtSugerido":"EDT sugerido","factorSeguridad":1.0,"margen":1.35,"actividades":[{"nombre":"...","descripcion":"...","recursos":[{"recursoNombre":"Senior A","tipo":"oficina","costoHora":30,"horas":40}],"horasTotal":40,"costoInterno":1200,"costoCliente":1620}]}]}`
}

function buildGastoPrompt(sheet: SheetTextData, resumenCtx: string): string {
  return `Extrae los GASTOS de esta hoja.
Si la hoja trae además secciones de SERVICIOS o MATERIALES, ignóralas: aquí solo van gastos.
${resumenCtx}
--- HOJA: "${sheet.name}" (${sheet.rowCount} filas) ---
${sheet.csv}

Responde ÚNICAMENTE con el JSON. No agregues texto antes ni después. No uses markdown. Solo el JSON puro:
{"gastos":[{"grupo":"nombre descriptivo","hoja":"${sheet.name}","items":[{"nombre":"...","descripcion":"...o null","cantidad":1,"precioUnitario":50,"costoInterno":50,"costoCliente":67.50}]}]}`
}

// ── Claude API call with retry + parse validation + Sonnet fallback ──

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new Anthropic({ apiKey, timeout: 90_000 })
}

const RETRY_JSON_PREFIX = `CRITICAL: Your previous response was not valid JSON. Respond with ONLY a JSON object, nothing else. No explanations, no markdown, no code fences.\n\n`

interface ClaudeRawResult {
  text: string
  inputTokens: number
  outputTokens: number
  cacheCreation: number
  cacheRead: number
}

async function callClaudeRaw(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<ClaudeRawResult> {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    // Cache del system: en imports multi-hoja, hojas posteriores reutilizan el cache
    system: [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  return {
    text,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    cacheCreation: response.usage?.cache_creation_input_tokens ?? 0,
    cacheRead: response.usage?.cache_read_input_tokens ?? 0,
  }
}

/**
 * Call Claude and parse JSON with up to 3 attempts:
 * 1. Normal call with Haiku
 * 2. Retry with stronger JSON prompt (Haiku)
 * 3. Fallback to Sonnet (more reliable with JSON)
 */
async function callClaudeJson(
  client: Anthropic,
  model: string,
  userPrompt: string,
  maxTokens: number = 8192,
  sheetName?: string,
  userId?: string
): Promise<unknown> {
  const label = sheetName ? ` [${sheetName}]` : ''

  const doTrack = (usedModel: string, result: ClaudeRawResult) => {
    if (!userId) return
    trackUsage({
      userId,
      tipo: 'excel-extraction',
      modelo: usedModel,
      tokensInput: result.inputTokens,
      tokensOutput: result.outputTokens,
      tokensCacheCreation: result.cacheCreation,
      tokensCacheRead: result.cacheRead,
      metadata: { sheet: sheetName },
    })
  }

  // Attempt 1: Normal call
  try {
    const result = await callClaudeRaw(client, model, SYSTEM_PROMPT, userPrompt, maxTokens)
    doTrack(model, result)
    return parseJsonRobust(result.text)
  } catch (err) {
    console.warn(`[excelExtractor]${label} Attempt 1 failed:`, err instanceof Error ? err.message : err)
  }

  // Attempt 2: Retry with stronger JSON prefix
  await new Promise((r) => setTimeout(r, 2000))
  console.info(`[excelExtractor]${label} Retry attempt 2 (enhanced prompt)`)
  try {
    const result = await callClaudeRaw(client, model, SYSTEM_PROMPT, RETRY_JSON_PREFIX + userPrompt, maxTokens)
    doTrack(model, result)
    return parseJsonRobust(result.text)
  } catch (err) {
    console.warn(`[excelExtractor]${label} Attempt 2 failed:`, err instanceof Error ? err.message : err)
  }

  // Attempt 3: Fallback to Sonnet (more expensive but more reliable)
  const sonnetModel = MODELS.sonnet
  if (model !== sonnetModel) {
    await new Promise((r) => setTimeout(r, 1000))
    console.info(`[excelExtractor]${label} Retry attempt 3 (Sonnet fallback)`)
    try {
      const result = await callClaudeRaw(client, sonnetModel, SYSTEM_PROMPT, userPrompt, maxTokens)
      doTrack(sonnetModel, result)
      return parseJsonRobust(result.text)
    } catch (err) {
      console.error(`[excelExtractor]${label} Sonnet fallback also failed:`, err instanceof Error ? err.message : err)
      throw err
    }
  }

  throw new Error(`Error al interpretar la respuesta del modelo para hoja${label}`)
}

// ── Per-type parsers ─────────────────────────────────────

function parseEquipoGroups(rawGroups: Record<string, unknown>[]): ExcelEquipoGrupo[] {
  return rawGroups.map((g) => ({
    grupo: (g.grupo as string) || '',
    hoja: (g.hoja as string) || '',
    items: ((g.items as Record<string, unknown>[]) || []).map((item) => ({
      descripcion: (item.descripcion as string) || '',
      codigo: (item.codigo as string) || undefined,
      categoria: (item.categoria as string) || undefined,
      unidad: (item.unidad as string) || 'Und',
      marca: (item.marca as string) || '',
      cantidad: Number(item.cantidad) || 1,
      precioLista: Number(item.precioLista) || 0,
      precioInterno: Number(item.precioInterno) || 0,
      precioCliente: Number(item.precioCliente) || 0,
      factorCosto: Number(item.factorCosto) || 1.0,
      factorVenta: Number(item.factorVenta) || 1.25,
    })),
  }))
}

function parseServicioGroups(
  rawGroups: Record<string, unknown>[],
  recursosSet: Set<string>,
  edtsSet: Set<string>
): ExcelServicioGrupo[] {
  return rawGroups.map((g) => {
    if (g.edtSugerido) edtsSet.add(g.edtSugerido as string)
    return {
      grupo: (g.grupo as string) || '',
      hoja: (g.hoja as string) || '',
      edtSugerido: (g.edtSugerido as string) || undefined,
      factorSeguridad: Number(g.factorSeguridad) || 1.0,
      margen: Number(g.margen) || 1.35,
      actividades: ((g.actividades as Record<string, unknown>[]) || []).map(
        (act: Record<string, unknown>) => {
          const recursos = ((act.recursos as Record<string, unknown>[]) || []).map(
            (r: Record<string, unknown>) => {
              if (r.recursoNombre) recursosSet.add(r.recursoNombre as string)
              return {
                recursoNombre: (r.recursoNombre as string) || '',
                tipo: (r.tipo as 'oficina' | 'campo') || 'oficina',
                costoHora: Number(r.costoHora) || 0,
                horas: Number(r.horas) || 0,
              }
            }
          )
          return {
            nombre: (act.nombre as string) || '',
            descripcion: (act.descripcion as string) || undefined,
            recursos,
            horasTotal: Number(act.horasTotal) || 0,
            costoInterno: Number(act.costoInterno) || 0,
            costoCliente: Number(act.costoCliente) || 0,
          }
        }
      ),
    }
  })
}

function parseGastoGroups(rawGroups: Record<string, unknown>[]): ExcelGastoGrupo[] {
  return rawGroups.map((g) => ({
    grupo: (g.grupo as string) || '',
    hoja: (g.hoja as string) || '',
    items: ((g.items as Record<string, unknown>[]) || []).map((item) => ({
      nombre: (item.nombre as string) || '',
      descripcion: (item.descripcion as string) || undefined,
      cantidad: Number(item.cantidad) || 1,
      precioUnitario: Number(item.precioUnitario) || 0,
      costoInterno: Number(item.costoInterno) || 0,
      costoCliente: Number(item.costoCliente) || 0,
    })),
  }))
}

function parseResumen(raw: Record<string, unknown>): ExcelResumen {
  return {
    totalInterno: Number(raw?.totalInterno) || 0,
    totalCliente: Number(raw?.totalCliente) || 0,
    moneda: (raw?.moneda as string) || 'USD',
    margenGlobal: raw?.margenGlobal ? Number(raw.margenGlobal) : undefined,
    nombreProyecto: (raw?.nombreProyecto as string) || undefined,
    clienteNombre: (raw?.clienteNombre as string) || undefined,
  }
}

// ── Main extraction (per-sheet with chunking) ────────────

export async function extractWithClaude(
  sheets: SheetTextData[],
  onProgress?: ProgressCallback,
  userId?: string
): Promise<ExcelExtraido> {
  const client = getClient()
  const model = getModelForTask('excel-extraction')
  const groups = groupSheets(sheets)

  // Build resumen context (shared across calls, truncated to 5K)
  const resumenCsv = groups.resumen[0]?.csv || ''
  const resumenCtx = resumenCsv
    ? `\n--- CONTEXTO: HOJA "RESUMEN" ---\n${resumenCsv.substring(0, 5000)}\n`
    : ''

  // 1. Extract resumen
  let resumen: ExcelResumen = { totalInterno: 0, totalCliente: 0, moneda: 'USD' }
  if (groups.resumen.length > 0) {
    onProgress?.('Extrayendo resumen...')
    const raw = await callClaudeJson(client, model, buildResumenPrompt(groups.resumen[0]), 2048, 'RESUMEN', userId) as Record<string, unknown>
    resumen = parseResumen((raw.resumen as Record<string, unknown>) || raw)
  }

  // 2. Extract equipos (per sheet, with chunking for large sheets)
  const allEquipos: ExcelEquipoGrupo[] = []
  for (const sheet of groups.equipos) {
    const chunks = chunkSheet(sheet)
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]
      const part = chunks.length > 1 ? ` (${ci + 1}/${chunks.length})` : ''
      onProgress?.(`Analizando equipos: ${sheet.name}${part}...`)
      const raw = await callClaudeJson(client, model, buildEquipoPrompt(chunk, resumenCtx), 8192, sheet.name, userId) as Record<string, unknown>
      const parsed = parseEquipoGroups((raw.equipos as Record<string, unknown>[]) || [])
      allEquipos.push(...parsed)
    }
  }

  // 3. Extract servicios (per sheet)
  const allServicios: ExcelServicioGrupo[] = []
  const recursosSet = new Set<string>()
  const edtsSet = new Set<string>()
  for (const sheet of groups.servicios) {
    onProgress?.(`Analizando servicios: ${sheet.name}...`)
    const raw = await callClaudeJson(client, model, buildServicioPrompt(sheet, resumenCtx), 8192, sheet.name, userId) as Record<string, unknown>
    const parsed = parseServicioGroups(
      (raw.servicios as Record<string, unknown>[]) || [],
      recursosSet,
      edtsSet
    )
    allServicios.push(...parsed)
  }

  // 4. Extract gastos (per sheet)
  const allGastos: ExcelGastoGrupo[] = []
  for (const sheet of groups.gastos) {
    onProgress?.(`Analizando gastos: ${sheet.name}...`)
    const raw = await callClaudeJson(client, model, buildGastoPrompt(sheet, resumenCtx), 8192, sheet.name, userId) as Record<string, unknown>
    const parsed = parseGastoGroups((raw.gastos as Record<string, unknown>[]) || [])
    allGastos.push(...parsed)
  }

  return {
    equipos: allEquipos,
    servicios: allServicios,
    gastos: allGastos,
    resumen,
    recursosUnicos: Array.from(recursosSet).sort(),
    edtsUnicos: Array.from(edtsSet).sort(),
    hojas: [],
  }
}

// ── Pipeline principal ───────────────────────────────────

export async function extractExcelData(
  buffer: Buffer,
  onProgress?: ProgressCallback
): Promise<{ data: ExcelExtraido; sheets: SheetTextData[] }> {
  onProgress?.('Leyendo hojas del Excel...')
  const sheets = readExcelSheets(buffer)

  if (sheets.length === 0) {
    throw new Error('El archivo Excel no contiene hojas con datos')
  }

  const data = await extractWithClaude(sheets, onProgress)
  data.hojas = sheets.map((s) => s.name)

  return { data, sheets }
}
