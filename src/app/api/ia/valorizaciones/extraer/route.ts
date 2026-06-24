// src/app/api/ia/valorizaciones/extraer/route.ts
// Recibe archivo Excel del cliente, extrae datos de valorización con Claude, devuelve resultado vía SSE.

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { extractValorizacion } from '@/lib/agente/valorizacionExtractor'

export const maxDuration = 120

const MAX_FILE_SIZE = 20 * 1024 * 1024

function sse(ctrl: ReadableStreamDefaultController, enc: TextEncoder, event: string, data: unknown) {
  ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
}

export async function POST(request: NextRequest) {
  if (!(await isIAFeatureEnabled('importarValorizacionIA'))) {
    return NextResponse.json(
      { error: 'La importación de valorizaciones con IA está deshabilitada.' },
      { status: 403 },
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let fileBuffer: Buffer
  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Se requiere un archivo' }, { status: 400 })

    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ]
    if (!allowed.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json({ error: 'El archivo debe ser Excel (.xlsx o .xls)' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Archivo demasiado grande. Máximo: 20MB` }, { status: 400 })
    }
    fileBuffer = Buffer.from(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Error leyendo archivo' }, { status: 400 })
  }

  const userId = (session.user as { id: string }).id
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        sse(ctrl, encoder, 'progress', { message: 'Leyendo hojas del archivo...' })
        sse(ctrl, encoder, 'progress', { message: 'Enviando a IA para interpretación...' })

        const resultado = await extractValorizacion(fileBuffer, userId)

        sse(ctrl, encoder, 'result', resultado)
        sse(ctrl, encoder, 'done', {})
      } catch (err) {
        console.error('[api/ia/valorizaciones/extraer]', err)
        let msg = 'Error al procesar el archivo'
        if (err instanceof Error) {
          msg = err.message
          if (err.message.includes('timeout') || err.message.includes('timed out')) {
            msg = 'El análisis tomó demasiado tiempo. Intenta con un archivo más pequeño.'
          }
        }
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
