/**
 * Baja una generación del plan (guardada en Drive) en partes de ~3MB y la
 * guarda en el equipo. Una función de Vercel no puede responder más de
 * ~4.5MB y un plan con fotos pesa 10MB o más, así que el archivo nunca viaja
 * entero en una sola respuesta (ver generaciones/[generacionId]/descargar).
 */
export async function descargarGeneracionPorPartes(proyectoId: string, generacionId: string, archivoNombre: string): Promise<void> {
  const partes: ArrayBuffer[] = []
  let desde = 0
  let total = Infinity
  while (desde < total) {
    const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/generaciones/${generacionId}/descargar?desde=${desde}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(data.error ?? `Error al descargar (HTTP ${res.status})`)
    }
    const parte = await res.arrayBuffer()
    total = Number(res.headers.get('X-Total-Bytes')) || desde + parte.byteLength
    if (parte.byteLength === 0) break
    partes.push(parte)
    desde += parte.byteLength
  }

  const blob = new Blob(partes, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = archivoNombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
