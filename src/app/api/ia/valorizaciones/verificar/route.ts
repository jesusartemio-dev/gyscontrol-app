// src/app/api/ia/valorizaciones/verificar/route.ts
// Extrae datos del documento del cliente y los compara con la valorización existente en el sistema.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { extractValorizacion, buildDiff } from '@/lib/agente/valorizacionExtractor'

export const maxDuration = 120

const MAX_FILE_SIZE = 20 * 1024 * 1024

function sse(ctrl: ReadableStreamDefaultController, enc: TextEncoder, event: string, data: unknown) {
  ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
}

export async function POST(request: NextRequest) {
  if (!(await isIAFeatureEnabled('importarValorizacionIA'))) {
    return NextResponse.json(
      { error: 'La verificación con IA está deshabilitada.' },
      { status: 403 },
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let fileBuffer: Buffer
  let valorizacionId: string
  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    valorizacionId = (form.get('valorizacionId') as string | null) ?? ''

    if (!file) return NextResponse.json({ error: 'Se requiere un archivo' }, { status: 400 })
    if (!valorizacionId) return NextResponse.json({ error: 'Se requiere valorizacionId' }, { status: 400 })

    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ]
    if (!allowed.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json({ error: 'El archivo debe ser Excel (.xlsx o .xls)' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande. Máximo: 20MB' }, { status: 400 })
    }
    fileBuffer = Buffer.from(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Error leyendo formulario' }, { status: 400 })
  }

  const userId = (session.user as { id: string }).id
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        // Cargar valorización del sistema
        sse(ctrl, encoder, 'progress', { message: 'Cargando valorización del sistema...' })
        const val = await prisma.valorizacion.findUnique({
          where: { id: valorizacionId },
          include: {
            partidas: { orderBy: { orden: 'asc' } },
          },
        })

        if (!val) {
          sse(ctrl, encoder, 'error', { error: 'Valorización no encontrada' })
          return
        }

        // Extraer del documento
        sse(ctrl, encoder, 'progress', { message: 'Interpretando documento con IA...' })
        const extraido = await extractValorizacion(fileBuffer, userId)

        // Construir diff
        sse(ctrl, encoder, 'progress', { message: 'Comparando datos...' })
        const diff = buildDiff(extraido, {
          periodoInicio: val.periodoInicio?.toISOString() ?? '',
          periodoFin: val.periodoFin?.toISOString() ?? '',
          moneda: val.moneda ?? 'USD',
          presupuestoContractual: val.presupuestoContractual ?? 0,
          montoValorizacion: val.montoValorizacion ?? 0,
          descuentoComercialPorcentaje: val.descuentoComercialPorcentaje ?? 0,
          adelantoPorcentaje: val.adelantoPorcentaje ?? 0,
          igvPorcentaje: val.igvPorcentaje ?? 18,
          fondoGarantiaPorcentaje: val.fondoGarantiaPorcentaje ?? 0,
          netoARecibir: val.netoARecibir ?? 0,
          partidas: val.partidas.map(p => ({
            numero: p.orden ?? 0,
            descripcion: p.descripcion,
            montoContractual: p.montoContractual ?? 0,
            porcentajeAcumuladoAnterior: p.porcentajeAcumuladoAnterior ?? 0,
            porcentajeAvance: p.porcentajeAvance ?? 0,
            montoAvance: p.montoAvance ?? 0,
          })),
        })

        sse(ctrl, encoder, 'result', diff)
        sse(ctrl, encoder, 'done', {})
      } catch (err) {
        console.error('[api/ia/valorizaciones/verificar]', err)
        let msg = 'Error al procesar el archivo'
        if (err instanceof Error) msg = err.message
        sse(ctrl, encoder, 'error', { error: msg })
      } finally {
        ctrl.close()
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
