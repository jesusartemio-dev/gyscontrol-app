'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CotizacionProveedor } from '@/types'
import {
  getCotizacionesProveedor,
  updateCotizacionProveedor,
  deleteCotizacionProveedor,
} from '@/lib/services/cotizacionProveedor'

import CotizacionProveedorAccordion from '@/components/logistica/CotizacionProveedorAccordion'
import { Button } from '@/components/ui/button'

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionProveedor[]>([])

  const cargarCotizaciones = async () => {
    try {
      const data = await getCotizacionesProveedor()
      setCotizaciones(data || [])
    } catch {
      toast.error('Error al cargar cotizaciones')
    }
  }

  useEffect(() => {
    cargarCotizaciones()
  }, [])

  const handleUpdate = async (id: string, payload: any) => {
    const actualizado = await updateCotizacionProveedor(id, payload)
    if (actualizado) {
      toast.success('✅ Cotización actualizada')
      cargarCotizaciones()
    } else {
      toast.error('❌ Error al actualizar cotización')
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteCotizacionProveedor(id)
    if (ok) {
      toast.success('🗑️ Cotización eliminada')
      cargarCotizaciones()
    } else {
      toast.error('❌ Error al eliminar cotización')
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📦 Cotizaciones de Proveedores</h1>
        <Link href="/logistica/cotizaciones/crear">
          <Button className="bg-green-600 text-white">➕ Crear Cotización</Button>
        </Link>
      </div>

      {cotizaciones.length > 0 ? (
        cotizaciones.map((cot) => (
          <CotizacionProveedorAccordion
            key={cot.id}
            cotizacion={cot}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onUpdatedItem={cargarCotizaciones}  // ✅ Escucha los cambios internos
          />
        ))
      ) : (
        <p className="text-gray-500">No hay cotizaciones registradas.</p>
      )}
    </div>
  )
}
