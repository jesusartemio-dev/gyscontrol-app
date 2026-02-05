'use client'

import React, { useState, useEffect } from 'react'
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
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AsignarResponsable } from '@/components/proyectos/cronograma/AsignarResponsable'

interface EdtConResponsable {
  id: string
  nombre: string
  estado: string
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
        // Transformar los datos al formato esperado
        const edtsFormateados = result.data.edts.map((edt: any) => ({
          id: edt.id,
          nombre: edt.nombre,
          estado: edt.estado,
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

        // Extraer proyectos únicos
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

  // Filtrar EDTs
  const edtsFiltrados = edts.filter(edt => {
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

  // Estadísticas
  const totalEdts = edtsFiltrados.length
  const edtsSinResponsable = edtsFiltrados.filter(e => !e.responsable).length
  const edtsConResponsable = edtsFiltrados.filter(e => e.responsable).length

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

      {/* Estadísticas rápidas */}
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

      {/* Filtros */}
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
          </div>
        </CardContent>
      </Card>

      {/* Tabla de EDTs */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
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
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Cargando EDTs...</p>
                  </TableCell>
                </TableRow>
              ) : edtsFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Layers className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No hay EDTs que coincidan con los filtros</p>
                  </TableCell>
                </TableRow>
              ) : (
                edtsFiltrados.map((edt) => {
                  const estadoInfo = getEstadoBadge(edt.estado)
                  return (
                    <TableRow key={edt.id} className="hover:bg-gray-50">
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
                          onClick={() => handleAsignarResponsable(edt)}
                          className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          {edt.responsable ? 'Cambiar' : 'Asignar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Información */}
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
