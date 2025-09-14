// ===================================================
// 📁 Archivo: PlantillaEquipoModal.tsx
// 📌 Ubicación: src/components/plantillas/
// 🔧 Descripción: Modal mejorado para crear nuevas secciones de equipo
// 🎨 Mejoras UX/UI: Modal moderno, validación en tiempo real, animaciones
// ✍️ Autor: Sistema GYS
// 📅 Fecha: 2025-01-27
// ===================================================

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader2, AlertCircle, Package } from 'lucide-react'
import { createPlantillaEquipo } from '@/lib/services/plantillaEquipo'
import type { PlantillaEquipoPayload } from '@/types'
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
import { toast } from 'sonner'

interface Props {
  plantillaId: string
  onCreated: (nuevo: any) => void
  trigger?: React.ReactNode
}

export default function PlantillaEquipoModal({ plantillaId, onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ✅ Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setNombre('')
      setDescripcion('')
      setError(null)
    }
  }

  // ✅ Form validation
  const isValid = nombre.trim().length >= 2

  // ✅ Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isValid) {
      setError('El nombre debe tener al menos 2 caracteres.')
      return
    }

    const payload: PlantillaEquipoPayload = {
      plantillaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      subtotalInterno: 0,
      subtotalCliente: 0
    }

    try {
      setLoading(true)
      const nuevo = await createPlantillaEquipo(payload)
      
      // ✅ Success feedback
      toast.success('✅ Sección de equipo creada exitosamente', {
        description: `Se creó la sección "${nuevo.nombre}"`
      })
      
      onCreated(nuevo)
      handleOpenChange(false)
    } catch (err) {
      console.error('❌ Error al crear sección de equipo:', err)
      setError('Error al crear la sección. Inténtalo nuevamente.')
      toast.error('❌ Error al crear la sección de equipo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" /> 
            Nuevo Equipo
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Nueva Sección de Equipo
          </DialogTitle>
          <DialogDescription>
            Crea una nueva sección para agrupar equipos relacionados en la plantilla.
          </DialogDescription>
        </DialogHeader>

        <motion.form 
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Nombre Field */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la sección *</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Tablero de Control, Equipos de Medición..."
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                if (error) setError(null) // Clear error on input
              }}
              disabled={loading}
              className={`transition-colors ${
                nombre.trim() && !isValid 
                  ? 'border-red-300 focus:border-red-500' 
                  : isValid 
                  ? 'border-green-300 focus:border-green-500'
                  : ''
              }`}
            />
            {nombre.trim() && !isValid && (
              <p className="text-sm text-red-600">Mínimo 2 caracteres</p>
            )}
          </div>

          {/* Descripción Field */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input
              id="descripcion"
              type="text"
              placeholder="Descripción breve de la sección..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={loading}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Sección
                </>
              )}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  )
}