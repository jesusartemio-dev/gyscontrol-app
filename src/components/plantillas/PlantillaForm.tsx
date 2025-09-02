'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { createPlantilla } from '@/lib/services/plantilla'
import type { Plantilla } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  onCreated: (nueva: Plantilla) => void
}

export default function PlantillaForm({ onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string }>({})

  // Validación en tiempo real
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const nueva = await createPlantilla({
        nombre: nombre.trim(),
        descripcion: ''
      })
      onCreated(nueva)
      setNombre('')
      setErrors({})
    } catch (err) {
      console.error('Error al crear plantilla:', err)
      setError('Ocurrió un error al crear la plantilla. Por favor, inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (value: string) => {
    setNombre(value)
    if (errors.nombre) {
      setErrors({})
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Plantilla
          </CardTitle>
          <CardDescription>
            Crea una nueva plantilla para tus cotizaciones comerciales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la plantilla</Label>
              <Input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Ej: Plantilla Sistema Eléctrico"
                disabled={loading}
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500"
                >
                  {errors.nombre}
                </motion.p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !!errors.nombre}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Plantilla
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
