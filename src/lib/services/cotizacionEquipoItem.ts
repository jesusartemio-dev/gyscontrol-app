import type { CotizacionEquipoItem } from '@/types'
import type { CotizacionEquipoItemUpdatePayload } from '@/types/payloads'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/cotizacionEquipoItem.ts
// 📌 Descripción: Servicios para gestionar items de cotización de equipo
// 🧠 Uso: CRUD completo para items de cotización de equipo
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

// ✅ Crear nuevo item de cotización de equipo
export async function createCotizacionEquipoItem(data: {
  cotizacionEquipoId: string
  catalogoEquipoId: string
  cantidad: number
  precioUnitario: number
  observaciones?: string
}): Promise<CotizacionEquipoItem> {
  try {
    // 📡 Obtener datos del catálogo de equipos
    const equipoRes = await fetch(buildApiUrl(`/api/catalogo-equipo/${data.catalogoEquipoId}`))
    if (!equipoRes.ok) {
      throw new Error('Error al obtener datos del equipo del catálogo')
    }
    const equipo = await equipoRes.json()

    // 🔁 Transformar datos al formato requerido por la API
    const precioLista = equipo.precioLista ? Number(equipo.precioLista) : undefined
    const precioInterno = Number(equipo.precioInterno) || 0
    const factorCosto = Number(equipo.factorCosto) || 1.00
    const factorVenta = Number(equipo.factorVenta) || 1.15
    const precioCliente = Number(data.precioUnitario) || 0
    const cantidad = Number(data.cantidad) || 1
    // Precio gerencia: usa el precio especial del catálogo si existe, si no cae a precioInterno.
    // precioGerenciaEditado = false porque viene del catálogo, no fue editado manualmente en la cotización.
    const precioGerencia = equipo.precioGerencia != null
      ? Number(equipo.precioGerencia)
      : precioInterno

    const itemPayload = {
      cotizacionEquipoId: data.cotizacionEquipoId,
      catalogoEquipoId: data.catalogoEquipoId,
      codigo: equipo.codigo,
      descripcion: equipo.descripcion,
      categoria: equipo.categoria?.nombre || equipo.categoria || 'Sin categoría',
      unidad: equipo.unidad?.nombre || equipo.unidad || 'Unidad',
      marca: equipo.marca || 'Sin marca',
      precioLista,
      precioInterno,
      factorCosto,
      factorVenta,
      precioCliente,
      cantidad,
      costoInterno: +(precioInterno * cantidad).toFixed(2),
      costoCliente: +(precioCliente * cantidad).toFixed(2),
      precioGerencia,
      precioGerenciaEditado: false,
    }

    // 🐛 Debug: Log payload para debugging
    console.log('📡 Payload enviado a API:', JSON.stringify(itemPayload, null, 2))
    console.log('📡 Datos del equipo obtenidos:', JSON.stringify(equipo, null, 2))

    // 📡 Crear el item en la API
    const res = await fetch(buildApiUrl('/api/cotizacion-equipo-item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemPayload),
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('❌ Error response from API:', errorData)
      throw new Error(errorData.details || errorData.error || 'Error al crear item de cotización de equipo')
    }
    
    return await res.json()
  } catch (error) {
    console.error('Error en createCotizacionEquipoItem:', error)
    throw error
  }
}

// ✅ Actualizar ítem de equipo
export async function updateCotizacionEquipoItem(
  id: string,
  data: CotizacionEquipoItemUpdatePayload
): Promise<CotizacionEquipoItem> {
  try {
    const res = await fetch(`/api/cotizacion-equipo-item/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de equipo')
    return await res.json()
  } catch (error) {
    console.error('❌ updateCotizacionEquipoItem:', error)
    throw error
  }
}

// ✅ Reordenar ítems de equipo
export async function reordenarCotizacionEquipoItems(items: { id: string; orden: number }[]): Promise<void> {
  const res = await fetch('/api/cotizacion-equipo-item/reordenar', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error('Error al reordenar ítems de equipo')
}

// ✅ Eliminar ítem de equipo
export async function deleteCotizacionEquipoItem(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/cotizacion-equipo-item/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar ítem de equipo')
  } catch (error) {
    console.error('❌ deleteCotizacionEquipoItem:', error)
    throw error
  }
}
