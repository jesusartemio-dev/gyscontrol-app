// src/lib/agente/valorizacionExtractor.ts
// Extrae datos estructurados de documentos de valorización emitidos por el cliente
// (Excel o texto) usando SheetJS para leer y Claude Haiku para interpretar.

import * as XLSX from 'xlsx'
import Anthropic from '@anthropic-ai/sdk'
import { getModelForTask, MODELS } from './models'
import { trackUsage } from './usageTracker'

// ── Tipos exportados ──────────────────────────────────────

export interface ValorizacionExtractedCabecera {
  proyectoCodigo: string | null
  proyectoNombre: string | null
  clienteNombre: string | null
  codigoDocumento: string | null
  periodoInicio: string | null   // ISO date YYYY-MM-DD
  periodoFin: string | null      // ISO date YYYY-MM-DD
  moneda: string                 // 'USD' | 'PEN'
  presupuestoContractual: number | null
  // Monto BRUTO = suma de ítems × % avance, ANTES de descuentos/deducciones/IGV
  montoValorizacion: number | null
  // Neto SIN IGV = monto bruto − descuentos − amortización adelanto − fondo garantía
  // Es lo que el cliente llama "valorización a cobrar" o "subtotal". MÉTRICA PRINCIPAL.
  subtotalSinIGV: number | null
  descuentoComercialPorcentaje: number
  adelantoPorcentaje: number
  igvPorcentaje: number
  fondoGarantiaPorcentaje: number
  // Neto CON IGV = subtotalSinIGV + IGV. El sistema lo llama "netoARecibir".
  netoARecibir: number | null
  observaciones: string | null
}

export interface ValorizacionExtractedPartida {
  numero: number
  descripcion: string
  unidad: string | null
  cantidad: number | null
  precioUnitario: number | null
  montoContractual: number
  // Porcentaje acumulado hasta la valorización ANTERIOR (snapshot del doc)
  porcentajeAcumuladoAnterior: number
  // Porcentaje acumulado hasta esta valorización (incluye lo nuevo)
  porcentajeAcumuladoActual: number
  // Incremento de esta valorización = actual - anterior
  porcentajeAvance: number
  montoAvance: number
}

export interface ValorizacionExtracted {
  cabecera: ValorizacionExtractedCabecera
  partidas: ValorizacionExtractedPartida[]
  confianza: 'alta' | 'media' | 'baja'
  advertencias: string[]
  hojas: string[]
}

// ── Campo diff para modo verificación ────────────────────

export interface CampoDiff {
  campo: string
  label: string
  valorSistema: string | number | null
  valorDocumento: string | number | null
  coincide: boolean
  unidad?: string
}

export interface ValorizacionDiff {
  extraido: ValorizacionExtracted
  cabecera: CampoDiff[]
  partidas: Array<{
    numero: number
    descripcion: string
    coincide: boolean
    diffs: CampoDiff[]
    soloEnDocumento: boolean
    soloEnSistema: boolean
  }>
  resumen: {
    totalCampos: number
    coinciden: number
    difieren: number
    partidasSoloDoc: number
    partidasSoloSistema: number
  }
}

// ── Lectura Excel ─────────────────────────────────────────

interface SheetText {
  name: string
  csv: string
  rowCount: number
}

const MAX_CHARS = 60_000

export function readValorizacionSheets(buffer: Buffer): SheetText[] {
  // cellDates: true convierte serial dates a strings legibles en el CSV
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd' })
  const sheets: SheetText[] = []

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    if (!sheet) continue
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
    const rowCount = csv.split('\n').filter(l => l.trim()).length
    if (rowCount <= 1) continue
    sheets.push({ name, csv: csv.substring(0, MAX_CHARS), rowCount })
  }

  // Hoja de detalle conocida primero ("VAL", "VALORIZACION"), luego por cantidad de filas
  const PRIORITY = ['val', 'valorizacion', 'resumen', 'detalle']
  return sheets.sort((a, b) => {
    const ai = PRIORITY.indexOf(a.name.toLowerCase())
    const bi = PRIORITY.indexOf(b.name.toLowerCase())
    if (ai !== -1 && bi === -1) return -1
    if (bi !== -1 && ai === -1) return 1
    if (ai !== -1 && bi !== -1) return ai - bi
    return b.rowCount - a.rowCount
  })
}

// ── JSON helpers (reutilizados del excelExtractor) ────────

function tryParseJson(text: string): unknown | null {
  try { return JSON.parse(text) } catch { return null }
}

function extractJsonSubstring(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) return fenceMatch[1].trim()
  let cleaned = text.replace(/^﻿/, '').trim()
  let first = -1, last = -1
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{' || cleaned[i] === '[') { first = i; break }
  }
  for (let i = cleaned.length - 1; i >= 0; i--) {
    if (cleaned[i] === '}' || cleaned[i] === ']') { last = i; break }
  }
  if (first !== -1 && last > first) cleaned = cleaned.substring(first, last + 1)
  return cleaned
}

function repairJson(text: string): string {
  let r = text.trim().replace(/,\s*$/, '')
  const stack: string[] = []
  let inStr = false, esc = false
  for (const ch of r) {
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    if (ch === '}' || ch === ']') stack.pop()
  }
  if (inStr) r += '"'
  r = r.replace(/,?\s*"[^"]*"?\s*:?\s*("[^"]*)?$/, '').replace(/,\s*$/, '')
  while (stack.length) r += stack.pop() === '{' ? '}' : ']'
  return r
}

function parseJsonRobust(raw: string): unknown {
  const text = extractJsonSubstring(raw)
  const d = tryParseJson(text); if (d !== null) return d
  const rep = repairJson(text)
  const r = tryParseJson(rep); if (r !== null) return r
  throw new Error('Respuesta del modelo no es JSON válido')
}

// ── Prompts ───────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a JSON extraction API for Peruvian engineering and construction project valuations ("valorizaciones").
The documents are client-issued Excel files (converted to CSV) that certify work progress for billing purposes.
They are written in Spanish and use Peruvian accounting conventions (PEN or USD, IGV=18%).

═══ FINANCIAL STRUCTURE ═══
A valorización has these calculation steps:
1. GROSS (montoValorizacion): sum of each work item × its advance %. BEFORE any deductions.
   In documents this often appears as "Valorización Neta", "Costo Directo", or the subtotal BEFORE discount rows.
2. DEDUCTIONS: commercial discount ("Descuento Comercial"), advance amortization ("Adelanto Comercial"), guarantee fund ("Fondo Garantía").
3. SUBTOTAL WITHOUT IGV (subtotalSinIGV): = gross - all deductions. KEY METRIC. Often labelled "Sub Total" or "Subtotal".
4. IGV (18% typically): applied on subtotalSinIGV.
5. NET WITH IGV (netoARecibir): = subtotalSinIGV + IGV. Often "Total a Facturar" or "Neto a Recibir".

═══ DOCUMENT FORMAT — NEXA / STANDARD PERUVIAN MULTI-SHEET FORMAT ═══
This format has sheets: "Carátula" (cover), "RESUMEN" (summary), "VAL" (detail).
READ FROM VAL FIRST if present — it has the most accurate per-partida data.

VAL sheet column layout (right-to-left groups):
  PRESUPUESTO BASE: UND | CANT(contractual) | (variation) | ACTUAL qty | PRECIO UNIT | TOTAL(contractual)
  ACUMULADO ANTERIOR: % | TOTAL
  VALORIZACION ACTUAL: % | TOTAL   ← THIS PERIOD'S WORK — USE THESE VALUES
  ACUMULADO ACTUAL: % | TOTAL
  SALDO: % | TOTAL

For PARTIDAS (work items):
- montoContractual = TOTAL in the PRESUPUESTO BASE group (the base budget for that line)
- porcentajeAcumuladoAnterior = % in ACUMULADO ANTERIOR group
- porcentajeAcumuladoActual = % in ACUMULADO ACTUAL group (or = anterior + actual period %)
- porcentajeAvance = % in VALORIZACION ACTUAL group (the increment THIS period)
- montoAvance = TOTAL in VALORIZACION ACTUAL group (NOT SALDO, NOT ACUMULADO)

IMPORTANT: Only extract TOP-LEVEL items (e.g. "1 MATERIALES", "2 SERVICIO ASOCIADO", "3 GASTOS OPERATIVOS").
Do NOT extract sub-items (01.01, 01.02, 01.01.01, etc.) — they are sub-components of the main item.
If an item row shows 0 for VALORIZACION ACTUAL, include it anyway with montoAvance=0.

RESUMEN sheet: Use only for header info (period, contract amount, discount, IGV, neto).
Rows like "VALORIZACION NETA", "DESCUENTO COMERCIAL", "SUB TOTAL", "IMPUESTO", "TOTAL a facturar" are the summary.
"CONTRATADO = X" is the contracted invoice value (gross before discount at contract level), NOT a partida.

═══ FIELD MAPPING RULES ═══
- montoValorizacion = gross before deductions (e.g. "VALORIZACION NETA" or "COSTO DIRECTO" row in the ACTUAL column)
- subtotalSinIGV = "SUB TOTAL" or "Subtotal" in the ACTUAL column (after discount, before IGV)
- netoARecibir = "TOTAL a facturar" or "Neto a Recibir" in the ACTUAL column
- descuentoComercialPorcentaje = the discount rate (e.g. "DSCTO COMERCIAL_ = 0.0917677..." → 9.18%)
- presupuestoContractual = total PRESUPUESTO BASE sum (e.g. "COSTO DIRECTO" or "VALORIZACION NETA" base column)

═══ OTHER RULES ═══
- Respond ONLY with raw JSON. No markdown, no code fences, no explanations.
- Dates: YYYY-MM-DD format. Parse text like "Del 15-05-2026 al 23-06-2026" → periodoInicio=2026-05-15, periodoFin=2026-06-23.
- Percentages as numbers 0-100 (NOT 0-1). If document shows 0.37 as %, convert to 37.
- All monetary amounts as numbers without currency symbols.
- If a field is not found, use null.
- porcentajeAvance = porcentajeAcumuladoActual - porcentajeAcumuladoAnterior.`

function buildExtractionPrompt(sheets: SheetText[]): string {
  const sheetsText = sheets.map(s =>
    `--- HOJA: "${s.name}" (${s.rowCount} filas) ---\n${s.csv}`
  ).join('\n\n')

  return `Extrae los datos de esta valorización de proyecto de ingeniería/construcción:

${sheetsText}

Responde ÚNICAMENTE con este JSON (sin texto adicional):
{
  "cabecera": {
    "proyectoCodigo": "código o null",
    "proyectoNombre": "nombre o null",
    "clienteNombre": "nombre del cliente o null",
    "codigoDocumento": "código del documento o null",
    "periodoInicio": "YYYY-MM-DD o null",
    "periodoFin": "YYYY-MM-DD o null",
    "moneda": "USD",
    "presupuestoContractual": 0,
    "montoValorizacion": 0,
    "subtotalSinIGV": 0,
    "descuentoComercialPorcentaje": 0,
    "adelantoPorcentaje": 0,
    "igvPorcentaje": 18,
    "fondoGarantiaPorcentaje": 0,
    "netoARecibir": 0,
    "observaciones": null
  },
  "partidas": [
    {
      "numero": 1,
      "descripcion": "descripción exacta del ítem",
      "unidad": "und o null",
      "cantidad": null,
      "precioUnitario": null,
      "montoContractual": 0,
      "porcentajeAcumuladoAnterior": 0,
      "porcentajeAcumuladoActual": 0,
      "porcentajeAvance": 0,
      "montoAvance": 0
    }
  ],
  "confianza": "alta",
  "advertencias": []
}`
}

// ── Llamada a Claude ──────────────────────────────────────

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new Anthropic({ apiKey, timeout: 90_000 })
}

async function callClaude(
  client: Anthropic,
  model: string,
  userPrompt: string,
  userId?: string,
  tipo = 'valorizacion-import-ia',
): Promise<unknown> {
  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  if (userId) {
    trackUsage({
      userId,
      tipo,
      modelo: model,
      tokensInput: response.usage?.input_tokens ?? 0,
      tokensOutput: response.usage?.output_tokens ?? 0,
      tokensCacheCreation: response.usage?.cache_creation_input_tokens ?? 0,
      tokensCacheRead: response.usage?.cache_read_input_tokens ?? 0,
    })
  }

  return parseJsonRobust(text)
}

// ── Parser de respuesta ───────────────────────────────────

function parseExtracted(raw: Record<string, unknown>): ValorizacionExtracted {
  const cab = (raw.cabecera as Record<string, unknown>) ?? {}
  const partidasRaw = (raw.partidas as Record<string, unknown>[]) ?? []
  const advertencias = (raw.advertencias as string[]) ?? []
  const confianza = (raw.confianza as string) ?? 'media'

  const cabecera: ValorizacionExtractedCabecera = {
    proyectoCodigo: (cab.proyectoCodigo as string) || null,
    proyectoNombre: (cab.proyectoNombre as string) || null,
    clienteNombre: (cab.clienteNombre as string) || null,
    codigoDocumento: (cab.codigoDocumento as string) || null,
    periodoInicio: (cab.periodoInicio as string) || null,
    periodoFin: (cab.periodoFin as string) || null,
    moneda: (cab.moneda as string) || 'USD',
    presupuestoContractual: cab.presupuestoContractual != null ? Number(cab.presupuestoContractual) : null,
    montoValorizacion: cab.montoValorizacion != null ? Number(cab.montoValorizacion) : null,
    subtotalSinIGV: cab.subtotalSinIGV != null ? Number(cab.subtotalSinIGV) : null,
    descuentoComercialPorcentaje: Number(cab.descuentoComercialPorcentaje) || 0,
    adelantoPorcentaje: Number(cab.adelantoPorcentaje) || 0,
    igvPorcentaje: Number(cab.igvPorcentaje) || 18,
    fondoGarantiaPorcentaje: Number(cab.fondoGarantiaPorcentaje) || 0,
    netoARecibir: cab.netoARecibir != null ? Number(cab.netoARecibir) : null,
    observaciones: (cab.observaciones as string) || null,
  }

  const partidas: ValorizacionExtractedPartida[] = partidasRaw.map((p, i) => {
    const anterior = Number(p.porcentajeAcumuladoAnterior) || 0
    const actual = Number(p.porcentajeAcumuladoActual) || 0
    const avance = Number(p.porcentajeAvance) || Math.max(0, actual - anterior)
    const monto = Number(p.montoContractual) || 0
    return {
      numero: Number(p.numero) || i + 1,
      descripcion: (p.descripcion as string) || `Partida ${i + 1}`,
      unidad: (p.unidad as string) || null,
      cantidad: p.cantidad != null ? Number(p.cantidad) : null,
      precioUnitario: p.precioUnitario != null ? Number(p.precioUnitario) : null,
      montoContractual: monto,
      porcentajeAcumuladoAnterior: anterior,
      porcentajeAcumuladoActual: actual,
      porcentajeAvance: avance,
      montoAvance: Number(p.montoAvance) || monto * avance / 100,
    }
  })

  return {
    cabecera,
    partidas,
    confianza: confianza as 'alta' | 'media' | 'baja',
    advertencias,
    hojas: [],
  }
}

// ── Función principal de extracción ──────────────────────

export async function extractValorizacion(
  buffer: Buffer,
  userId?: string,
): Promise<ValorizacionExtracted> {
  const sheets = readValorizacionSheets(buffer)
  if (sheets.length === 0) throw new Error('El archivo no contiene hojas con datos')

  const client = getClient()
  const model = getModelForTask('excel-extraction')
  const prompt = buildExtractionPrompt(sheets)

  let raw: unknown
  try {
    raw = await callClaude(client, model, prompt, userId, 'valorizacion-import-ia')
  } catch {
    // Fallback to Sonnet
    raw = await callClaude(client, MODELS.sonnet, prompt, userId, 'valorizacion-import-ia')
  }

  const result = parseExtracted(raw as Record<string, unknown>)
  result.hojas = sheets.map(s => s.name)
  return result
}

// ── Generación del diff contra valorización existente ────

interface SistemaVal {
  periodoInicio: string
  periodoFin: string
  moneda: string
  presupuestoContractual: number
  montoValorizacion: number
  // subtotal = montoValorizacion − descuento − adelanto (antes de IGV). Es la cifra principal.
  subtotal: number
  descuentoComercialPorcentaje: number
  adelantoPorcentaje: number
  igvPorcentaje: number
  fondoGarantiaPorcentaje: number
  netoARecibir: number
  partidas: Array<{
    numero: number
    descripcion: string
    montoContractual: number
    porcentajeAcumuladoAnterior: number
    porcentajeAvance: number
    montoAvance: number
  }>
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function numEq(a: number | null, b: number | null, tolerance = 0.1): boolean {
  if (a === null || b === null) return false
  return Math.abs(a - b) <= tolerance
}

export function buildDiff(extraido: ValorizacionExtracted, sistema: SistemaVal): ValorizacionDiff {
  const cab = extraido.cabecera

  // El subtotalSinIGV del documento = la cifra que el gestor compara con el sistema.subtotal.
  // Si la IA no pudo distinguirlo del montoValorizacion, usamos montoValorizacion como fallback.
  const docSubtotal = cab.subtotalSinIGV ?? cab.montoValorizacion

  // El documento del cliente a menudo NO muestra el monto bruto separado del subtotal.
  // Si la IA extrajo el mismo valor para ambos, significa que el bruto no es visible en el doc
  // y la comparación vs sistema.montoValorizacion sería un falso positivo.
  const docMuestraMontoDistinto =
    cab.montoValorizacion != null &&
    cab.subtotalSinIGV != null &&
    Math.abs(cab.montoValorizacion - cab.subtotalSinIGV) > 1

  // El descuento comercial % NO se verifica directamente si el subtotal ya coincide:
  // el descuento puede estar implícito en el subtotal sin aparecer como % explícito en el doc.
  const subtotalCoincide = numEq(sistema.subtotal, docSubtotal)

  const headerDiffs: CampoDiff[] = [
    {
      campo: 'subtotal',
      label: 'Subtotal sin IGV ★',
      valorSistema: sistema.subtotal,
      valorDocumento: docSubtotal,
      coincide: subtotalCoincide,
      unidad: cab.moneda,
    },
    {
      campo: 'netoARecibir',
      label: 'Neto con IGV',
      valorSistema: sistema.netoARecibir,
      valorDocumento: cab.netoARecibir,
      coincide: numEq(sistema.netoARecibir, cab.netoARecibir),
      unidad: cab.moneda,
    },
    // Monto bruto solo se muestra si el documento lo expone claramente por separado del subtotal
    ...(docMuestraMontoDistinto ? [{
      campo: 'montoValorizacion',
      label: 'Monto bruto (antes deducciones)',
      valorSistema: sistema.montoValorizacion,
      valorDocumento: cab.montoValorizacion,
      coincide: numEq(sistema.montoValorizacion, cab.montoValorizacion),
      unidad: cab.moneda,
    } as CampoDiff] : []),
    {
      campo: 'periodoInicio',
      label: 'Inicio período',
      valorSistema: formatDate(sistema.periodoInicio),
      valorDocumento: formatDate(cab.periodoInicio),
      coincide: sistema.periodoInicio?.split('T')[0] === cab.periodoInicio,
    },
    {
      campo: 'periodoFin',
      label: 'Fin período',
      valorSistema: formatDate(sistema.periodoFin),
      valorDocumento: formatDate(cab.periodoFin),
      coincide: sistema.periodoFin?.split('T')[0] === cab.periodoFin,
    },
    {
      campo: 'igvPorcentaje',
      label: 'IGV %',
      valorSistema: sistema.igvPorcentaje,
      valorDocumento: cab.igvPorcentaje,
      coincide: numEq(sistema.igvPorcentaje, cab.igvPorcentaje, 0.01),
      unidad: '%',
    },
    // Descuento comercial % solo se verifica si el subtotal NO coincide o el doc muestra >0.
    // Si subtotal ya coincide con descuento=0 en doc, el descuento está implícito: no es una diferencia real.
    ...(!subtotalCoincide || cab.descuentoComercialPorcentaje > 0 ? [{
      campo: 'descuentoComercialPorcentaje',
      label: 'Descuento comercial %',
      valorSistema: sistema.descuentoComercialPorcentaje,
      valorDocumento: cab.descuentoComercialPorcentaje,
      coincide: numEq(sistema.descuentoComercialPorcentaje, cab.descuentoComercialPorcentaje, 0.01),
      unidad: '%',
    } as CampoDiff] : []),
    {
      campo: 'adelantoPorcentaje',
      label: 'Amortización adelanto %',
      valorSistema: sistema.adelantoPorcentaje,
      valorDocumento: cab.adelantoPorcentaje,
      coincide: numEq(sistema.adelantoPorcentaje, cab.adelantoPorcentaje, 0.01),
      unidad: '%',
    },
  ]

  // Normaliza descripciones para matching
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

  const sisPartidas = sistema.partidas
  const docPartidas = extraido.partidas

  const matched = new Set<number>()
  const partidaDiffs = docPartidas.map(dp => {
    // Buscar por número exacto primero, luego por descripción
    let sp = sisPartidas.find(s => s.numero === dp.numero)
    if (!sp) sp = sisPartidas.find(s => norm(s.descripcion) === norm(dp.descripcion))

    if (!sp) {
      return {
        numero: dp.numero,
        descripcion: dp.descripcion,
        coincide: false,
        soloEnDocumento: true,
        soloEnSistema: false,
        diffs: [] as CampoDiff[],
      }
    }
    matched.add(sp.numero)

    const diffs: CampoDiff[] = [
      {
        campo: 'montoContractual',
        label: 'Monto contractual',
        valorSistema: sp.montoContractual,
        valorDocumento: dp.montoContractual,
        coincide: numEq(sp.montoContractual, dp.montoContractual),
      },
      {
        campo: 'porcentajeAvance',
        label: '% Avance (período)',
        valorSistema: sp.porcentajeAvance,
        valorDocumento: dp.porcentajeAvance,
        coincide: numEq(sp.porcentajeAvance, dp.porcentajeAvance, 0.5),
        unidad: '%',
      },
      {
        campo: 'montoAvance',
        label: 'Monto período',
        valorSistema: sp.montoAvance,
        valorDocumento: dp.montoAvance,
        coincide: numEq(sp.montoAvance, dp.montoAvance),
      },
    ]

    return {
      numero: dp.numero,
      descripcion: dp.descripcion,
      coincide: diffs.every(d => d.coincide),
      soloEnDocumento: false,
      soloEnSistema: false,
      diffs,
    }
  })

  // Partidas que están en el sistema pero no en el documento
  const soloSistema = sisPartidas
    .filter(s => !matched.has(s.numero))
    .map(s => ({
      numero: s.numero,
      descripcion: s.descripcion,
      coincide: false,
      soloEnDocumento: false,
      soloEnSistema: true,
      diffs: [] as CampoDiff[],
    }))

  const allPartidas = [...partidaDiffs, ...soloSistema]
    .sort((a, b) => a.numero - b.numero)

  const totalCampos = headerDiffs.length + allPartidas.reduce((a, p) => a + p.diffs.length, 0)
  const coinciden = headerDiffs.filter(d => d.coincide).length + allPartidas.reduce((a, p) => a + p.diffs.filter(d => d.coincide).length, 0)

  return {
    extraido,
    cabecera: headerDiffs,
    partidas: allPartidas,
    resumen: {
      totalCampos,
      coinciden,
      difieren: totalCampos - coinciden,
      partidasSoloDoc: partidaDiffs.filter(p => p.soloEnDocumento).length,
      partidasSoloSistema: soloSistema.length,
    },
  }
}
