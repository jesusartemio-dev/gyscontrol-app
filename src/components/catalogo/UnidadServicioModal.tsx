// ===================================================
// 📁 Archivo: UnidadServicioModal.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Modal para crear unidades de servicio
//
// 🧠 Uso: Modal que se abre desde la página de unidades de servicio
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Save, X } from 'lucide-react'
import { UnidadServicio, UnidadServicioPayload } from '@/types'
import { createUnidadServicio } from '@/lib/services/unidadServicio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: (unidad: UnidadServicio) => void
}

export default function UnidadServicioModal({ isOpen, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (nombre.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    setLoading(true)
    try {
      const payload: UnidadServicioPayload = { nombre: nombre.trim() }
      const nueva = await createUnidadServicio(payload)
      toast.success('Unidad de servicio creada exitosamente')
      onCreated?.(nueva)
      handleClose()
    } catch (err) {
      console.error('Error creating unidad servicio:', err)
      toast.error('Error al crear la unidad de servicio')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNombre('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Nueva Unidad de Servicio
          </DialogTitle>
          <DialogDescription>
            Agrega una nueva unidad de medida para los servicios del catálogo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Unidad *</Label>
            <Input
              id="nombre"
              placeholder="Ej: horas, días, metros..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              💡 Ejemplos: "horas", "días", "metros", "unidades", "m²", "kg"
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !nombre.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creando...' : 'Crear Unidad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}