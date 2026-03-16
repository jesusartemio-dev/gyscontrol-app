import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { getModelForTask } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { prisma } from '@/lib/prisma'

// ── Types ──────────────────────────────────────────────────────────────────

export type PdfExtractedItem = {
  codigo: string
  descripcion: string
  marca: string
  precioLista: number | null
  categoriaSugerida: string | null
  unidadSugerida: string | null
  confianza: 'alta' | 'media' | 'baja'
  // Server-side matching results
  matchedEquipoId: string | null
  matchedCodigo: string | null
  matchedDescripcion: string | null
  isNew: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const SYSTEM_PROMPT = `Eres un especialista en extracción de datos de cotizaciones y catálogos de equipos de automatización industrial, instrumentación y control.
Tu tarea: extraer TODOS los equipos/ítems del PDF con sus datos técnicos y precios.

Para cada equipo, extrae:
- codigo: código del producto/catálogo del fabricante (part number, modelo, referencia). IMPORTANTE: si el documento tiene columnas separadas como "Código" (código interno del proveedor) y "Catálogo" (código del fabricante/producto), SIEMPRE usa el valor de "Catálogo" como codigo. El código de catálogo del fabricante es la prioridad.
- descripcion: descripción completa del equipo incluyendo especificaciones técnicas
- marca: marca o fabricante del equipo
- precioLista: precio unitario como número decimal (sin símbolo de moneda, sin separadores de miles). Si no hay precio, null
- categoriaSugerida: nombre de categoría sugerida basándote en el tipo de equipo (ej: "Instrumentación", "PLC", "HMI", "Variador de Frecuencia", "Cable", "Tubería", "Válvula", "Sensor", "Controlador", etc.)
- unidadSugerida: unidad de medida (ej: "UND", "PZA", "MTS", "KG", "ML", "GLB")
- confianza: "alta" si los datos son claros y legibles, "media" si algún campo es ambiguo, "baja" si es inferido o incierto

Reglas:
- Extrae TODOS los ítems del documento, no omitas ninguno
- Si un ítem no tiene código claro, usa la descripción abreviada como código
- Prioridad de código: Catálogo > Part Number > Modelo > Código interno del proveedor
- Devuelve ÚNICAMENTE un JSON array válido, sin markdown, backticks ni texto adicional
- Los precios deben ser números, no strings`

// ── Helpers ────────────────────────────────────────────────────────────────

function parseExtractResponse(text: string): Omit<PdfExtractedItem, 'matchedEquipoId' | 'matchedCodigo' | 'matchedDescripcion' | 'isNew'>[] {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  let parsed: unknown[]
  try {
    parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) throw new Error('Not an array')
  } catch {
    throw new Error(`No se pudo interpretar la respuesta de IA: ${text.substring(0, 200)}`)
  }

  return parsed.map((raw: unknown) => {
    const r = raw as Record<string, unknown>
    return {
      codigo: String(r.codigo ?? '').trim(),
      descripcion: String(r.descripcion ?? '').trim(),
      marca: String(r.marca ?? '').trim(),
      precioLista: typeof r.precioLista === 'number' ? r.precioLista : null,
      categoriaSugerida: typeof r.categoriaSugerida === 'string' ? r.categoriaSugerida.trim() : null,
      unidadSugerida: typeof r.unidadSugerida === 'string' ? r.unidadSugerida.trim() : null,
      confianza: (['alta', 'media', 'baja'] as const).includes(r.confianza as 'alta' | 'media' | 'baja')
        ? (r.confianza as 'alta' | 'media' | 'baja')
        : 'media',
    }
  })
}

function matchAgainstCatalog(
  items: Omit<PdfExtractedItem, 'matchedEquipoId' | 'matchedCodigo' | 'matchedDescripcion' | 'isNew'>[],
  catalog: { id: string; codigo: string; descripcion: string }[]
): PdfExtractedItem[] {
  const catalogByCode = new Map(catalog.map(c => [c.codigo.toLowerCase().trim(), c]))

  return items.map(item => {
    const normalizedCode = item.codigo.toLowerCase().trim()
    const match = catalogByCode.get(normalizedCode)

    if (match) {
      return {
        ...item,
        matchedEquipoId: match.id,
        matchedCodigo: match.codigo,
        matchedDescripcion: match.descripcion,
        isNew: false,
      }
    }

    return {
      ...item,
      matchedEquipoId: null,
      matchedCodigo: null,
      matchedDescripcion: null,
      isNew: true,
    }
  })
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!(await isIAFeatureEnabled('importCatalogoPDF'))) {
      return NextResponse.json(
        { error: 'La importación de catálogo por PDF está deshabilitada por el administrador.' },
        { status: 403 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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

    // Fetch existing catalog for matching
    const existingCatalog = await prisma.catalogoEquipo.findMany({
      select: { id: true, codigo: true, descripcion: true },
    })

    // Prepare PDF for Claude
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })
    const model = getModelForTask('pdf-extraction')

    const userText = `Analiza este PDF de cotización/catálogo de equipos.
Extrae TODOS los equipos/ítems con sus datos.
Devuelve SOLO un JSON array:
[{ "codigo": "...", "descripcion": "...", "marca": "...", "precioLista": number|null, "categoriaSugerida": "...", "unidadSugerida": "...", "confianza": "alta|media|baja" }]`

    const scanStart = Date.now()
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
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
      tipo: 'import-catalogo-pdf',
      modelo: model,
      tokensInput: message.usage?.input_tokens ?? 0,
      tokensOutput: message.usage?.output_tokens ?? 0,
      duracionMs: Date.now() - scanStart,
      metadata: { fileName: file.name, catalogSize: existingCatalog.length },
    })

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const extractedItems = parseExtractResponse(responseText)
    const matchedItems = matchAgainstCatalog(extractedItems, existingCatalog)

    return NextResponse.json({
      ok: true,
      items: matchedItems,
      stats: {
        total: matchedItems.length,
        nuevos: matchedItems.filter(i => i.isNew).length,
        existentes: matchedItems.filter(i => !i.isNew).length,
      },
    })
  } catch (error) {
    console.error('Error en import-pdf de catálogo:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: `Error procesando PDF: ${msg}` }, { status: 500 })
  }
}
