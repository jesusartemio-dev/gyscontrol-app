// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/logistica/cotizaciones/[id]/equipos/page.tsx
// 🔧 Descripción: Visualización de listas técnicas por cotizar en una cotización
// 
// 🧠 Uso: Permite al área de logística cargar precios por proveedor para los ítems
// de las listas técnicas.
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getCotizacionProveedorById } from '@/lib/services/cotizacionProveedor'
import { CotizacionProveedor } from '@/types'
import CotizacionProveedorItemList from '@/components/logistica/CotizacionProveedorItemList'

export default function CotizacionEquiposPage() {
  const { id } = useParams()
  const [cotizacion, setCotizacion] = useState<CotizacionProveedor | null>(null)

  useEffect(() => {
    if (!id) return
    getCotizacionProveedorById(id as string).then(setCotizacion)
  }, [id])

  if (!cotizacion) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-blue-700">Cotización: {cotizacion.nombre}</h1>

      <CotizacionProveedorItemList items={cotizacion.items} cotizacionId={cotizacion.id} />
    </div>
  )
}
