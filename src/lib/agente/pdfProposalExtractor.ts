// src/lib/agente/pdfProposalExtractor.ts
// Extrae datos de PDFs de propuestas comerciales usando Claude Vision
// Reutiliza patrón de comprobante-ocr/route.ts

import Anthropic from '@anthropic-ai/sdk'
import { getModelForTask } from './models'
import { trackUsage } from './usageTracker'

// ── Tipos ─────────────────────────────────────────────────

export interface PdfCondicion {
  texto: string
  tipo?: string
  confianza: 'alta' | 'media' | 'baja'
}

export interface PdfExclusion {
  texto: string
  confianza: 'alta' | 'media' | 'baja'
}

/**
 * Una posición del cuadro económico (POS10, POS20, …) o, si la propuesta no se
 * desglosa, el alcance completo como una sola línea. Solo precio de venta: el
 * costo interno nunca aparece en el documento que ve el cliente.
 */
export interface PdfPartida {
  descripcion: string
  monto: number
}

export interface PropuestaExtraida {
  /** Nombre del archivo de origen. Lo pone el llamador, no el modelo. */
  archivo?: string
  clienteNombre?: string
  clienteRuc?: string
  /** Quién firmó la propuesta ("EMITIDO POR"): es el comercial que la vendió. */
  emitidoPorNombre?: string
  emitidoPorEmail?: string
  nombreProyecto?: string
  codigoOriginal?: string
  /** Fecha de emisión impresa en la propuesta, normalizada a YYYY-MM-DD. */
  fechaEmision?: string
  moneda?: 'USD' | 'PEN'
  formaPago?: string
  validezDias?: number
  tiempoEntrega?: string
  incluyeIGV?: boolean
  montoTotal?: number
  partidas: PdfPartida[]
  condiciones: PdfCondicion[]
  exclusiones: PdfExclusion[]
  alcance?: string
  confianzaGeneral: 'alta' | 'media' | 'baja'
  observaciones?: string
}

// ── Prompt ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un sistema de extracción de datos de propuestas comerciales de automatización industrial en Perú.

Tu tarea es extraer información estructurada de PDFs de propuestas económicas de GYS Control Industrial SAC.

ESTRUCTURA TÍPICA DE UNA PROPUESTA GYS:
- Página 1: Portada con datos del cliente, código de cotización (GYS-XXXX-YY), fecha, referencia, forma de pago, validez, moneda
- Página 2: Resumen ejecutivo con tabla de montos, alcance del proyecto
- Páginas 3-5: Detalle técnico de equipos, servicios y gastos
- Página 6: Términos y condiciones generales (BOILERPLATE - ignorar estos)
- Página 7: Exclusiones y condiciones ESPECÍFICAS del proyecto (ESTAS SÍ EXTRAER)

INSTRUCCIONES:
- Extrae SOLO las condiciones y exclusiones que son ESPECÍFICAS del proyecto (página 7 o similar)
- IGNORA los términos genéricos/boilerplate de la página 6 (condiciones de pago estándar 30/40/30, garantías estándar 12 meses)
- Si una condición es personalizada para el proyecto, extráela con tipo sugerido: "pago", "entrega", "garantia", "soporte", "capacitacion", "alcance", "otro"
- Extrae el nombre del cliente y RUC del encabezado
- Extrae el "EMITIDO POR" de la portada (nombre y correo de quien firma la propuesta por GYS).
  OJO: es el vendedor de GYS, NO confundir con el "ATENCIÓN A", que es el contacto del cliente
- Identifica el código de cotización (formato GYS-XXXX-YY) TAL CUAL aparece impreso, sin corregirlo
- Identifica la fecha de emisión de la propuesta y devuélvela como YYYY-MM-DD (las propuestas
  suelen escribirla en texto, ej. "Lima, 14 de marzo de 2019" → "2019-03-14")
- Identifica la moneda (USD o PEN)
- Si hay un alcance de proyecto personalizado (no boilerplate), extráelo

CUADRO ECONÓMICO (importante para propuestas antiguas, donde el PDF es la única fuente):
- Extrae el monto total de la propuesta y, si el cuadro se desglosa por posiciones
  (POS10, POS20, PARTIDA 1, ÍTEM 1…), extrae cada posición con su descripción y su monto
- Usa montos SIN IGV (subtotal). Si el PDF solo muestra el total con IGV incluido,
  devuelve ese monto y marca "incluyeIGV": true
- Los montos van como número puro, sin símbolo de moneda ni separadores de miles
- Si no logras leer el cuadro económico con seguridad, devuelve montoTotal null y partidas []
  — es preferible vacío a un monto inventado`

const USER_PROMPT = `Analiza esta propuesta comercial de GYS Control y devuelve ÚNICAMENTE un JSON válido:

{
  "clienteNombre": "nombre del cliente o null",
  "clienteRuc": "RUC de 11 dígitos o null",
  "emitidoPorNombre": "nombre de quien emite la propuesta por GYS o null",
  "emitidoPorEmail": "correo de quien emite la propuesta por GYS o null",
  "nombreProyecto": "nombre/referencia del proyecto o null",
  "codigoOriginal": "código GYS-XXXX-YY o null",
  "fechaEmision": "fecha de la propuesta en formato YYYY-MM-DD o null",
  "moneda": "USD o PEN",
  "formaPago": "forma de pago personalizada o null",
  "validezDias": 15,
  "tiempoEntrega": "tiempo de entrega si difiere del estándar o null",
  "incluyeIGV": false,
  "montoTotal": 125000.50,
  "partidas": [
    {
      "descripcion": "POS10 - descripcion de la posicion",
      "monto": 85000.00
    }
  ],
  "condiciones": [
    {
      "texto": "texto completo de la condición específica",
      "tipo": "pago|entrega|garantia|soporte|capacitacion|alcance|otro",
      "confianza": "alta|media|baja"
    }
  ],
  "exclusiones": [
    {
      "texto": "texto completo de la exclusión",
      "confianza": "alta|media|baja"
    }
  ],
  "alcance": "descripción del alcance del proyecto si es personalizada, null si es boilerplate",
  "confianzaGeneral": "alta|media|baja",
  "observaciones": "observaciones sobre la calidad de la extracción o null"
}

No incluyas markdown, backticks, ni texto adicional. Solo el JSON.`

// ── Extracción ────────────────────────────────────────────

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada en las variables de entorno del servidor')
  return new Anthropic({ apiKey, timeout: 90_000 }) // 90s timeout
}

/**
 * Extrae datos estructurados de un PDF de propuesta comercial GYS.
 */
export async function extractPdfProposal(
  pdfBase64: string,
  userId?: string
): Promise<PropuestaExtraida> {
  const client = getClient()
  const model = getModelForTask('pdf-extraction')
  const start = Date.now()

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    // Cache del system: extraer varias propuestas en sesion reusa el cache
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: USER_PROMPT,
          },
        ],
      },
    ],
  })

  // Track usage
  if (userId) {
    trackUsage({
      userId,
      tipo: 'pdf-extraction',
      modelo: model,
      tokensInput: response.usage?.input_tokens ?? 0,
      tokensOutput: response.usage?.output_tokens ?? 0,
      tokensCacheCreation: response.usage?.cache_creation_input_tokens ?? 0,
      tokensCacheRead: response.usage?.cache_read_input_tokens ?? 0,
      duracionMs: Date.now() - start,
    })
  }

  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  return parseResponse(responseText)
}

function parseResponse(text: string): PropuestaExtraida {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  try {
    const raw = JSON.parse(cleaned)

    return {
      clienteNombre: raw.clienteNombre || undefined,
      clienteRuc: raw.clienteRuc || undefined,
      emitidoPorNombre: raw.emitidoPorNombre || undefined,
      emitidoPorEmail: raw.emitidoPorEmail || undefined,
      nombreProyecto: raw.nombreProyecto || undefined,
      codigoOriginal: raw.codigoOriginal || undefined,
      // Solo se acepta ISO: alimenta un <input type="date">, que rechaza cualquier otro formato.
      fechaEmision: /^\d{4}-\d{2}-\d{2}$/.test(raw.fechaEmision)
        ? raw.fechaEmision
        : undefined,
      moneda: raw.moneda === 'PEN' ? 'PEN' : 'USD',
      formaPago: raw.formaPago || undefined,
      validezDias: typeof raw.validezDias === 'number' ? raw.validezDias : undefined,
      tiempoEntrega: raw.tiempoEntrega || undefined,
      incluyeIGV: typeof raw.incluyeIGV === 'boolean' ? raw.incluyeIGV : false,
      montoTotal: typeof raw.montoTotal === 'number' ? raw.montoTotal : undefined,
      partidas: (raw.partidas || [])
        .filter(
          (p: Record<string, unknown>) =>
            typeof p?.monto === 'number' && typeof p?.descripcion === 'string'
        )
        .map((p: Record<string, unknown>) => ({
          descripcion: p.descripcion as string,
          monto: p.monto as number,
        })),
      condiciones: (raw.condiciones || []).map(
        (c: Record<string, unknown>) => ({
          texto: c.texto as string,
          tipo: (c.tipo as string) || undefined,
          confianza: (['alta', 'media', 'baja'].includes(c.confianza as string)
            ? c.confianza
            : 'media') as 'alta' | 'media' | 'baja',
        })
      ),
      exclusiones: (raw.exclusiones || []).map(
        (e: Record<string, unknown>) => ({
          texto: e.texto as string,
          confianza: (['alta', 'media', 'baja'].includes(e.confianza as string)
            ? e.confianza
            : 'media') as 'alta' | 'media' | 'baja',
        })
      ),
      alcance: raw.alcance || undefined,
      confianzaGeneral: (['alta', 'media', 'baja'].includes(raw.confianzaGeneral)
        ? raw.confianzaGeneral
        : 'media') as 'alta' | 'media' | 'baja',
      observaciones: raw.observaciones || undefined,
    }
  } catch {
    return {
      partidas: [],
      condiciones: [],
      exclusiones: [],
      confianzaGeneral: 'baja',
      observaciones: `No se pudo parsear la respuesta del modelo: ${text.substring(0, 200)}`,
    }
  }
}
