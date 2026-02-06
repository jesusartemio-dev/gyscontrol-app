'use client'

/**
 * EditarJornadaModal - Modal para editar objetivos y ubicación de una jornada
 *
 * Solo disponible mientras la jornada está en estado 'iniciado'
 */

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Target,
  MapPin,
  Loader2,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EditarJornadaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  objetivosDia: string | null | undefined
  ubicacion: string | null | undefined
  onSuccess: () => void
}

export function EditarJornadaModal({
  open,
  onOpenChange,
  jornadaId,
  objetivosDia,
  ubicacion,
  onSuccess
}: EditarJornadaModalProps) {
  const { toast } = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [objetivos, setObjetivos] = useState('')
  const [ubicacionValue, setUbicacionValue] = useState('')

  // Inicializar valores cuando se abre el modal
  useEffect(() => {
    if (open) {
      setObjetivos(objetivosDia || '')
      setUbicacionValue(ubicacion || '')
    }
  }, [open, objetivosDia, ubicacion])

  const handleSubmit = async () => {
    if (!objetivos.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Los objetivos del día son requeridos' })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objetivosDia: objetivos.trim(),
          ubicacion: ubicacionValue.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando jornada')
      }

      toast({
        title: 'Jornada actualizada',
        description: 'Los cambios se guardaron correctamente'
      })

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error actualizando jornada'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Editar Jornada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Objetivos */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-500" />
              Objetivos del día *
            </Label>
            <Textarea
              placeholder="Describe los objetivos planificados para hoy..."
              value={objetivos}
              onChange={e => setObjetivos(e.target.value)}
              rows={3}
            />
          </div>

          {/* Ubicación */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              Ubicación (opcional)
            </Label>
            <Input
              placeholder="Ej: Sector norte, Planta 2, etc."
              value={ubicacionValue}
              onChange={e => setUbicacionValue(e.target.value)}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !objetivos.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
