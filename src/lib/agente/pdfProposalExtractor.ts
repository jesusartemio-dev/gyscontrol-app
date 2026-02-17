// src/lib/agente/pdfProposalExtractor.ts
// Extrae datos de PDFs de propuestas comerciales usando Claude Vision
// Reutiliza patrón de comprobante-ocr/route.ts

import Anthropic from '@anthropic-ai/sdk'

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

export interface PropuestaExtraida {
  clienteNombre?: string
  clienteRuc?: string
  nombreProyecto?: string
  codigoOriginal?: string
  moneda?: 'USD' | 'PEN'
  formaPago?: string
  validezDias?: number
  tiempoEntrega?: string
  incluyeIGV?: boolean
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
- Identifica el código de cotización (formato GYS-XXXX-YY)
- Identifica la moneda (USD o PEN)
- Si hay un alcance de proyecto personalizado (no boilerplate), extráelo`

const USER_PROMPT = `Analiza esta propuesta comercial de GYS Control y devuelve ÚNICAMENTE un JSON válido:

{
  "clienteNombre": "nombre del cliente o null",
  "clienteRuc": "RUC de 11 dígitos o null",
  "nombreProyecto": "nombre/referencia del proyecto o null",
  "codigoOriginal": "código GYS-XXXX-YY o null",
  "moneda": "USD o PEN",
  "formaPago": "forma de pago personalizada o null",
  "validezDias": 15,
  "tiempoEntrega": "tiempo de entrega si difiere del estándar o null",
  "incluyeIGV": false,
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
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new Anthropic({ apiKey })
}

/**
 * Extrae datos estructurados de un PDF de propuesta comercial GYS.
 */
export async function extractPdfProposal(
  pdfBase64: string
): Promise<PropuestaExtraida> {
  const client = getClient()
  const model = process.env.AI_EXTRACTION_MODEL || 'claude-sonnet-4-5-20250929'

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
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
      nombreProyecto: raw.nombreProyecto || undefined,
      codigoOriginal: raw.codigoOriginal || undefined,
      moneda: raw.moneda === 'PEN' ? 'PEN' : 'USD',
      formaPago: raw.formaPago || undefined,
      validezDias: typeof raw.validezDias === 'number' ? raw.validezDias : undefined,
      tiempoEntrega: raw.tiempoEntrega || undefined,
      incluyeIGV: typeof raw.incluyeIGV === 'boolean' ? raw.incluyeIGV : false,
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
      condiciones: [],
      exclusiones: [],
      confianzaGeneral: 'baja',
      observaciones: `No se pudo parsear la respuesta del modelo: ${text.substring(0, 200)}`,
    }
  }
}
