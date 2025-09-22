// ===================================================
// 📁 Archivo: ProyectoTareaList.tsx
// 📌 Ubicación: src/components/proyectos/fases/
// 🔧 Descripción: Componente para gestión de tareas de EDT
//
// 🧠 Uso: Lista, creación y gestión de ProyectoTarea
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-22
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, MoreHorizontal, Clock, User, Calendar, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ProyectoTarea {
  id: string
  nombre: string
  descripcion?: string
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  horasEstimadas?: number
  horasReales: number
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'pausada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  porcentajeCompletado: number
  responsable?: {
    id: string
    name: string
    email: string
  }
  dependencia?: {
    id: string
    nombre: string
  }
  registrosHoras: Array<{
    horasTrabajadas: number
    fechaTrabajo: string
    aprobado: boolean
  }>
  subtareas: Array<{
    id: string
    nombre: string
    estado: string
    porcentajeCompletado: number
  }>
}

interface ProyectoTareaListProps {
  edtId: string
  proyectoId: string
  onRefresh?: () => void
}

export function ProyectoTareaList({ edtId, proyectoId, onRefresh }: ProyectoTareaListProps) {
  const [tareas, setTareas] = useState<ProyectoTarea[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTarea, setEditingTarea] = useState<ProyectoTarea | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    horasEstimadas: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'critica',
    responsableId: ''
  })

  useEffect(() => {
    loadTareas()
  }, [edtId])

  const loadTareas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/proyecto-edt/${edtId}/tareas`)
      const result = await response.json()

      if (result.success) {
        setTareas(result.data || [])
      }
    } catch (error) {
      console.error('Error loading tareas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingTarea
        ? `/api/proyecto-edt/${edtId}/tareas/${editingTarea.id}`
        : `/api/proyecto-edt/${edtId}/tareas`

      const method = editingTarea ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        setDialogOpen(false)
        resetForm()
        loadTareas()
        onRefresh?.()
      }
    } catch (error) {
      console.error('Error saving tarea:', error)
    }
  }

  const handleDelete = async (tareaId: string) => {
    try {
      const response = await fetch(`/api/proyecto-edt/${edtId}/tareas/${tareaId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadTareas()
        onRefresh?.()
      }
    } catch (error) {
      console.error('Error deleting tarea:', error)
    }
  }

  const handleEdit = (tarea: ProyectoTarea) => {
    setEditingTarea(tarea)
    setFormData({
      nombre: tarea.nombre,
      descripcion: tarea.descripcion || '',
      fechaInicio: format(new Date(tarea.fechaInicio), 'yyyy-MM-dd'),
      fechaFin: format(new Date(tarea.fechaFin), 'yyyy-MM-dd'),
      horasEstimadas: tarea.horasEstimadas?.toString() || '',
      prioridad: tarea.prioridad,
      responsableId: tarea.responsable?.id || ''
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingTarea(null)
    setFormData({
      nombre: '',
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      horasEstimadas: '',
      prioridad: 'media',
      responsableId: ''
    })
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completada': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'en_progreso': return <PlayCircle className="h-4 w-4 text-blue-500" />
      case 'pendiente': return <Clock className="h-4 w-4 text-gray-500" />
      case 'cancelada': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada': return 'bg-green-100 text-green-800'
      case 'en_progreso': return 'bg-blue-100 text-blue-800'
      case 'pendiente': return 'bg-gray-100 text-gray-800'
      case 'cancelada': return 'bg-red-100 text-red-800'
      case 'pausada': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'bg-red-100 text-red-800'
      case 'alta': return 'bg-orange-100 text-orange-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'baja': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Cargando tareas...</div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            📋 Tareas del EDT
            <Badge variant="secondary">{tareas.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestión detallada de tareas con seguimiento de tiempo
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre *</label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridad</label>
                  <Select value={formData.prioridad} onValueChange={(value: any) => setFormData({...formData, prioridad: value})}>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha Inicio *</label>
                  <Input
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({...formData, fechaInicio: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha Fin *</label>
                  <Input
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({...formData, fechaFin: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Horas Estimadas</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.horasEstimadas}
                    onChange={(e) => setFormData({...formData, horasEstimadas: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTarea ? 'Actualizar' : 'Crear'} Tarea
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {tareas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay tareas registradas para este EDT
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tareas.map((tarea) => (
                <TableRow key={tarea.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEstadoIcon(tarea.estado)}
                      <Badge className={getEstadoColor(tarea.estado)}>
                        {tarea.estado.replace('_', ' ')}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium">{tarea.nombre}</div>
                      {tarea.descripcion && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {tarea.descripcion}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {tarea.responsable ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm">{tarea.responsable.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(tarea.fechaInicio), 'dd/MM', { locale: es })} - {format(new Date(tarea.fechaFin), 'dd/MM', { locale: es })}
                      </div>
                      {tarea.fechaInicioReal && (
                        <div className="text-muted-foreground">
                          Real: {format(new Date(tarea.fechaInicioReal), 'dd/MM', { locale: es })}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      <div>Est: {tarea.horasEstimadas || 0}h</div>
                      <div className="text-muted-foreground">Real: {tarea.horasReales}h</div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge className={getPrioridadColor(tarea.prioridad)}>
                      {tarea.prioridad}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${tarea.porcentajeCompletado}%` }}
                        />
                      </div>
                      <span className="text-sm">{tarea.porcentajeCompletado}%</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(tarea)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará la tarea "{tarea.nombre}"
                                y todos sus registros asociados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(tarea.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}