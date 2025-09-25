// ===================================================
// 📁 Archivo: RecursoModal.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Modal para crear recursos
//
// 🧠 Uso: Modal que se abre desde la página de recursos
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Save, X } from 'lucide-react'
import { Recurso, RecursoPayload } from '@/types'
import { createRecurso } from '@/lib/services/recurso'
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
  onCreated?: (nuevo: Recurso) => void
}

export default function RecursoModal({ isOpen, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [costoHora, setCostoHora] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: RecursoPayload = { nombre, costoHora }
      const nuevo = await createRecurso(payload)
      toast.success('Recurso creado exitosamente')
      onCreated?.(nuevo)
      handleClose()
    } catch (err) {
      console.error('Error creating recurso:', err)
      toast.error('Error al crear recurso')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNombre('')
    setCostoHora(0)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Nuevo Recurso
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo recurso al catálogo del sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Recurso *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Ingeniero Senior"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costoHora">Costo por Hora (USD) *</Label>
            <Input
              id="costoHora"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 85.50"
              value={costoHora}
              onChange={(e) => setCostoHora(parseFloat(e.target.value) || 0)}
              required
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creando...' : 'Crear Recurso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}