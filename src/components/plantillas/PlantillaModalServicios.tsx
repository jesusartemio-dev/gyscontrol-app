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
}

export default function PlantillaModalServicios({ onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [categorias, setCategorias] = useState<Edt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCategorias, setLoadingCategorias] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string; categoriaId?: string }>({})

  // Load categorias when modal opens
  useEffect(() => {
    if (open) {
      loadCategorias()
    }
  }, [open])

  const loadCategorias = async () => {
    setLoadingCategorias(true)
    try {
      const data = await getEdts()
      setCategorias(data)
    } catch (error) {
      console.error('Error loading categorias:', error)
    } finally {
      setLoadingCategorias(false)
    }
  }

  // ✅ Form validation
  const validateForm = () => {
    const newErrors: { nombre?: string; categoriaId?: string } = {}

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    } else if (nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres'
    }

    if (!categoriaId) {
      newErrors.categoriaId = 'Debe seleccionar una categoría de servicios'
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
          categoria: categoriaId,
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
        setCategoriaId('')
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
      setCategoriaId('')
      setError(null)
      setErrors({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla de Servicios
          </Button>
        )}
      </DialogTrigger>
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

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría de Servicios *</Label>
            <Select
              value={categoriaId}
              onValueChange={(value) => {
                setCategoriaId(value)
                if (errors.categoriaId) {
                  setErrors(prev => ({ ...prev, categoriaId: undefined }))
                }
              }}
              disabled={loading || loadingCategorias}
            >
              <SelectTrigger className={errors.categoriaId ? 'border-red-500 focus:border-red-500' : ''}>
                <SelectValue placeholder={loadingCategorias ? "Cargando categorías..." : "Selecciona una categoría"} />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoriaId && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.categoriaId}
              </motion.p>
            )}
          </div>

          {/* Info about template type */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <Truck className="h-4 w-4" />
              <span className="text-sm font-medium">Plantilla de Servicios por Categoría</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Esta plantilla solo permitirá agregar servicios de la categoría seleccionada. Podrás elegir múltiples items del catálogo de servicios para crear una plantilla especializada.
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
              disabled={loading || !nombre.trim() || !categoriaId}
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