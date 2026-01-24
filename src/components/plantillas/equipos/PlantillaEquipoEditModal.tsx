// ===================================================
// 📁 Archivo: PlantillaEquipoEditModal.tsx
// 📍 Ubicación: src/components/plantillas/equipos/
// 🔧 Descripción: Modal para editar plantillas de equipos independientes
//
// 🎨 Mejoras UX/UI aplicadas:
// - Diseño moderno con modal
// - Validación en tiempo real
// - Estados de carga mejorados
// - Feedback visual
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, FileText, Wrench } from 'lucide-react'

interface PlantillaEquipoIndependiente {
  id: string
  nombre: string
  descripcion?: string
  estado: string
  totalInterno: number
  totalCliente: number
  descuento: number
  grandTotal: number
  createdAt: string
  updatedAt: string
  plantillaEquipoItemIndependiente: any[] // We don't need the full items type for editing
  _count?: { plantillaEquipoItemIndependiente: number }
}

interface Props {
  plantilla: PlantillaEquipoIndependiente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (plantilla: PlantillaEquipoIndependiente) => void
}

export default function PlantillaEquipoEditModal({ plantilla, open, onOpenChange, onUpdated }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string; descripcion?: string }>({})

  // Reset form when plantilla changes
  useEffect(() => {
    if (plantilla) {
      setNombre(plantilla.nombre || '')
      setDescripcion(plantilla.descripcion || '')
      setErrors({})
    }
  }, [plantilla])

  const validateForm = () => {
    const newErrors: { nombre?: string; descripcion?: string } = {}

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    }

    // Descripción es opcional, pero si se proporciona, validar longitud
    if (descripcion && descripcion.trim().length > 500) {
      newErrors.descripcion = 'La descripción no puede exceder 500 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!plantilla || !validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    try {
      setLoading(true)

      // Preparar payload para API
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null
      }

      console.log('🔍 Enviando payload de actualización:', payload)

      // Llamada al API
      const response = await fetch(`/api/plantillas/equipos/${plantilla.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        let errorData: { error?: string } = {}
        let errorMessage = 'Error al actualizar la plantilla'

        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const textResponse = await response.text()
            console.error('❌ Non-JSON error response:', textResponse)
            errorMessage = textResponse || `Error ${response.status}: ${response.statusText}`
          }
        } catch (parseError) {
          console.error('❌ Error parsing response:', parseError)
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }

        console.error('❌ Error response:', errorData)
        throw new Error(errorMessage)
      }

      const plantillaActualizada = await response.json()
      console.log('✅ Plantilla actualizada:', plantillaActualizada)

      // Call parent callback with the updated plantilla
      onUpdated(plantillaActualizada)

      // Close modal
      onOpenChange(false)

      toast.success('Plantilla de equipos actualizada exitosamente')
    } catch (error) {
      console.error('Error al actualizar plantilla:', error)

      let errorMessage = 'Error al actualizar la plantilla de equipos. Intente nuevamente.'

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: 'nombre' | 'descripcion', value: string) => {
    if (field === 'nombre') {
      setNombre(value)
      // Clear error when user starts typing
      if (errors.nombre && value.trim()) {
        setErrors(prev => ({ ...prev, nombre: undefined }))
      }
    } else if (field === 'descripcion') {
      setDescripcion(value)
      // Clear error when user changes description
      if (errors.descripcion) {
        setErrors(prev => ({ ...prev, descripcion: undefined }))
      }
    }
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      // Reset form to original values
      if (plantilla) {
        setNombre(plantilla.nombre || '')
        setDescripcion(plantilla.descripcion || '')
        setErrors({})
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Editar Plantilla de Equipos
          </DialogTitle>
        </DialogHeader>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-sm font-medium text-gray-700">
              Nombre de la Plantilla
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                placeholder="Ej: Plantilla de Equipos Básicos"
                className={`pl-10 ${errors.nombre ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.nombre && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.nombre}
              </motion.p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-sm font-medium text-gray-700">
              Descripción (Opcional)
            </Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Describe el propósito y alcance de esta plantilla..."
              className={`min-h-[100px] ${errors.descripcion ? 'border-red-500 focus:border-red-500' : ''}`}
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{descripcion.length}/500 caracteres</span>
              {errors.descripcion && (
                <motion.span
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600"
                >
                  {errors.descripcion}
                </motion.span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Actualizar Plantilla
                </>
              )}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  )
}