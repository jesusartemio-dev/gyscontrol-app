'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Calendar, Clock, Pencil, Trash2, Loader2, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

interface CalendarioLaboral {
  id: string
  nombre: string
  descripcion?: string
  pais?: string
  empresa?: string
  activo: boolean
  horasPorDia: number
  diasLaborables: string[]
  horaInicioManana: string
  horaFinManana: string
  horaInicioTarde: string
  horaFinTarde: string
}

const DIAS_SEMANA = [
  { value: 'lunes', label: 'L', full: 'Lunes' },
  { value: 'martes', label: 'M', full: 'Martes' },
  { value: 'miercoles', label: 'X', full: 'Miércoles' },
  { value: 'jueves', label: 'J', full: 'Jueves' },
  { value: 'viernes', label: 'V', full: 'Viernes' },
  { value: 'sabado', label: 'S', full: 'Sábado' },
  { value: 'domingo', label: 'D', full: 'Domingo' }
]

export default function CalendarioLaboralPage() {
  const [calendarios, setCalendarios] = useState<CalendarioLaboral[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingCalendario, setEditingCalendario] = useState<CalendarioLaboral | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    pais: 'Perú',
    empresa: 'GYS',
    activo: true,
    horasPorDia: 8,
    diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    horaInicioManana: '08:00',
    horaFinManana: '12:00',
    horaInicioTarde: '13:00',
    horaFinTarde: '17:00'
  })

  useEffect(() => {
    loadCalendarios()
  }, [])

  const loadCalendarios = async () => {
    try {
      const response = await fetch('/api/configuracion/calendario-laboral')
      if (response.ok) {
        const data = await response.json()
        setCalendarios(data.data || [])
      }
    } catch (error) {
      console.error('Error loading calendarios:', error)
      toast.error('Error al cargar los calendarios laborales')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setSaving(true)
    try {
      const url = editingCalendario
        ? `/api/configuracion/calendario-laboral/${editingCalendario.id}`
        : '/api/configuracion/calendario-laboral'

      const response = await fetch(url, {
        method: editingCalendario ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingCalendario ? 'Calendario actualizado' : 'Calendario creado')
        setShowDialog(false)
        setEditingCalendario(null)
        resetForm()
        loadCalendarios()
      } else {
        throw new Error('Error al guardar')
      }
    } catch {
      toast.error('Error al guardar el calendario')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/configuracion/calendario-laboral/${deleteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Calendario eliminado')
        loadCalendarios()
      } else {
        throw new Error('Error al eliminar')
      }
    } catch {
      toast.error('Error al eliminar el calendario')
    } finally {
      setDeleteId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      pais: 'Perú',
      empresa: 'GYS',
      activo: true,
      horasPorDia: 8,
      diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
      horaInicioManana: '08:00',
      horaFinManana: '12:00',
      horaInicioTarde: '13:00',
      horaFinTarde: '17:00'
    })
  }

  const openCreate = () => {
    resetForm()
    setEditingCalendario(null)
    setShowDialog(true)
  }

  const openEdit = (calendario: CalendarioLaboral) => {
    setEditingCalendario(calendario)
    setFormData({
      nombre: calendario.nombre,
      descripcion: calendario.descripcion || '',
      pais: calendario.pais || 'Perú',
      empresa: calendario.empresa || 'GYS',
      activo: calendario.activo,
      horasPorDia: calendario.horasPorDia,
      diasLaborables: calendario.diasLaborables,
      horaInicioManana: calendario.horaInicioManana,
      horaFinManana: calendario.horaFinManana,
      horaInicioTarde: calendario.horaInicioTarde,
      horaFinTarde: calendario.horaFinTarde
    })
    setShowDialog(true)
  }

  const toggleDia = (dia: string) => {
    setFormData(prev => ({
      ...prev,
      diasLaborables: prev.diasLaborables.includes(dia)
        ? prev.diasLaborables.filter(d => d !== dia)
        : [...prev.diasLaborables, dia]
    }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-8" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-7" />
                  <Skeleton className="h-7 w-7" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header compacto */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Calendarios Laborales</h1>
            </div>
            <Badge variant="secondary" className="font-normal">
              {calendarios.length}
            </Badge>
          </div>

          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>

        {/* Lista de Calendarios */}
        {calendarios.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay calendarios</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea un calendario laboral para ajustar fechas de cronogramas
              </p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo calendario
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calendarios.map((calendario) => (
              <Card key={calendario.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">{calendario.nombre}</span>
                    </div>
                    <Badge variant={calendario.activo ? 'default' : 'secondary'} className="text-xs">
                      {calendario.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {calendario.descripcion && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                      {calendario.descripcion}
                    </p>
                  )}

                  <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{calendario.horasPorDia}h/día · {calendario.diasLaborables.length} días · <strong>{calendario.horasPorDia * calendario.diasLaborables.length}h/sem</strong></span>
                    </div>
                    <div className="text-xs">
                      {calendario.horaInicioManana}-{calendario.horaFinManana} / {calendario.horaInicioTarde}-{calendario.horaFinTarde}
                    </div>
                  </div>

                  {/* Días de la semana compactos */}
                  <div className="flex gap-1 mb-3">
                    {DIAS_SEMANA.map(dia => (
                      <Tooltip key={dia.value}>
                        <TooltipTrigger asChild>
                          <span
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center font-medium ${
                              calendario.diasLaborables.includes(dia.value)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {dia.label}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{dia.full}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(calendario)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(calendario.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Crear/Editar - Compacto */}
        <Dialog open={showDialog} onOpenChange={(open) => {
          if (!open) {
            setShowDialog(false)
            setEditingCalendario(null)
            resetForm()
          }
        }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>
                {editingCalendario ? 'Editar Calendario' : 'Nuevo Calendario'}
              </DialogTitle>
              <DialogDescription>
                Configura días laborables y jornada laboral
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Fila 1: Nombre y País */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Perú - Estándar"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">País</Label>
                  <Input
                    value={formData.pais}
                    onChange={(e) => setFormData(prev => ({ ...prev, pais: e.target.value }))}
                    placeholder="Perú"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Fila 2: Empresa y Horas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Empresa</Label>
                  <Input
                    value={formData.empresa}
                    onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                    placeholder="GYS"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Horas/día</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={formData.horasPorDia}
                    onChange={(e) => setFormData(prev => ({ ...prev, horasPorDia: parseFloat(e.target.value) || 8 }))}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    = <strong>{formData.horasPorDia * formData.diasLaborables.length}h/semana</strong> · {(formData.horasPorDia * formData.diasLaborables.length * 4).toFixed(0)}h/mes
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción opcional"
                  className="h-9"
                />
              </div>

              {/* Días Laborables - Chips compactos */}
              <div className="space-y-1.5">
                <Label className="text-xs">Días Laborables</Label>
                <div className="flex gap-1.5">
                  {DIAS_SEMANA.map(dia => (
                    <Tooltip key={dia.value}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => toggleDia(dia.value)}
                          className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                            formData.diasLaborables.includes(dia.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {dia.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{dia.full}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* Jornada Laboral - Compacta en 2 filas */}
              <div className="space-y-1.5">
                <Label className="text-xs">Jornada Laboral</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14">Mañana:</span>
                    <Input
                      type="time"
                      value={formData.horaInicioManana}
                      onChange={(e) => setFormData(prev => ({ ...prev, horaInicioManana: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={formData.horaFinManana}
                      onChange={(e) => setFormData(prev => ({ ...prev, horaFinManana: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14">Tarde:</span>
                    <Input
                      type="time"
                      value={formData.horaInicioTarde}
                      onChange={(e) => setFormData(prev => ({ ...prev, horaInicioTarde: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={formData.horaFinTarde}
                      onChange={(e) => setFormData(prev => ({ ...prev, horaFinTarde: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Estado activo */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="activo" className="text-sm cursor-pointer">
                  Calendario activo
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  setEditingCalendario(null)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.nombre.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCalendario ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog para eliminar */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar calendario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El calendario será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
