'use client'

/**
 * 📅 Página de Configuración de Calendarios Laborales
 *
 * Permite gestionar calendarios laborales con:
 * - Días laborables por semana
 * - Jornada laboral (horarios)
 * - Feriados y excepciones
 * - Asignación a empresas/proyectos
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Calendar, Clock, Users, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
  diasCalendario?: DiaCalendario[]
  excepciones?: ExcepcionCalendario[]
}

interface DiaCalendario {
  id: string
  diaSemana: string
  esLaborable: boolean
  horaInicioManana?: string
  horaFinManana?: string
  horaInicioTarde?: string
  horaFinTarde?: string
  horasTotales?: number
}

interface ExcepcionCalendario {
  id: string
  fecha: string
  tipo: 'feriado' | 'dia_laboral_extra' | 'dia_no_laboral'
  nombre: string
  descripcion?: string
  horaInicio?: string
  horaFin?: string
  horasTotales?: number
}

const DIAS_SEMANA = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' }
]

export default function CalendarioLaboralPage() {
  const [calendarios, setCalendarios] = useState<CalendarioLaboral[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCalendario, setEditingCalendario] = useState<CalendarioLaboral | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    pais: 'Colombia',
    empresa: 'GYS',
    activo: true,
    horasPorDia: 8,
    diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    horaInicioManana: '08:00',
    horaFinManana: '12:00',
    horaInicioTarde: '13:00',
    horaFinTarde: '17:00'
  })
  const { toast } = useToast()

  // Cargar calendarios
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
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los calendarios laborales.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCalendario = async () => {
    try {
      const response = await fetch('/api/configuracion/calendario-laboral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: 'Calendario creado',
          description: 'El calendario laboral ha sido creado exitosamente.'
        })
        setShowCreateDialog(false)
        resetForm()
        loadCalendarios()
      } else {
        throw new Error('Error al crear calendario')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el calendario laboral.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateCalendario = async () => {
    if (!editingCalendario) return

    try {
      const response = await fetch(`/api/configuracion/calendario-laboral/${editingCalendario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: 'Calendario actualizado',
          description: 'El calendario laboral ha sido actualizado exitosamente.'
        })
        setEditingCalendario(null)
        resetForm()
        loadCalendarios()
      } else {
        throw new Error('Error al actualizar calendario')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el calendario laboral.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteCalendario = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este calendario laboral?')) return

    try {
      const response = await fetch(`/api/configuracion/calendario-laboral/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Calendario eliminado',
          description: 'El calendario laboral ha sido eliminado exitosamente.'
        })
        loadCalendarios()
      } else {
        throw new Error('Error al eliminar calendario')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el calendario laboral.',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      pais: 'Colombia',
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

  const startEdit = (calendario: CalendarioLaboral) => {
    setEditingCalendario(calendario)
    setFormData({
      nombre: calendario.nombre,
      descripcion: calendario.descripcion || '',
      pais: calendario.pais || 'Colombia',
      empresa: calendario.empresa || 'GYS',
      activo: calendario.activo,
      horasPorDia: calendario.horasPorDia,
      diasLaborables: calendario.diasLaborables,
      horaInicioManana: calendario.horaInicioManana,
      horaFinManana: calendario.horaFinManana,
      horaInicioTarde: calendario.horaInicioTarde,
      horaFinTarde: calendario.horaFinTarde
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendarios Laborales</h1>
          <p className="text-muted-foreground">
            Configura calendarios laborales para ajustar automáticamente fechas de cronogramas
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Calendario
        </Button>
      </div>

      {/* Lista de Calendarios */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {calendarios.map((calendario) => (
          <Card key={calendario.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {calendario.nombre}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={calendario.activo ? 'default' : 'secondary'}>
                    {calendario.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
              <CardDescription>{calendario.descripcion}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{calendario.horasPorDia}h/día</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{calendario.diasLaborables.length} días hábiles</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Jornada: {calendario.horaInicioManana}-{calendario.horaFinManana}, {calendario.horaInicioTarde}-{calendario.horaFinTarde}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(calendario)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCalendario(calendario.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Diálogo de Crear/Editar */}
      <Dialog open={showCreateDialog || !!editingCalendario} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingCalendario(null)
          resetForm()
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingCalendario ? 'Editar Calendario' : 'Crear Nuevo Calendario'}
            </DialogTitle>
            <DialogDescription>
              Configura los días laborables, jornada laboral y feriados para este calendario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="ej: Colombia - Estándar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={formData.pais}
                  onChange={(e) => setFormData(prev => ({ ...prev, pais: e.target.value }))}
                  placeholder="Colombia"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción del calendario laboral"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  value={formData.empresa}
                  onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                  placeholder="GYS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horasPorDia">Horas por Día</Label>
                <Input
                  id="horasPorDia"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.horasPorDia}
                  onChange={(e) => setFormData(prev => ({ ...prev, horasPorDia: parseFloat(e.target.value) || 8 }))}
                />
              </div>
            </div>

            {/* Días Laborables */}
            <div className="space-y-2">
              <Label>Días Laborables</Label>
              <div className="grid grid-cols-2 gap-2">
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dia-${dia.value}`}
                      checked={formData.diasLaborables.includes(dia.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            diasLaborables: [...prev.diasLaborables, dia.value]
                          }))
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            diasLaborables: prev.diasLaborables.filter(d => d !== dia.value)
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`dia-${dia.value}`} className="text-sm">
                      {dia.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Jornada Laboral */}
            <div className="space-y-2">
              <Label>Jornada Laboral</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horaInicioManana">Mañana Inicio</Label>
                  <Input
                    id="horaInicioManana"
                    type="time"
                    value={formData.horaInicioManana}
                    onChange={(e) => setFormData(prev => ({ ...prev, horaInicioManana: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaFinManana">Mañana Fin</Label>
                  <Input
                    id="horaFinManana"
                    type="time"
                    value={formData.horaFinManana}
                    onChange={(e) => setFormData(prev => ({ ...prev, horaFinManana: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaInicioTarde">Tarde Inicio</Label>
                  <Input
                    id="horaInicioTarde"
                    type="time"
                    value={formData.horaInicioTarde}
                    onChange={(e) => setFormData(prev => ({ ...prev, horaInicioTarde: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaFinTarde">Tarde Fin</Label>
                  <Input
                    id="horaFinTarde"
                    type="time"
                    value={formData.horaFinTarde}
                    onChange={(e) => setFormData(prev => ({ ...prev, horaFinTarde: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activo: !!checked }))}
              />
              <Label htmlFor="activo">Calendario activo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingCalendario(null)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={editingCalendario ? handleUpdateCalendario : handleCreateCalendario}
              disabled={!formData.nombre.trim()}
            >
              {editingCalendario ? 'Actualizar' : 'Crear'} Calendario
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}