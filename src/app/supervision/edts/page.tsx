'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Layers,
  Search,
  UserPlus,
  User,
  RefreshCw,
  Filter,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  GripVertical,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AsignarResponsable } from '@/components/proyectos/cronograma/AsignarResponsable'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

interface EdtConResponsable {
  id: string
  nombre: string
  estado: string
  orden: number
  horasPlan: number
  horasReales: number
  porcentajeAvance: number
  fechaInicioPlan: string | null
  fechaFinPlan: string | null
  proyecto: {
    id: string
    codigo: string
    nombre: string
  }
  edt: {
    id: string
    nombre: string
  } | null
  responsable: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

// Sortable row component
function SortableEdtRow({
  edt,
  dndEnabled,
  getEstadoBadge,
  onAsignar,
}: {
  edt: EdtConResponsable
  dndEnabled: boolean
  getEstadoBadge: (estado: string) => { color: string; label: string }
  onAsignar: (edt: EdtConResponsable) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: edt.id, disabled: !dndEnabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const estadoInfo = getEstadoBadge(edt.estado)

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        'hover:bg-gray-50',
        isDragging && 'opacity-50 bg-blue-50 shadow-lg z-50'
      )}
    >
      {/* Drag handle + Orden */}
      <TableCell className="w-16 text-center">
        <div className="flex items-center justify-center gap-1">
          {dndEnabled && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <span className="text-xs font-mono text-gray-400 w-5">{edt.orden}</span>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <span className="font-medium text-blue-600">{edt.proyecto.codigo}</span>
          <p className="text-xs text-gray-500 truncate max-w-[150px]">{edt.proyecto.nombre}</p>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-medium">{edt.nombre}</span>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{edt.edt?.nombre || 'Sin categoría'}</Badge>
      </TableCell>
      <TableCell className="text-center">
        <Badge className={estadoInfo.color}>{estadoInfo.label}</Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Target className="h-3 w-3 text-purple-500" />
          <span className="text-sm">{edt.horasPlan.toFixed(1)}h</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Clock className="h-3 w-3 text-green-500" />
          <span className="text-sm">{edt.horasReales.toFixed(1)}h</span>
        </div>
      </TableCell>
      <TableCell>
        {edt.responsable ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{edt.responsable.name}</p>
              <p className="text-xs text-gray-500">{edt.responsable.role}</p>
            </div>
          </div>
        ) : (
          <span className="text-sm text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Sin asignar
          </span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAsignar(edt)}
          className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
        >
          <UserPlus className="h-4 w-4 mr-1" />
          {edt.responsable ? 'Cambiar' : 'Asignar'}
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function SupervisionEdtsPage() {
  const [edts, setEdts] = useState<EdtConResponsable[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroProyecto, setFiltroProyecto] = useState<string>('todos')
  const [filtroResponsable, setFiltroResponsable] = useState<string>('todos')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [proyectos, setProyectos] = useState<{ id: string; codigo: string; nombre: string }[]>([])
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [edtSeleccionado, setEdtSeleccionado] = useState<EdtConResponsable | null>(null)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const dndEnabled = filtroProyecto !== 'todos' && filtroResponsable === 'todos' && filtroBusqueda === ''

  useEffect(() => {
    cargarEdts()
  }, [])

  const cargarEdts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/horas-hombre/edts-unificados?incluirHoras=true&soloActivos=true')

      if (!response.ok) throw new Error('Error cargando EDTs')

      const result = await response.json()

      if (result.success && result.data.edts) {
        const edtsFormateados = result.data.edts.map((edt: any) => ({
          id: edt.id,
          nombre: edt.nombre,
          estado: edt.estado,
          orden: edt.orden ?? 0,
          horasPlan: edt.horas.planificadas,
          horasReales: edt.horas.reales,
          porcentajeAvance: edt.horas.porcentajeAvance,
          fechaInicioPlan: edt.fechas.inicioPlan,
          fechaFinPlan: edt.fechas.finPlan,
          proyecto: edt.proyecto,
          edt: edt.categoriaId ? { id: edt.categoriaId, nombre: edt.categoriaNombre } : null,
          responsable: edt.responsable?.id ? edt.responsable : null
        }))

        setEdts(edtsFormateados)

        const proyectosUnicos = Array.from(
          new Map(edtsFormateados.map((e: EdtConResponsable) => [e.proyecto.id, e.proyecto])).values()
        ) as { id: string; codigo: string; nombre: string }[]
        setProyectos(proyectosUnicos)
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los EDTs',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAsignarResponsable = (edt: EdtConResponsable) => {
    setEdtSeleccionado(edt)
    setShowAsignarModal(true)
  }

  const handleAsignacionExitosa = () => {
    setShowAsignarModal(false)
    setEdtSeleccionado(null)
    cargarEdts()
    toast({
      title: 'Responsable asignado',
      description: 'El responsable se ha asignado correctamente'
    })
  }

  // Filter and sort EDTs
  const edtsFiltrados = useMemo(() => {
    let result = edts.filter(edt => {
      const cumpleFiltroProyecto = filtroProyecto === 'todos' || edt.proyecto.id === filtroProyecto
      const cumpleFiltroResponsable =
        filtroResponsable === 'todos' ||
        (filtroResponsable === 'sin_asignar' && !edt.responsable) ||
        (filtroResponsable === 'asignado' && edt.responsable)
      const cumpleBusqueda =
        filtroBusqueda === '' ||
        edt.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        edt.proyecto.codigo.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        edt.edt?.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())

      return cumpleFiltroProyecto && cumpleFiltroResponsable && cumpleBusqueda
    })

    // Sort by orden when project is selected, otherwise by project + orden
    if (filtroProyecto !== 'todos') {
      result.sort((a, b) => a.orden - b.orden)
    } else {
      result.sort((a, b) => {
        const projCompare = a.proyecto.codigo.localeCompare(b.proyecto.codigo)
        if (projCompare !== 0) return projCompare
        return a.orden - b.orden
      })
    }

    return result
  }, [edts, filtroProyecto, filtroResponsable, filtroBusqueda])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = edtsFiltrados.findIndex(e => e.id === active.id)
    const newIndex = edtsFiltrados.findIndex(e => e.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(edtsFiltrados, oldIndex, newIndex)
    const elementos = reordered.map((item, index) => ({ id: item.id, orden: index }))

    // Update local state optimistically
    setEdts(prev => {
      const updated = [...prev]
      for (const el of elementos) {
        const idx = updated.findIndex(e => e.id === el.id)
        if (idx !== -1) updated[idx] = { ...updated[idx], orden: el.orden }
      }
      return updated
    })

    // Persist to server
    try {
      const res = await fetch('/api/supervision/edts/reordenar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementos })
      })
      if (!res.ok) throw new Error('Error al reordenar')
      toast({ title: 'Orden actualizado' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el orden', variant: 'destructive' })
      cargarEdts() // Rollback
    }
  }

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { color: string; label: string }> = {
      planificado: { color: 'bg-blue-100 text-blue-800', label: 'Planificado' },
      en_progreso: { color: 'bg-green-100 text-green-800', label: 'En Progreso' },
      completado: { color: 'bg-emerald-100 text-emerald-800', label: 'Completado' },
      pausado: { color: 'bg-orange-100 text-orange-800', label: 'Pausado' },
      cancelado: { color: 'bg-red-100 text-red-800', label: 'Cancelado' }
    }
    return estados[estado] || estados.planificado
  }

  // Stats
  const totalEdts = edtsFiltrados.length
  const edtsSinResponsable = edtsFiltrados.filter(e => !e.responsable).length
  const edtsConResponsable = edtsFiltrados.filter(e => e.responsable).length

  const colSpan = 10

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-purple-600" />
            Gestión de EDTs
          </h1>
          <p className="text-sm text-gray-500">
            Asigna responsables a los EDTs de los proyectos en ejecución
          </p>
        </div>
        <Button onClick={cargarEdts} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Layers className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEdts}</p>
              <p className="text-xs text-gray-500">EDTs totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{edtsConResponsable}</p>
              <p className="text-xs text-gray-500">Con responsable</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{edtsSinResponsable}</p>
              <p className="text-xs text-gray-500">Sin asignar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>

            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar EDT..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                className="w-[200px] h-9"
              />
            </div>

            <Select value={filtroProyecto} onValueChange={setFiltroProyecto}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los proyectos</SelectItem>
                {proyectos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroResponsable} onValueChange={setFiltroResponsable}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                <SelectItem value="asignado">Con responsable</SelectItem>
              </SelectContent>
            </Select>

            {dndEnabled && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                <GripVertical className="h-3 w-3 mr-1" />
                Arrastra para reordenar
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-16 text-center">Orden</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>EDT</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Plan</TableHead>
                  <TableHead className="text-center">Real</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <SortableContext
                items={edtsFiltrados.map(e => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="text-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">Cargando EDTs...</p>
                      </TableCell>
                    </TableRow>
                  ) : edtsFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="text-center py-12">
                        <Layers className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No hay EDTs que coincidan con los filtros</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    edtsFiltrados.map((edt) => (
                      <SortableEdtRow
                        key={edt.id}
                        edt={edt}
                        dndEnabled={dndEnabled}
                        getEstadoBadge={getEstadoBadge}
                        onAsignar={handleAsignarResponsable}
                      />
                    ))
                  )}
                </TableBody>
              </SortableContext>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="text-sm text-gray-500 text-center">
        Mostrando {edtsFiltrados.length} de {edts.length} EDTs
      </div>

      {/* Modal Asignar Responsable */}
      {edtSeleccionado && (
        <AsignarResponsable
          open={showAsignarModal}
          onOpenChange={setShowAsignarModal}
          tipo="edt"
          elementoId={edtSeleccionado.id}
          elementoNombre={`${edtSeleccionado.proyecto.codigo} - ${edtSeleccionado.nombre}`}
          responsableActual={edtSeleccionado.responsable}
          onAsignacionExitosa={handleAsignacionExitosa}
        />
      )}
    </div>
  )
}
