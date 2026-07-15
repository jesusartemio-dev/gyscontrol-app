import { toast } from 'sonner'

/**
 * Cliente compartido para consumir el stream SSE de las rutas de
 * generación/regeneración del Plan de Trabajo (`generar-ia`,
 * `regenerar-seccion`) — extraído de `PlanTrabajoClient.tsx` (Bloque 4.2
 * sesión 5) para que `AlcanceDetalladoEditor.tsx` también pueda consumirlo
 * al regenerar un solo EDT sin duplicar el parseo de SSE.
 */

export function parseSSEPart(part: string): { event: string; data: Record<string, unknown> } | null {
  const lines = part.split('\n')
  let event = ''
  let dataStr = ''
  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7).trim()
    else if (line.startsWith('data: ')) dataStr = line.slice(6).trim()
  }
  if (!event || !dataStr) return null
  try { return { event, data: JSON.parse(dataStr) } }
  catch { return null }
}

export async function readSSEStream(
  res: Response,
  onStatus: (msg: string, progreso?: number) => void,
  onDone: (data: Record<string, unknown>) => Promise<void>,
  onSeccion?: (id: string) => Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let doneCalled = false

  const abortHandler = () => reader.cancel().catch(() => {})
  signal?.addEventListener('abort', abortHandler)

  const procesarPart = async (part: string) => {
    const parsed = parseSSEPart(part)
    if (!parsed) return
    const { event, data } = parsed
    if (event === 'status') onStatus(String(data.mensaje ?? ''), typeof data.progreso === 'number' ? data.progreso : undefined)
    else if (event === 'seccion') { if (onSeccion) await onSeccion(String(data.id ?? '')) }
    else if (event === 'seccion-error') {
      const id = String(data.id ?? '')
      const motivo = String(data.motivo ?? 'error desconocido')
      console.warn(`[IA] Sección ${id} falló: ${motivo}`)
      toast.warning(`Sección "${id}" no se pudo generar: ${motivo.slice(0, 120)}`)
    }
    else if (event === 'done') { doneCalled = true; await onDone(data) }
    else if (event === 'error') throw new Error(String(data.mensaje ?? 'Error interno'))
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        // Flush decoder y procesar cualquier dato restante en el buffer
        buffer += decoder.decode()
        if (buffer.trim()) await procesarPart(buffer)
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()!
      for (const part of parts) await procesarPart(part)
    }
  } catch (err) {
    if (signal?.aborted) return
    throw err
  } finally {
    signal?.removeEventListener('abort', abortHandler)
  }

  if (!doneCalled && !signal?.aborted) {
    throw new Error('La generación finalizó sin respuesta — revisá los logs del servidor')
  }
}
