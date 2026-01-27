'use client'

/**
 * CotizacionTareaList - Lista de Tareas para Cronograma de Cotizaciones
 *
 * Muestra y gestiona las tareas dentro de una cotización.
 * Las tareas son las actividades ejecutables más detalladas.
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
import { CheckCircle, RefreshCw, AlertCircle, Save, X, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

interface CotizacionTarea {
  id: string
  nombre: string
  descripcion?: string
  cotizacionActividadId: string
  fechaInicio: string
  fechaFin: string
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'pausada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  horasEstimadas?: number
  responsableId?: string
  createdAt: string
  updatedAt: string
}

interface CotizacionActividad {
  id: string
  nombre: string
  cotizacionZonaId: string
}

interface CotizacionTareaListProps {
  cotizacionId: string
  refreshKey: number
  onRefresh: () => void
}

export function CotizacionTareaList({
  cotizacionId,
  refreshKey,
  onRefresh
}: CotizacionTareaListProps) {
  const [tareas, setTareas] = useState<CotizacionTarea[]>([])
  const [actividades, setActividades] = useState<CotizacionActividad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTarea, setEditingTarea] = useState<CotizacionTarea | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    tareaId: string
    tareaNombre: string
  }>({ open: false, tareaId: '', tareaNombre: '' })
  const [deletingTarea, setDeletingTarea] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    cotizacionActividadId: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    horasEstimadas: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'critica',
    estado: 'pendiente' as 'pendiente' | 'en_progreso' | 'completada' | 'pausada' | 'cancelada',
    responsableId: '',
    orden: 0
  })

  // Cargar datos
  useEffect(() => {
    loadData()
  }, [cotizacionId, refreshKey])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar actividades disponibles
      const actividadesResponse = await fetch(`/api/cotizaciones/${cotizacionId}/actividades`)
      if (!actividadesResponse.ok) {
        throw new Error('Error al cargar actividades')
      }
      const actividadesData = await actividadesResponse.json()
      setActividades(actividadesData.data || [])

      // Cargar tareas
      const tareasResponse = await fetch(`/api/cotizaciones/${cotizacionId}/tareas`)
      if (!tareasResponse.ok) {
        throw new Error('Error al cargar tareas')
      }
      const tareasData = await tareasResponse.json()
      setTareas(tareasData.data || [])

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: `No se pudieron cargar las tareas: ${errorMessage}`,
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

  const getActividadNombre = (actividadId: string) => {
    const actividad = actividades.find(a => a.id === actividadId)
    return actividad ? actividad.nombre : 'Actividad no encontrada'
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      cotizacionActividadId: '',
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      horasEstimadas: '',
      prioridad: 'media',
      estado: 'pendiente',
      responsableId: '',
      orden: 0
    })
  }

  const handleCreateTarea = async () => {
    if (!formData.nombre.trim() || !formData.cotizacionActividadId || !formData.fechaInicio || !formData.fechaFin) {
      toast({
        title: 'Error',
        description: 'El nombre, actividad y fechas son obligatorios',
        variant: 'destructive'
      })
      return
    }

    try {
      setCreating(true)

      // Convertir fechas a formato datetime si existen
      const requestData = {
        ...formData,
        fechaInicio: formData.fechaInicio
          ? new Date(formData.fechaInicio).toISOString()
          : undefined,
        fechaFin: formData.fechaFin
          ? new Date(formData.fechaFin).toISOString()
          : undefined,
        horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined,
        responsableId: formData.responsableId || undefined // Solo enviar si tiene valor
      }

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/tareas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear tarea')
      }

      const result = await response.json()

      toast({
        title: 'Éxito',
        description: result.message || 'Tarea creada exitosamente'
      })

      setShowCreateModal(false)
      resetForm()
      onRefresh()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast({
        title: 'Error',
        description: `No se pudo crear la tarea: ${errorMessage}`,
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleEditTarea = async () => {
    if (!editingTarea || !formData.nombre.trim() || !formData.cotizacionActividadId || !formData.fechaInicio || !formData.fechaFin) {
      toast({
        title: 'Error',
        description: 'El nombre, actividad y fechas son obligatorios',
        variant: 'destructive'
      })
      return
    }

    try {
      setUpdating(true)

      const requestData = {
        ...formData,
        fechaInicio: formData.fechaInicio
          ? new Date(formData.fechaInicio).toISOString()
          : undefined,
        fechaFin: formData.fechaFin
          ? new Date(formData.fechaFin).toISOString()
          : undefined,
        horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined,
        responsableId: formData.responsableId || undefined
      }

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/tareas/${editingTarea.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar tarea')
      }

      const result = await response.json()

      toast({
        title: 'Éxito',
        description: result.message || 'Tarea actualizada exitosamente'
      })

      setShowEditModal(false)
      setEditingTarea(null)
      resetForm()
      onRefresh()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast({
        title: 'Error',
        description: `No se pudo actualizar la tarea: ${errorMessage}`,
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteTarea = async () => {
    const tareaId = deleteDialog.tareaId
    const tareaNombre = deleteDialog.tareaNombre

    try {
      // Set loading state and close dialog
      setDeletingTarea(tareaId)
      setDeleteDialog({ open: false, tareaId: '', tareaNombre: '' })

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/tareas/${tareaId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar tarea')
      }

      toast({
        title: 'Tarea eliminada',
        description: 'La tarea comercial ha sido eliminada exitosamente.'
      })

      onRefresh()
      setDeletingTarea(null)
    } catch (error) {
      console.error('Error deleting tarea:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la tarea.',
        variant: 'destructive'
      })
      setDeletingTarea(null)
    }
  }

  const handleEditClick = (tarea: CotizacionTarea) => {
    setEditingTarea(tarea)
    setFormData({
      nombre: tarea.nombre,
      cotizacionActividadId: tarea.cotizacionActividadId,
      descripcion: tarea.descripcion || '',
      fechaInicio: new Date(tarea.fechaInicio).toISOString().split('T')[0],
      fechaFin: new Date(tarea.fechaFin).toISOString().split('T')[0],
      horasEstimadas: tarea.horasEstimadas?.toString() || '',
      prioridad: tarea.prioridad,
      estado: tarea.estado,
      responsableId: tarea.responsableId || '',
      orden: 0
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
          <h3 className="text-lg font-semibold text-destructive mb-2">Error al cargar tareas</h3>
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
            <CheckCircle className="h-5 w-5 text-primary" />
            <CardTitle>Tareas del Proyecto</CardTitle>
            <Badge variant="secondary">{tareas.length}</Badge>
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
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Nueva Tarea
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Tarea</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre de la Tarea *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej: Tender cableado trifásico 200m"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="actividad">Actividad *</Label>
                    <Select
                      value={formData.cotizacionActividadId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, cotizacionActividadId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una actividad" />
                      </SelectTrigger>
                      <SelectContent>
                        {actividades.map((actividad) => (
                          <SelectItem key={actividad.id} value={actividad.id}>
                            {actividad.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Descripción opcional de la tarea"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={formData.fechaInicio}
                        onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fechaFin">Fecha Fin *</Label>
                      <Input
                        id="fechaFin"
                        type="date"
                        value={formData.fechaFin}
                        onChange={(e) => setFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="horasEstimadas">Horas Estimadas</Label>
                      <Input
                        id="horasEstimadas"
                        type="number"
                        value={formData.horasEstimadas}
                        onChange={(e) => setFormData(prev => ({ ...prev, horasEstimadas: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
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

                  <div className="grid gap-2">
                    <Label htmlFor="orden">Orden</Label>
                    <Input
                      id="orden"
                      type="number"
                      value={formData.orden}
                      onChange={(e) => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
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
                  <Button onClick={handleCreateTarea} disabled={creating}>
                    <Save className="h-4 w-4 mr-2" />
                    {creating ? 'Creando...' : 'Crear Tarea'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {tareas.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay tareas definidas</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Las tareas son las actividades ejecutables más detalladas dentro de cada actividad.
              Crea tu primera tarea para comenzar a planificar el trabajo específico.
            </p>
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Crear Primera Tarea
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            {tareas.map((tarea) => (
              <Card key={tarea.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{tarea.nombre}</h4>
                        <Badge variant={getEstadoVariant(tarea.estado)}>
                          {getEstadoLabel(tarea.estado)}
                        </Badge>
                        <Badge variant={getPrioridadVariant(tarea.prioridad)}>
                          {getPrioridadLabel(tarea.prioridad)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>Actividad: {getActividadNombre(tarea.cotizacionActividadId)}</span>
                        <span>
                          {new Date(tarea.fechaInicio).toLocaleDateString('es-ES')} - {' '}
                          {new Date(tarea.fechaFin).toLocaleDateString('es-ES')}
                        </span>
                        {tarea.horasEstimadas && (
                          <span>{tarea.horasEstimadas}h estimadas</span>
                        )}
                      </div>

                      {tarea.descripcion && (
                        <p className="text-sm text-gray-600 mt-2">{tarea.descripcion}</p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(tarea)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Tarea
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            // Small delay to ensure dropdown closes before dialog opens
                            setTimeout(() => {
                              setDeleteDialog({ open: true, tareaId: tarea.id, tareaNombre: tarea.nombre })
                            }, 100)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Tarea
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Tarea</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nombre">Nombre de la Tarea *</Label>
              <Input
                id="edit-nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Tender cableado trifásico 200m"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-actividad">Actividad *</Label>
              <Select
                value={formData.cotizacionActividadId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cotizacionActividadId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una actividad" />
                </SelectTrigger>
                <SelectContent>
                  {actividades.map((actividad) => (
                    <SelectItem key={actividad.id} value={actividad.id}>
                      {actividad.nombre}
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
                placeholder="Descripción opcional de la tarea"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-fechaInicio">Fecha Inicio *</Label>
                <Input
                  id="edit-fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-fechaFin">Fecha Fin *</Label>
                <Input
                  id="edit-fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-horasEstimadas">Horas Estimadas</Label>
                <Input
                  id="edit-horasEstimadas"
                  type="number"
                  value={formData.horasEstimadas}
                  onChange={(e) => setFormData(prev => ({ ...prev, horasEstimadas: e.target.value }))}
                  placeholder="0"
                />
              </div>
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

            <div className="grid gap-2">
              <Label htmlFor="edit-orden">Orden</Label>
              <Input
                id="edit-orden"
                type="number"
                value={formData.orden}
                onChange={(e) => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false)
                setEditingTarea(null)
                resetForm()
              }}
              disabled={updating}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleEditTarea} disabled={updating}>
              <Save className="h-4 w-4 mr-2" />
              {updating ? 'Actualizando...' : 'Actualizar Tarea'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        // Solo permitir cerrar si no estamos en medio de una operación
        if (!open) {
          setDeleteDialog({ open: false, tareaId: '', tareaNombre: '' })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar Tarea comercial?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará la tarea "{deleteDialog.tareaNombre}".
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, tareaId: '', tareaNombre: '' })}
              disabled={deletingTarea !== null}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteTarea}
              disabled={deletingTarea !== null}
              variant="destructive"
            >
              {deletingTarea !== null ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                'Eliminar Tarea'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}