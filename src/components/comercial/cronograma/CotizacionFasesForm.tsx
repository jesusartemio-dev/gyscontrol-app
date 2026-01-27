'use client'

/**
 * 📝 CotizacionFasesForm - Formulario para fases comerciales
 *
 * Componente básico para crear y editar fases comerciales.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface CotizacionFase {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  estado: string
  porcentajeAvance: number
}

interface CotizacionFasesFormProps {
  cotizacionId: string
  fase?: CotizacionFase // Fase existente para editar
  onSuccess: () => void
  onCancel: () => void
}

export function CotizacionFasesForm({
  cotizacionId,
  fase,
  onSuccess,
  onCancel
}: CotizacionFasesFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    orden: '',
    fechaInicioPlan: '',
    fechaFinPlan: '',
    estado: 'planificado'
  })
  const { toast } = useToast()

  // Cargar datos si es edición
  useEffect(() => {
    if (fase) {
      setFormData({
        nombre: fase.nombre || '',
        descripcion: fase.descripcion || '',
        orden: fase.orden?.toString() || '',
        fechaInicioPlan: fase.fechaInicioPlan
          ? new Date(fase.fechaInicioPlan).toISOString().split('T')[0]
          : '',
        fechaFinPlan: fase.fechaFinPlan
          ? new Date(fase.fechaFinPlan).toISOString().split('T')[0]
          : '',
        estado: fase.estado || 'planificado'
      })
    }
  }, [fase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      const url = fase
        ? `/api/cotizacion/${cotizacionId}/fases/${fase.id}`
        : `/api/cotizacion/${cotizacionId}/fases`

      const method = fase ? 'PUT' : 'POST'

      // Validar campos requeridos
      if (!formData.nombre?.trim()) {
        toast({
          title: 'Error de validación',
          description: 'El nombre de la fase es obligatorio.',
          variant: 'destructive'
        })
        return
      }

      if (!formData.orden || parseInt(formData.orden) <= 0) {
        toast({
          title: 'Error de validación',
          description: 'El orden debe ser un número válido mayor a 0.',
          variant: 'destructive'
        })
        return
      }

      const requestData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion || undefined,
        orden: parseInt(formData.orden),
        fechaInicioPlan: formData.fechaInicioPlan ? new Date(formData.fechaInicioPlan).toISOString() : undefined,
        fechaFinPlan: formData.fechaFinPlan ? new Date(formData.fechaFinPlan).toISOString() : undefined,
        estado: formData.estado
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error('Error al guardar fase')
      }

      toast({
        title: 'Éxito',
        description: `Fase ${fase ? 'actualizada' : 'creada'} correctamente.`
      })

      onSuccess()
    } catch (error) {
      console.error('Error saving fase:', error)
      toast({
        title: 'Error',
        description: 'No se pudo guardar la fase.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {fase ? 'Editar Fase Comercial' : 'Crear Fase Comercial'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre de la Fase *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, nombre: e.target.value }))
              }
              placeholder="Ej: Planificación, Ejecución, Cierre..."
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Descripción de la fase comercial..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orden">Orden *</Label>
              <Input
                id="orden"
                type="number"
                min="1"
                value={formData.orden}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, orden: e.target.value }))
                }
                placeholder="1, 2, 3..."
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, estado: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planificado">Planificado</SelectItem>
                  <SelectItem value="en_progreso">En Progreso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaInicioPlan">Fecha Inicio Planificada</Label>
              <Input
                id="fechaInicioPlan"
                type="date"
                value={formData.fechaInicioPlan}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, fechaInicioPlan: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="fechaFinPlan">Fecha Fin Planificada</Label>
              <Input
                id="fechaFinPlan"
                type="date"
                value={formData.fechaFinPlan}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, fechaFinPlan: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.nombre?.trim() ||
                !formData.orden ||
                parseInt(formData.orden) <= 0
              }
            >
              {loading ? 'Guardando...' : (fase ? 'Actualizar' : 'Crear')} Fase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}