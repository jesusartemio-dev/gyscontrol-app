'use client'

/**
 * CotizacionActividadList - Lista de Actividades para Cronograma de Cotizaciones
 *
 * Muestra y gestiona las actividades dentro de una cotización.
 * Las actividades agrupan tareas relacionadas dentro de cada EDT.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, RefreshCw, AlertCircle, Save, X, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

interface CotizacionActividad {
  id: string
  nombre: string
  descripcion?: string
  cotizacionEdtId?: string  // ✅ NUEVO: Para modo EDT directo
  fechaInicioComercial?: string
  fechaFinComercial?: string
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'pausada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  createdAt: string
  updatedAt: string
  // ✅ NUEVAS RELACIONES PARA MODO FLEXIBLE
  cotizacionEdt?: {
    id: string
    nombre: string
    edt: {
      nombre: string
    }
  }
}


interface CotizacionEdt {
  id: string
  nombre: string
  edt: {
    id: string
    nombre: string
  }
}

interface CotizacionActividadListProps {
  cotizacionId: string
  refreshKey: number
  onRefresh: () => void
}

export function CotizacionActividadList({
  cotizacionId,
  refreshKey,
  onRefresh
}: CotizacionActividadListProps) {
  const [actividades, setActividades] = useState<CotizacionActividad[]>([])
  const [edts, setEdts] = useState<CotizacionEdt[]>([]) // ✅ NUEVO: EDTs disponibles
  const [cotizacionServicios, setCotizacionServicios] = useState<any[]>([]) // ✅ Todos los servicios de la cotización
  const [loading, setLoading] = useState(true)

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
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingActividad, setEditingActividad] = useState<CotizacionActividad | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    actividadId: string
    actividadNombre: string
  }>({ open: false, actividadId: '', actividadNombre: '' })
  const [deletingActividad, setDeletingActividad] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  // ✅ Estado del formulario - Con sistema de posicionamiento flexible
  const [formData, setFormData] = useState({
    nombre: '',
    // Servicio seleccionado (CotizacionServicio) - fuente de la actividad
    cotizacionServicioId: '',
    // EDT opcional para contexto
    cotizacionEdtId: '',
    // Sistema de posicionamiento flexible
    posicionamiento: 'despues_ultima' as 'inicio_padre' | 'despues_ultima',
    descripcion: '',
    fechaInicioComercial: '',
    fechaFinComercial: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'critica',
    estado: 'pendiente' as 'pendiente' | 'en_progreso' | 'completada' | 'pausada' | 'cancelada'
  })

  // Cargar datos
  useEffect(() => {
    loadData()
  }, [cotizacionId, refreshKey])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // ✅ Cargar EDTs disponibles
      const edtsResponse = await fetch(`/api/cotizaciones/${cotizacionId}/edts`)
      if (!edtsResponse.ok) {
        throw new Error('Error al cargar EDTs')
      }
      const edtsData = await edtsResponse.json()
      console.log('🏗️ EDTs cargados:', edtsData.data)
      setEdts(edtsData.data || [])

      // ✅ Cargar servicios de la cotización
      console.log('📡 Cargando servicios de la cotización...')
      const serviciosResponse = await fetch(`/api/cotizacion/${cotizacionId}`)
      if (serviciosResponse.ok) {
        const cotizacionData = await serviciosResponse.json()
        const servicios = cotizacionData.data?.servicios || []
        console.log('📋 Servicios de cotización cargados:', servicios.length, 'servicios')
        console.log('🔍 Primeros 3 servicios:', servicios.slice(0, 3))
        setCotizacionServicios(servicios)
      } else {
        console.error('❌ Error cargando servicios de cotización:', serviciosResponse.status)
      }


      // Cargar actividades
      const actividadesResponse = await fetch(`/api/cotizaciones/${cotizacionId}/actividades`)
      if (!actividadesResponse.ok) {
        throw new Error('Error al cargar actividades')
      }
      const actividadesData = await actividadesResponse.json()
      setActividades(actividadesData.data || [])

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: `No se pudieron cargar las actividades: ${errorMessage}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getEstadoVariant = (estado: string) => {
    switch (estado) {
      case 'completada': return 'default'
      case 'en_progreso': return 'secondary'
      case 'pendiente': return 'outline'
      case 'pausada': return 'secondary'
      case 'cancelada': return 'destructive'
      default: return 'outline'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente'
      case 'en_progreso': return 'En Progreso'
      case 'completada': return 'Completada'
      case 'pausada': return 'Pausada'
      case 'cancelada': return 'Cancelada'
      default: return estado
    }
  }

  const getPrioridadVariant = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'destructive'
      case 'alta': return 'default'
      case 'media': return 'secondary'
      case 'baja': return 'outline'
      default: return 'outline'
    }
  }

  const getPrioridadLabel = (prioridad: string) => {
    switch (prioridad) {
      case 'baja': return 'Baja'
      case 'media': return 'Media'
      case 'alta': return 'Alta'
      case 'critica': return 'Crítica'
      default: return prioridad
    }
  }



  // ✅ Función para calcular duración automática de un servicio
  const calcularDuracionServicio = (servicio: any): number => {
    if (!servicio?.items || servicio.items.length === 0) return 0
    return servicio.items.reduce((total: number, item: any) => total + (item.horaTotal || 0), 0)
  }

  // ✅ Función para determinar ubicación contextual automática
  const determinarUbicacionContextual = (servicioId: string) => {
    const servicio = cotizacionServicios.find(s => s.id === servicioId)
    if (!servicio) return { cotizacionEdtId: '' }

    // Buscar EDTs que correspondan a la categoría del servicio
    const edtCompatible = edts.find(edt =>
      edt.edt?.nombre === servicio.categoria
    )

    if (edtCompatible) {
      // Ubicar directamente en el EDT
      return {
        cotizacionEdtId: edtCompatible.id,
      }
    }

    // Si no hay EDT compatible, dejar sin ubicación específica
    return { cotizacionEdtId: '' }
  }


  const resetForm = () => {
    setFormData({
      nombre: '',
      cotizacionServicioId: '',
      cotizacionEdtId: '',
      posicionamiento: 'despues_ultima',
      descripcion: '',
      fechaInicioComercial: '',
      fechaFinComercial: '',
      prioridad: 'media',
      estado: 'pendiente'
    })
  }

  const handleCreateActividad = async () => {
    // ✅ Validación simplificada
    if (!formData.nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive'
      })
      return
    }

    if (!formData.cotizacionServicioId) {
      toast({
        title: 'Error',
        description: 'El servicio es obligatorio',
        variant: 'destructive'
      })
      return
    }

    try {
      setCreating(true)

      // Convertir fechas a formato datetime si existen
      const requestData = {
        nombre: formData.nombre,
        cotizacionEdtId: formData.cotizacionEdtId || undefined,
        descripcion: formData.descripcion,
        fechaInicioComercial: formData.fechaInicioComercial
          ? new Date(formData.fechaInicioComercial).toISOString()
          : undefined,
        fechaFinComercial: formData.fechaFinComercial
          ? new Date(formData.fechaFinComercial).toISOString()
          : undefined,
        prioridad: formData.prioridad,
        estado: formData.estado
      }

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/actividades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear actividad')
      }

      const result = await response.json()

      toast({
        title: 'Éxito',
        description: result.message || 'Actividad creada exitosamente'
      })

      setShowCreateModal(false)
      resetForm()
      onRefresh()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast({
        title: 'Error',
        description: `No se pudo crear la actividad: ${errorMessage}`,
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleEditActividad = async () => {
    if (!editingActividad || !formData.nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive'
      })
      return
    }

    try {
      setUpdating(true)

      const requestData = {
        nombre: formData.nombre,
        cotizacionEdtId: formData.cotizacionEdtId || undefined,
        descripcion: formData.descripcion,
        fechaInicioComercial: formData.fechaInicioComercial
          ? new Date(formData.fechaInicioComercial).toISOString()
          : undefined,
        fechaFinComercial: formData.fechaFinComercial
          ? new Date(formData.fechaFinComercial).toISOString()
          : undefined,
        prioridad: formData.prioridad,
        estado: formData.estado
      }

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/actividades/${editingActividad.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar actividad')
      }

      const result = await response.json()

      toast({
        title: 'Éxito',
        description: result.message || 'Actividad actualizada exitosamente'
      })

      setShowEditModal(false)
      setEditingActividad(null)
      resetForm()
      onRefresh()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast({
        title: 'Error',
        description: `No se pudo actualizar la actividad: ${errorMessage}`,
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteActividad = async () => {
    const actividadId = deleteDialog.actividadId
    const actividadNombre = deleteDialog.actividadNombre

    try {
      // Set loading state and close dialog
      setDeletingActividad(actividadId)
      setDeleteDialog({ open: false, actividadId: '', actividadNombre: '' })

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/actividades/${actividadId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar actividad')
      }

      toast({
        title: 'Actividad eliminada',
        description: 'La actividad comercial ha sido eliminada exitosamente.'
      })

      onRefresh()
      setDeletingActividad(null)
    } catch (error) {
      console.error('Error deleting actividad:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la actividad.',
        variant: 'destructive'
      })
      setDeletingActividad(null)
    }
  }

  const handleEditClick = (actividad: CotizacionActividad) => {
    setEditingActividad(actividad)
    setFormData({
      nombre: actividad.nombre,
      cotizacionServicioId: '', // No disponible en edición
      cotizacionEdtId: actividad.cotizacionEdtId || '',
      posicionamiento: 'despues_ultima', // Default para edición
      descripcion: actividad.descripcion || '',
      fechaInicioComercial: actividad.fechaInicioComercial
        ? new Date(actividad.fechaInicioComercial).toISOString().split('T')[0]
        : '',
      fechaFinComercial: actividad.fechaFinComercial
        ? new Date(actividad.fechaFinComercial).toISOString().split('T')[0]
        : '',
      prioridad: actividad.prioridad,
      estado: actividad.estado
    })
    setShowEditModal(true)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-8" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" /> {/* Skeleton for menu button */}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">Error al cargar actividades</h3>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Actividades del Proyecto</CardTitle>
            <Badge variant="secondary">{actividades.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Nueva Actividad
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Actividad</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* ✅ Selector de Servicio - TODOS los servicios disponibles */}
                  <div className="grid gap-2">
                    <Label htmlFor="servicio">Servicio *</Label>
                    <Select
                      value={formData.cotizacionServicioId}
                      onValueChange={(value) => {
                        const servicioSeleccionado = cotizacionServicios.find(s => s.id === value)
                        const ubicacionContextual = determinarUbicacionContextual(value)

                        setFormData(prev => ({
                          ...prev,
                          cotizacionServicioId: value,
                          nombre: servicioSeleccionado?.nombre || '',
                          // ✅ Aplicar ubicación contextual automática
                          cotizacionEdtId: ubicacionContextual.cotizacionEdtId
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {cotizacionServicios.map((servicio) => (
                          <SelectItem key={servicio.id} value={servicio.id}>
                            {servicio.nombre} ({servicio.categoria})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ✅ Nombre de la actividad (auto-llenado) */}
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre de la Actividad *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre de la actividad"
                    />
                  </div>

                  {/* ✅ EDT para contexto (auto-determinada) */}
                  <div className="grid gap-2">
                    <Label htmlFor="edt">
                      EDT {formData.cotizacionEdtId ? '(Auto-determinada)' : '(Opcional)'}
                    </Label>
                    <Select
                      value={formData.cotizacionEdtId || 'none'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, cotizacionEdtId: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.cotizacionEdtId ? "EDT determinado automáticamente" : "Selecciona un EDT opcional"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin EDT específico</SelectItem>
                        {edts.map((edt) => (
                          <SelectItem key={edt.id} value={edt.id}>
                            {edt.nombre} ({edt.edt?.nombre})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>


                  {/* ✅ Sistema de posicionamiento flexible */}
                  <div className="grid gap-2">
                    <Label htmlFor="posicionamiento">Posicionamiento de Fecha Inicio</Label>
                    <Select
                      value={formData.posicionamiento}
                      onValueChange={(value: 'inicio_padre' | 'despues_ultima') =>
                        setFormData(prev => ({ ...prev, posicionamiento: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar posicionamiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="despues_ultima">Después de la Última Actividad</SelectItem>
                        <SelectItem value="inicio_padre">Al Inicio del Padre</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.posicionamiento === 'despues_ultima'
                        ? 'La actividad se programará después de la última actividad existente en el EDT/Zona'
                        : 'La actividad se programará al inicio del EDT/Zona padre'
                      }
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Descripción opcional de la actividad"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={formData.fechaInicioComercial}
                        onChange={(e) => setFormData(prev => ({ ...prev, fechaInicioComercial: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fechaFin">Fecha Fin</Label>
                      <Input
                        id="fechaFin"
                        type="date"
                        value={formData.fechaFinComercial}
                        onChange={(e) => setFormData(prev => ({ ...prev, fechaFinComercial: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="prioridad">Prioridad</Label>
                      <Select
                        value={formData.prioridad}
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, prioridad: value }))}
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
                    <div className="grid gap-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, estado: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en_progreso">En Progreso</SelectItem>
                          <SelectItem value="completada">Completada</SelectItem>
                          <SelectItem value="pausada">Pausada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    disabled={creating}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateActividad} disabled={creating}>
                    <Save className="h-4 w-4 mr-2" />
                    {creating ? 'Creando...' : 'Crear Actividad'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {actividades.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings className="h-12 w-12 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay actividades definidas</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Las actividades agrupan tareas relacionadas dentro de cada EDT del proyecto.
              Crea tu primera actividad para organizar mejor el trabajo.
            </p>
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Crear Primera Actividad
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            {actividades.map((actividad) => (
              <Card key={actividad.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{actividad.nombre}</h4>
                        <Badge variant={getEstadoVariant(actividad.estado)}>
                          {getEstadoLabel(actividad.estado)}
                        </Badge>
                        <Badge variant={getPrioridadVariant(actividad.prioridad)}>
                          {getPrioridadLabel(actividad.prioridad)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        {actividad.cotizacionEdt ? (
                          <span>EDT: {actividad.cotizacionEdt.nombre}</span>
                        ) : (
                          <span>Ubicación no especificada</span>
                        )}
                        {actividad.fechaInicioComercial && actividad.fechaFinComercial && (
                          <span>
                            {new Date(actividad.fechaInicioComercial).toLocaleDateString('es-ES')} - {' '}
                            {new Date(actividad.fechaFinComercial).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>

                      {actividad.descripcion && (
                        <p className="text-sm text-gray-600 mt-2">{actividad.descripcion}</p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(actividad)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Actividad
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            // Small delay to ensure dropdown closes before dialog opens
                            setTimeout(() => {
                              setDeleteDialog({ open: true, actividadId: actividad.id, actividadNombre: actividad.nombre })
                            }, 100)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Actividad
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal de edición */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Actividad</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nombre">Nombre de la Actividad *</Label>
              <Input
                id="edit-nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre de la actividad"
              />
            </div>

            {/* ✅ EDT opcional para contexto */}
            <div className="grid gap-2">
              <Label htmlFor="edit-edt">EDT (Opcional)</Label>
              <Select
                value={formData.cotizacionEdtId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cotizacionEdtId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un EDT opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin EDT específico</SelectItem>
                  {edts.map((edt) => (
                    <SelectItem key={edt.id} value={edt.id}>
                      {edt.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            <div className="grid gap-2">
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <Textarea
                id="edit-descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción opcional de la actividad"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-fechaInicio">Fecha Inicio</Label>
                <Input
                  id="edit-fechaInicio"
                  type="date"
                  value={formData.fechaInicioComercial}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaInicioComercial: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-fechaFin">Fecha Fin</Label>
                <Input
                  id="edit-fechaFin"
                  type="date"
                  value={formData.fechaFinComercial}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaFinComercial: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-prioridad">Prioridad</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, prioridad: value }))}
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
              <div className="grid gap-2">
                <Label htmlFor="edit-estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, estado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false)
                setEditingActividad(null)
                resetForm()
              }}
              disabled={updating}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleEditActividad} disabled={updating}>
              <Save className="h-4 w-4 mr-2" />
              {updating ? 'Actualizando...' : 'Actualizar Actividad'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        // Solo permitir cerrar si no estamos en medio de una operación
        if (!open) {
          setDeleteDialog({ open: false, actividadId: '', actividadNombre: '' })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar Actividad comercial?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará la actividad "{deleteDialog.actividadNombre}"
              y todas sus tareas asociadas.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, actividadId: '', actividadNombre: '' })}
              disabled={deletingActividad !== null}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteActividad}
              disabled={deletingActividad !== null}
              variant="destructive"
            >
              {deletingActividad !== null ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                'Eliminar Actividad'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}