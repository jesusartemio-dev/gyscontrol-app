import type { ComprobanteOcrResponse } from '@/app/api/comprobante-ocr/route'

export type { ComprobanteOcrResponse }

export async function procesarComprobante(file: File): Promise<ComprobanteOcrResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/comprobante-ocr', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Error al procesar comprobante')
  }

  return await res.json()
}

export interface BatchLineaPayload {
  categoriaGastoId?: string | null
  descripcion: string
  fecha: string
  monto: number
  moneda?: string
  tipoComprobante?: string | null
  numeroComprobante?: string | null
  proveedorNombre?: string | null
  proveedorRuc?: string | null
  observaciones?: string | null
  sunatVerificado?: boolean | null
}

export async function createGastoLineasBatch(
  hojaDeGastosId: string,
  lineas: BatchLineaPayload[]
): Promise<{ ok: boolean; data: Array<{ id: string }>; count: number }> {
  const res = await fetch('/api/gasto-linea/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hojaDeGastosId, lineas }),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Error al crear líneas en batch')
  }

  return await res.json()
}
