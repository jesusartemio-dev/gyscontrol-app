// ===================================================
// 📁 Archivo: CotizacionServicioItemList.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Lista editable de ítems de servicio en cotización
// 🧠 Uso: Se muestra dentro del acordeón de servicios para ver y editar ítems
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

'use client'

import { useState } from 'react'
import { updateCotizacionServicioItem, deleteCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import type { CotizacionServicioItem } from '@/types'

interface Props {
  items: CotizacionServicioItem[]
  onUpdated: (item: CotizacionServicioItem) => void
  onDeleted: (id: string) => void
}

export default function CotizacionServicioItemList({ items, onUpdated, onDeleted }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState(0)
  const [margen, setMargen] = useState(1.35)
  const [factorSeguridad, setFactorSeguridad] = useState(1)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const iniciarEdicion = (item: CotizacionServicioItem) => {
    setEditandoId(item.id)
    setCantidad(item.cantidad)
    setMargen(item.margen)
    setFactorSeguridad(item.factorSeguridad)
    setError(null)
  }

  const cancelar = () => {
    setEditandoId(null)
    setCantidad(0)
    setMargen(1.35)
    setFactorSeguridad(1)
    setError(null)
  }

  const guardar = async (item: CotizacionServicioItem) => {
    if (cantidad <= 0 || margen <= 0 || factorSeguridad <= 0) {
      setError('Todos los valores deben ser mayores a cero.')
      return
    }

    const costoInterno = item.costoHora * cantidad * factorSeguridad
    const costoCliente = costoInterno * margen

    setLoadingId(item.id)
    try {
      const actualizado = await updateCotizacionServicioItem(item.id, {
        cantidad,
        factorSeguridad,
        margen,
        costoInterno,
        costoCliente
      })
      onUpdated(actualizado)
      cancelar()
    } catch {
      setError('Error al guardar los cambios.')
    } finally {
      setLoadingId(null)
    }
  }

  const eliminar = async (id: string) => {
    setLoadingId(id)
    try {
      await deleteCotizacionServicioItem(id)
      onDeleted(id)
    } catch (err) {
      console.error('❌ Error al eliminar ítem de servicio:', err)
      setError('Error al eliminar el ítem.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {items.map((item) => {
        const costoInternoEditado = item.costoHora * cantidad * factorSeguridad
        const costoClienteEditado = costoInternoEditado * margen

        return (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 border rounded-lg px-4 py-3"
          >
            <div className="flex-1 space-y-1 text-sm">
              <div className="font-semibold text-base text-gray-900">{item.nombre}</div>
              <div className="text-xs text-gray-600 italic">{item.descripcion}</div>
              <div className="text-gray-500">{item.recursoNombre} • {item.unidadServicioNombre}</div>
              <div className="text-xs text-gray-500 italic">Categoría: {item.categoria} • Fórmula: {item.formula}</div>
              <div className="text-xs text-gray-600">
                Costo/Hr: S/ {item.costoHora.toFixed(2)} • FS: {item.factorSeguridad}
              </div>
              <div className="text-xs text-gray-600">
                C. Interno: <span className="font-medium">S/ {item.costoInterno.toFixed(2)}</span> • Margen: {item.margen} • Cliente: <span className="text-green-700 font-semibold">S/ {item.costoCliente.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-3 sm:mt-0 flex flex-col items-end gap-2">
              {editandoId === item.id ? (
                <div className="bg-white border rounded-lg shadow-md p-3 space-y-3 w-full max-w-sm">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">Cantidad de horas</label>
                    <input
                      type="number"
                      value={cantidad}
                      min={1}
                      className={`border px-2 py-1 rounded text-sm ${cantidad <= 0 ? 'border-red-500' : ''}`}
                      onChange={(e) => setCantidad(parseInt(e.target.value))}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">Margen</label>
                    <input
                      type="number"
                      step={0.01}
                      value={margen}
                      min={0}
                      className={`border px-2 py-1 rounded text-sm ${margen <= 0 ? 'border-red-500' : ''}`}
                      onChange={(e) => setMargen(parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">Factor de Seguridad</label>
                    <input
                      type="number"
                      step={0.1}
                      value={factorSeguridad}
                      min={0}
                      className={`border px-2 py-1 rounded text-sm ${factorSeguridad <= 0 ? 'border-red-500' : ''}`}
                      onChange={(e) => setFactorSeguridad(parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="text-xs text-gray-500 pt-1">
                    C. Interno: S/ {costoInternoEditado.toFixed(2)} • Cliente: <span className="text-green-600 font-semibold">S/ {costoClienteEditado.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => guardar(item)}
                      disabled={loadingId === item.id}
                      className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700 transition"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelar}
                      className="bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-300 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Cantidad</div>
                    <div className="text-sm font-medium">{item.cantidad} h</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Cliente</div>
                    <div className="text-green-700 font-semibold">S/ {item.costoCliente.toFixed(2)}</div>
                  </div>
                  <button onClick={() => iniciarEdicion(item)} className="text-blue-600">✏️</button>
                  <button
                    onClick={() => eliminar(item.id)}
                    disabled={loadingId === item.id}
                    className="text-red-500"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
