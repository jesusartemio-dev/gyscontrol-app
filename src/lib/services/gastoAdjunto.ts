import type { GastoAdjunto } from '@/types'

const BASE_URL = '/api/gasto-adjunto'

export async function uploadGastoAdjunto(gastoLineaId: string, file: File): Promise<GastoAdjunto> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('gastoLineaId', gastoLineaId)

  const res = await fetch(BASE_URL, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al subir adjunto')
  }
  return await res.json()
}

export async function deleteGastoAdjunto(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al eliminar adjunto')
  }
}
