// ===================================================
// 📁 Archivo: ListaEquipoForm.tsx
// 📍 Ubicación: src/components/equipos/
// 🔧 Descripción: Formulario mejorado para crear listas técnicas con UX/UI moderna
//
// 🎨 Mejoras UX/UI aplicadas:
// - Diseño más limpio y moderno
// - Mejor feedback visual
// - Estados de carga mejorados
// - Validación en tiempo real
// ===================================================

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ListaEquipoPayload } from '@/types'
import { Plus, Loader2, FileText } from 'lucide-react'

interface Props {
  proyectoId: string
  onCreated: (payload: ListaEquipoPayload) => void
}

export default function ListaEquipoForm({ proyectoId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string; fechaNecesaria?: string }>({})

  const validateForm = () => {
    const newErrors: { nombre?: string; fechaNecesaria?: string } = {}
    
    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    }
    
    // ✅ Validación opcional para fechaNecesaria
    if (fechaNecesaria) {
      const fecha = new Date(fechaNecesaria)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0) // Reset time for comparison
      
      if (fecha < hoy) {
        newErrors.fechaNecesaria = 'La fecha necesaria no puede ser anterior a hoy'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    try {
      setLoading(true)

      onCreated({
        proyectoId,
        nombre: nombre.trim(),
        fechaNecesaria: fechaNecesaria || undefined, // ✅ incluir fecha necesaria
        codigo: undefined,          // generado en backend
        numeroSecuencia: undefined, // generado en backend
      })

      setNombre('')
      setFechaNecesaria('')
      setErrors({})
      toast.success('Lista creada correctamente')
    } catch {
      toast.error('Error al crear lista')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (value: string) => {
    setNombre(value)
    // Clear error when user starts typing
    if (errors.nombre && value.trim()) {
      setErrors(prev => ({ ...prev, nombre: undefined }))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="nombre" className="text-sm font-medium text-gray-700">
              Nombre de la Lista Técnica
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => handleInputChange(e.target.value)}
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
          
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="fechaNecesaria" className="text-sm font-medium text-gray-700">
              Fecha Necesaria (Opcional)
            </Label>
            <Input
              id="fechaNecesaria"
              type="date"
              value={fechaNecesaria}
              onChange={(e) => setFechaNecesaria(e.target.value)}
              className={errors.fechaNecesaria ? 'border-red-500 focus:border-red-500' : ''}
              disabled={loading}
              min={new Date().toISOString().split('T')[0]} // ✅ No permitir fechas pasadas
            />
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
          
          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Lista Técnica
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Helper text */}
        <p className="text-sm text-gray-500">
          Las listas técnicas te permiten organizar y gestionar los equipos necesarios para el proyecto.
        </p>
      </form>
    </motion.div>
  )
}
