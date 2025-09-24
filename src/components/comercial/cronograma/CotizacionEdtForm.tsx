'use client'

/**
 * 📝 CotizacionEdtForm - Formulario para EDTs comerciales
 *
 * Componente básico para crear y editar EDTs comerciales.
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
import type { CategoriaServicio } from '@/types/modelos'

interface CotizacionEdtFormProps {
  cotizacionId: string
  edt?: any // EDT existente para editar
  onSuccess: () => void
  onCancel: () => void
}

export function CotizacionEdtForm({
  cotizacionId,
  edt,
  onSuccess,
  onCancel
}: CotizacionEdtFormProps) {
  const [loading, setLoading] = useState(false)
  const [serviciosLoading, setServiciosLoading] = useState(true)
  const [fasesLoading, setFasesLoading] = useState(true)
  const [servicios, setServicios] = useState<any[]>([])
  const [fases, setFases] = useState<any[]>([])
  const [formData, setFormData] = useState({
    nombre: '',
    categoriaServicioId: '',
    zona: '',
    fechaInicioCom: '',
    fechaFinCom: '',
    horasCom: '',
    responsableId: '',
    descripcion: '',
    prioridad: 'media',
    cotizacionFaseId: 'none'
  })
  const { toast } = useToast()

  // ✅ Función para calcular horas totales de un servicio
  const calcularHorasTotalesServicio = (servicio: any): number => {
    if (!servicio?.items || servicio.items.length === 0) return 0

    return servicio.items.reduce((total: number, item: any) => {
      return total + (item.horaTotal || 0)
    }, 0)
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

  // Cargar servicios de la cotización
  useEffect(() => {
    const loadServicios = async () => {
      try {
        setServiciosLoading(true)
        const response = await fetch(`/api/cotizacion/${cotizacionId}/servicios`)
        if (response.ok) {
          const data = await response.json()
          setServicios(data.data || [])
          console.log('Servicios loaded:', data.data?.length || 0)
        } else {
          console.error('Failed to load servicios:', response.status)
        }
      } catch (error) {
        console.error('Error loading servicios:', error)
      } finally {
        setServiciosLoading(false)
      }
    }
    loadServicios()
  }, [cotizacionId])

  // Cargar fases de la cotización
  useEffect(() => {
    const loadFases = async () => {
      try {
        setFasesLoading(true)
        const response = await fetch(`/api/cotizacion/${cotizacionId}/fases`)
        if (response.ok) {
          const data = await response.json()
          setFases(data.data || [])
          console.log('Fases loaded:', data.data?.length || 0)
        } else {
          console.error('Failed to load fases:', response.status)
        }
      } catch (error) {
        console.error('Error loading fases:', error)
      } finally {
        setFasesLoading(false)
      }
    }
    loadFases()
  }, [cotizacionId])

  // Cargar datos si es edición
  useEffect(() => {
    if (edt) {
      setFormData({
        nombre: edt.nombre || '',
        categoriaServicioId: edt.categoriaServicio?.id || '',
        zona: edt.zona || '',
        fechaInicioCom: edt.fechaInicioComercial
          ? new Date(edt.fechaInicioComercial).toISOString().split('T')[0]
          : '',
        fechaFinCom: edt.fechaFinComercial
          ? new Date(edt.fechaFinComercial).toISOString().split('T')[0]
          : '',
        horasCom: edt.horasEstimadas?.toString() || '',
        responsableId: edt.responsableId || '',
        descripcion: edt.descripcion || '',
        prioridad: edt.prioridad || 'media',
        cotizacionFaseId: edt.cotizacionFaseId || 'none'
      })
    }
  }, [edt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      const url = edt
        ? `/api/cotizacion/${cotizacionId}/cronograma/${edt.id}`
        : `/api/cotizacion/${cotizacionId}/cronograma`

      const method = edt ? 'PUT' : 'POST'

      // Validar que los servicios y fases estén cargados
      if (serviciosLoading || fasesLoading) {
        toast({
          title: 'Cargando...',
          description: 'Espere a que se carguen los servicios y fases.',
          variant: 'destructive'
        })
        return
      }

      // Validar campos requeridos
      if (!formData.nombre?.trim()) {
        toast({
          title: 'Error de validación',
          description: 'El nombre del EDT es obligatorio.',
          variant: 'destructive'
        })
        return
      }

      if (!formData.categoriaServicioId) {
        toast({
          title: 'Error de validación',
          description: 'Debe seleccionar una categoría de servicio.',
          variant: 'destructive'
        })
        return
      }

      // Validar que el servicio seleccionado existe
      const servicioExists = servicios.some(serv => serv.categoriaServicioId === formData.categoriaServicioId)
      if (!servicioExists) {
        toast({
          title: 'Error de validación',
          description: 'El servicio seleccionado no es válido.',
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

      // Debug: Log form data before validation
      console.log('Form data before validation:', formData)
      console.log('Servicios loaded:', servicios.length)

      const horasValue = parseFloat(formData.horasCom)
      if (isNaN(horasValue) || horasValue <= 0) {
        toast({
          title: 'Error de validación',
          description: 'Las horas estimadas deben ser un número válido mayor a 0.',
          variant: 'destructive'
        })
        return
      }

      const requestData = {
        nombre: formData.nombre.trim(),
        categoriaServicioId: formData.categoriaServicioId,
        zona: formData.zona || undefined,
        fechaInicioCom: formData.fechaInicioCom ? new Date(formData.fechaInicioCom).toISOString() : undefined,
        fechaFinCom: formData.fechaFinCom ? new Date(formData.fechaFinCom).toISOString() : undefined,
        horasCom: horasValue,
        responsableId: formData.responsableId || undefined,
        descripcion: formData.descripcion || undefined,
        prioridad: formData.prioridad,
        cotizacionFaseId: formData.cotizacionFaseId === 'none' ? undefined : formData.cotizacionFaseId || undefined
      }

      console.log('Request data:', requestData)
      console.log('Request data types:', {
        nombre: typeof requestData.nombre,
        categoriaServicioId: typeof requestData.categoriaServicioId,
        zona: typeof requestData.zona,
        fechaInicioCom: typeof requestData.fechaInicioCom,
        fechaFinCom: typeof requestData.fechaFinCom,
        horasCom: typeof requestData.horasCom,
        responsableId: typeof requestData.responsableId,
        descripcion: typeof requestData.descripcion,
        prioridad: typeof requestData.prioridad
      })


      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error('Error al guardar EDT')
      }

      toast({
        title: 'Éxito',
        description: `EDT ${edt ? 'actualizado' : 'creado'} correctamente.`
      })

      onSuccess()
    } catch (error) {
      console.error('Error saving EDT:', error)
      toast({
        title: 'Error',
        description: 'No se pudo guardar el EDT.',
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
            {edt ? 'Editar EDT Comercial' : 'Crear EDT Comercial'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre del EDT *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, nombre: e.target.value }))
              }
              placeholder="Ej: Levantamiento de requerimientos, Instalación de equipos..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoriaServicioId">Servicio *</Label>
              <Select
                value={formData.categoriaServicioId}
                onValueChange={(value) => {
                  // ✅ Auto-cargar horas del servicio seleccionado
                  const servicioSeleccionado = servicios.find(s => s.categoriaServicioId === value)
                  const horasTotales = servicioSeleccionado ? calcularHorasTotalesServicio(servicioSeleccionado) : 0

                  setFormData(prev => ({
                    ...prev,
                    categoriaServicioId: value,
                    // ✅ Auto-fill nombre del EDT con el nombre del servicio
                    nombre: servicioSeleccionado ? servicioSeleccionado.nombre : prev.nombre,
                    horasCom: horasTotales > 0 ? horasTotales.toString() : prev.horasCom,
                    // ✅ Auto-calcular fecha fin si hay fecha inicio
                    fechaFinCom: prev.fechaInicioCom && horasTotales > 0
                      ? calcularFechaFin(prev.fechaInicioCom, horasTotales)
                      : prev.fechaFinCom
                  }))
                }}
                disabled={serviciosLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    serviciosLoading
                      ? "Cargando servicios..."
                      : servicios.length === 0
                        ? "No hay servicios disponibles"
                        : "Seleccionar servicio"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {!serviciosLoading && servicios.length > 0 && servicios.map((servicio) => (
                    <SelectItem key={servicio.id} value={servicio.categoriaServicioId}>
                      {servicio.nombre} ({servicio.categoria})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="zona">Zona</Label>
              <Input
                id="zona"
                value={formData.zona}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, zona: e.target.value }))
                }
                placeholder="Ej: Z1, Planta, Oficina"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cotizacionFaseId">Fase del Proyecto</Label>
            <Select
              value={formData.cotizacionFaseId}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, cotizacionFaseId: value }))
              }
              disabled={fasesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  fasesLoading
                    ? "Cargando fases..."
                    : fases.length === 0
                      ? "No hay fases disponibles. Crea fases primero."
                      : "Seleccionar fase (opcional)"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar a fase</SelectItem>
                {!fasesLoading && fases.length > 0 && fases.map((fase) => (
                  <SelectItem key={fase.id} value={fase.id}>
                    {fase.nombre} (Orden: {fase.orden})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaInicioCom">Fecha Inicio</Label>
              <Input
                id="fechaInicioCom"
                type="date"
                value={formData.fechaInicioCom}
                onChange={(e) => {
                  const nuevaFechaInicio = e.target.value
                  const horasTotales = parseFloat(formData.horasCom) || 0

                  setFormData(prev => ({
                    ...prev,
                    fechaInicioCom: nuevaFechaInicio,
                    // ✅ Auto-calcular fecha fin si hay horas
                    fechaFinCom: nuevaFechaInicio && horasTotales > 0
                      ? calcularFechaFin(nuevaFechaInicio, horasTotales)
                      : prev.fechaFinCom
                  }))
                }}
              />
            </div>

            <div>
              <Label htmlFor="fechaFinCom" className="flex items-center gap-2">
                Fecha Fin
                {formData.fechaFinCom && (
                  <span className="text-xs text-muted-foreground bg-blue-50 px-2 py-1 rounded">
                    Auto-calculado (8h/día)
                  </span>
                )}
              </Label>
              <Input
                id="fechaFinCom"
                type="date"
                value={formData.fechaFinCom}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, fechaFinCom: e.target.value }))
                }
                placeholder="Se calcula automáticamente o edite manualmente"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="horasCom" className="flex items-center gap-2">
                Horas Estimadas
                {formData.horasCom && parseFloat(formData.horasCom) > 0 && (
                  <span className="text-xs text-muted-foreground bg-green-50 px-2 py-1 rounded">
                    Auto-cargado del servicio
                  </span>
                )}
              </Label>
              <Input
                id="horasCom"
                type="number"
                step="0.5"
                value={formData.horasCom}
                onChange={(e) => {
                  const nuevasHoras = e.target.value
                  const horasTotales = parseFloat(nuevasHoras) || 0

                  setFormData(prev => ({
                    ...prev,
                    horasCom: nuevasHoras,
                    // ✅ Auto-calcular fecha fin si hay fecha inicio
                    fechaFinCom: prev.fechaInicioCom && horasTotales > 0
                      ? calcularFechaFin(prev.fechaInicioCom, horasTotales)
                      : prev.fechaFinCom
                  }))
                }}
                placeholder="Se carga automáticamente del servicio"
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
                  <SelectValue placeholder="Seleccionar prioridad" />
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
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Descripción del EDT comercial..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || serviciosLoading || fasesLoading}>
              {loading ? 'Guardando...' : (serviciosLoading || fasesLoading) ? 'Cargando...' : (edt ? 'Actualizar' : 'Crear')} EDT
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}