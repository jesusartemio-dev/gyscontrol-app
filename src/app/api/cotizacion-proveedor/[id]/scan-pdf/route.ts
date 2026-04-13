import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { getModelForTask } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { prisma } from '@/lib/prisma'

// ── Types ──────────────────────────────────────────────────────────────────

export type ScanMatch = {
  itemId: string
  codigo: string
  descripcion: string
  precioUnitario: number | null
  tiempoEntrega: string | null
  tiempoEntregaDias: number | null
  confianza: 'alta' | 'media' | 'baja'
  observacion: string | null
}

export type ScanCondiciones = {
  condicionPago: string | null    // "contado" | "factura" | "cheque" | "letra" | "adelanto" | otro texto
  diasCredito: number | null
  lugarEntrega: string | null
  tiempoEntrega: string | null    // plazo general de entrega (cabecera)
  contactoEntrega: string | null
  observaciones: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const SYSTEM_PROMPT = `Eres un especialista en extracción de datos de cotizaciones de proveedores en PDF para equipos de procurement.
Tu tarea: extraer dos cosas del PDF:
1. Para cada ítem de la lista: precio unitario y plazo de entrega
2. Las condiciones comerciales generales de la cotización (forma de pago, lugar de entrega, etc.)

Reglas para ítems:
- Busca por código primero (coincidencia exacta del código alfanumérico), luego por descripción (coincidencia parcial)
- precioUnitario: número decimal sin símbolo de moneda
- tiempoEntrega: texto libre tal como aparece en el PDF (ej. "30 días", "6 semanas", "stock")
- tiempoEntregaDias: convierte tiempoEntrega a días enteros si puedes estimarlo, sino null
- Si no encuentras el ítem: precioUnitario null, tiempoEntrega null, tiempoEntregaDias null
- confianza: "alta" si encontraste por código exacto, "media" si fue por descripción similar, "baja" si es inferido

Reglas para condiciones comerciales (objeto "condiciones"):
- condicionPago: forma de pago detectada. Normaliza a: "contado", "factura", "cheque", "letra", "adelanto", o texto libre si no encaja
- diasCredito: número de días de crédito si se menciona (ej. "30 días" → 30), sino null
- lugarEntrega: lugar de entrega mencionado (ej. "Almacén Lima", "Planta cliente"), sino null
- tiempoEntrega: plazo general de entrega de la cotización si aparece en el encabezado (no por ítem), sino null
- contactoEntrega: nombre o teléfono de contacto para entrega, sino null
- observaciones: notas generales de la cotización (validez de oferta, garantía, etc.), sino null

Devuelve ÚNICAMENTE un JSON objeto con esta estructura exacta, sin markdown ni backticks:
{ "items": [...], "condiciones": { "condicionPago": ..., "diasCredito": ..., "lugarEntrega": ..., "tiempoEntrega": ..., "contactoEntrega": ..., "observaciones": ... } }`

// ── Helpers ────────────────────────────────────────────────────────────────

function parseScanResponse(
  text: string,
  items: { id: string; codigo: string; descripcion: string }[]
): { matches: ScanMatch[]; condiciones: ScanCondiciones } {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  const emptyCondiciones: ScanCondiciones = {
    condicionPago: null, diasCredito: null, lugarEntrega: null,
    tiempoEntrega: null, contactoEntrega: null, observaciones: null,
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return {
      matches: items.map(item => ({
        itemId: item.id, codigo: item.codigo, descripcion: item.descripcion,
        precioUnitario: null, tiempoEntrega: null, tiempoEntregaDias: null,
        confianza: 'baja' as const,
        observacion: `No se pudo procesar la respuesta de IA: ${text.substring(0, 100)}`,
      })),
      condiciones: emptyCondiciones,
    }
  }

  // Support both new format { items, condiciones } and legacy array format
  const rawItems: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.items) ? (parsed as any).items : []

  const rawCondiciones: Record<string, unknown> = (!Array.isArray(parsed) && (parsed as any)?.condiciones)
    ? (parsed as any).condiciones
    : {}

  const condiciones: ScanCondiciones = {
    condicionPago: typeof rawCondiciones.condicionPago === 'string' ? rawCondiciones.condicionPago : null,
    diasCredito: typeof rawCondiciones.diasCredito === 'number' ? Math.round(rawCondiciones.diasCredito) : null,
    lugarEntrega: typeof rawCondiciones.lugarEntrega === 'string' ? rawCondiciones.lugarEntrega : null,
    tiempoEntrega: typeof rawCondiciones.tiempoEntrega === 'string' ? rawCondiciones.tiempoEntrega : null,
    contactoEntrega: typeof rawCondiciones.contactoEntrega === 'string' ? rawCondiciones.contactoEntrega : null,
    observaciones: typeof rawCondiciones.observaciones === 'string' ? rawCondiciones.observaciones : null,
  }

  const itemMap = new Map(items.map(i => [i.id, i]))

  const matches: ScanMatch[] = rawItems.map((raw: unknown) => {
    const r = raw as Record<string, unknown>
    const itemId = String(r.itemId ?? '')
    const item = itemMap.get(itemId)
    return {
      itemId,
      codigo: item?.codigo ?? String(r.codigo ?? ''),
      descripcion: item?.descripcion ?? String(r.descripcion ?? ''),
      precioUnitario: typeof r.precioUnitario === 'number' ? r.precioUnitario : null,
      tiempoEntrega: typeof r.tiempoEntrega === 'string' ? r.tiempoEntrega : null,
      tiempoEntregaDias: typeof r.tiempoEntregaDias === 'number' ? Math.round(r.tiempoEntregaDias) : null,
      confianza: (['alta', 'media', 'baja'] as const).includes(r.confianza as 'alta' | 'media' | 'baja')
        ? (r.confianza as 'alta' | 'media' | 'baja')
        : 'baja',
      observacion: typeof r.observacion === 'string' ? r.observacion : null,
    }
  })

  return { matches, condiciones }
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isIAFeatureEnabled('scanCotizacionPDF'))) {
      return NextResponse.json(
        { error: 'El escaneo de cotizaciones PDF está deshabilitado por el administrador.' },
        { status: 403 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: cotizacionId } = await params

    // Fetch cotización items from DB
    const items = await prisma.cotizacionProveedorItem.findMany({
      where: { cotizacionId },
      select: { id: true, codigo: true, descripcion: true },
    })

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'La cotización no tiene ítems' },
        { status: 400 }
      )
    }

    // Parse uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Archivo PDF requerido' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: `Solo se aceptan archivos PDF. Tipo recibido: ${file.type}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB` },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    // Build Claude request
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }
    const client = new Anthropic({ apiKey })
    const model = getModelForTask('pdf-extraction')

    const itemsJson = JSON.stringify(
      items.map(i => ({ itemId: i.id, codigo: i.codigo, descripcion: i.descripcion }))
    )

    const userText = `Analiza este PDF de cotización del proveedor.

Nuestra lista de compra contiene los siguientes ítems (en JSON):
${itemsJson}

Devuelve SOLO un JSON objeto con esta estructura exacta:
{
  "items": [
    { "itemId": "...", "precioUnitario": number|null, "tiempoEntrega": "string|null", "tiempoEntregaDias": number|null, "confianza": "alta|media|baja", "observacion": "string|null" }
  ],
  "condiciones": {
    "condicionPago": "string|null",
    "diasCredito": number|null,
    "lugarEntrega": "string|null",
    "tiempoEntrega": "string|null",
    "contactoEntrega": "string|null",
    "observaciones": "string|null"
  }
}
El array "items" debe tener exactamente ${items.length} elementos, uno por cada itemId de la lista.`

    const scanStart = Date.now()
    const message = await client.messages.create({
      model,
      max_tokens: 2048,
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
                data: base64Data,
              },
            } as Anthropic.Messages.ContentBlockParam,
            {
              type: 'text',
              text: userText,
            },
          ],
        },
      ],
    })

    // Track usage
    const userId = (session.user as { id: string }).id
    trackUsage({
      userId,
      tipo: 'scan-cotizacion',
      modelo: model,
      tokensInput: message.usage?.input_tokens ?? 0,
      tokensOutput: message.usage?.output_tokens ?? 0,
      duracionMs: Date.now() - scanStart,
      metadata: { fileName: file.name, cotizacionId, itemCount: items.length },
    })

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const { matches, condiciones } = parseScanResponse(responseText, items)

    return NextResponse.json({ ok: true, matches, condiciones })
  } catch (error) {
    console.error('Error en scan-pdf de cotización:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: `Error procesando PDF: ${msg}` }, { status: 500 })
  }
}
