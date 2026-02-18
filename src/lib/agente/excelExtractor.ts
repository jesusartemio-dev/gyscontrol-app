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

export function readExcelSheets(buffer: Buffer): SheetTextData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheets: SheetTextData[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue

    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
    const rowCount = csv.split('\n').filter((line) => line.trim()).length

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

function groupSheets(sheets: SheetTextData[]): SheetGroups {
  const groups: SheetGroups = { resumen: [], equipos: [], servicios: [], gastos: [] }
  for (const sheet of sheets) {
    groups[classifySheet(sheet.name)].push(sheet)
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

FORMAT CONTEXT:
- EQUIPOS sheets (MAT. ELECTRICOS, MAT. TABLEROS, SOFTWARE): items with código, descripción, unidad, marca, cantidad, precio lista, factors
- Columns "GYS CONTROL" or "INTEGRADOR" = precioInterno. Column "CLIENTE" = precioCliente
- factorCosto = precioInterno / precioLista. factorVenta = precioCliente / precioInterno
- SERVICIOS sheets (SERV. ING., SERV. CON, SERV. PRO): hours×resource matrices
- Resources: Senior A/B, Semisenior A/B, Junior A/B with OFICINA and CAMPO rates
- GASTOS sheets (COVID, MOVIL., OPERAT.): items with cantidad, precio unitario, totals

RULES:
- Extract ALL items, do not omit rows
- If a field has no clear data, use null
- Defaults: factorCosto=1.00, factorVenta=1.25
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
  return `Extrae los EQUIPOS/MATERIALES de esta hoja. Extrae TODOS los items sin omitir ninguno.
${resumenCtx}
--- HOJA: "${sheet.name}" (${sheet.rowCount} filas) ---
${sheet.csv}

Responde ÚNICAMENTE con el JSON. No agregues texto antes ni después. No uses markdown. Solo el JSON puro con TODOS los items:
{"equipos":[{"grupo":"nombre descriptivo","hoja":"${sheet.name}","items":[{"descripcion":"...","codigo":"...o null","categoria":"...","unidad":"Und","marca":"...","cantidad":1,"precioLista":100,"precioInterno":100,"precioCliente":125,"factorCosto":1.00,"factorVenta":1.25}]}]}`
}

function buildServicioPrompt(sheet: SheetTextData, resumenCtx: string): string {
  return `Extrae los SERVICIOS de esta hoja. Identifica actividades con su matriz de horas×recurso.
${resumenCtx}
--- HOJA: "${sheet.name}" (${sheet.rowCount} filas) ---
${sheet.csv}

Responde ÚNICAMENTE con el JSON. No agregues texto antes ni después. No uses markdown. Solo el JSON puro:
{"servicios":[{"grupo":"nombre descriptivo","hoja":"${sheet.name}","edtSugerido":"EDT sugerido","factorSeguridad":1.0,"margen":1.35,"actividades":[{"nombre":"...","descripcion":"...","recursos":[{"recursoNombre":"Senior A","tipo":"oficina","costoHora":30,"horas":40}],"horasTotal":40,"costoInterno":1200,"costoCliente":1620}]}]}`
}

function buildGastoPrompt(sheet: SheetTextData, resumenCtx: string): string {
  return `Extrae los GASTOS de esta hoja. Extrae TODOS los items.
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
    system: systemPrompt,
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
