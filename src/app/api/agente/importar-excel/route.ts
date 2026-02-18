// src/app/api/agente/importar-excel/route.ts
// Paso 1: Recibe Excel (+PDF opcional), extrae datos con Claude, devuelve preview + sugerencias de mapeo
// Usa SSE streaming para reportar progreso al frontend

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readExcelSheets, extractWithClaude } from '@/lib/agente/excelExtractor'
import { extractPdfProposal } from '@/lib/agente/pdfProposalExtractor'
import type { PropuestaExtraida } from '@/lib/agente/pdfProposalExtractor'

// Allow up to 300 seconds for Claude API processing of large Excel files
export const maxDuration = 300

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

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
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Parse and validate FormData before starting the stream
  let excelBuffer: Buffer
  let pdfBuffer: Buffer | null = null
  let hasPdf = false

  try {
    const formData = await request.formData()
    const excelFile = formData.get('excel') as File | null
    const pdfFile = formData.get('pdf') as File | null

    if (!excelFile) {
      return NextResponse.json({ error: 'Se requiere un archivo Excel' }, { status: 400 })
    }

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

    if (pdfFile && pdfFile.size > 0) {
      if (pdfFile.type !== 'application/pdf' && !pdfFile.name.endsWith('.pdf')) {
        return NextResponse.json({ error: 'El archivo PDF debe ser un .pdf' }, { status: 400 })
      }
      if (pdfFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `PDF demasiado grande (${(pdfFile.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB` },
          { status: 400 }
        )
      }
      pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
      hasPdf = true
    }
  } catch {
    return NextResponse.json({ error: 'Error leyendo archivos' }, { status: 400 })
  }

  // Start SSE stream for the processing phase
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Read Excel sheets
        writeSSE(controller, encoder, 'progress', { message: 'Leyendo hojas del Excel...' })
        const sheets = readExcelSheets(excelBuffer)

        if (sheets.length === 0) {
          writeSSE(controller, encoder, 'error', { error: 'El archivo Excel no contiene hojas con datos' })
          controller.close()
          return
        }

        // 2. Extract data with Claude (per-sheet, with progress)
        const importUserId = (session.user as { id: string }).id
        const excelData = await extractWithClaude(sheets, (message) => {
          writeSSE(controller, encoder, 'progress', { message })
        }, importUserId)
        excelData.hojas = sheets.map((s) => s.name)

        // 3. Process PDF if provided
        let pdfData: PropuestaExtraida | null = null
        if (hasPdf && pdfBuffer) {
          writeSSE(controller, encoder, 'progress', { message: 'Analizando PDF de propuesta...' })
          const pdfBase64 = pdfBuffer.toString('base64')
          pdfData = await extractPdfProposal(pdfBase64, importUserId)
        }

        // 4. Query catalogs for mapping suggestions
        writeSSE(controller, encoder, 'progress', { message: 'Generando sugerencias de mapeo...' })

        const [recursos, edts, categoriasEquipo, clientes] = await Promise.all([
          prisma.recurso.findMany({ orderBy: { nombre: 'asc' } }),
          prisma.edt.findMany({ orderBy: { nombre: 'asc' } }),
          prisma.categoriaEquipo.findMany({ orderBy: { nombre: 'asc' } }),
          prisma.cliente.findMany({
            select: { id: true, nombre: true, ruc: true, codigo: true },
            orderBy: { nombre: 'asc' },
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

        // 6. Client suggestion
        let clienteSugerido: { id: string; nombre: string } | null = null
        const clienteNombre = pdfData?.clienteNombre || excelData.resumen.clienteNombre
        const clienteRuc = pdfData?.clienteRuc

        if (clienteRuc) {
          const match = clientes.find((c) => c.ruc === clienteRuc)
          if (match) clienteSugerido = { id: match.id, nombre: match.nombre }
        }
        if (!clienteSugerido && clienteNombre) {
          const match = clientes.find((c) => similarity(clienteNombre, c.nombre) > 0.6)
          if (match) clienteSugerido = { id: match.id, nombre: match.nombre }
        }

        // 7. Send final result
        writeSSE(controller, encoder, 'result', {
          excel: excelData,
          pdf: pdfData,
          hojas: sheets.map((s) => ({ name: s.name, rowCount: s.rowCount })),
          mapeo: {
            recursos: recursoSugerencias,
            edts: edtSugerencias,
            clienteSugerido,
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
