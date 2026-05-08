import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { getModelForTask } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { calcularCompletitudGeneral } from '@/lib/tdr/completitud'
import type { TdrAnalisisCore } from '@/types/tdr'

export const maxDuration = 300

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

// ── Prompts ────────────────────────────────────────────────────────────────

const PDF_SUMMARY_PROMPT = `Extrae una síntesis completa y estructurada de este documento TDR/especificación técnica.

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

Sé exhaustivo. Incluye todos los detalles técnicos, números, especificaciones y cantidades.`

const JSON_EXTRACTION_SYSTEM = `Eres un extractor de datos estructurados de documentos TDR.
Recibes un resumen de texto de un TDR y debes convertirlo a JSON estructurado.
IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON. Sin texto adicional, sin markdown, sin explicaciones.`

const JSON_EXTRACTION_SCHEMA = `Devuelve SOLO este objeto JSON con los datos extraídos del resumen. Usa null para campos no encontrados, [] para listas vacías:

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

Tipos de cada campo:
- clienteDetectado/proyectoDetectado/ubicacionDetectada: string | null
- resumenTdr: string (resumen general, obligatorio)
- alcanceDetectado/resumenEjecutivoNarrativa: string | null
- resumenEjecutivoPuntos: [{categoria: "entregable"|"ubicacion"|"plazo"|"condicion"|"otro", texto: string}]
- requerimientos: [{descripcion: string, cantidad: number|null, especificacion: string|null, criticidad: "alta"|"media"|"baja"}]
- equiposIdentificados: [{nombre: string, cantidad: number|null, especificacion: string|null, estimadoUsd: number|null, suministra: "contratista"|"cliente"|null, marcaSugerida: string|null}]
- serviciosIdentificados: [{nombre: string, descripcion: string|null, horasEstimadas: number|null}]
- personalRequerido: [{rol: string, cantidad: number, experienciaAnios: number|null, certificaciones: string[]|null, obligatorio: boolean}]
- cronogramaEstimado: [{fase: string, duracion: string|null, observaciones: string|null}]
- hitosContractuales: [{nombre: string, tipo: "kom"|"fat"|"sat"|"comisionamiento"|"as-built"|"otro", fechaEstimada: string|null, diasDesdeInicio: number|null, entregablesAsociados: string[]|null}]
- normasAplicables: [{codigo: string, nombre: string, categoria: "electrica"|"mecanica"|"ssoma"|"calidad"|"otro"}]
- documentosPrevios: [{nombre: string, diasAnticipacion: number|null, responsable: "contratista"|"cliente"|null, obligatorio: boolean}]
- riesgosCriticos: [{riesgo: string, probabilidad: "alta"|"media"|"baja"|null, impacto: "alta"|"media"|"baja"|null, mitigacion: string|null}]
- presupuestoEstimado: {equipos: number|null, servicios: number|null, gastos: number|null, total: number|null} | null
- penalidades: [{causa: string, tipo: "porcentaje-diario"|"monto-fijo"|"porcentaje-total", valor: number, topeMaximo: number|null}]
- garantias: {fielCumplimiento: {porcentaje: number, vigencia: string}|null, adelanto: {porcentaje: number, vigencia: string}|null, responsabilidadCivil: {monto: number, moneda: string}|null, servicio: {duracionMeses: number}|null} | null
- entregablesDossier: [{nombre: string, formato: "fisico"|"digital"|"ambos"|null, fase: "ingenieria"|"construccion"|"cierre"}]`

// ── Helpers ────────────────────────────────────────────────────────────────

function estimatePdfPages(base64: string): number {
  try {
    const raw = atob(base64)
    const matches = raw.match(/\/Type\s*\/Page(?!s)/g)
    return matches ? matches.length : 0
  } catch {
    return 0
  }
}

function parseJsonResponse(text: string): Record<string, unknown> | null {
  let cleaned = text.trim()

  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) cleaned = match[1].trim()
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch { /* fallthrough */ }

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch { /* fallthrough */ }
  }

  return null
}

function writeSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, event: string, data: unknown) {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
}

const ALLOWED_AI_FIELDS = [
  'clienteDetectado', 'proyectoDetectado', 'ubicacionDetectada',
  'resumenTdr', 'alcanceDetectado', 'resumenEjecutivoNarrativa', 'resumenEjecutivoPuntos',
  'requerimientos', 'equiposIdentificados', 'serviciosIdentificados',
  'personalRequerido', 'cronogramaEstimado', 'hitosContractuales',
  'normasAplicables', 'documentosPrevios', 'riesgosCriticos',
  'presupuestoEstimado', 'penalidades', 'garantias', 'entregablesDossier',
] as const

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isIAFeatureEnabled('analisisTdr'))) {
    return NextResponse.json(
      { error: 'El análisis de TDR con IA está deshabilitado por el administrador.' },
      { status: 403 },
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Archivo PDF requerido' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB` },
      { status: 400 },
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString('base64')
  const pages = estimatePdfPages(base64Data)
  const userId = (session.user as { id: string }).id

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
  }
  const client = new Anthropic({ apiKey })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => writeSSE(controller, encoder, event, data)

      try {
        // ── Fase 1: Extraer texto del PDF con Haiku ────────────────────
        send('status', { fase: 'leyendo', mensaje: `Leyendo PDF (${pages > 0 ? `${pages} pág.` : file.name})…` })

        const haikuModel = getModelForTask('pdf-extraction')
        const t1 = Date.now()
        const pdfResponse = await client.messages.create({
          model: haikuModel,
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
              } as Anthropic.Messages.ContentBlockParam,
              { type: 'text', text: PDF_SUMMARY_PROMPT },
            ],
          }],
        })

        trackUsage({
          userId,
          tipo: 'tdr-proyecto-pdf-lectura',
          modelo: haikuModel,
          tokensInput: pdfResponse.usage?.input_tokens ?? 0,
          tokensOutput: pdfResponse.usage?.output_tokens ?? 0,
          duracionMs: Date.now() - t1,
          metadata: { fileName: file.name, proyectoId, pages },
        })

        const textSummary = pdfResponse.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('\n')

        // ── Fase 2: Convertir texto a JSON estructurado con Sonnet ─────
        send('status', { fase: 'extrayendo', mensaje: 'Extrayendo datos estructurados…' })

        const sonnetModel = getModelForTask('chat')
        const t2 = Date.now()
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

        trackUsage({
          userId,
          tipo: 'tdr-proyecto-pdf-extraccion',
          modelo: sonnetModel,
          tokensInput: jsonResponse.usage?.input_tokens ?? 0,
          tokensOutput: jsonResponse.usage?.output_tokens ?? 0,
          tokensCacheCreation: jsonResponse.usage?.cache_creation_input_tokens ?? 0,
          tokensCacheRead: jsonResponse.usage?.cache_read_input_tokens ?? 0,
          duracionMs: Date.now() - t2,
          metadata: { proyectoId },
        })

        const rawText = jsonResponse.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('')

        const extracted = parseJsonResponse(rawText)
        if (!extracted) {
          console.error('[proyecto/analizar-pdf] Fase 2 JSON parse failed. Raw (500):', rawText.slice(0, 500))
          send('error', { mensaje: 'La IA no pudo estructurar los datos extraídos. Intenta con otro PDF.' })
          return
        }

        // ── Fase 3: Guardar en BD ──────────────────────────────────────
        send('status', { fase: 'guardando', mensaje: 'Guardando análisis…' })

        let analisis = await prisma.proyectoTdrAnalisis.findUnique({ where: { proyectoId } })
        if (!analisis) {
          analisis = await prisma.proyectoTdrAnalisis.create({
            data: {
              proyectoId,
              resumenTdr: '',
              desconectadoDeOrigen: false,
              fechaSnapshot: new Date(),
            },
          })
        }

        const updateData: Record<string, unknown> = {
          nombreArchivo: file.name,
          paginasPdf: pages > 0 ? pages : null,
          desconectadoDeOrigen: true,
          fechaSnapshot: new Date(),
        }
        for (const field of ALLOWED_AI_FIELDS) {
          if (extracted[field] !== undefined) {
            updateData[field] = extracted[field]
          }
        }

        const updated = await prisma.proyectoTdrAnalisis.update({
          where: { id: analisis.id },
          data: updateData,
        })

        const completitud = calcularCompletitudGeneral(updated as unknown as TdrAnalisisCore)
        const final = await prisma.proyectoTdrAnalisis.update({
          where: { id: updated.id },
          data: { bloquesCompletitud: completitud.bloques },
        })

        // Incluir cotizacionId del proyecto para que el UI mantenga el link
        const proyectoConCot = await prisma.proyecto.findUnique({
          where: { id: proyectoId },
          select: { cotizacionId: true },
        })

        send('done', { analisis: { ...final, cotizacionId: proyectoConCot?.cotizacionId ?? null } })
      } catch (error) {
        console.error('[proyecto/analizar-pdf]', error)
        send('error', { mensaje: error instanceof Error ? error.message : 'Error interno' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
