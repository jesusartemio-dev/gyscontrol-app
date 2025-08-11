'use client'

// ===================================================
// 📁 ModalCrearCotizacionProveedor.tsx
// 📌 Modal para crear una nueva Cotización de Proveedor
// 🧠 Solo requiere seleccionar proyecto y proveedor
// ===================================================

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from 'sonner'

import { Proyecto, Proveedor } from '@/types'
import { createCotizacionProveedor } from '@/lib/services/cotizacionProveedor'

interface Props {
  open: boolean
  onClose: () => void
  proyectos: Proyecto[]
  proveedores: Proveedor[]
  onCreated?: () => void
}

export default function ModalCrearCotizacionProveedor({
  open,
  onClose,
  proyectos,
  proveedores,
  onCreated,
}: Props) {
  const [proyectoId, setProyectoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCrear = async () => {
    if (!proyectoId || !proveedorId) {
      toast.error('Selecciona proyecto y proveedor')
      return
    }

    setLoading(true)
    try {
      await createCotizacionProveedor({
        proyectoId,
        proveedorId,
        // 👉 fecha ya no se incluye
      })
      toast.success('✅ Cotización creada')
      onClose()
      onCreated?.()
    } catch {
      toast.error('❌ Error al crear cotización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>➕ Crear Cotización</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Proyecto</label>
            <Select value={proyectoId} onValueChange={setProyectoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto" />
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

          <div>
            <label className="text-sm font-medium">Proveedor</label>
            <Select value={proveedorId} onValueChange={setProveedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-green-600 text-white"
            onClick={handleCrear}
            disabled={!proyectoId || !proveedorId || loading}
          >
            {loading ? 'Creando...' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
