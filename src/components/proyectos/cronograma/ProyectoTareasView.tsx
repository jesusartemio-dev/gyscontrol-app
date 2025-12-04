'use client'

/**
 * ProyectoTareasView - Vista integrada de gestión de tareas en cronograma
 *
 * Vista jerárquica EDT → Zonas → Actividades → Tareas con:
 * - Asignación de responsables
 * - Registro de horas
 * - Progreso automático
 * - Integración completa con cronograma de 6 niveles
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  UserCheck,
  Calendar,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ProyectoTareasViewProps {
  proyectoId: string
  cronogramaId?: string
  modoVista?: 'automatico' | 'jerarquia_completa'
  onHorasRegistradas: () => void
}

interface TareaItem {
  id: string
  nombre: string
  tipo: 'edt' | 'zona' | 'actividad' | 'tarea'
  nivel: number
  responsableId?: string
  responsableNombre?: string
  fechaInicio: Date
  fechaFin: Date
  porcentajeAvance: number
  horasPlan: number
  horasReales: number
  estado: string
  expanded?: boolean
  hijos?: TareaItem[]
}

export function ProyectoTareasView({
  proyectoId,
  cronogramaId,
  modoVista = 'automatico',
  onHorasRegistradas
}: ProyectoTareasViewProps) {
  const [items, setItems] = useState<TareaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showRegistroHoras, setShowRegistroHoras] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaItem | null>(null)
  const [horas, setHoras] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const { toast } = useToast()

  // Cargar jerarquía de tareas
  useEffect(() => {
    loadTareasJerarquia()
  }, [proyectoId, cronogramaId, modoVista])

  const loadTareasJerarquia = async () => {
    try {
      setLoading(true)

      const url = cronogramaId
        ? `/api/proyectos/${proyectoId}/cronograma/tareas-jerarquia?cronogramaId=${cronogramaId}&modoVista=${modoVista}`
        : `/api/proyectos/${proyectoId}/cronograma/tareas-jerarquia?modoVista=${modoVista}`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Error al cargar tareas')

      const data = await response.json()
      setItems(data.data || [])
    } catch (error) {
      console.error('Error cargando tareas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas del proyecto',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (itemId: string) => {
    const updateItems = (items: TareaItem[]): TareaItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: !item.expanded }
        }
        if (item.hijos) {
          return { ...item, hijos: updateItems(item.hijos) }
        }
        return item
      })
    }
    setItems(updateItems)
  }

  const handleRegistroHoras = async () => {
    if (!tareaSeleccionada || !horas) return

    try {
      const response = await fetch('/api/horas-hombre/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nivel: tareaSeleccionada.tipo,
          id: tareaSeleccionada.id,
          fecha,
          horas: parseFloat(horas),
          descripcion
        })
      })

      if (!response.ok) throw new Error('Error al registrar horas')

      toast({
        title: 'Horas registradas',
        description: `Se registraron ${horas}h en ${tareaSeleccionada.nombre}`
      })

      // Limpiar formulario y recargar
      setShowRegistroHoras(false)
      setTareaSeleccionada(null)
      setHoras('')
      setDescripcion('')
      loadTareasJerarquia()
      onHorasRegistradas()
    } catch (error) {
      console.error('Error registrando horas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron registrar las horas',
        variant: 'destructive'
      })
    }
  }

  const renderTareaItem = (item: TareaItem, depth = 0) => {
    const indent = depth * 20
    const hasChildren = item.hijos && item.hijos.length > 0
    const progresoColor = item.porcentajeAvance >= 100 ? 'bg-green-500' :
                         item.porcentajeAvance >= 75 ? 'bg-blue-500' :
                         item.porcentajeAvance >= 50 ? 'bg-yellow-500' : 'bg-red-500'

    return (
      <div key={item.id}>
        <div className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50">
          {/* Expand/Collapse */}
          <div style={{ width: indent }} className="flex items-center">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(item.id)}
                className="h-6 w-6 p-0"
              >
                {item.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Tipo y nombre */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Badge variant="outline" className="text-xs">
              {item.tipo.toUpperCase()}
            </Badge>
            <span className="font-medium truncate">{item.nombre}</span>
          </div>

          {/* Responsable */}
          <div className="flex items-center gap-1 min-w-[120px]">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 truncate">
              {item.responsableNombre || 'Sin asignar'}
            </span>
          </div>

          {/* Fechas */}
          <div className="flex items-center gap-1 min-w-[140px]">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-600">
              {format(item.fechaInicio, 'dd/MM', { locale: es })} - {format(item.fechaFin, 'dd/MM', { locale: es })}
            </span>
          </div>

          {/* Progreso */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1">
              <Progress value={item.porcentajeAvance} className="h-2" />
            </div>
            <span className="text-xs font-medium w-10 text-right">
              {item.porcentajeAvance}%
            </span>
          </div>

          {/* Horas */}
          <div className="flex items-center gap-1 min-w-[100px]">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-xs">
              {item.horasReales}h / {item.horasPlan}h
            </span>
          </div>

          {/* Estado */}
          <Badge
            variant={item.estado === 'completada' ? 'default' : 'secondary'}
            className="min-w-[80px] justify-center"
          >
            {item.estado}
          </Badge>

          {/* Acciones */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTareaSeleccionada(item)
                setShowRegistroHoras(true)
              }}
              className="h-8 px-2"
            >
              <Clock className="h-3 w-3 mr-1" />
              Horas
            </Button>
          </div>
        </div>

        {/* Hijos */}
        {item.expanded && item.hijos && (
          <div>
            {item.hijos.map(hijo => renderTareaItem(hijo, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Cargando tareas del proyecto...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Tareas</h2>
          <p className="text-gray-600">
            Vista jerárquica EDT → Actividades → Tareas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Modo: {modoVista === 'automatico' ? 'Automático' : 'Completo'}
          </Badge>
        </div>
      </div>

      {/* Vista Jerárquica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Jerarquía de Tareas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b bg-gray-50 px-4 py-3">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-3">Elemento</div>
              <div className="col-span-2">Responsable</div>
              <div className="col-span-2">Fechas</div>
              <div className="col-span-2">Progreso</div>
              <div className="col-span-2">Horas</div>
              <div className="col-span-1">Estado</div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.map(item => renderTareaItem(item))}
          </div>
        </CardContent>
      </Card>

      {/* Modal Registro de Horas */}
      <Dialog open={showRegistroHoras} onOpenChange={setShowRegistroHoras}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Horas</DialogTitle>
          </DialogHeader>

          {tareaSeleccionada && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Elemento seleccionado</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{tareaSeleccionada.tipo.toUpperCase()}</Badge>
                  <span className="text-sm">{tareaSeleccionada.nombre}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="horas">Horas</Label>
                  <Input
                    id="horas"
                    type="number"
                    step="0.5"
                    placeholder="8.0"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción del trabajo</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describa el trabajo realizado..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRegistroHoras(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleRegistroHoras} disabled={!horas}>
                  Registrar Horas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}