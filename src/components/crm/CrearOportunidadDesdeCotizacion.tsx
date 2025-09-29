'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Plus, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

interface CrearOportunidadDesdeCotizacionProps {
  cotizacionId: string
  cotizacionNombre: string
  cotizacionCodigo: string
  clienteNombre: string
  valorCotizacion: number
  isOpen: boolean
  onClose: () => void
  onSuccess?: (oportunidad: any) => void
}

export default function CrearOportunidadDesdeCotizacion({
  cotizacionId,
  cotizacionNombre,
  cotizacionCodigo,
  clienteNombre,
  valorCotizacion,
  isOpen,
  onClose,
  onSuccess
}: CrearOportunidadDesdeCotizacionProps) {
  const { data: session } = useSession()
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/crm/oportunidades/crear-desde-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacionId,
          comercialId: session?.user?.id,
          descripcion: descripcion.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Error al crear oportunidad'

        // Check if the error is about existing opportunity
        if (errorMessage.includes('Ya existe una oportunidad') || errorMessage.includes('ya existe')) {
          toast.info('Esta cotización ya tiene una oportunidad asociada en el CRM', {
            description: 'No es necesario crear otra oportunidad.',
            duration: 5000,
          })
          onClose()
          // Reset form
          setDescripcion('')
          return
        }

        throw new Error(errorMessage)
      }

      const oportunidad = await response.json()

      toast.success('Oportunidad creada exitosamente desde la cotización')
      onSuccess?.(oportunidad)
      onClose()

      // Reset form
      setDescripcion('')
    } catch (error) {
      console.error('Error creating oportunidad:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear oportunidad')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setDescripcion('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Crear Oportunidad desde Cotización
          </DialogTitle>
          <DialogDescription>
            Convierte esta cotización en una oportunidad de venta para seguimiento en el CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la cotización */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cotización:</span>
              <span className="text-sm font-mono bg-background px-2 py-1 rounded">
                {cotizacionCodigo}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cliente:</span>
              <span className="text-sm">{clienteNombre}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Valor:</span>
              <span className="text-sm font-semibold text-green-600">
                ${valorCotizacion.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Descripción opcional */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">
              Descripción adicional (opcional)
            </Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Agrega información adicional sobre esta oportunidad..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Información sobre la oportunidad */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-900">
                  ¿Qué sucederá al crear la oportunidad?
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Se creará una oportunidad con estado "Contacto Inicial"</li>
                  <li>• Se vinculará automáticamente a esta cotización</li>
                  <li>• Se registrará una actividad de seguimiento inicial</li>
                  <li>• Podrás hacer seguimiento desde el módulo CRM</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Crear Oportunidad
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}