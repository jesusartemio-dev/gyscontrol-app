export interface SSEIpercCallbacks {
  onStatus: (msg: string, progreso?: number) => void
  onFilasParciales: (filas: unknown[]) => void
  onCompletado: (data: Record<string, unknown>) => Promise<void>
}

function parseSSEPart(
  part: string
): { event: string; data: Record<string, unknown> } | null {
  const lines = part.split('\n')
  let event = ''
  let dataStr = ''
  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7).trim()
    else if (line.startsWith('data: ')) dataStr = line.slice(6).trim()
  }
  if (!event || !dataStr) return null
  try {
    return { event, data: JSON.parse(dataStr) }
  } catch {
    return null
  }
}

export async function readSSEStreamIperc(
  res: Response,
  callbacks: SSEIpercCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { onStatus, onFilasParciales, onCompletado } = callbacks
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

    switch (event) {
      case 'status':
        onStatus(
          String(data.mensaje ?? ''),
          typeof data.progreso === 'number' ? data.progreso : undefined
        )
        break
      case 'lote_iniciado':
        onStatus(
          `Lote ${data.lote}/${data.totalLotes} — ${data.tareas} tareas...`,
          typeof data.progreso === 'number' ? data.progreso : undefined
        )
        break
      case 'lote_completado':
        onStatus(
          `Lote ${data.lote} completado — ${data.filasGeneradas} filas (${data.filasPorTareaPromedio ?? '?'}/tarea) · total ${data.totalFilas}`,
          undefined
        )
        break
      case 'filas_parciales':
        if (Array.isArray(data.filas)) onFilasParciales(data.filas)
        break
      case 'completado':
        doneCalled = true
        await onCompletado(data)
        break
      case 'error':
        throw new Error(String(data.mensaje ?? 'Error en generación IA'))
      case 'cancelado':
        doneCalled = true
        break
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
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
