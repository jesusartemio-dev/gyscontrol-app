'use client'

import { useEffect, useState } from 'react'
import { Proveedor } from '@/types'
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from '@/lib/services/proveedor'
import ProveedorForm from '@/components/logistica/ProveedorForm'
import ProveedorList from '@/components/logistica/ProveedorList'
import { toast } from 'sonner'
import { ProveedorPayload, ProveedorUpdatePayload } from '@/types'

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

  const cargarProveedores = async () => {
    const data = await getProveedores()
    if (data) setProveedores(data)
  }

  useEffect(() => {
    cargarProveedores()
  }, [])

  const handleCreate = async (payload: ProveedorPayload) => {
    const nuevo = await createProveedor(payload)
    if (nuevo) {
      toast.success('Proveedor creado')
      cargarProveedores()
    }
  }

  const handleUpdate = async (id: string, payload: ProveedorUpdatePayload) => {
    const actualizado = await updateProveedor(id, payload)
    if (actualizado) {
      toast.success('Proveedor actualizado')
      cargarProveedores()
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteProveedor(id)
    if (ok) {
      toast.success('Proveedor eliminado')
      cargarProveedores()
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">📦 Gestión de Proveedores</h1>
      <ProveedorForm onCreated={handleCreate} />
      <ProveedorList
        data={proveedores}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}
