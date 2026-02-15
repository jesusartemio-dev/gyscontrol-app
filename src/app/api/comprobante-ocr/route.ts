import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

// ── Tipos ────────────────────────────────────────────────

interface OcrResult {
  tipoComprobante: 'factura' | 'boleta' | 'recibo' | 'ticket' | 'sin_comprobante'
  numeroComprobante: string | null
  proveedorRuc: string | null
  proveedorNombre: string | null
  fechaEmision: string | null
  montoTotal: number | null
  igv: number | null
  moneda: 'PEN' | 'USD'
  descripcion: string
  confianza: 'alta' | 'media' | 'baja'
  observaciones: string | null
}

interface SunatInfo {
  razonSocial: string
  estado: string
  condicion: string
  direccion: string
}

export interface ComprobanteOcrResponse {
  ok: true
  data: OcrResult & {
    sunat: SunatInfo | null
    sunatAlerta: string | null
    sunatAlertaTipo: 'warning' | 'info' | null
  }
}

// ── Constantes ───────────────────────────────────────────

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type ImageMediaType = (typeof SUPPORTED_IMAGE_TYPES)[number]

const SUPPORTED_MIME_TYPES = [...SUPPORTED_IMAGE_TYPES, 'application/pdf'] as const
type SupportedMediaType = (typeof SUPPORTED_MIME_TYPES)[number]

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB - límite Claude Vision

const SYSTEM_PROMPT = `Eres un sistema OCR especializado en comprobantes de pago peruanos (facturas electrónicas SUNAT, boletas de venta, recibos por honorarios, tickets de máquina registradora).

Extrae los datos estructurados del comprobante en la imagen/PDF proporcionado.

Reglas:
- RUC tiene exactamente 11 dígitos numéricos
- Facturas tienen formato: F###-######## o E001-########
- Boletas tienen formato: B###-########
- Recibos por honorarios: E###-########
- Si el comprobante está en moneda USD o dólares, indica moneda "USD", de lo contrario "PEN"
- Si no puedes leer un campo con certeza, devuelve null para ese campo
- El monto total debe incluir IGV (total a pagar)
- IGV en Perú es 18% sobre la base imponible
- La descripción debe ser un resumen breve del concepto o detalle de los items
- Si la imagen NO es un comprobante de pago, devuelve tipoComprobante "sin_comprobante" y describe qué es en la descripción`

const USER_PROMPT = `Analiza este comprobante de pago y devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:

{
  "tipoComprobante": "factura|boleta|recibo|ticket|sin_comprobante",
  "numeroComprobante": "string o null",
  "proveedorRuc": "string de 11 dígitos o null",
  "proveedorNombre": "string o null",
  "fechaEmision": "YYYY-MM-DD o null",
  "montoTotal": number o null,
  "igv": number o null,
  "moneda": "PEN|USD",
  "descripcion": "resumen breve del concepto/detalle",
  "confianza": "alta|media|baja",
  "observaciones": "string si hay problemas de lectura, null si todo OK"
}

No incluyas markdown, backticks, ni texto adicional. Solo el JSON.`

// ── Helpers ──────────────────────────────────────────────

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY no configurada')
  }
  return new Anthropic({ apiKey })
}

function getOcrModel(): string {
  return process.env.OCR_MODEL || 'claude-haiku-4-5-20251001'
}

type SunatResult = {
  sunat: SunatInfo | null
  sunatAlerta: string | null
  sunatAlertaTipo: 'warning' | 'info' | null
}

// ── Throttle para PeruAPI (plan free tiene rate limit) ──
// Serializa las consultas SUNAT con 500ms de delay entre cada una.
// Las requests concurrentes al mismo serverless instance comparten este módulo.
let sunatQueue: Promise<void> = Promise.resolve()
const SUNAT_DELAY_MS = 500

function consultarSunatThrottled(ruc: string): Promise<SunatResult> {
  return new Promise<SunatResult>((resolve) => {
    sunatQueue = sunatQueue.then(async () => {
      const result = await consultarSunatInternal(ruc)
      await new Promise((r) => setTimeout(r, SUNAT_DELAY_MS))
      resolve(result)
    })
  })
}

async function consultarSunatInternal(ruc: string): Promise<SunatResult> {
  const apiKey = process.env.PERU_API_KEY
  if (!apiKey) {
    return { sunat: null, sunatAlerta: 'No se pudo verificar RUC en SUNAT', sunatAlertaTipo: 'info' }
  }

  try {
    // Intentar endpoint REST primero, luego legacy si falla con 401
    let res = await fetch(
      `https://peruapi.com/api/ruc/${ruc}?api_token=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (res.status === 401) {
      // Intentar formato legacy como fallback
      res = await fetch(
        `https://peruapi.com/api.php?json=ruc&id=${ruc}&api_token=${apiKey}`,
        { signal: AbortSignal.timeout(10000) }
      )
    }

    if (!res.ok) {
      console.warn(`PeruAPI error: HTTP ${res.status} for RUC ${ruc}`)
      return { sunat: null, sunatAlerta: 'No se pudo verificar RUC en SUNAT', sunatAlertaTipo: 'info' }
    }

    const data = await res.json()

    if (data.code !== '200' && data.code !== 200) {
      return { sunat: null, sunatAlerta: data.mensaje || 'RUC no encontrado en SUNAT', sunatAlertaTipo: 'info' }
    }

    const sunat: SunatInfo = {
      razonSocial: data.razon_social || '',
      estado: data.estado || '',
      condicion: data.condicion || '',
      direccion: data.direccion || '',
    }

    // Solo alertas reales (NOT HABIDO, NOT ACTIVO) son warnings
    let sunatAlerta: string | null = null
    let sunatAlertaTipo: 'warning' | 'info' | null = null
    if (sunat.condicion !== 'HABIDO') {
      sunatAlerta = `Proveedor NO HABIDO (condición: ${sunat.condicion})`
      sunatAlertaTipo = 'warning'
    }
    if (sunat.estado !== 'ACTIVO') {
      sunatAlerta = `Proveedor NO ACTIVO (estado: ${sunat.estado})${sunatAlerta ? `. ${sunatAlerta}` : ''}`
      sunatAlertaTipo = 'warning'
    }

    return { sunat, sunatAlerta, sunatAlertaTipo }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.warn(`PeruAPI error for RUC ${ruc}:`, message)
    return { sunat: null, sunatAlerta: 'No se pudo verificar RUC en SUNAT', sunatAlertaTipo: 'info' }
  }
}

function parseOcrResponse(text: string): OcrResult {
  // Limpiar posible markdown wrapping
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  try {
    const parsed = JSON.parse(cleaned)
    return {
      tipoComprobante: parsed.tipoComprobante || 'sin_comprobante',
      numeroComprobante: parsed.numeroComprobante || null,
      proveedorRuc: parsed.proveedorRuc || null,
      proveedorNombre: parsed.proveedorNombre || null,
      fechaEmision: parsed.fechaEmision || null,
      montoTotal: typeof parsed.montoTotal === 'number' ? parsed.montoTotal : null,
      igv: typeof parsed.igv === 'number' ? parsed.igv : null,
      moneda: parsed.moneda === 'USD' ? 'USD' : 'PEN',
      descripcion: parsed.descripcion || 'Sin descripción',
      confianza: ['alta', 'media', 'baja'].includes(parsed.confianza) ? parsed.confianza : 'baja',
      observaciones: parsed.observaciones || null,
    }
  } catch {
    return {
      tipoComprobante: 'sin_comprobante',
      numeroComprobante: null,
      proveedorRuc: null,
      proveedorNombre: null,
      fechaEmision: null,
      montoTotal: null,
      igv: null,
      moneda: 'PEN',
      descripcion: 'No se pudo interpretar la respuesta del modelo',
      confianza: 'baja',
      observaciones: `Respuesta no parseable: ${text.substring(0, 200)}`,
    }
  }
}

// ── Handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    // Validar tipo de archivo
    const mimeType = file.type || 'application/octet-stream'
    if (!SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMediaType)) {
      return NextResponse.json(
        { error: `Tipo de archivo no soportado: ${mimeType}. Soportados: JPG, PNG, GIF, WEBP, PDF` },
        { status: 400 }
      )
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB` },
        { status: 400 }
      )
    }

    // Convertir a base64
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    // Llamar a Claude Vision
    const client = getAnthropicClient()
    const model = getOcrModel()

    const isPdf = mimeType === 'application/pdf'
    const fileBlock: Anthropic.Messages.ContentBlockParam = isPdf
      ? {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as ImageMediaType,
            data: base64Data,
          },
        }

    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            {
              type: 'text',
              text: USER_PROMPT,
            },
          ],
        },
      ],
    })

    // Extraer texto de la respuesta
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Parsear resultado OCR
    const ocrResult = parseOcrResponse(responseText)

    // Consultar SUNAT si hay RUC válido
    let sunat: SunatInfo | null = null
    let sunatAlerta: string | null = null
    let sunatAlertaTipo: 'warning' | 'info' | null = null

    if (ocrResult.proveedorRuc && /^\d{11}$/.test(ocrResult.proveedorRuc)) {
      const sunatResult = await consultarSunatThrottled(ocrResult.proveedorRuc)
      sunat = sunatResult.sunat
      sunatAlerta = sunatResult.sunatAlerta
      sunatAlertaTipo = sunatResult.sunatAlertaTipo

      // Si SUNAT devuelve razón social y Claude no la extrajo (o es diferente), preferir SUNAT
      if (sunat?.razonSocial && !ocrResult.proveedorNombre) {
        ocrResult.proveedorNombre = sunat.razonSocial
      }
    }

    const response: ComprobanteOcrResponse = {
      ok: true,
      data: {
        ...ocrResult,
        sunat,
        sunatAlerta,
        sunatAlertaTipo,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error en OCR de comprobante:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: `Error procesando comprobante: ${message}` }, { status: 500 })
  }
}
