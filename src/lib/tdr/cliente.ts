export type Origen = 'cotizacion' | 'proyecto'

function urlBase(origen: Origen, id: string) {
  return origen === 'cotizacion'
    ? `/api/cotizacion/${id}/tdr-analisis`
    : `/api/proyecto/${id}/tdr-analisis`
}

export async function obtenerAnalisis(origen: Origen, id: string) {
  const res = await fetch(urlBase(origen, id))
  if (res.status === 404) {
    const body = await res.json().catch(() => ({}))
    return { ok: false as const, status: 404, body }
  }
  if (!res.ok) {
    throw new Error('Error al cargar análisis')
  }
  const data = await res.json()
  return { ok: true as const, data }
}

export async function patchAnalisis(
  origen: Origen,
  id: string,
  campos: object,
) {
  const res = await fetch(urlBase(origen, id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campos),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error al guardar')
  }
  return res.json()
}

export async function importarDesdeCotizacion(proyectoId: string) {
  const res = await fetch(`/api/proyecto/${proyectoId}/tdr-analisis`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error al importar')
  }
  return res.json()
}

export async function reimportarDesdeCotizacion(proyectoId: string) {
  const res = await fetch(`/api/proyecto/${proyectoId}/tdr-analisis/resincronizar`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error al re-importar')
  }
  return res.json()
}

export async function eliminarAnalisis(origen: Origen, id: string) {
  const res = await fetch(urlBase(origen, id), { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error al eliminar')
  }
  return res.json()
}
