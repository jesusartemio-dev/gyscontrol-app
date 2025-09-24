// ===================================================
// 📁 Archivo: ListaEquipoEditModal.tsx
// 📍 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para editar listas técnicas existentes
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ListaEquipo } from '@/types/modelos'
import { Loader2, FileText, Calendar } from 'lucide-react'

interface Props {
  lista: ListaEquipo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (lista: ListaEquipo) => void
}

export default function ListaEquipoEditModal({ lista, open, onOpenChange, onUpdated }: Props) {
  const [nombre, setNombre] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string; fechaNecesaria?: string }>({})

  // Reset form when lista changes
  useEffect(() => {
    if (lista) {
      setNombre(lista.nombre || '')
      setFechaNecesaria(lista.fechaNecesaria || '')
      setErrors({})
    }
  }, [lista])

  const validateForm = () => {
    const newErrors: { nombre?: string; fechaNecesaria?: string } = {}

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    }

    // Validación opcional para fechaNecesaria
    if (fechaNecesaria) {
      const fecha = new Date(fechaNecesaria)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      if (fecha < hoy) {
        newErrors.fechaNecesaria = 'La fecha necesaria no puede ser anterior a hoy'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lista || !validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    try {
      setLoading(true)

      // Preparar payload para API
      const payload = {
        nombre: nombre.trim(),
        ...(fechaNecesaria && { fechaNecesaria })
      }

      console.log('🔍 Enviando payload de actualización:', payload)

      // Llamada al API
      const response = await fetch(`/api/listas-equipo/${lista.id}`, {
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
        let errorMessage = 'Error al actualizar la lista'

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

      const listaActualizada = await response.json()
      console.log('✅ Lista actualizada:', listaActualizada)

      // Call parent callback with the updated lista
      onUpdated(listaActualizada)

      // Close modal
      onOpenChange(false)

      toast.success('Lista técnica actualizada exitosamente')
    } catch (error) {
      console.error('Error al actualizar lista:', error)

      let errorMessage = 'Error al actualizar la lista técnica. Intente nuevamente.'

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

  const handleInputChange = (field: 'nombre' | 'fechaNecesaria', value: string) => {
    if (field === 'nombre') {
      setNombre(value)
      // Clear error when user starts typing
      if (errors.nombre && value.trim()) {
        setErrors(prev => ({ ...prev, nombre: undefined }))
      }
    } else if (field === 'fechaNecesaria') {
      setFechaNecesaria(value)
      // Clear error when user changes date
      if (errors.fechaNecesaria) {
        setErrors(prev => ({ ...prev, fechaNecesaria: undefined }))
      }
    }
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      // Reset form to original values
      if (lista) {
        setNombre(lista.nombre || '')
        setFechaNecesaria(lista.fechaNecesaria || '')
        setErrors({})
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Editar Lista Técnica
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
              Nombre de la Lista Técnica
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                placeholder="Ej: Lista de Equipos Eléctricos"
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
            <Label htmlFor="fechaNecesaria" className="text-sm font-medium text-gray-700">
              Fecha Necesaria (Opcional)
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="fechaNecesaria"
                type="date"
                value={fechaNecesaria}
                onChange={(e) => handleInputChange('fechaNecesaria', e.target.value)}
                className={`pl-10 ${errors.fechaNecesaria ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {errors.fechaNecesaria && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.fechaNecesaria}
              </motion.p>
            )}
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
                  <FileText className="w-4 h-4 mr-2" />
                  Actualizar Lista
                </>
              )}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  )
}