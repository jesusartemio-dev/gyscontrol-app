// src/lib/agente/cotizacionDocumentoExtractor.ts
// Extrae datos estructurados de la Propuesta Económica (PDF) que dio origen a un proyecto,
// usando Claude para leer el PDF nativamente (sin pdf-parse) y clasificar cada línea del
// resumen económico en equipos/servicios/gastos cuando el documento no lo separa explícito.

import Anthropic from '@anthropic-ai/sdk'
import { getModelForTask } from './models'
import { trackUsage } from './usageTracker'

// ── Tipos exportados ──────────────────────────────────────

export interface LineaClasificada {
  descripcion: string
  monto: number
  categoria: 'equipos' | 'servicios' | 'gastos'
  seccionOriginalDocumento: string | null
}

export interface CotizacionDocumentoExtracted {
  numeroPropuesta: string | null
  clienteDetectado: string | null
  moneda: string
  fechaPropuesta: string | null // YYYY-MM-DD
  totalEquipos: number
  totalServicios: number
  totalGastos: number
  descuento: number
  grandTotal: number
  grandTotalIncluyeImpuestos: boolean
  resumenAlcance: string[]
  exclusiones: string[]
  lineasClasificadas: LineaClasificada[]
  confianza: 'alta' | 'media' | 'baja'
  advertencias: string[]
}

export interface CampoDiffCotizacion {
  campo: string
  label: string
  valorSistema: number
  valorDocumento: number
  coincide: boolean
  unidad?: string
}

export interface SistemaCotizacionTotales {
  moneda: string | null
  totalEquiposCliente: number
  totalServiciosCliente: number
  totalGastosCliente: number
  descuento: number
  grandTotal: number
}

export interface CotizacionDiff {
  monedaCoincide: boolean
  campos: CampoDiffCotizacion[]
  estadoGeneral: 'coincide' | 'no_coincide' | 'sin_verificar'
  resumen: { totalCampos: number; coinciden: number; difieren: number }
}

// ── Prompt ────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un especialista en extracción de datos de Propuestas Económicas (cotizaciones) en PDF emitidas por GYS Control Industrial a sus clientes, para equipos de gestión de proyectos.

Tu tarea es leer el PDF completo y devolver un JSON con:

1. CABECERA: número de propuesta (ej. "GYS-4251-25 R04"), cliente ("SEÑORES"), moneda, fecha de emisión.

2. TOTALES POR CATEGORÍA — CLASIFICACIÓN SEMÁNTICA:
Busca la tabla de "RESUMEN" (o equivalente) con el desglose económico. Si el documento ya separa explícitamente las líneas en secciones tipo "A. MATERIALES", "B. SERVICIO", "C. GASTOS OPERATIVOS", respeta esa separación. Si NO las separa (tabla plana de N ítems mezclados), clasifica CADA línea usando este criterio:
- "equipos": suministro de materiales, cables, equipos de control, luminarias, tuberías, accesorios — cualquier ítem de SUMINISTRO/COMPRA de bienes físicos.
- "servicios": instalación, montaje, tendido y conexionado, programación, integración SCADA/PLC, puesta en marcha, comisionamiento, dossier de calidad, mano de obra técnica.
- "gastos": alquiler de andamios/grúa/contenedor, movilización, gastos operativos, costos indirectos, costos administrativos.
Suma los montos de cada categoría para obtener totalEquipos, totalServicios, totalGastos.

3. DESCUENTO Y GRAN TOTAL:
- descuento: monto ABSOLUTO del descuento (columna "DSCTO"/"DESCUENTO"). Si el documento solo da un porcentaje, calcúlalo sobre el subtotal bruto (total antes de descuento).
- grandTotal: el total final después de descuento (columna "GRAND TOTAL"/"TOTAL $" final).
- grandTotalIncluyeImpuestos: true solo si el documento indica explícitamente que el total incluye IGV/impuestos (la mayoría de propuestas GYS dicen "IGV: No incluye" → false).

4. RESUMEN DE ALCANCE: 3-8 bullets concisos con los puntos clave del alcance/objetivos del proyecto, extraídos de la sección narrativa "ALCANCE DEL PROYECTO"/"ALCANCE DEL SERVICIO" (NO copies la tabla de ítems, sintetiza los objetivos).

5. EXCLUSIONES: bullets de la sección "EXCLUSIONES"/"OBSERVACIONES" — los puntos que suelen generar disputas después (ej. "no incluye instrumentación", "no incluye licencias de software").

6. lineasClasificadas: array de auditoría con cada línea de la tabla de resumen (descripcion, monto, categoria asignada, seccionOriginalDocumento si el PDF ya la separaba en secciones, sino null).

7. confianza: "alta" si la tabla de resumen es clara y sin ambigüedad de clasificación; "media" si tuviste que inferir la categoría de algunas líneas; "baja" si el documento es confuso o incompleto.

8. advertencias: array de strings señalando decisiones no triviales (ej. "línea 'Gastos operativos, costos indirectos' clasificada como gastos por inferencia, el documento no la separaba explícitamente").

Responde ÚNICAMENTE con el objeto JSON, sin markdown, sin backticks, sin texto adicional.`

function buildUserPrompt(): string {
  return `Analiza este PDF de Propuesta Económica y devuelve SOLO este objeto JSON (sin texto adicional):
{
  "numeroPropuesta": "string|null",
  "clienteDetectado": "string|null",
  "moneda": "USD",
  "fechaPropuesta": "YYYY-MM-DD|null",
  "totalEquipos": 0,
  "totalServicios": 0,
  "totalGastos": 0,
  "descuento": 0,
  "grandTotal": 0,
  "grandTotalIncluyeImpuestos": false,
  "resumenAlcance": ["..."],
  "exclusiones": ["..."],
  "lineasClasificadas": [
    { "descripcion": "...", "monto": 0, "categoria": "equipos|servicios|gastos", "seccionOriginalDocumento": "string|null" }
  ],
  "confianza": "alta",
  "advertencias": []
}`
}

// ── Parser tolerante ──────────────────────────────────────

function parseExtractedResponse(text: string): CotizacionDocumentoExtracted {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('La IA no devolvió un JSON válido al leer la propuesta económica')
    }
    parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
  }

  const lineasRaw = Array.isArray(parsed.lineasClasificadas) ? parsed.lineasClasificadas : []
  const lineasClasificadas: LineaClasificada[] = lineasRaw.map((raw: unknown) => {
    const r = raw as Record<string, unknown>
    const categoria = (['equipos', 'servicios', 'gastos'] as const).includes(r.categoria as never)
      ? (r.categoria as 'equipos' | 'servicios' | 'gastos')
      : 'gastos'
    return {
      descripcion: typeof r.descripcion === 'string' ? r.descripcion : '',
      monto: typeof r.monto === 'number' ? r.monto : 0,
      categoria,
      seccionOriginalDocumento: typeof r.seccionOriginalDocumento === 'string' ? r.seccionOriginalDocumento : null,
    }
  })

  return {
    numeroPropuesta: typeof parsed.numeroPropuesta === 'string' ? parsed.numeroPropuesta : null,
    clienteDetectado: typeof parsed.clienteDetectado === 'string' ? parsed.clienteDetectado : null,
    moneda: typeof parsed.moneda === 'string' ? parsed.moneda : 'USD',
    fechaPropuesta: typeof parsed.fechaPropuesta === 'string' ? parsed.fechaPropuesta : null,
    totalEquipos: typeof parsed.totalEquipos === 'number' ? parsed.totalEquipos : 0,
    totalServicios: typeof parsed.totalServicios === 'number' ? parsed.totalServicios : 0,
    totalGastos: typeof parsed.totalGastos === 'number' ? parsed.totalGastos : 0,
    descuento: typeof parsed.descuento === 'number' ? parsed.descuento : 0,
    grandTotal: typeof parsed.grandTotal === 'number' ? parsed.grandTotal : 0,
    grandTotalIncluyeImpuestos: parsed.grandTotalIncluyeImpuestos === true,
    resumenAlcance: Array.isArray(parsed.resumenAlcance) ? parsed.resumenAlcance.filter((s): s is string => typeof s === 'string') : [],
    exclusiones: Array.isArray(parsed.exclusiones) ? parsed.exclusiones.filter((s): s is string => typeof s === 'string') : [],
    lineasClasificadas,
    confianza: (['alta', 'media', 'baja'] as const).includes(parsed.confianza as never)
      ? (parsed.confianza as 'alta' | 'media' | 'baja')
      : 'media',
    advertencias: Array.isArray(parsed.advertencias) ? parsed.advertencias.filter((s): s is string => typeof s === 'string') : [],
  }
}

// ── Función principal de extracción ──────────────────────

export async function extractCotizacionDocumento(
  buffer: Buffer,
  userId: string,
  fileName: string,
): Promise<CotizacionDocumentoExtracted> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

  const client = new Anthropic({ apiKey, timeout: 90_000 })
  const model = getModelForTask('pdf-extraction-cotizacion')
  const base64Data = buffer.toString('base64')

  const start = Date.now()
  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
          } as Anthropic.Messages.ContentBlockParam,
          { type: 'text', text: buildUserPrompt() },
        ],
      },
    ],
  })

  trackUsage({
    userId,
    tipo: 'cotizacion-proyecto-extraccion',
    modelo: model,
    tokensInput: message.usage?.input_tokens ?? 0,
    tokensOutput: message.usage?.output_tokens ?? 0,
    tokensCacheCreation: message.usage?.cache_creation_input_tokens ?? 0,
    tokensCacheRead: message.usage?.cache_read_input_tokens ?? 0,
    duracionMs: Date.now() - start,
    metadata: { fileName },
  })

  const responseText = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  return parseExtractedResponse(responseText)
}

// ── Diff contra totales reales del proyecto ──────────────

function numEqRel(a: number | null, b: number | null, relTol = 0.005, minAbs = 1): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return Math.abs(a - b) <= Math.max(minAbs, Math.abs(b) * relTol)
}

export function buildDiffCotizacion(
  extraido: CotizacionDocumentoExtracted,
  sistema: SistemaCotizacionTotales,
): CotizacionDiff {
  const monedaCoincide = !sistema.moneda || sistema.moneda === extraido.moneda

  const campos: CampoDiffCotizacion[] = [
    {
      campo: 'totalEquipos',
      label: 'Total Equipos',
      valorSistema: sistema.totalEquiposCliente,
      valorDocumento: extraido.totalEquipos,
      coincide: numEqRel(sistema.totalEquiposCliente, extraido.totalEquipos),
      unidad: extraido.moneda,
    },
    {
      campo: 'totalServicios',
      label: 'Total Servicios',
      valorSistema: sistema.totalServiciosCliente,
      valorDocumento: extraido.totalServicios,
      coincide: numEqRel(sistema.totalServiciosCliente, extraido.totalServicios),
      unidad: extraido.moneda,
    },
    {
      campo: 'totalGastos',
      label: 'Total Gastos',
      valorSistema: sistema.totalGastosCliente,
      valorDocumento: extraido.totalGastos,
      coincide: numEqRel(sistema.totalGastosCliente, extraido.totalGastos),
      unidad: extraido.moneda,
    },
    {
      campo: 'descuento',
      label: 'Descuento',
      valorSistema: sistema.descuento,
      valorDocumento: extraido.descuento,
      coincide: numEqRel(sistema.descuento, extraido.descuento),
      unidad: extraido.moneda,
    },
    {
      campo: 'grandTotal',
      label: 'Gran Total ★',
      valorSistema: sistema.grandTotal,
      valorDocumento: extraido.grandTotal,
      coincide: numEqRel(sistema.grandTotal, extraido.grandTotal),
      unidad: extraido.moneda,
    },
  ]

  const coinciden = campos.filter(c => c.coincide).length
  const estadoGeneral: CotizacionDiff['estadoGeneral'] = !monedaCoincide
    ? 'sin_verificar'
    : coinciden === campos.length
      ? 'coincide'
      : 'no_coincide'

  return {
    monedaCoincide,
    campos,
    estadoGeneral,
    resumen: { totalCampos: campos.length, coinciden, difieren: campos.length - coinciden },
  }
}
