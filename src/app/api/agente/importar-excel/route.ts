// src/app/api/agente/importar-excel/route.ts
// Paso 1: Recibe Excel (+PDF opcional), extrae datos con Claude, devuelve preview + sugerencias de mapeo

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractExcelData } from '@/lib/agente/excelExtractor'
import { extractPdfProposal } from '@/lib/agente/pdfProposalExtractor'
import type { PropuestaExtraida } from '@/lib/agente/pdfProposalExtractor'

// Allow up to 300 seconds for Claude API processing of large Excel files
export const maxDuration = 300

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

interface MappingSuggestion {
  excelName: string
  matches: Array<{ id: string; nombre: string; score: number }>
}

/**
 * Calcula un score de similitud simple entre dos strings (0-1).
 */
function similarity(a: string, b: string): number {
  const al = a.toLowerCase().trim()
  const bl = b.toLowerCase().trim()
  if (al === bl) return 1.0
  if (al.includes(bl) || bl.includes(al)) return 0.8

  // Coincidencia de palabras
  const wordsA = al.split(/\s+/)
  const wordsB = bl.split(/\s+/)
  const common = wordsA.filter((w) => wordsB.some((wb) => wb.includes(w) || w.includes(wb)))
  if (common.length === 0) return 0
  return common.length / Math.max(wordsA.length, wordsB.length)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const excelFile = formData.get('excel') as File | null
    const pdfFile = formData.get('pdf') as File | null

    if (!excelFile) {
      return NextResponse.json(
        { error: 'Se requiere un archivo Excel' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo Excel
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

    // 1. Procesar Excel con Claude
    const excelBuffer = Buffer.from(await excelFile.arrayBuffer())
    const { data: excelData, sheets } = await extractExcelData(excelBuffer)

    // 2. Procesar PDF si se proporcionó
    let pdfData: PropuestaExtraida | null = null
    if (pdfFile && pdfFile.size > 0) {
      if (pdfFile.type !== 'application/pdf' && !pdfFile.name.endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'El archivo PDF debe ser un .pdf' },
          { status: 400 }
        )
      }
      if (pdfFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `PDF demasiado grande (${(pdfFile.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB` },
          { status: 400 }
        )
      }

      const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
      const pdfBase64 = pdfBuffer.toString('base64')
      pdfData = await extractPdfProposal(pdfBase64)
    }

    // 3. Buscar datos existentes para sugerir mapeos
    const [recursos, edts, categoriasEquipo, clientes] = await Promise.all([
      prisma.recurso.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.edt.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.categoriaEquipo.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.cliente.findMany({
        select: { id: true, nombre: true, ruc: true, codigo: true },
        orderBy: { nombre: 'asc' },
      }),
    ])

    // 4. Generar sugerencias de mapeo para recursos
    const recursoSugerencias: MappingSuggestion[] = excelData.recursosUnicos.map(
      (excelName) => {
        const matches = recursos
          .map((r) => ({
            id: r.id,
            nombre: r.nombre,
            score: similarity(excelName, r.nombre),
          }))
          .filter((m) => m.score > 0.3)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)

        return { excelName, matches }
      }
    )

    // 5. Generar sugerencias de mapeo para EDTs
    const edtSugerencias: MappingSuggestion[] = excelData.edtsUnicos.map(
      (excelName) => {
        const matches = edts
          .map((e) => ({
            id: e.id,
            nombre: e.nombre,
            score: similarity(excelName, e.nombre),
          }))
          .filter((m) => m.score > 0.3)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)

        return { excelName, matches }
      }
    )

    // 6. Sugerencia de cliente (si se detectó en Excel o PDF)
    let clienteSugerido: { id: string; nombre: string } | null = null
    const clienteNombre =
      pdfData?.clienteNombre || excelData.resumen.clienteNombre
    const clienteRuc = pdfData?.clienteRuc

    if (clienteRuc) {
      const match = clientes.find((c) => c.ruc === clienteRuc)
      if (match) clienteSugerido = { id: match.id, nombre: match.nombre }
    }
    if (!clienteSugerido && clienteNombre) {
      const match = clientes.find(
        (c) => similarity(clienteNombre, c.nombre) > 0.6
      )
      if (match) clienteSugerido = { id: match.id, nombre: match.nombre }
    }

    return NextResponse.json({
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
        categoriasEquipo: categoriasEquipo.map((c) => ({
          id: c.id,
          nombre: c.nombre,
        })),
        clientes: clientes.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          ruc: c.ruc,
        })),
      },
    })
  } catch (error) {
    console.error('Error importar-excel:', error)

    let message = 'Error desconocido al procesar archivos'
    let status = 500

    if (error instanceof Error) {
      message = error.message

      // Anthropic API errors
      if (error.name === 'APIError' || error.message.includes('API')) {
        const apiErr = error as Error & { status?: number }
        if (apiErr.status === 429) {
          message = 'Límite de API excedido. Espera un momento e intenta de nuevo.'
          status = 429
        } else if (apiErr.status === 401) {
          message = 'Error de autenticación con el servicio de IA. Contacta al administrador.'
        }
      }

      // Timeout
      if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('timed out')) {
        message = 'El análisis tomó demasiado tiempo. Intenta con un archivo Excel más pequeño.'
        status = 504
      }

      // SheetJS / parse errors
      if (error.message.includes('JSON') || error.message.includes('parse')) {
        message = 'Error al interpretar la respuesta del modelo. Intenta de nuevo.'
      }
    }

    return NextResponse.json(
      {
        error: message,
        ...(process.env.NODE_ENV === 'development' && error instanceof Error
          ? { stack: error.stack }
          : {}),
      },
      { status }
    )
  }
}
