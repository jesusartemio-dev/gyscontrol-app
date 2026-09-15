// src/app/api/agente/importar-excel/route.ts
// Paso 1: Recibe Excel (+PDF opcional), extrae datos con Claude, devuelve preview + sugerencias de mapeo
// Usa SSE streaming para reportar progreso al frontend

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readExcelSheets, extractWithClaude } from '@/lib/agente/excelExtractor'
import type { ExcelExtraido } from '@/lib/agente/excelExtractor'
import { extractPdfProposal } from '@/lib/agente/pdfProposalExtractor'
import type { PropuestaExtraida } from '@/lib/agente/pdfProposalExtractor'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { tieneRol } from '@/lib/auth/roles'

// Allow up to 300 seconds for Claude API processing of large Excel files
export const maxDuration = 300

const ROLES_PERMITIDOS = ['admin']

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

// Cada PDF es una llamada a Claude de ~15-30s; con más de esto se acerca al maxDuration.
const MAX_PDFS = 8

interface MappingSuggestion {
  excelName: string
  matches: Array<{ id: string; nombre: string; score: number }>
}

function similarity(a: string, b: string): number {
  const al = a.toLowerCase().trim()
  const bl = b.toLowerCase().trim()
  if (al === bl) return 1.0
  if (al.includes(bl) || bl.includes(al)) return 0.8

  const wordsA = al.split(/\s+/)
  const wordsB = bl.split(/\s+/)
  const common = wordsA.filter((w) => wordsB.some((wb) => wb.includes(w) || w.includes(wb)))
  if (common.length === 0) return 0
  return common.length / Math.max(wordsA.length, wordsB.length)
}

/**
 * Arma el equivalente a un Excel extraído cuando solo hay PDF: una cotización
 * histórica de la que ya no se conserva la hoja de costeo interna. Cada posición
 * del cuadro económico entra como un ítem de suma alzada.
 *
 * El costo interno se iguala al precio de venta con factorVenta 1 en vez de dejarlo
 * en cero: los subtotales se derivan de `precioInterno × factorVenta` (ver
 * calcularSubtotal), así que un costo cero arrastra el total de la cotización a cero
 * y se pierde el único dato real que trae el PDF, el monto que pagó el cliente.
 * Consecuencia asumida: el margen de estas cotizaciones sale 0% — marca de "costo
 * desconocido", no de venta sin utilidad.
 */
function construirDesdePdf(pdfs: PropuestaExtraida[]): ExcelExtraido {
  const equipos = []
  let total = 0

  for (const pdf of pdfs) {
    // Una propuesta sin cuadro desglosado pero con total sí es cargable: una sola línea.
    const partidas = pdf.partidas.length
      ? pdf.partidas
      : pdf.montoTotal
        ? [{ descripcion: pdf.nombreProyecto || 'Alcance total de la propuesta', monto: pdf.montoTotal }]
        : []

    if (!partidas.length) continue
    total += partidas.reduce((suma, p) => suma + p.monto, 0)

    equipos.push({
      grupo: `Propuesta ${pdf.codigoOriginal || pdf.archivo || 'sin código'}`,
      hoja: 'PDF',
      items: partidas.map((p) => ({
        descripcion: p.descripcion,
        categoria: 'Histórico',
        unidad: 'Glb',
        marca: '',
        cantidad: 1,
        precioLista: p.monto,
        precioInterno: p.monto,
        precioCliente: p.monto,
        factorCosto: 1,
        factorVenta: 1,
      })),
    })
  }

  const principal = pdfs[0]

  return {
    equipos,
    servicios: [],
    gastos: [],
    resumen: {
      totalInterno: total,
      totalCliente: total,
      moneda: principal?.moneda,
      nombreProyecto: principal?.nombreProyecto,
      clienteNombre: principal?.clienteNombre,
    },
    recursosUnicos: [],
    edtsUnicos: [],
    hojas: [],
  }
}

// ── SSE helpers ──────────────────────────────────────────

function writeSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  controller.enqueue(encoder.encode(payload))
}

export async function POST(request: NextRequest) {
  // Feature flag check
  if (!(await isIAFeatureEnabled('importacionExcel'))) {
    return NextResponse.json(
      { error: 'La importación Excel con IA está deshabilitada por el administrador.' },
      { status: 403 }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!tieneRol(session, ROLES_PERMITIDOS)) {
    return NextResponse.json(
      { error: 'Solo un administrador puede importar cotizaciones desde Excel.' },
      { status: 403 }
    )
  }

  // Parse and validate FormData before starting the stream
  let excelBuffer: Buffer | null = null
  const pdfEntradas: Array<{ buffer: Buffer; nombre: string }> = []

  try {
    const formData = await request.formData()
    const excelFile = formData.get('excel') as File | null
    // Varias propuestas (POS10, POS20, …) que el cliente cerró con una sola OC
    // entran juntas y forman una única cotización.
    const pdfFiles = formData
      .getAll('pdf')
      .filter((f): f is File => f instanceof File && f.size > 0)

    // Basta con uno de los dos: las cotizaciones antiguas suelen conservar
    // solo el PDF que se le envió al cliente.
    if (!excelFile && pdfFiles.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un archivo Excel o un PDF de propuesta' },
        { status: 400 }
      )
    }

    if (pdfFiles.length > MAX_PDFS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_PDFS} PDFs por importación (subiste ${pdfFiles.length})` },
        { status: 400 }
      )
    }

    if (excelFile) {
      const excelTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream',
      ]
      if (!excelTypes.includes(excelFile.type) && !excelFile.name.match(/\.xlsx?$/i)) {
        return NextResponse.json(
          { error: 'El archivo debe ser un Excel (.xlsx o .xls)' },
          { status: 400 }
        )
      }

      if (excelFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Excel demasiado grande (${(excelFile.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB` },
          { status: 400 }
        )
      }

      excelBuffer = Buffer.from(await excelFile.arrayBuffer())
    }

    for (const pdfFile of pdfFiles) {
      if (pdfFile.type !== 'application/pdf' && !pdfFile.name.endsWith('.pdf')) {
        return NextResponse.json(
          { error: `"${pdfFile.name}" no es un .pdf` },
          { status: 400 }
        )
      }
      if (pdfFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `PDF "${pdfFile.name}" demasiado grande (${(pdfFile.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB` },
          { status: 400 }
        )
      }
      pdfEntradas.push({
        buffer: Buffer.from(await pdfFile.arrayBuffer()),
        nombre: pdfFile.name,
      })
    }
  } catch {
    return NextResponse.json({ error: 'Error leyendo archivos' }, { status: 400 })
  }

  // Start SSE stream for the processing phase
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const importUserId = (session.user as { id: string }).id

        // 1. Read Excel sheets (si lo hay)
        let sheets: ReturnType<typeof readExcelSheets> = []
        let excelData: ExcelExtraido | null = null

        if (excelBuffer) {
          writeSSE(controller, encoder, 'progress', { message: 'Leyendo hojas del Excel...' })
          sheets = readExcelSheets(excelBuffer)

          if (sheets.length === 0) {
            writeSSE(controller, encoder, 'error', { error: 'El archivo Excel no contiene hojas con datos' })
            controller.close()
            return
          }

          // 2. Extract data with Claude (per-sheet, with progress)
          excelData = await extractWithClaude(sheets, (message) => {
            writeSSE(controller, encoder, 'progress', { message })
          }, importUserId)
          excelData.hojas = sheets.map((s) => s.name)
        }

        // 3. Process PDFs if provided
        const pdfs: PropuestaExtraida[] = []
        for (let i = 0; i < pdfEntradas.length; i++) {
          const entrada = pdfEntradas[i]
          writeSSE(controller, encoder, 'progress', {
            message:
              pdfEntradas.length > 1
                ? `Analizando PDF ${i + 1} de ${pdfEntradas.length}: ${entrada.nombre}`
                : 'Analizando PDF de propuesta...',
          })
          const extraido = await extractPdfProposal(entrada.buffer.toString('base64'), importUserId)
          pdfs.push({ ...extraido, archivo: entrada.nombre })
        }

        if (!excelData) {
          if (pdfs.length === 0) {
            writeSSE(controller, encoder, 'error', { error: 'No se pudo extraer información de los archivos' })
            controller.close()
            return
          }
          excelData = construirDesdePdf(pdfs)
        }

        // 4. Query catalogs for mapping suggestions
        writeSSE(controller, encoder, 'progress', { message: 'Generando sugerencias de mapeo...' })

        const [recursos, edts, categoriasEquipo, clientes, comerciales] = await Promise.all([
          prisma.recurso.findMany({ orderBy: { nombre: 'asc' } }),
          prisma.edt.findMany({ orderBy: { nombre: 'asc' } }),
          prisma.categoriaEquipo.findMany({ orderBy: { nombre: 'asc' } }),
          prisma.cliente.findMany({
            select: { id: true, nombre: true, ruc: true, codigo: true },
            orderBy: { nombre: 'asc' },
          }),
          prisma.user.findMany({
            where: { role: { in: ['comercial', 'admin', 'gerente'] } },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
          }),
        ])

        // 5. Generate mapping suggestions
        const recursoSugerencias: MappingSuggestion[] = excelData.recursosUnicos.map(
          (excelName) => ({
            excelName,
            matches: recursos
              .map((r) => ({ id: r.id, nombre: r.nombre, score: similarity(excelName, r.nombre) }))
              .filter((m) => m.score > 0.3)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5),
          })
        )

        const edtSugerencias: MappingSuggestion[] = excelData.edtsUnicos.map(
          (excelName) => ({
            excelName,
            matches: edts
              .map((e) => ({ id: e.id, nombre: e.nombre, score: similarity(excelName, e.nombre) }))
              .filter((m) => m.score > 0.3)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5),
          })
        )

        // 6. Client suggestion — la cabecera sale de la primera propuesta
        const principal = pdfs[0] ?? null
        let clienteSugerido: { id: string; nombre: string } | null = null
        const clienteNombre = principal?.clienteNombre || excelData.resumen.clienteNombre
        const clienteRuc = principal?.clienteRuc

        if (clienteRuc) {
          const match = clientes.find((c) => c.ruc === clienteRuc)
          if (match) clienteSugerido = { id: match.id, nombre: match.nombre }
        }
        // 6b. Comercial: el PDF trae el "EMITIDO POR", que es quien realmente vendió.
        // Sin esto, las cotizaciones históricas quedan a nombre de quien las importa.
        let comercialSugerido: { id: string; nombre: string } | null = null
        const emailEmisor = principal?.emitidoPorEmail?.trim().toLowerCase()
        if (emailEmisor) {
          const match = comerciales.find((u) => u.email?.toLowerCase() === emailEmisor)
          if (match) comercialSugerido = { id: match.id, nombre: match.name || match.email || '' }
        }
        if (!comercialSugerido && principal?.emitidoPorNombre) {
          const match = comerciales.find(
            (u) => u.name && similarity(principal.emitidoPorNombre!, u.name) > 0.6
          )
          if (match) comercialSugerido = { id: match.id, nombre: match.name || '' }
        }

        if (!clienteSugerido && clienteNombre) {
          const match = clientes.find((c) => similarity(clienteNombre, c.nombre) > 0.6)
          if (match) clienteSugerido = { id: match.id, nombre: match.nombre }
        }

        // 7. Send final result
        writeSSE(controller, encoder, 'result', {
          excel: excelData,
          pdfs,
          hojas: sheets.map((s) => ({ name: s.name, rowCount: s.rowCount })),
          mapeo: {
            recursos: recursoSugerencias,
            edts: edtSugerencias,
            clienteSugerido,
            comercialSugerido,
          },
          catalogos: {
            recursos: recursos.map((r) => ({
              id: r.id,
              nombre: r.nombre,
              tipo: r.tipo,
              costoHora: r.costoHora,
            })),
            edts: edts.map((e) => ({ id: e.id, nombre: e.nombre })),
            categoriasEquipo: categoriasEquipo.map((c) => ({ id: c.id, nombre: c.nombre })),
            clientes: clientes.map((c) => ({ id: c.id, nombre: c.nombre, ruc: c.ruc })),
            comerciales: comerciales.map((u) => ({
              id: u.id,
              nombre: u.name || u.email || '',
              email: u.email,
            })),
          },
        })

        writeSSE(controller, encoder, 'done', {})
      } catch (err) {
        console.error('Error importar-excel:', err)

        let message = 'Error desconocido al procesar archivos'
        if (err instanceof Error) {
          message = err.message
          if (err.name === 'APIError' || err.message.includes('API')) {
            const apiErr = err as Error & { status?: number }
            if (apiErr.status === 429) {
              message = 'Límite de API excedido. Espera un momento e intenta de nuevo.'
            } else if (apiErr.status === 401) {
              message = 'Error de autenticación con el servicio de IA. Contacta al administrador.'
            }
          }
          if (err.name === 'AbortError' || err.message.includes('timeout') || err.message.includes('timed out')) {
            message = 'El análisis tomó demasiado tiempo. Intenta con un archivo Excel más pequeño.'
          }
        }

        writeSSE(controller, encoder, 'error', { error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
