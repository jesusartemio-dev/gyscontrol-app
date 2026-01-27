'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader2, AlertCircle, X, Truck } from 'lucide-react'
import { createPlantilla } from '@/lib/services/plantilla'
import { getEdts } from '@/lib/services/edt'
import type { Plantilla, Edt } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  onCreated: (nueva: Plantilla) => void
  trigger?: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
}

export default function PlantillaModalServicios({ onCreated, trigger, isOpen, onClose }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Determinar si usar control externo
  const isExternallyControlled = isOpen !== undefined
  const open = isExternallyControlled ? isOpen : internalOpen
  const setOpen = onClose !== undefined ? (value: boolean) => { if (!value) onClose() } : setInternalOpen
  const [nombre, setNombre] = useState('')
  const [edtId, setEdtId] = useState('')
  const [edts, setEdts] = useState<Edt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingEdts, setLoadingEdts] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string; edtId?: string }>({})

  // Load EDTs when modal opens
  useEffect(() => {
    if (open) {
      loadEdts()
    }
  }, [open])

  const loadEdts = async () => {
    setLoadingEdts(true)
    try {
      const data = await getEdts()
      setEdts(data)
    } catch (error) {
      console.error('Error loading EDTs:', error)
    } finally {
      setLoadingEdts(false)
    }
  }

  // ✅ Form validation
  const validateForm = () => {
    const newErrors: { nombre?: string; edtId?: string } = {}

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    } else if (nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres'
    }

    if (!edtId) {
      newErrors.edtId = 'Debe seleccionar un EDT'
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
      // Create independent services template
      const response = await fetch('/api/plantillas/servicios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          edtId: edtId,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear la plantilla')
      }

      const nueva = await response.json()

      if (nueva) {
        onCreated(nueva)
        // Reset form and close modal
        setNombre('')
        setEdtId('')
        setError(null)
        setErrors({})
        setOpen(false)
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
      setEdtId('')
      setError(null)
      setErrors({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isExternallyControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Servicios
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-600" />
            Nueva Plantilla de Servicios
          </DialogTitle>
          <DialogDescription>
            Crea una nueva plantilla especializada en servicios de una categoría específica
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
              placeholder="Ej: Servicios de Instalación y Montaje"
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

          {/* EDT Selection */}
          <div className="space-y-2">
            <Label htmlFor="edt">EDT *</Label>
            <Select
              value={edtId}
              onValueChange={(value) => {
                setEdtId(value)
                if (errors.edtId) {
                  setErrors(prev => ({ ...prev, edtId: undefined }))
                }
              }}
              disabled={loading || loadingEdts}
            >
              <SelectTrigger className={errors.edtId ? 'border-red-500 focus:border-red-500' : ''}>
                <SelectValue placeholder={loadingEdts ? "Cargando EDTs..." : "Selecciona un EDT"} />
              </SelectTrigger>
              <SelectContent>
                {edts.map((edt) => (
                  <SelectItem key={edt.id} value={edt.id}>
                    {edt.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.edtId && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.edtId}
              </motion.p>
            )}
          </div>

          {/* Info about template type */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <Truck className="h-4 w-4" />
              <span className="text-sm font-medium">Plantilla de Servicios por EDT</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Esta plantilla solo permitirá agregar servicios del EDT seleccionado. Podrás elegir múltiples items del catálogo de servicios para crear una plantilla especializada.
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
              disabled={loading || !nombre.trim() || !edtId}
              className="bg-green-600 hover:bg-green-700 text-white"
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