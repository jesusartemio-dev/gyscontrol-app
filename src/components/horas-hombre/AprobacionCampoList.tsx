'use client'

/**
 * AprobacionCampoList - Lista de registros de campo para aprobar/rechazar
 *
 * Nueva estructura: 1 Registro = 1 Proyecto + 1 EDT + N Tareas
 * Cada Tarea tiene su propio personal con horas independientes
 */

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  Users,
  Clock,
  Building,
  FolderOpen,
  Calendar,
  User,
  RefreshCw,
  Filter,
  AlertCircle,
  ListTodo
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Miembro {
  id: string
  usuarioId: string
  horas: number
  observaciones: string | null
  registroHorasId: string | null
  usuario: {
    id: string
    name: string | null
    email: string
    role: string
  }
}

interface Tarea {
  id: string
  proyectoTareaId: string | null
  nombreTareaExtra: string | null
  descripcion: string | null
  proyectoTarea: {
    id: string
    nombre: string
    proyectoActividad?: { id: string; nombre: string } | null
  } | null
  miembros: Miembro[]
  totalHoras: number
}

interface RegistroCampo {
  id: string
  fechaTrabajo: string
  descripcion: string | null
  ubicacion: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  motivoRechazo: string | null
  createdAt: string
  proyecto: { id: string; codigo: string; nombre: string }
  proyectoEdt: { id: string; nombre: string } | null
  supervisor: { id: string; name: string | null; email: string }
  aprobadoPor: { id: string; name: string | null; email: string } | null
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
  tareas: Tarea[]
}

interface AprobacionCampoListProps {
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'todos'
  onRefresh?: () => void
}

export function AprobacionCampoList({
  estado = 'pendiente',
  onRefresh
}: AprobacionCampoListProps) {
  const { toast } = useToast()
  const [registros, setRegistros] = useState<RegistroCampo[]>([])
  const [loading, setLoading] = useState(true)
  const [proyectos, setProyectos] = useState<{ id: string; codigo: string; nombre: string }[]>([])

  // Filtros
  const [filtroProyecto, setFiltroProyecto] = useState<string>('todos')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')

  // Modal de detalle
  const [registroDetalle, setRegistroDetalle] = useState<RegistroCampo | null>(null)
  const [showDetalle, setShowDetalle] = useState(false)

  // Modal de rechazo
  const [registroRechazar, setRegistroRechazar] = useState<RegistroCampo | null>(null)
  const [showRechazo, setShowRechazo] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  // Estado de acciones
  const [procesando, setProcesando] = useState<string | null>(null)

  useEffect(() => {
    cargarRegistros()
  }, [estado])

  const cargarRegistros = async () => {
    try {
      setLoading(true)
      const estadoParam = estado === 'todos' ? '' : `estado=${estado}`
      const response = await fetch(`/api/horas-hombre/campo/pendientes?${estadoParam}`)

      if (!response.ok) throw new Error('Error cargando registros')

      const data = await response.json()
      setRegistros(data.data || [])

      // Extraer proyectos únicos
      const proyectosUnicos = Array.from(
        new Map(
          (data.data || []).map((r: RegistroCampo) => [r.proyecto.id, r.proyecto])
        ).values()
      ) as { id: string; codigo: string; nombre: string }[]
      setProyectos(proyectosUnicos)

    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los registros',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAprobar = async (registro: RegistroCampo) => {
    try {
      setProcesando(registro.id)
      const response = await fetch(`/api/horas-hombre/campo/${registro.id}/aprobar`, {
        method: 'PUT'
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Error al aprobar')

      toast({
        title: 'Registro aprobado',
        description: data.message
      })

      cargarRegistros()
      onRefresh?.()

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al aprobar',
        variant: 'destructive'
      })
    } finally {
      setProcesando(null)
    }
  }

  const handleRechazar = async () => {
    if (!registroRechazar || !motivoRechazo.trim()) return

    try {
      setProcesando(registroRechazar.id)
      const response = await fetch(`/api/horas-hombre/campo/${registroRechazar.id}/rechazar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRechazo: motivoRechazo.trim() })
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Error al rechazar')

      toast({
        title: 'Registro rechazado',
        description: 'Se notificará al supervisor'
      })

      setShowRechazo(false)
      setMotivoRechazo('')
      setRegistroRechazar(null)
      cargarRegistros()
      onRefresh?.()

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al rechazar',
        variant: 'destructive'
      })
    } finally {
      setProcesando(null)
    }
  }

  // Filtrar registros
  const registrosFiltrados = registros.filter(r => {
    const cumpleProyecto = filtroProyecto === 'todos' || r.proyecto.id === filtroProyecto
    const cumpleBusqueda = filtroBusqueda === '' ||
      r.proyecto.codigo.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      r.supervisor.name?.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      r.supervisor.email.toLowerCase().includes(filtroBusqueda.toLowerCase())
    return cumpleProyecto && cumpleBusqueda
  })

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800">Pendiente</Badge>
      case 'aprobado':
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
      case 'rechazado':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>
      default:
        return <Badge>{estado}</Badge>
    }
  }

  const getNombreTarea = (tarea: Tarea): string => {
    if (tarea.proyectoTarea) {
      return tarea.proyectoTarea.nombre
    }
    return tarea.nombreTareaExtra || 'Tarea Extra'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        <span>Cargando registros...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>

            <Input
              placeholder="Buscar..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              className="w-[200px]"
            />

            <Select value={filtroProyecto} onValueChange={setFiltroProyecto}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los proyectos</SelectItem>
                {proyectos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={cargarRegistros}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de registros */}
      {registrosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay registros de campo {estado !== 'todos' ? estado + 's' : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {registrosFiltrados.map(registro => (
            <Card key={registro.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-blue-50">
                        <Building className="h-3 w-3 mr-1" />
                        {registro.proyecto.codigo}
                      </Badge>
                      {registro.proyectoEdt && (
                        <Badge variant="outline">
                          <FolderOpen className="h-3 w-3 mr-1" />
                          {registro.proyectoEdt.nombre}
                        </Badge>
                      )}
                      {getEstadoBadge(registro.estado)}
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(registro.fechaTrabajo), 'dd/MM/yyyy', { locale: es })}
                      </div>
                      <div className="flex items-center gap-1 text-purple-600">
                        <ListTodo className="h-4 w-4" />
                        {registro.cantidadTareas} tarea(s)
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="h-4 w-4" />
                        {registro.cantidadMiembros} persona(s)
                      </div>
                      <div className="flex items-center gap-1 text-green-600 font-medium">
                        <Clock className="h-4 w-4" />
                        {registro.totalHoras}h total
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <User className="h-4 w-4" />
                        {registro.supervisor.name || registro.supervisor.email}
                      </div>
                    </div>

                    {/* Tareas resumen */}
                    {registro.tareas && registro.tareas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {registro.tareas.slice(0, 3).map(tarea => (
                          <Badge key={tarea.id} variant="secondary" className="text-xs">
                            {getNombreTarea(tarea)}
                          </Badge>
                        ))}
                        {registro.tareas.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{registro.tareas.length - 3} más
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Ubicación */}
                    {registro.ubicacion && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                        <MapPin className="h-3 w-3" />
                        {registro.ubicacion}
                      </div>
                    )}

                    {/* Motivo de rechazo */}
                    {registro.estado === 'rechazado' && registro.motivoRechazo && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                        <strong>Motivo:</strong> {registro.motivoRechazo}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRegistroDetalle(registro)
                        setShowDetalle(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>

                    {registro.estado === 'pendiente' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleAprobar(registro)}
                          disabled={procesando === registro.id}
                        >
                          {procesando === registro.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setRegistroRechazar(registro)
                            setShowRechazo(true)
                          }}
                          disabled={procesando === registro.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Detalle */}
      <Dialog open={showDetalle} onOpenChange={setShowDetalle}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Detalle del Registro de Campo
            </DialogTitle>
          </DialogHeader>

          {registroDetalle && (
            <div className="space-y-4">
              {/* Info general */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Proyecto:</span>
                  <p className="font-medium">{registroDetalle.proyecto.codigo} - {registroDetalle.proyecto.nombre}</p>
                </div>
                <div>
                  <span className="text-gray-500">Fecha:</span>
                  <p className="font-medium">
                    {format(new Date(registroDetalle.fechaTrabajo), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                {registroDetalle.proyectoEdt && (
                  <div>
                    <span className="text-gray-500">EDT:</span>
                    <p className="font-medium">{registroDetalle.proyectoEdt.nombre}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Supervisor:</span>
                  <p className="font-medium">{registroDetalle.supervisor.name || registroDetalle.supervisor.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <p>{getEstadoBadge(registroDetalle.estado)}</p>
                </div>
                {registroDetalle.ubicacion && (
                  <div>
                    <span className="text-gray-500">Ubicación:</span>
                    <p className="font-medium">{registroDetalle.ubicacion}</p>
                  </div>
                )}
              </div>

              {registroDetalle.descripcion && (
                <div>
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <p className="text-sm">{registroDetalle.descripcion}</p>
                </div>
              )}

              {/* Tareas con miembros */}
              <div>
                <span className="text-sm text-gray-500 block mb-2">
                  Tareas ({registroDetalle.tareas?.length || 0}):
                </span>
                <div className="space-y-3">
                  {registroDetalle.tareas?.map(tarea => (
                    <Card key={tarea.id} className="bg-gray-50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ListTodo className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">{getNombreTarea(tarea)}</span>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {tarea.totalHoras}h
                          </Badge>
                        </div>
                        {tarea.proyectoTarea?.proyectoActividad && (
                          <p className="text-xs text-gray-500 mb-2">
                            Actividad: {tarea.proyectoTarea.proyectoActividad.nombre}
                          </p>
                        )}
                        <div className="space-y-1">
                          {tarea.miembros.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-gray-400" />
                                <span>{m.usuario.name || m.usuario.email}</span>
                              </div>
                              <Badge variant="secondary">{m.horas}h</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="border-t pt-3 flex justify-between items-center">
                <div>
                  <span className="text-gray-600">Total:</span>
                  <p className="text-sm">
                    {registroDetalle.cantidadTareas} tarea(s) - {registroDetalle.cantidadMiembros} persona(s)
                  </p>
                </div>
                <span className="text-2xl font-bold text-green-700">{registroDetalle.totalHoras}h</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Rechazo */}
      <Dialog open={showRechazo} onOpenChange={setShowRechazo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Rechazar Registro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                El supervisor será notificado del rechazo con el motivo que indique.
              </p>
            </div>

            <div>
              <Label>Motivo del rechazo *</Label>
              <Textarea
                placeholder="Explique por qué rechaza este registro..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 10 caracteres</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRechazo(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={motivoRechazo.trim().length < 10 || procesando !== null}
            >
              {procesando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AprobacionCampoList
