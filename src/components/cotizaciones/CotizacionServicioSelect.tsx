// ===================================================
// 📁 Archivo: CotizacionServicioSelect.tsx
// 📌 Ubicación: src/components/cotizaciones/CotizacionServicioSelect.tsx
// 🔧 Descripción: Pantalla para seleccionar servicios desde catálogo y agregarlos a una cotización
// 🧠 Uso: Utilizado al presionar "➕ Agregar Servicios desde Catálogo"
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getCatalogoServicios } from '@/lib/services/catalogoServicio'
import { CatalogoServicio, CotizacionServicioItemPayload } from '@/types'
import CotizacionServicioItemForm from './CotizacionServicioItemForm'

interface Props {
  onCreated: () => void
  grupoId: string
}

export default function CotizacionServicioSelect({ grupoId, onCreated }: Props) {
  const [catalogo, setCatalogo] = useState<CatalogoServicio[]>([])
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    getCatalogoServicios()
      .then(setCatalogo)
      .catch(() => setError('Error al cargar catálogo de servicios'))
  }, [])

  const handleClose = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    current.delete('grupo')
    router.push(`/comercial/cotizaciones/${grupoId}?${current.toString()}`)
  }

  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Agregar servicios desde catálogo</h2>
        <button
          onClick={handleClose}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          ✖ Cerrar
        </button>
      </div>

      <div className="space-y-6">
        {catalogo.map((item) => (
          <CotizacionServicioItemForm
            key={item.id}
            grupoId={grupoId}
            catalogoId={item.id}
            nombre={item.nombre}
            descripcion={item.descripcion}
            categoria={item.categoria.nombre}
            formula={item.formula}
            horaBase={item.horaBase}
            horaRepetido={item.horaRepetido}
            horaUnidad={item.horaUnidad}
            horaFijo={item.horaFijo}
            unidadServicioNombre={item.unidadServicio.nombre}
            recursoNombre={item.recurso.nombre}
            costoHora={item.recurso.costoHora}
            onCreated={onCreated}
          />
        ))}
      </div>
    </div>
  )
}
