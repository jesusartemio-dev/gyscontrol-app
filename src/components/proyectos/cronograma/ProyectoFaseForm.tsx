// ===================================================
// 📁 Archivo: ProyectoFaseForm.tsx
// 📌 Ubicación: src/components/proyectos/cronograma/ProyectoFaseForm.tsx
// 🔧 Descripción: Formulario para crear/editar fases de proyecto
// 🎯 Funcionalidades: CRUD completo de fases con validaciones
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-03
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Save, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import type { ProyectoFase } from '@/types/modelos'

// Schema de validación
const faseFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  orden: z.number().min(1).optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  proyectoCronogramaId: z.string().min(1, 'El cronograma es requerido')
})

type FaseFormData = z.infer<typeof faseFormSchema>

interface ProyectoFaseFormProps {
  proyectoId: string
  cronogramaId?: string
  fase?: ProyectoFase // Para edición
  onSuccess: (fase: ProyectoFase) => void
  onCancel: () => void
}

export function ProyectoFaseForm({
  proyectoId,
  cronogramaId,
  fase,
  onSuccess,
  onCancel
}: ProyectoFaseFormProps) {
  const [loading, setLoading] = useState(false)
  const [fechaInicio, setFechaInicio] = useState<Date>()
  const [fechaFin, setFechaFin] = useState<Date>()

  const isEditing = !!fase

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FaseFormData>({
    resolver: zodResolver(faseFormSchema),
    defaultValues: {
      nombre: fase?.nombre || '',
      descripcion: fase?.descripcion || '',
      orden: fase?.orden || undefined,
      fechaInicioPlan: fase?.fechaInicioPlan || '',
      fechaFinPlan: fase?.fechaFinPlan || '',
      proyectoCronogramaId: cronogramaId || ''
    }
  })

  // Actualizar fechas cuando cambian los valores del form
  useEffect(() => {
    const fechaInicioStr = watch('fechaInicioPlan')
    const fechaFinStr = watch('fechaFinPlan')

    if (fechaInicioStr) setFechaInicio(new Date(fechaInicioStr))
    if (fechaFinStr) setFechaFin(new Date(fechaFinStr))
  }, [watch])

  const onSubmit = async (data: FaseFormData) => {
    try {
      setLoading(true)

      const payload = {
        proyectoCronogramaId: data.proyectoCronogramaId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        orden: data.orden,
        fechaInicioPlan: data.fechaInicioPlan,
        fechaFinPlan: data.fechaFinPlan
      }

      const url = isEditing
        ? `/api/proyectos/${proyectoId}/fases/${fase.id}`
        : `/api/proyectos/${proyectoId}/fases`

      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar fase')
      }

      const result = await response.json()

      toast.success(
        isEditing
          ? 'Fase actualizada exitosamente'
          : 'Fase creada exitosamente'
      )

      onSuccess(result.data)

    } catch (error) {
      console.error('Error guardando fase:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar fase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? 'Editar Fase' : 'Crear Nueva Fase'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Fase *</Label>
            <Input
              id="nombre"
              {...register('nombre')}
              placeholder="Ej: Planificación, Ejecución, Cierre"
            />
            {errors.nombre && (
              <p className="text-sm text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          {/* Orden */}
          <div className="space-y-2">
            <Label htmlFor="orden">Orden</Label>
            <Input
              id="orden"
              type="number"
              min="1"
              {...register('orden', { valueAsNumber: true })}
              placeholder="Ej: 1, 2, 3..."
            />
            {errors.orden && (
              <p className="text-sm text-red-600">{errors.orden.message}</p>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio Planificada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaInicio ? (
                      format(fechaInicio, 'PPP', { locale: es })
                    ) : (
                      <span>Selecciona fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaInicio}
                    onSelect={(date) => {
                      setFechaInicio(date)
                      setValue('fechaInicioPlan', date ? date.toISOString() : '')
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin Planificada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaFin ? (
                      format(fechaFin, 'PPP', { locale: es })
                    ) : (
                      <span>Selecciona fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaFin}
                    onSelect={(date) => {
                      setFechaFin(date)
                      setValue('fechaFinPlan', date ? date.toISOString() : '')
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Describe las actividades de esta fase..."
              rows={3}
            />
          </div>

          {/* Cronograma ID (hidden) */}
          <input
            type="hidden"
            {...register('proyectoCronogramaId')}
            value={cronogramaId}
          />

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Actualizar Fase' : 'Crear Fase'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}