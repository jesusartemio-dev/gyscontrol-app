// ===================================================
// 📁 Archivo: CategoriaServicioModal.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Modal para crear categorías de servicio
//
// 🧠 Uso: Modal que se abre desde la página de categorías de servicio
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { FolderOpen, Save, X } from 'lucide-react'
import { CategoriaServicio, CategoriaServicioPayload } from '@/types'
import { createCategoriaServicio } from '@/lib/services/categoriaServicio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  onCreated?: (categoria: CategoriaServicio) => void
}

export default function CategoriaServicioModal({ isOpen, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
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
      const payload: CategoriaServicioPayload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined
      }
      const nueva = await createCategoriaServicio(payload)
      toast.success('Categoría creada exitosamente')
      onCreated?.(nueva)
      handleClose()
    } catch (err) {
      console.error('Error creating categoria:', err)
      toast.error('Error al crear la categoría')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNombre('')
    setDescripcion('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-600" />
            Nueva Categoría de Servicio
          </DialogTitle>
          <DialogDescription>
            Crea una nueva categoría para organizar los servicios del catálogo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Categoría *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Instalación y Montaje, Mantenimiento..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              💡 Nombre descriptivo de la categoría (ej: "Instalación y Montaje", "Mantenimiento Preventivo")
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (Opcional)</Label>
            <Textarea
              id="descripcion"
              placeholder="Describe brevemente qué tipo de servicios incluye esta categoría..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={loading}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              📝 Proporciona detalles adicionales sobre esta categoría de servicios
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !nombre.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creando...' : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}