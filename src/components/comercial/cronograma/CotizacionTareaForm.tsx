'use client'

/**
 * 📝 CotizacionTareaForm - Formulario para tareas de EDT comercial
 *
 * Componente básico para crear y editar tareas comerciales.
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

interface CotizacionTareaFormProps {
  cotizacionId: string
  edtId: string
  edt?: any // EDT data for defaults
  tarea?: any // Tarea existente para editar
  onSuccess: () => void
  onCancel: () => void
}

export function CotizacionTareaForm({
  cotizacionId,
  edtId,
  edt,
  tarea,
  onSuccess,
  onCancel
}: CotizacionTareaFormProps) {
  const [loading, setLoading] = useState(false)
  const [tareasExistentes, setTareasExistentes] = useState<any[]>([])
  const [servicioItems, setServicioItems] = useState<any[]>([])
  const [creationMode, setCreationMode] = useState<'manual' | 'from_item'>('manual')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [formData, setFormData] = useState({
    nombre: '',
    fechaInicioCom: '',
    fechaFinCom: '',
    horasCom: '',
    dependenciaDeId: '',
    descripcion: '',
    prioridad: 'media',
    responsableId: ''
  })
  const { toast } = useToast()

  // Cargar tareas existentes para dependencias
  useEffect(() => {
    const loadTareas = async () => {
      try {
        const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/${edtId}/tareas`)
        if (response.ok) {
          const data = await response.json()
          setTareasExistentes(data.data || [])
        }
      } catch (error) {
        console.error('Error loading tareas existentes:', error)
      }
    }
    loadTareas()
  }, [cotizacionId, edtId])

  // Cargar ítems de servicio disponibles
  useEffect(() => {
    const loadServicioItems = async () => {
      try {
        const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/${edtId}/servicio-items`)
        if (response.ok) {
          const data = await response.json()
          setServicioItems(data.data || [])
        }
      } catch (error) {
        console.error('Error loading servicio items:', error)
      }
    }
    if (!tarea) { // Solo cargar si no es edición
      loadServicioItems()
    }
  }, [cotizacionId, edtId, tarea])

  // Cargar datos si es edición
  useEffect(() => {
    if (tarea) {
      setFormData({
        nombre: tarea.nombre || '',
        fechaInicioCom: tarea.fechaInicioComercial
          ? new Date(tarea.fechaInicioComercial).toISOString().split('T')[0]
          : '',
        fechaFinCom: tarea.fechaFinComercial
          ? new Date(tarea.fechaFinComercial).toISOString().split('T')[0]
          : '',
        horasCom: tarea.horasEstimadas?.toString() || '',
        dependenciaDeId: tarea.dependenciaId || '',
        descripcion: tarea.descripcion || '',
        prioridad: tarea.prioridad || 'media',
        responsableId: tarea.responsableId || ''
      })
    } else if (edt && !tarea) {
      // Set defaults from EDT for new tasks
      setFormData(prev => ({
        ...prev,
        fechaInicioCom: edt.fechaInicioComercial
          ? new Date(edt.fechaInicioComercial).toISOString().split('T')[0]
          : prev.fechaInicioCom,
        responsableId: edt.responsableId || prev.responsableId,
        prioridad: edt.prioridad || prev.prioridad
      }))
    }
  }, [tarea, edt])

  // ✅ Manejar selección de ítem de servicio
  const handleItemSelection = (itemId: string) => {
    setSelectedItemId(itemId)
    if (itemId && creationMode === 'from_item') {
      const selectedItem = servicioItems.find(item => item.id === itemId)
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          nombre: selectedItem.nombre || '',
          descripcion: selectedItem.descripcion || '',
          horasCom: selectedItem.horaTotal?.toString() || '',
          // Auto-calcular fecha fin si hay fecha inicio
          fechaFinCom: prev.fechaInicioCom && selectedItem.horaTotal
            ? calcularFechaFin(prev.fechaInicioCom, selectedItem.horaTotal)
            : prev.fechaFinCom
        }))
      }
    }
  }

  // ✅ Función para calcular fecha fin basada en fecha inicio y horas (8 horas/día)
  const calcularFechaFin = (fechaInicio: string, horasTotales: number): string => {
    if (!fechaInicio || !horasTotales || horasTotales <= 0) return ''

    const fechaInicioDate = new Date(fechaInicio)
    const diasTrabajo = Math.ceil(horasTotales / 8) // 8 horas por día

    // Calcular fecha fin considerando días hábiles (lunes a viernes)
    let diasAgregados = 0
    let fechaActual = new Date(fechaInicioDate)

    while (diasAgregados < diasTrabajo) {
      fechaActual.setDate(fechaActual.getDate() + 1)
      // Solo contar días hábiles (0 = domingo, 6 = sábado)
      if (fechaActual.getDay() !== 0 && fechaActual.getDay() !== 6) {
        diasAgregados++
      }
    }

    return fechaActual.toISOString().split('T')[0]
  }

  // ✅ Auto-calcular fecha fin cuando cambian fecha inicio o horas
  const handleFechaInicioChange = (nuevaFechaInicio: string) => {
    const horasTotales = parseFloat(formData.horasCom) || 0
    const nuevaFechaFin = nuevaFechaInicio && horasTotales > 0
      ? calcularFechaFin(nuevaFechaInicio, horasTotales)
      : formData.fechaFinCom

    setFormData(prev => ({
      ...prev,
      fechaInicioCom: nuevaFechaInicio,
      fechaFinCom: nuevaFechaFin
    }))
  }

  // ✅ Auto-calcular fecha fin cuando cambian las horas
  const handleHorasChange = (nuevasHoras: string) => {
    const horasTotales = parseFloat(nuevasHoras) || 0
    const nuevaFechaFin = formData.fechaInicioCom && horasTotales > 0
      ? calcularFechaFin(formData.fechaInicioCom, horasTotales)
      : formData.fechaFinCom

    setFormData(prev => ({
      ...prev,
      horasCom: nuevasHoras,
      fechaFinCom: nuevaFechaFin
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      const url = tarea
        ? `/api/cotizacion/${cotizacionId}/cronograma/${edtId}/tareas/${tarea.id}`
        : `/api/cotizacion/${cotizacionId}/cronograma/${edtId}/tareas`

      const method = tarea ? 'PUT' : 'POST'

      // Validar campos requeridos
      if (!formData.nombre.trim()) {
        toast({
          title: 'Error de validación',
          description: 'Debe ingresar un nombre para la tarea.',
          variant: 'destructive'
        })
        return
      }

      // Validar selección de ítem cuando está en modo from_item
      if (creationMode === 'from_item' && !selectedItemId) {
        toast({
          title: 'Error de validación',
          description: 'Debe seleccionar un ítem de servicio.',
          variant: 'destructive'
        })
        return
      }

      if (!formData.horasCom || parseFloat(formData.horasCom) <= 0) {
        toast({
          title: 'Error de validación',
          description: 'Debe ingresar horas estimadas válidas.',
          variant: 'destructive'
        })
        return
      }

      const requestData = {
        nombre: formData.nombre.trim(),
        fechaInicioCom: formData.fechaInicioCom ? new Date(formData.fechaInicioCom).toISOString() : undefined,
        fechaFinCom: formData.fechaFinCom ? new Date(formData.fechaFinCom).toISOString() : undefined,
        horasCom: parseFloat(formData.horasCom),
        dependenciaDeId: formData.dependenciaDeId || undefined,
        descripcion: formData.descripcion || undefined,
        prioridad: formData.prioridad,
        responsableId: formData.responsableId || undefined,
        // ✅ Incluir ID del ítem de servicio si se creó desde un ítem
        cotizacionServicioItemId: creationMode === 'from_item' && selectedItemId ? selectedItemId : undefined
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error('Error al guardar tarea')
      }

      toast({
        title: 'Éxito',
        description: `Tarea ${tarea ? 'actualizada' : 'creada'} correctamente.`
      })

      onSuccess()
    } catch (error) {
      console.error('Error saving tarea:', error)
      toast({
        title: 'Error',
        description: 'No se pudo guardar la tarea.',
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
            {tarea ? 'Editar Tarea' : 'Crear Tarea'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ Modo de creación */}
          {!tarea && (
            <div className="space-y-3">
              <Label>Modo de creación</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="creationMode"
                    value="manual"
                    checked={creationMode === 'manual'}
                    onChange={(e) => setCreationMode(e.target.value as 'manual' | 'from_item')}
                  />
                  <span>Crear tarea manual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="creationMode"
                    value="from_item"
                    checked={creationMode === 'from_item'}
                    onChange={(e) => setCreationMode(e.target.value as 'manual' | 'from_item')}
                  />
                  <span>Seleccionar de ítems de servicio</span>
                </label>
              </div>
            </div>
          )}

          {/* ✅ Selector de ítem de servicio (solo en modo from_item) */}
          {creationMode === 'from_item' && !tarea && (
            <div>
              <Label htmlFor="servicioItem">Ítem de servicio *</Label>
              <Select
                value={selectedItemId}
                onValueChange={handleItemSelection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ítem de servicio" />
                </SelectTrigger>
                <SelectContent>
                  {servicioItems.length === 0 ? (
                    <SelectItem value="no-items" disabled>
                      No hay ítems disponibles
                    </SelectItem>
                  ) : (
                    servicioItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nombre} ({item.horaTotal}h - {item.categoria})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="nombre">Nombre de la Tarea *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, nombre: e.target.value }))
              }
              placeholder="Ej: Levantamiento de requerimientos"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaInicioCom">Fecha Inicio</Label>
              <Input
                id="fechaInicioCom"
                type="date"
                value={formData.fechaInicioCom}
                onChange={(e) => handleFechaInicioChange(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="fechaFinCom">Fecha Fin</Label>
              <Input
                id="fechaFinCom"
                type="date"
                value={formData.fechaFinCom}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, fechaFinCom: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="horasCom">Horas Estimadas *</Label>
              <Input
                id="horasCom"
                type="number"
                step="0.5"
                value={formData.horasCom}
                onChange={(e) => handleHorasChange(e.target.value)}
                placeholder="0.0"
                required
              />
            </div>

            <div>
              <Label htmlFor="prioridad">Prioridad</Label>
              <Select
                value={formData.prioridad}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, prioridad: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="dependenciaDeId">Depende de</Label>
            <Select
              value={formData.dependenciaDeId}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, dependenciaDeId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tarea precedente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {tareasExistentes.length === 0 ? (
                  <SelectItem value="no-tasks" disabled>
                    No hay tareas disponibles
                  </SelectItem>
                ) : (
                  tareasExistentes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Descripción de la tarea..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (tarea ? 'Actualizar' : 'Crear')} Tarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}