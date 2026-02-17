import type { HojaDeGastosAdjunto } from '@/types'

const BASE_URL = '/api/hoja-de-gastos-adjunto'

export async function uploadHojaAdjunto(hojaDeGastosId: string, file: File): Promise<HojaDeGastosAdjunto> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('hojaDeGastosId', hojaDeGastosId)

  const res = await fetch(BASE_URL, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al subir constancia')
  }
  return await res.json()
}

export async function deleteHojaAdjunto(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al eliminar adjunto')
  }
}
