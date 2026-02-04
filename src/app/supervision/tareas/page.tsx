'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  ClipboardList,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  UserPlus,
  AlertCircle,
  Calendar,
  Plus,
  Zap,
  CalendarClock
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea as TextareaComponent } from '@/components/ui/textarea'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface Tarea {
  id: string
  tipo: 'proyecto_tarea' | 'tarea'
  nombre: string
  descripcion?: string
  proyectoId: string | null
  proyectoCodigo: string
  proyectoNombre: string
  edtNombre: string
  esExtra: boolean
  responsableId: string | null
  responsableNombre: string | null
  responsableEmail: string | null
  fechaInicio: Date
  fechaFin: Date
  horasPlan: number
  progreso: number
  estado: string
  prioridad: string
}

interface NuevaTarea {
  proyectoId: string
  proyectoEdtId: string
  nombre: string
  descripcion: string
  fechaInicio: string
  fechaFin: string
  responsableId: string
  prioridad: string
  horasEstimadas: string
}

interface ProyectoEdt {
  id: string
  nombre: string
  descripcion?: string
}

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  estado: string
}

interface Usuario {
  id: string
  name: string
  email: string
  role: string
}

interface Metricas {
  totalTareas: number
  tareasCompletadas: number
  tareasEnProgreso: number
  tareasPendientes: number
  tareasSinAsignar: number
  tareasVencidas: number
  tareasProximasVencer: number
}

export default function SupervisionTareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [tareasFiltradas, setTareasFiltradas] = useState<Tarea[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroProyecto, setFiltroProyecto] = useState<string>('')
  const [filtroResponsable, setFiltroResponsable] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>('')
  const [filtroSinAsignar, setFiltroSinAsignar] = useState<boolean>(false)
  const [filtroTipo, setFiltroTipo] = useState<string>('')

  // Modal de asignacion
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Tarea | null>(null)
  const [nuevoResponsable, setNuevoResponsable] = useState<string>('')

  // Modal de crear tarea
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [creandoTarea, setCreandoTarea] = useState(false)
  const [edtsProyecto, setEdtsProyecto] = useState<ProyectoEdt[]>([])
  const [cargandoEdts, setCargandoEdts] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState<NuevaTarea>({
    proyectoId: '',
    proyectoEdtId: '',
    nombre: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    responsableId: '',
    prioridad: 'media',
    horasEstimadas: ''
  })

  const { data: session, status } = useSession()
  const { toast } = useToast()

  // Cargar datos
  const cargarDatos = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (filtroSinAsignar) params.append('sinAsignar', 'true')

      const response = await fetch(`/api/supervision/tareas?${params}`)

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: 'No autorizado',
            description: 'Debe iniciar sesion',
            variant: 'destructive'
          })
          return
        }
        if (response.status === 403) {
          toast({
            title: 'Sin permisos',
            description: 'No tiene permisos para gestionar tareas',
            variant: 'destructive'
          })
          return
        }
        throw new Error('Error al cargar datos')
      }

      const data = await response.json()

      if (data.success) {
        setTareas(data.data.tareas)
        setTareasFiltradas(data.data.tareas)
        setProyectos(data.data.proyectos)
        setUsuarios(data.data.usuarios)
        setMetricas(data.data.metricas)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar al iniciar
  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      setLoading(false)
      return
    }
    cargarDatos()
  }, [status, session])

  // Aplicar filtros locales
  useEffect(() => {
    let resultado = [...tareas]

    if (filtroProyecto) {
      resultado = resultado.filter(t => t.proyectoId === filtroProyecto)
    }

    if (filtroResponsable) {
      resultado = resultado.filter(t => t.responsableId === filtroResponsable)
    }

    if (filtroEstado) {
      resultado = resultado.filter(t => t.estado === filtroEstado)
    }

    if (filtroSinAsignar) {
      resultado = resultado.filter(t => !t.responsableId)
    }

    if (filtroTipo) {
      if (filtroTipo === 'extra') {
        resultado = resultado.filter(t => t.esExtra)
      } else if (filtroTipo === 'cronograma') {
        resultado = resultado.filter(t => !t.esExtra)
      }
    }

    if (filtroBusqueda) {
      const busqueda = filtroBusqueda.toLowerCase()
      resultado = resultado.filter(t =>
        t.nombre.toLowerCase().includes(busqueda) ||
        t.proyectoNombre.toLowerCase().includes(busqueda) ||
        t.proyectoCodigo.toLowerCase().includes(busqueda)
      )
    }

    setTareasFiltradas(resultado)
  }, [tareas, filtroProyecto, filtroResponsable, filtroEstado, filtroSinAsignar, filtroTipo, filtroBusqueda])

  // Cargar EDTs cuando cambia el proyecto seleccionado en el modal
  const cargarEdtsProyecto = async (proyectoId: string) => {
    if (!proyectoId) {
      setEdtsProyecto([])
      return
    }

    try {
      setCargandoEdts(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/edt`)

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setEdtsProyecto(data.data.map((edt: any) => ({
            id: edt.id,
            nombre: edt.nombre,
            descripcion: edt.descripcion
          })))
        } else if (Array.isArray(data)) {
          setEdtsProyecto(data.map((edt: any) => ({
            id: edt.id,
            nombre: edt.nombre,
            descripcion: edt.descripcion
          })))
        } else {
          setEdtsProyecto([])
        }
      } else {
        setEdtsProyecto([])
      }
    } catch (error) {
      console.error('Error cargando EDTs:', error)
      setEdtsProyecto([])
    } finally {
      setCargandoEdts(false)
    }
  }

  // Manejar cambio de proyecto en el modal
  const handleProyectoChange = (proyectoId: string) => {
    setNuevaTarea({ ...nuevaTarea, proyectoId, proyectoEdtId: '' })
    cargarEdtsProyecto(proyectoId)
  }

  // Abrir modal para asignar
  const abrirAsignarModal = (tarea: Tarea) => {
    setTareaSeleccionada(tarea)
    setNuevoResponsable(tarea.responsableId || '')
    setShowAsignarModal(true)
  }

  // Asignar tarea
  const asignarTarea = async () => {
    if (!tareaSeleccionada) return

    try {
      const response = await fetch('/api/supervision/tareas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareaId: tareaSeleccionada.id,
          tipo: tareaSeleccionada.tipo,
          responsableId: nuevoResponsable || null
        })
      })

      if (!response.ok) {
        throw new Error('Error al asignar tarea')
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Tarea asignada',
          description: nuevoResponsable
            ? 'La tarea ha sido asignada correctamente'
            : 'Se ha removido la asignacion de la tarea'
        })
        setShowAsignarModal(false)
        cargarDatos()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo asignar la tarea',
        variant: 'destructive'
      })
    }
  }

  // Obtener color de estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada': return 'bg-green-100 text-green-800'
      case 'en_progreso': return 'bg-blue-100 text-blue-800'
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'pausada': return 'bg-gray-100 text-gray-800'
      case 'cancelada': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Obtener color de prioridad
  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'bg-red-500 text-white'
      case 'alta': return 'bg-orange-500 text-white'
      case 'media': return 'bg-yellow-500 text-white'
      case 'baja': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Calcular dias restantes
  const getDiasRestantes = (fechaFin: Date) => {
    const dias = differenceInDays(new Date(fechaFin), new Date())
    if (dias < 0) return { texto: `${Math.abs(dias)} dias vencida`, color: 'text-red-600' }
    if (dias === 0) return { texto: 'Vence hoy', color: 'text-orange-600' }
    if (dias <= 3) return { texto: `${dias} dias`, color: 'text-orange-500' }
    if (dias <= 7) return { texto: `${dias} dias`, color: 'text-yellow-600' }
    return { texto: `${dias} dias`, color: 'text-gray-600' }
  }

  // Exportar CSV
  const exportarCSV = () => {
    if (tareasFiltradas.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay tareas para exportar',
        variant: 'destructive'
      })
      return
    }

    const csvRows = [
      'Proyecto,EDT,Tarea,Responsable,Estado,Prioridad,Fecha Inicio,Fecha Fin,Horas Plan,Progreso'
    ]

    tareasFiltradas.forEach(t => {
      csvRows.push(
        `"${t.proyectoCodigo}","${t.edtNombre}","${t.nombre}","${t.responsableNombre || 'Sin asignar'}","${t.estado}","${t.prioridad}","${format(new Date(t.fechaInicio), 'dd/MM/yyyy')}","${format(new Date(t.fechaFin), 'dd/MM/yyyy')}",${t.horasPlan},${t.progreso}%`
      )
    })

    const csvContent = csvRows.join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tareas-supervision-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Exportado',
      description: 'Archivo CSV descargado correctamente'
    })
  }

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroProyecto('')
    setFiltroResponsable('')
    setFiltroEstado('')
    setFiltroBusqueda('')
    setFiltroSinAsignar(false)
    setFiltroTipo('')
  }

  // Abrir modal para crear
  const abrirCrearModal = () => {
    const proyectoIdInicial = filtroProyecto || ''
    setNuevaTarea({
      proyectoId: proyectoIdInicial,
      proyectoEdtId: '',
      nombre: '',
      descripcion: '',
      fechaInicio: format(new Date(), 'yyyy-MM-dd'),
      fechaFin: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      responsableId: '',
      prioridad: 'media',
      horasEstimadas: ''
    })
    // Cargar EDTs si ya hay proyecto seleccionado
    if (proyectoIdInicial) {
      cargarEdtsProyecto(proyectoIdInicial)
    } else {
      setEdtsProyecto([])
    }
    setShowCrearModal(true)
  }

  // Crear tarea extra
  const crearTarea = async () => {
    if (!nuevaTarea.proyectoId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un proyecto',
        variant: 'destructive'
      })
      return
    }

    if (!nuevaTarea.proyectoEdtId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un EDT',
        variant: 'destructive'
      })
      return
    }

    if (!nuevaTarea.nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la tarea es requerido',
        variant: 'destructive'
      })
      return
    }

    try {
      setCreandoTarea(true)

      const response = await fetch('/api/supervision/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId: nuevaTarea.proyectoId,
          proyectoEdtId: nuevaTarea.proyectoEdtId,
          nombre: nuevaTarea.nombre,
          descripcion: nuevaTarea.descripcion,
          fechaInicio: nuevaTarea.fechaInicio,
          fechaFin: nuevaTarea.fechaFin,
          responsableId: nuevaTarea.responsableId || null,
          prioridad: nuevaTarea.prioridad,
          horasEstimadas: nuevaTarea.horasEstimadas || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear tarea')
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Tarea creada',
          description: 'La tarea extra ha sido creada correctamente'
        })
        setShowCrearModal(false)
        cargarDatos()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la tarea',
        variant: 'destructive'
      })
    } finally {
      setCreandoTarea(false)
    }
  }

  // Si no hay sesion
  if (!session?.user && status !== 'loading') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Acceso Denegado
              </h2>
              <p className="text-gray-600">
                Debe iniciar sesion para gestionar tareas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion de Tareas</h1>
          <p className="text-gray-600 mt-1">
            Asigna y gestiona tareas de todos los proyectos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportarCSV} disabled={tareasFiltradas.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={abrirCrearModal}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Metricas */}
      {metricas && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ClipboardList className="h-6 w-6 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{metricas.totalTareas}</p>
                  <p className="text-xs text-gray-600">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{metricas.tareasCompletadas}</p>
                  <p className="text-xs text-gray-600">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{metricas.tareasEnProgreso}</p>
                  <p className="text-xs text-gray-600">En Progreso</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-6 w-6 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{metricas.tareasPendientes}</p>
                  <p className="text-xs text-gray-600">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-orange-50" onClick={() => setFiltroSinAsignar(!filtroSinAsignar)}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-6 w-6 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{metricas.tareasSinAsignar}</p>
                  <p className="text-xs text-gray-600">Sin Asignar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{metricas.tareasVencidas}</p>
                  <p className="text-xs text-gray-600">Vencidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-amber-600">{metricas.tareasProximasVencer}</p>
                  <p className="text-xs text-gray-600">Por Vencer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar tarea..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filtroProyecto || 'all'} onValueChange={(v) => setFiltroProyecto(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los proyectos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {proyectos.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroResponsable || 'all'} onValueChange={(v) => setFiltroResponsable(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los responsables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los responsables</SelectItem>
                {usuarios.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroEstado || 'all'} onValueChange={(v) => setFiltroEstado(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="pausada">Pausada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroTipo || 'all'} onValueChange={(v) => setFiltroTipo(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="cronograma">Planificada</SelectItem>
                <SelectItem value="extra">Extra</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={limpiarFiltros}>
              Limpiar
            </Button>
          </div>

          {filtroSinAsignar && (
            <div className="mt-3">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Mostrando solo tareas sin asignar
                <button
                  className="ml-2 hover:text-orange-600"
                  onClick={() => setFiltroSinAsignar(false)}
                >
                  ×
                </button>
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de tareas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tareas ({tareasFiltradas.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : tareasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin tareas</h3>
              <p className="text-gray-600">No se encontraron tareas con los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Tarea</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tareasFiltradas.map((tarea) => {
                    const diasInfo = getDiasRestantes(tarea.fechaFin)
                    return (
                      <TableRow key={`${tarea.tipo}-${tarea.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tarea.proyectoCodigo}</p>
                            <p className="text-xs text-gray-500">{tarea.edtNombre}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px]">
                            <p className="font-medium text-sm leading-tight" title={tarea.nombre}>
                              {tarea.nombre}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {tarea.esExtra ? (
                                <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50 text-[10px] px-1.5 py-0">
                                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                                  Extra
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 text-[10px] px-1.5 py-0">
                                  <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                                  Cronograma
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tarea.responsableNombre ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                                {tarea.responsableNombre.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm">{tarea.responsableNombre}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Sin asignar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getEstadoColor(tarea.estado)}>
                            {tarea.estado.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPrioridadColor(tarea.prioridad)}>
                            {tarea.prioridad}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{format(new Date(tarea.fechaFin), 'dd/MM/yyyy')}</p>
                            <p className={`text-xs ${diasInfo.color}`}>{diasInfo.texto}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${tarea.progreso}%` }}
                              />
                            </div>
                            <span className="text-sm">{tarea.progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirAsignarModal(tarea)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Asignar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de asignacion */}
      <Dialog open={showAsignarModal} onOpenChange={setShowAsignarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Tarea</DialogTitle>
          </DialogHeader>

          {tareaSeleccionada && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{tareaSeleccionada.nombre}</p>
                <p className="text-sm text-gray-600">
                  {tareaSeleccionada.proyectoCodigo} - {tareaSeleccionada.edtNombre}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Seleccionar Responsable
                </label>
                <Select value={nuevoResponsable || '__none__'} onValueChange={(v) => setNuevoResponsable(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {usuarios.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                            {u.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <span>{u.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({u.role})</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAsignarModal(false)}>
              Cancelar
            </Button>
            <Button onClick={asignarTarea}>
              <UserPlus className="h-4 w-4 mr-2" />
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de crear tarea extra */}
      <Dialog open={showCrearModal} onOpenChange={setShowCrearModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              Nueva Tarea Extra
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="proyecto">Proyecto *</Label>
              <Select
                value={nuevaTarea.proyectoId || '__none__'}
                onValueChange={(v) => handleProyectoChange(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proyecto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar proyecto...</SelectItem>
                  {proyectos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} - {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edt">EDT *</Label>
              <Select
                value={nuevaTarea.proyectoEdtId || '__none__'}
                onValueChange={(v) => setNuevaTarea({ ...nuevaTarea, proyectoEdtId: v === '__none__' ? '' : v })}
                disabled={!nuevaTarea.proyectoId || cargandoEdts}
              >
                <SelectTrigger>
                  <SelectValue placeholder={cargandoEdts ? 'Cargando EDTs...' : 'Seleccionar EDT...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar EDT...</SelectItem>
                  {edtsProyecto.map(edt => (
                    <SelectItem key={edt.id} value={edt.id}>
                      {edt.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {nuevaTarea.proyectoId && edtsProyecto.length === 0 && !cargandoEdts && (
                <p className="text-xs text-amber-600 mt-1">
                  Este proyecto no tiene EDTs configurados.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="nombre">Nombre de la tarea *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Revisar documentación del cliente"
                value={nuevaTarea.nombre}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, nombre: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <TextareaComponent
                id="descripcion"
                placeholder="Descripción detallada de la tarea..."
                value={nuevaTarea.descripcion}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={nuevaTarea.fechaInicio}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, fechaInicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fechaFin">Fecha Fin *</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={nuevaTarea.fechaFin}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, fechaFin: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responsable">Responsable</Label>
                <Select
                  value={nuevaTarea.responsableId || '__none__'}
                  onValueChange={(v) => setNuevaTarea({ ...nuevaTarea, responsableId: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {usuarios.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select
                  value={nuevaTarea.prioridad}
                  onValueChange={(v) => setNuevaTarea({ ...nuevaTarea, prioridad: v })}
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
              <Label htmlFor="horasEstimadas">Horas Estimadas</Label>
              <Input
                id="horasEstimadas"
                type="number"
                placeholder="Ej: 8"
                value={nuevaTarea.horasEstimadas}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, horasEstimadas: e.target.value })}
              />
            </div>

            <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
              <p className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Las tareas extra son tareas no planificadas originalmente en el cronograma.</span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCrearModal(false)} disabled={creandoTarea}>
              Cancelar
            </Button>
            <Button onClick={crearTarea} disabled={creandoTarea || !nuevaTarea.proyectoEdtId}>
              {creandoTarea ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Crear Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
