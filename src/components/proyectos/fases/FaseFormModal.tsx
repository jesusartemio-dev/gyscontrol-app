'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { Proyecto } from '@/types/modelos'

// ✅ Tipos locales
interface ProyectoFase {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: 'planificado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado'
  porcentajeAvance: number
  createdAt: string
  updatedAt: string
}

interface FaseFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: FaseFormData) => Promise<void>
  fase?: ProyectoFase | null
  proyecto: Proyecto
}

interface FaseFormData {
  nombre: string
  descripcion?: string
  orden?: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  estado?: 'planificado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado'
}

const ESTADOS_FASE = [
  { value: 'planificado', label: 'Planificado' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completado', label: 'Completado' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'cancelado', label: 'Cancelado' }
] as const

export function FaseFormModal({ open, onOpenChange, onSubmit, fase, proyecto }: FaseFormModalProps) {
  // ✅ Estados del formulario
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FaseFormData>({
    nombre: '',
    descripcion: '',
    orden: 1,
    fechaInicioPlan: '',
    fechaFinPlan: '',
    estado: 'planificado'
  })

  // ✅ Estados de fechas
  const [fechaInicioPlan, setFechaInicioPlan] = useState<Date>()
  const [fechaFinPlan, setFechaFinPlan] = useState<Date>()

  // ✅ Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      if (fase) {
        // Modo edición
        setFormData({
          nombre: fase.nombre,
          descripcion: fase.descripcion || '',
          orden: fase.orden,
          fechaInicioPlan: fase.fechaInicioPlan || '',
          fechaFinPlan: fase.fechaFinPlan || '',
          estado: fase.estado
        })
        setFechaInicioPlan(fase.fechaInicioPlan ? new Date(fase.fechaInicioPlan) : undefined)
        setFechaFinPlan(fase.fechaFinPlan ? new Date(fase.fechaFinPlan) : undefined)
      } else {
        // Modo creación
        setFormData({
          nombre: '',
          descripcion: '',
          orden: 1,
          fechaInicioPlan: '',
          fechaFinPlan: '',
          estado: 'planificado'
        })
        setFechaInicioPlan(undefined)
        setFechaFinPlan(undefined)
      }
    }
  }, [open, fase])

  // ✅ Handlers
  const handleInputChange = (field: keyof FaseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFechaInicioChange = (date: Date | undefined) => {
    setFechaInicioPlan(date)
    setFormData(prev => ({
      ...prev,
      fechaInicioPlan: date ? date.toISOString() : ''
    }))
  }

  const handleFechaFinChange = (date: Date | undefined) => {
    setFechaFinPlan(date)
    setFormData(prev => ({
      ...prev,
      fechaFinPlan: date ? date.toISOString() : ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones básicas
    if (!formData.nombre.trim()) {
      toast({
        title: 'Error de validación',
        description: 'El nombre de la fase es requerido',
        variant: 'destructive'
      })
      return
    }

    // Validar fechas
    if (fechaInicioPlan && fechaFinPlan && fechaInicioPlan >= fechaFinPlan) {
      toast({
        title: 'Error de validación',
        description: 'La fecha de fin debe ser posterior a la fecha de inicio',
        variant: 'destructive'
      })
      return
    }

    // Validar que las fechas estén dentro del proyecto
    if (fechaInicioPlan && fechaInicioPlan < new Date(proyecto.fechaInicio)) {
      toast({
        title: 'Error de validación',
        description: 'La fecha de inicio no puede ser anterior al inicio del proyecto',
        variant: 'destructive'
      })
      return
    }

    if (fechaFinPlan && fechaFinPlan > new Date(proyecto.fechaFin!)) {
      toast({
        title: 'Error de validación',
        description: 'La fecha de fin no puede ser posterior al fin del proyecto',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      // Error ya manejado en el componente padre
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {fase ? 'Editar Fase' : 'Crear Nueva Fase'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ✅ Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información Básica</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Fase *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Ej: Planificación, Ejecución, Cierre"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  min="1"
                  value={formData.orden}
                  onChange={(e) => handleInputChange('orden', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => handleInputChange('descripcion', e.target.value)}
                placeholder="Describe los objetivos y alcance de esta fase..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleInputChange('estado', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_FASE.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ✅ Fechas planificadas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Fechas Planificadas</h3>
            <p className="text-sm text-muted-foreground">
              Las fechas deben estar dentro del rango del proyecto:
              {format(new Date(proyecto.fechaInicio), 'dd/MM/yyyy', { locale: es })} - {' '}
              {proyecto.fechaFin ? format(new Date(proyecto.fechaFin), 'dd/MM/yyyy', { locale: es }) : 'No definida'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio Planificada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaInicioPlan && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaInicioPlan ? (
                        format(fechaInicioPlan, 'PPP', { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaInicioPlan}
                      onSelect={handleFechaInicioChange}
                      disabled={(date) =>
                        date < new Date(proyecto.fechaInicio) ||
                        Boolean(proyecto.fechaFin && date > new Date(proyecto.fechaFin))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Fin Planificada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaFinPlan && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaFinPlan ? (
                        format(fechaFinPlan, 'PPP', { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaFinPlan}
                      onSelect={handleFechaFinChange}
                      disabled={(date) =>
                        date < new Date(proyecto.fechaInicio) ||
                        Boolean(proyecto.fechaFin && date > new Date(proyecto.fechaFin))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* ✅ Botones de acción */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (fase ? 'Actualizar Fase' : 'Crear Fase')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}