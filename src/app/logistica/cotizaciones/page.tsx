// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/logistica/cotizaciones/page.tsx
// 🔧 Descripción: Página principal para gestionar cotizaciones de proveedores.
// 🧠 Uso: Vista para logística donde se pueden crear, listar y gestionar cotizaciones.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CotizacionProveedor,
  CotizacionProveedorPayload,
  CotizacionProveedorUpdatePayload,
  Proyecto,
} from '@/types'
import {
  getCotizacionesProveedor,
  createCotizacionProveedor,
  updateCotizacionProveedor,
  deleteCotizacionProveedor,
} from '@/lib/services/cotizacionProveedor'
import { getProyectos } from '@/lib/services/proyecto'

import CotizacionProveedorForm from '@/components/logistica/CotizacionProveedorForm'
import CotizacionProveedorAccordion from '@/components/logistica/CotizacionProveedorAccordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionProveedor[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proyectoId, setProyectoId] = useState<string>('')

  const cargarCotizaciones = async () => {
    try {
      const data = await getCotizacionesProveedor()
      setCotizaciones(data || [])
    } catch {
      toast.error('Error al cargar cotizaciones')
    }
  }

  const cargarProyectos = async () => {
    try {
      const data = await getProyectos()
      setProyectos(data || [])
    } catch {
      toast.error('Error al cargar proyectos')
    }
  }

  useEffect(() => {
    cargarCotizaciones()
    cargarProyectos()
  }, [])

  const handleCreate = async (payload: CotizacionProveedorPayload) => {
    const nueva = await createCotizacionProveedor(payload)
    if (nueva) {
      toast.success('✅ Cotización creada')
      cargarCotizaciones()
    } else {
      toast.error('❌ Error al crear cotización')
    }
  }

  const handleUpdate = async (id: string, payload: CotizacionProveedorUpdatePayload) => {
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
      <h1 className="text-2xl font-bold">📦 Cotizaciones de Proveedores</h1>

      <div className="max-w-md space-y-2">
        <label className="text-sm font-medium">Seleccionar Proyecto</label>
        <Select onValueChange={(value) => setProyectoId(value)} value={proyectoId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un proyecto" />
          </SelectTrigger>
          <SelectContent>
            {proyectos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {proyectoId && (
        <CotizacionProveedorForm
          proyectoId={proyectoId}
          onCreated={handleCreate}
        />
      )}

      {cotizaciones.length > 0 ? (
        cotizaciones.map((cot) => (
          <CotizacionProveedorAccordion
            key={cot.id}
            cotizacion={cot}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <p className="text-gray-500">No hay cotizaciones registradas.</p>
      )}
    </div>
  )
}
