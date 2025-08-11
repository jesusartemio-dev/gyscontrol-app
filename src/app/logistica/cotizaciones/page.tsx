'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CotizacionProveedor, Proyecto, Proveedor } from '@/types'
import {
  getCotizacionesProveedor,
  updateCotizacionProveedor,
  deleteCotizacionProveedor,
} from '@/lib/services/cotizacionProveedor'
import { getProyectos } from '@/lib/services/proyecto'
import { getProveedores } from '@/lib/services/proveedor'

import CotizacionProveedorAccordion from '@/components/logistica/CotizacionProveedorAccordion'
import ModalCrearCotizacionProveedor from '@/components/logistica/ModalCrearCotizacionProveedor'
import { Button } from '@/components/ui/button'

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionProveedor[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [openModal, setOpenModal] = useState(false)

  const cargarCotizaciones = async () => {
    try {
      const data = await getCotizacionesProveedor()
      setCotizaciones(data || [])
    } catch {
      toast.error('Error al cargar cotizaciones')
    }
  }

  const cargarDatosIniciales = async () => {
    try {
      const [proyectosData, proveedoresData] = await Promise.all([
        getProyectos(),
        getProveedores(),
      ])
      setProyectos(proyectosData)
      setProveedores(proveedoresData)
    } catch {
      toast.error('Error al cargar proyectos o proveedores')
    }
  }

  useEffect(() => {
    cargarCotizaciones()
    cargarDatosIniciales()
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
        <Button
          className="bg-green-600 text-white"
          onClick={() => setOpenModal(true)}
        >
          ➕ Crear Cotización
        </Button>
      </div>

      {cotizaciones.length > 0 ? (
        cotizaciones.map((cot) => (
          <CotizacionProveedorAccordion
            key={cot.id}
            cotizacion={cot}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onUpdatedItem={cargarCotizaciones}
          />
        ))
      ) : (
        <p className="text-gray-500">No hay cotizaciones registradas.</p>
      )}

      {/* 🎯 Modal para crear cotización */}
      <ModalCrearCotizacionProveedor
        open={openModal}
        onClose={() => setOpenModal(false)}
        proyectos={proyectos}
        proveedores={proveedores}
        onCreated={cargarCotizaciones}
      />
    </div>
  )
}
