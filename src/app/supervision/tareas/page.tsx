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
  creadoPorId: string | null
  creadoPorNombre: string | null
  fechaInicio: Date
  fechaFin: Date
  horasPlan: number
  horasReales: number
  personasEstimadas: number
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
  personasEstimadas: string
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
  const [filtroEdt, setFiltroEdt] = useState<string>('')

  // Modal de asignacion
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Tarea | null>(null)
  const [nuevoResponsable, setNuevoResponsable] = useState<string>('')
  const [nuevaPersonasEstimadas, setNuevaPersonasEstimadas] = useState<number>(1)

  // Modal de crear tarea
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [creandoTarea, setCreandoTarea] = useState(false)
  const [errorCrearTarea, setErrorCrearTarea] = useState<string | null>(null)

  // Estado de actualización
  const [actualizandoTarea, setActualizandoTarea] = useState<string | null>(null)
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
    horasEstimadas: '',
    personasEstimadas: '1'
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

    if (filtroEdt) {
      resultado = resultado.filter(t => t.edtNombre === filtroEdt)
    }

    if (filtroBusqueda) {
      const busqueda = filtroBusqueda.toLowerCase()
      resultado = resultado.filter(t =>
        t.nombre.toLowerCase().includes(busqueda) ||
        t.proyectoNombre.toLowerCase().includes(busqueda) ||
        t.proyectoCodigo.toLowerCase().includes(busqueda) ||
        t.edtNombre.toLowerCase().includes(busqueda)
      )
    }

    setTareasFiltradas(resultado)
  }, [tareas, filtroProyecto, filtroResponsable, filtroEstado, filtroSinAsignar, filtroTipo, filtroEdt, filtroBusqueda])

  // Cargar EDTs del cronograma de EJECUCIÓN cuando cambia el proyecto seleccionado en el modal
  const cargarEdtsProyecto = async (proyectoId: string) => {
    if (!proyectoId) {
      setEdtsProyecto([])
      setErrorCrearTarea(null)
      return
    }

    try {
      setCargandoEdts(true)
      setErrorCrearTarea(null)

      // Primero obtener los cronogramas del proyecto
      const cronogramaResponse = await fetch(`/api/proyectos/${proyectoId}/cronograma`)

      if (!cronogramaResponse.ok) {
        setEdtsProyecto([])
        setErrorCrearTarea('Error al obtener los cronogramas del proyecto.')
        return
      }

      const cronogramaData = await cronogramaResponse.json()
      const cronogramas = cronogramaData.data || cronogramaData || []

      // Buscar el cronograma de ejecución
      const cronogramaEjecucion = cronogramas.find((c: any) => c.tipo === 'ejecucion')

      if (!cronogramaEjecucion) {
        setEdtsProyecto([])
        setErrorCrearTarea('Este proyecto no tiene un Cronograma de Ejecución configurado. Debe crearlo primero en la sección de Cronograma del proyecto.')
        return
      }

      // Ahora obtener los EDTs del cronograma de ejecución
      const response = await fetch(`/api/proyectos/${proyectoId}/edt?cronogramaId=${cronogramaEjecucion.id}`)

      if (response.ok) {
        const data = await response.json()
        const edts = data.success && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])

        if (edts.length === 0) {
          setEdtsProyecto([])
          setErrorCrearTarea('El Cronograma de Ejecución no tiene EDTs configurados. Debe agregar EDTs al cronograma primero.')
          return
        }

        setEdtsProyecto(edts.map((edt: any) => ({
          id: edt.id,
          nombre: edt.nombre,
          descripcion: edt.descripcion
        })))
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
    setNuevaPersonasEstimadas(tarea.personasEstimadas || 1)
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
          responsableId: nuevoResponsable || null,
          ...(tareaSeleccionada.tipo === 'proyecto_tarea' && { personasEstimadas: nuevaPersonasEstimadas }),
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

  // Actualizar estado de tarea
  const actualizarEstado = async (tarea: Tarea, nuevoEstado: string) => {
    try {
      setActualizandoTarea(tarea.id)
      const response = await fetch('/api/supervision/tareas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareaId: tarea.id,
          tipo: tarea.tipo,
          estado: nuevoEstado
        })
      })

      if (!response.ok) throw new Error('Error al actualizar')

      // Actualizar localmente (si completada, progreso = 100)
      setTareas(prev => prev.map(t =>
        t.id === tarea.id ? {
          ...t,
          estado: nuevoEstado,
          progreso: nuevoEstado === 'completada' ? 100 : t.progreso
        } : t
      ))
      toast({ title: 'Estado actualizado', description: nuevoEstado.replace('_', ' ') })
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' })
    } finally {
      setActualizandoTarea(null)
    }
  }

  // Calcular eficiencia (solo si está completada)
  const calcularEficiencia = (horasPlan: number, horasReales: number, estado: string): number | null => {
    // Solo mostrar eficiencia cuando la tarea está completada
    if (estado !== 'completada') return null
    if (horasPlan <= 0 || horasReales <= 0) return null
    return Math.round((horasPlan / horasReales) * 100)
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
    setFiltroEdt('')
  }

  // Abrir modal para crear
  const abrirCrearModal = () => {
    const proyectoIdInicial = filtroProyecto || ''
    setErrorCrearTarea(null)
    setNuevaTarea({
      proyectoId: proyectoIdInicial,
      proyectoEdtId: '',
      nombre: '',
      descripcion: '',
      fechaInicio: format(new Date(), 'yyyy-MM-dd'),
      fechaFin: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      responsableId: '',
      prioridad: 'media',
      horasEstimadas: '',
      personasEstimadas: '1'
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
      setErrorCrearTarea(null)

      const personas = parseInt(nuevaTarea.personasEstimadas) || 1
      const horasPP = parseFloat(nuevaTarea.horasEstimadas) || 0
      const payload = {
        proyectoId: nuevaTarea.proyectoId,
        proyectoEdtId: nuevaTarea.proyectoEdtId,
        nombre: nuevaTarea.nombre,
        descripcion: nuevaTarea.descripcion,
        fechaInicio: nuevaTarea.fechaInicio,
        fechaFin: nuevaTarea.fechaFin,
        responsableId: nuevaTarea.responsableId || null,
        prioridad: nuevaTarea.prioridad,
        horasEstimadas: horasPP > 0 ? horasPP * personas : null,
        personasEstimadas: personas
      }

      console.log('📤 CREAR TAREA - Payload:', payload)

      const response = await fetch('/api/supervision/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ CREAR TAREA - Error:', errorData)
        setErrorCrearTarea(errorData.error || 'Error al crear tarea')
        return
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
      setErrorCrearTarea(error.message || 'No se pudo crear la tarea')
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

      {/* Metricas - Minimalista */}
      {metricas && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">Resumen:</span>
          <Badge variant="outline" className="font-normal">
            <ClipboardList className="h-3 w-3 mr-1" />
            {metricas.totalTareas} total
          </Badge>
          <Badge variant="outline" className="font-normal text-green-600 border-green-200 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            {metricas.tareasCompletadas} completadas
          </Badge>
          <Badge variant="outline" className="font-normal text-blue-600 border-blue-200 bg-blue-50">
            <Clock className="h-3 w-3 mr-1" />
            {metricas.tareasEnProgreso} en progreso
          </Badge>
          <Badge variant="outline" className="font-normal text-yellow-600 border-yellow-200 bg-yellow-50">
            <Calendar className="h-3 w-3 mr-1" />
            {metricas.tareasPendientes} pendientes
          </Badge>
          <Badge
            variant="outline"
            className={`font-normal cursor-pointer ${filtroSinAsignar ? 'text-orange-700 border-orange-400 bg-orange-100' : 'text-orange-600 border-orange-200 bg-orange-50'}`}
            onClick={() => setFiltroSinAsignar(!filtroSinAsignar)}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            {metricas.tareasSinAsignar} sin asignar
          </Badge>
          {metricas.tareasVencidas > 0 && (
            <Badge variant="outline" className="font-normal text-red-600 border-red-200 bg-red-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {metricas.tareasVencidas} vencidas
            </Badge>
          )}
          {metricas.tareasProximasVencer > 0 && (
            <Badge variant="outline" className="font-normal text-amber-600 border-amber-200 bg-amber-50">
              <AlertCircle className="h-3 w-3 mr-1" />
              {metricas.tareasProximasVencer} por vencer
            </Badge>
          )}
        </div>
      )}

      {/* Filtros - Compactos */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar tarea..."
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            className="pl-8 h-9 w-[180px]"
          />
        </div>

        <Select value={filtroProyecto || 'all'} onValueChange={(v) => setFiltroProyecto(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Proyectos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Proyectos</SelectItem>
            {proyectos.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.codigo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroEdt || 'all'} onValueChange={(v) => setFiltroEdt(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="EDT" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">EDT</SelectItem>
            {Array.from(new Set(
              (filtroProyecto ? tareas.filter(t => t.proyectoId === filtroProyecto) : tareas)
                .map(t => t.edtNombre)
                .filter(Boolean)
            )).sort().map(edt => (
              <SelectItem key={edt} value={edt}>
                {edt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroResponsable || 'all'} onValueChange={(v) => setFiltroResponsable(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Responsables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Responsables</SelectItem>
            {usuarios.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroEstado || 'all'} onValueChange={(v) => setFiltroEstado(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_progreso">En Progreso</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="pausada">Pausada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroTipo || 'all'} onValueChange={(v) => setFiltroTipo(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue placeholder="Tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tipos</SelectItem>
            <SelectItem value="cronograma">Planificada</SelectItem>
            <SelectItem value="extra">Extra</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-9 px-3">
          <Filter className="h-4 w-4 mr-1" />
          Limpiar
        </Button>

        {filtroSinAsignar && (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 h-9 flex items-center">
            Sin asignar
            <button
              className="ml-2 hover:text-orange-600"
              onClick={() => setFiltroSinAsignar(false)}
            >
              ×
            </button>
          </Badge>
        )}
      </div>

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
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Eficiencia</TableHead>
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
                              {tarea.creadoPorNombre && (
                                <span className="text-[10px] text-gray-400">
                                  por {tarea.creadoPorNombre}
                                </span>
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
                          <Select
                            value={tarea.estado}
                            onValueChange={(v) => actualizarEstado(tarea, v)}
                            disabled={actualizandoTarea === tarea.id}
                          >
                            <SelectTrigger className={`h-7 w-[110px] text-xs ${getEstadoColor(tarea.estado)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en_progreso">En Progreso</SelectItem>
                              <SelectItem value="completada">Completada</SelectItem>
                              <SelectItem value="pausada">Pausada</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{format(new Date(tarea.fechaFin), 'dd/MM/yyyy')}</p>
                            <p className={`text-xs ${diasInfo.color}`}>{diasInfo.texto}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm" title={tarea.personasEstimadas > 1 ? `${Math.round(tarea.horasPlan / tarea.personasEstimadas)}h × ${tarea.personasEstimadas} personas = ${tarea.horasPlan}h total` : undefined}>
                            <span className={tarea.horasReales > 0 ? 'font-medium' : 'text-gray-400'}>
                              {tarea.horasReales}h
                            </span>
                            <span className="text-gray-400">/{tarea.horasPlan}h</span>
                            {tarea.personasEstimadas > 1 && (
                              <span className="inline-flex items-center gap-0.5 ml-1 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0">
                                <Users className="h-2.5 w-2.5" />
                                {tarea.personasEstimadas}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const eficiencia = calcularEficiencia(tarea.horasPlan, tarea.horasReales, tarea.estado)
                            if (eficiencia === null) return <span className="text-gray-300 text-xs">-</span>
                            const color = eficiencia >= 100 ? 'text-green-600 bg-green-50' : eficiencia >= 80 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
                            return (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
                                {eficiencia}%
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${tarea.progreso === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${tarea.progreso}%` }}
                              />
                            </div>
                            <span className="text-xs w-8">{tarea.progreso}%</span>
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

              {tareaSeleccionada.tipo === 'proyecto_tarea' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Users className="h-3.5 w-3.5 inline mr-1" />
                    Personas Estimadas
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={nuevaPersonasEstimadas}
                    onChange={(e) => setNuevaPersonasEstimadas(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cantidad de personas que trabajan simultáneamente en esta tarea
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAsignarModal(false)}>
              Cancelar
            </Button>
            <Button onClick={asignarTarea}>
              <UserPlus className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de crear tarea extra */}
      <Dialog open={showCrearModal} onOpenChange={setShowCrearModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Zap className="h-5 w-5" />
              Nueva Tarea Extra
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Error message */}
            {errorCrearTarea && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{errorCrearTarea}</p>
                </div>
              </div>
            )}

            {/* Proyecto y EDT en una fila */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Proyecto *</Label>
                <Select
                  value={nuevaTarea.proyectoId || '__none__'}
                  onValueChange={(v) => handleProyectoChange(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Proyecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seleccionar...</SelectItem>
                    {proyectos.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">EDT *</Label>
                <Select
                  value={nuevaTarea.proyectoEdtId || '__none__'}
                  onValueChange={(v) => setNuevaTarea({ ...nuevaTarea, proyectoEdtId: v === '__none__' ? '' : v })}
                  disabled={!nuevaTarea.proyectoId || cargandoEdts}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={cargandoEdts ? 'Cargando...' : 'EDT...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seleccionar...</SelectItem>
                    {edtsProyecto.map(edt => (
                      <SelectItem key={edt.id} value={edt.id}>
                        {edt.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nombre de la tarea */}
            <div>
              <Label className="text-xs text-gray-500">Nombre de la tarea *</Label>
              <Input
                placeholder="Ej: Revisar documentación"
                value={nuevaTarea.nombre}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, nombre: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Descripción */}
            <div>
              <Label className="text-xs text-gray-500">Descripción</Label>
              <TextareaComponent
                placeholder="Descripción de la tarea..."
                value={nuevaTarea.descripcion}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={nuevaTarea.fechaInicio}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, fechaInicio: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Fecha Fin *</Label>
                <Input
                  type="date"
                  value={nuevaTarea.fechaFin}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, fechaFin: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Responsable y Prioridad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Responsable</Label>
                <Select
                  value={nuevaTarea.responsableId || '__none__'}
                  onValueChange={(v) => setNuevaTarea({ ...nuevaTarea, responsableId: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger className="h-9">
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
                <Label className="text-xs text-gray-500">Prioridad</Label>
                <Select
                  value={nuevaTarea.prioridad}
                  onValueChange={(v) => setNuevaTarea({ ...nuevaTarea, prioridad: v })}
                >
                  <SelectTrigger className="h-9">
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

            {/* Horas por persona, Personas y Total HH */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Hrs/persona</Label>
                <Input
                  type="number"
                  placeholder="8"
                  value={nuevaTarea.horasEstimadas}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, horasEstimadas: e.target.value })}
                  className="h-9"
                  min={0}
                  step={0.5}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Personas</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={nuevaTarea.personasEstimadas}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, personasEstimadas: e.target.value })}
                  className="h-9"
                  min={1}
                  step={1}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Total HH</Label>
                <div className="h-9 flex items-center px-3 bg-gray-50 border rounded-md text-sm font-medium text-gray-700">
                  {(() => {
                    const h = parseFloat(nuevaTarea.horasEstimadas) || 0
                    const p = parseInt(nuevaTarea.personasEstimadas) || 1
                    return h > 0 ? `${h * p}h` : '-'
                  })()}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCrearModal(false)} disabled={creandoTarea}>
              Cancelar
            </Button>
            <Button size="sm" onClick={crearTarea} disabled={creandoTarea || !nuevaTarea.proyectoEdtId} className="bg-purple-600 hover:bg-purple-700">
              {creandoTarea ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
