'use client'

import { useEffect, useState } from 'react'
import CotizacionForm from '@/components/cotizaciones/CotizacionForm'
import CotizacionList from '@/components/cotizaciones/CotizacionList'
import { getCotizaciones } from '@/lib/services/cotizacion'
import { calcularTotal } from '@/lib/utils/costos'
import type { Cotizacion } from '@/types'

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCotizaciones()
      .then((data) => {
        const actualizadas = data.map(c => ({
          ...c,
          ...calcularTotal(c)
        }))
        setCotizaciones(actualizadas)
      })
      .catch(() => setError('Error al cargar cotizaciones.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (nueva: Cotizacion) => {
    setCotizaciones(prev => [...prev, { ...nueva, ...calcularTotal(nueva) }])
  }

  const handleDelete = (id: string) => {
    setCotizaciones(prev => prev.filter(c => c.id !== id))
  }

  const handleUpdated = (actualizada: Cotizacion) => {
    setCotizaciones(prev =>
      prev.map(c => c.id === actualizada.id ? { ...actualizada, ...calcularTotal(actualizada) } : c)
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🧾 Gestión de Cotizaciones</h1>

      <CotizacionForm onCreated={handleCreated} />

      {error && <p className="text-red-500">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Cargando cotizaciones...</p>
      ) : (
        <CotizacionList
          cotizaciones={cotizaciones}
          onDelete={handleDelete}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
