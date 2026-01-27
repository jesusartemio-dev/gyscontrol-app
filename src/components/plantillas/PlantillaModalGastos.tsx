'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader2, AlertCircle, X, DollarSign } from 'lucide-react'
import { createPlantilla } from '@/lib/services/plantilla'
import type { Plantilla } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  onCreated?: (nueva: Plantilla) => void
  trigger?: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
}

export default function PlantillaModalGastos({ onCreated, trigger, isOpen, onClose }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Determinar si usar control externo
  const isExternallyControlled = isOpen !== undefined
  const open = isExternallyControlled ? isOpen : internalOpen
  const setOpen = onClose !== undefined ? (value: boolean) => { if (!value) onClose() } : setInternalOpen
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string }>({})

  // ✅ Form validation
  const validateForm = () => {
    const newErrors: { nombre?: string } = {}

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    } else if (nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 📡 Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/plantillas/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: ''
        })
      })

      if (!response.ok) {
        throw new Error('Error al crear la plantilla')
      }

      const nueva = await response.json()

      if (nueva) {
        // Reset form and close modal
        setNombre('')
        setError(null)
        setErrors({})
        setOpen(false)
        // Redirect to the detail page
        window.location.href = `/comercial/plantillas/gastos/${nueva.id}`
      } else {
        setError('Error al crear la plantilla. Inténtalo de nuevo.')
      }
    } catch (err) {
      console.error('Error creating plantilla:', err)
      setError('Error al crear la plantilla. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // 🔁 Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when closing
      setNombre('')
      setError(null)
      setErrors({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isExternallyControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Gastos
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Nueva Plantilla de Gastos
          </DialogTitle>
          <DialogDescription>
            Crea una nueva plantilla especializada solo en gastos adicionales
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Form Fields */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Plantilla *</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Gastos de Transporte y Logística"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                if (errors.nombre) {
                  setErrors(prev => ({ ...prev, nombre: undefined }))
                }
              }}
              className={errors.nombre ? 'border-red-500 focus:border-red-500' : ''}
              disabled={loading}
              autoComplete="off"
            />
            {errors.nombre && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.nombre}
              </motion.p>
            )}
          </div>

          {/* Info about template type */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 text-purple-800">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Plantilla de Gastos</span>
            </div>
            <p className="text-xs text-purple-700 mt-1">
              Esta plantilla solo permitirá agregar gastos adicionales. No podrás agregar equipos ni servicios.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Plantilla
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}