'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building,
  FolderOpen,
  Calendar,
  Target,
  Users,
  MapPin,
  Loader2,
  Search,
  Play,
  Shield,
  HardHat
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface EdtProyecto {
  id: string
  nombre: string
  edt?: {
    id: string
    nombre: string
  }
}

interface Usuario {
  id: string
  name: string | null
  email: string
  role: string
}

interface PersonalPlanificado {
  userId: string
  nombre: string
  rolJornada?: 'trabajador' | 'supervisor' | 'seguridad'
}

interface IniciarJornadaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (jornadaId: string) => void
}

const ROLE_TABS = [
  { key: 'proyectos', label: 'Proyectos' },
  { key: 'seguridad', label: 'Seguridad' },
  { key: 'comercial', label: 'Comercial' },
  { key: 'presupuestos', label: 'Presupuestos' },
  { key: 'todos', label: 'Todos' },
] as const

const ROLES_PERMITIDOS = ['colaborador', 'coordinador', 'logistico', 'gestor', 'proyectos', 'comercial', 'seguridad', 'presupuestos']

export function IniciarJornadaModal({
  open,
  onOpenChange,
  onSuccess
}: IniciarJornadaModalProps) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [edts, setEdts] = useState<EdtProyecto[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const [proyectoId, setProyectoId] = useState('')
  const [proyectoEdtId, setProyectoEdtId] = useState('')
  const [fechaTrabajo, setFechaTrabajo] = useState(new Date().toISOString().split('T')[0])
  const [objetivosDia, setObjetivosDia] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [personalSeleccionado, setPersonalSeleccionado] = useState<string[]>([])

  // Responsables
  const [supervisorId, setSupervisorId] = useState('')
  const [seguridadId, setSeguridadId] = useState('')

  // Filtro por rol
  const [filtroRol, setFiltroRol] = useState<string>('proyectos')
  const [busquedaPersonal, setBusquedaPersonal] = useState('')

  useEffect(() => {
    if (open) {
      setProyectoId('')
      setProyectoEdtId('')
      setFechaTrabajo(new Date().toISOString().split('T')[0])
      setObjetivosDia('')
      setUbicacion('')
      setPersonalSeleccionado([])
      setSupervisorId('')
      setSeguridadId('')
      setFiltroRol('proyectos')
      setBusquedaPersonal('')
      cargarProyectos()
      cargarUsuarios()
    }
  }, [open])

  useEffect(() => {
    if (proyectoId) {
      cargarEdts()
    } else {
      setEdts([])
      setProyectoEdtId('')
    }
  }, [proyectoId])

  const cargarProyectos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/proyectos')
      if (response.ok) {
        const data = await response.json()
        const proyectosData = Array.isArray(data) ? data : data.proyectos || []
        setProyectos(proyectosData)
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarEdts = async () => {
    try {
      const response = await fetch(`/api/proyecto-edt?proyectoId=${proyectoId}`)
      if (response.ok) {
        const data = await response.json()
        const allEdts = Array.isArray(data) ? data : []
        const nombresVistos = new Set<string>()
        const edtsUnicos = allEdts.filter((edt: { nombre: string }) => {
          if (nombresVistos.has(edt.nombre)) return false
          nombresVistos.add(edt.nombre)
          return true
        })
        setEdts(edtsUnicos)
      }
    } catch (error) {
      console.error('Error cargando EDTs:', error)
    }
  }

  const cargarUsuarios = async () => {
    try {
      const response = await fetch('/api/admin/usuarios')
      if (response.ok) {
        const data = await response.json()
        const usuariosFiltrados = data.filter((u: Usuario) =>
          ROLES_PERMITIDOS.includes(u.role)
        )
        setUsuarios(usuariosFiltrados)
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const togglePersonal = (userId: string) => {
    setPersonalSeleccionado(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const seleccionarTodosFiltrados = () => {
    const ids = usuariosMostrados.map(u => u.id)
    setPersonalSeleccionado(prev => {
      const set = new Set([...prev, ...ids])
      return Array.from(set)
    })
  }

  const deseleccionarTodos = () => {
    setPersonalSeleccionado([])
  }

  const handleSubmit = async () => {
    if (!proyectoId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona un proyecto' })
      return
    }
    if (!objetivosDia.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingresa los objetivos del día' })
      return
    }
    if (personalSeleccionado.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona al menos una persona' })
      return
    }
    if (!supervisorId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Asigna un supervisor de campo' })
      return
    }

    const personalPlanificado: PersonalPlanificado[] = personalSeleccionado.map(userId => {
      const usuario = usuarios.find(u => u.id === userId)
      let rolJornada: 'trabajador' | 'supervisor' | 'seguridad' = 'trabajador'
      if (userId === supervisorId) rolJornada = 'supervisor'
      if (userId === seguridadId) rolJornada = 'seguridad'
      return {
        userId,
        nombre: usuario?.name || usuario?.email || 'Sin nombre',
        rolJornada
      }
    })

    try {
      setSubmitting(true)
      const response = await fetch('/api/horas-hombre/jornada/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId,
          proyectoEdtId: proyectoEdtId || undefined,
          fechaTrabajo,
          objetivosDia: objetivosDia.trim(),
          personalPlanificado,
          ubicacion: ubicacion.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error iniciando jornada')
      }

      toast({
        title: 'Jornada iniciada',
        description: data.message
      })

      onSuccess(data.data.id)
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error iniciando jornada'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Filtrar usuarios por rol y búsqueda
  const usuariosPorRol = filtroRol === 'todos'
    ? usuarios
    : usuarios.filter(u => u.role === filtroRol)

  const usuariosMostrados = usuariosPorRol.filter(u =>
    u.name?.toLowerCase().includes(busquedaPersonal.toLowerCase()) ||
    u.email.toLowerCase().includes(busquedaPersonal.toLowerCase())
  )

  // Usuarios seleccionados para los selects de responsable
  const usuariosSeleccionados = usuarios.filter(u => personalSeleccionado.includes(u.id))

  const proyectoSeleccionado = proyectos.find(p => p.id === proyectoId)

  const formatRol = (role: string) => {
    const roles: Record<string, string> = {
      colaborador: 'Colaborador',
      comercial: 'Comercial',
      coordinador: 'Coordinador',
      logistico: 'Logístico',
      gestor: 'Gestor',
      proyectos: 'Proyectos',
      seguridad: 'Seguridad',
      presupuestos: 'Presupuestos'
    }
    return roles[role] || role
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            Iniciar Jornada de Campo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Proyecto y EDT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Proyecto *
              </Label>
              <Select value={proyectoId} onValueChange={setProyectoId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[250px]">
                  {proyectos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                EDT (opcional)
              </Label>
              <Select
                value={proyectoEdtId}
                onValueChange={setProyectoEdtId}
                disabled={!proyectoId || edts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!proyectoId ? 'Seleccionar proyecto primero' : edts.length === 0 ? 'Sin cronograma' : 'Seleccionar EDT'} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[250px]">
                  {edts.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.edt?.nombre ? `${e.edt.nombre} - ${e.nombre}` : e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha y Ubicación */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha *
              </Label>
              <Input
                type="date"
                value={fechaTrabajo}
                onChange={e => setFechaTrabajo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación (opcional)
              </Label>
              <Input
                placeholder="Ej: Zona norte, Sector A"
                value={ubicacion}
                onChange={e => setUbicacion(e.target.value)}
              />
            </div>
          </div>

          {/* Objetivos del día */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Objetivos del día *
            </Label>
            <Textarea
              placeholder="Describe los objetivos planificados para hoy..."
              value={objetivosDia}
              onChange={e => setObjetivosDia(e.target.value)}
              rows={3}
            />
          </div>

          {/* Personal planificado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Personal * ({personalSeleccionado.length} seleccionados)
              </Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={seleccionarTodosFiltrados}>
                  Todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={deseleccionarTodos}>
                  Ninguno
                </Button>
              </div>
            </div>

            {/* Filtro por rol - tabs */}
            <div className="flex flex-wrap gap-1">
              {ROLE_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFiltroRol(tab.key)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    filtroRol === tab.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {tab.key !== 'todos' && (
                    <span className="ml-1 opacity-70">
                      ({usuarios.filter(u => u.role === tab.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar personal..."
                value={busquedaPersonal}
                onChange={e => setBusquedaPersonal(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Lista de personal */}
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {usuarios.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Cargando usuarios...
                </div>
              ) : usuariosMostrados.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No se encontró personal con ese filtro
                </div>
              ) : (
                <div className="divide-y">
                  {usuariosMostrados.map(u => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={personalSeleccionado.includes(u.id)}
                        onCheckedChange={() => togglePersonal(u.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {u.name || u.email}
                        </div>
                        <div className="text-xs text-gray-500">{formatRol(u.role)}</div>
                      </div>
                      {personalSeleccionado.includes(u.id) && (
                        <div className="flex gap-1">
                          {u.id === supervisorId && (
                            <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5">SUP</Badge>
                          )}
                          {u.id === seguridadId && (
                            <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5">SEG</Badge>
                          )}
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Badges de seleccionados */}
            {personalSeleccionado.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {personalSeleccionado.slice(0, 8).map(userId => {
                  const usuario = usuarios.find(u => u.id === userId)
                  const esSupervisor = userId === supervisorId
                  const esSeguridad = userId === seguridadId
                  return (
                    <Badge
                      key={userId}
                      variant="secondary"
                      className={`text-xs ${esSupervisor ? 'bg-orange-100 text-orange-800' : esSeguridad ? 'bg-red-100 text-red-800' : ''}`}
                    >
                      {usuario?.name?.split(' ')[0] || 'Usuario'}
                      {esSupervisor && ' (Sup)'}
                      {esSeguridad && ' (Seg)'}
                    </Badge>
                  )
                })}
                {personalSeleccionado.length > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{personalSeleccionado.length - 8} más
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Responsables - Supervisor y Seguridad */}
          {personalSeleccionado.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <HardHat className="h-4 w-4 text-orange-600" />
                  Supervisor de campo *
                </Label>
                <Select value={supervisorId} onValueChange={setSupervisorId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar supervisor" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    {usuariosSeleccionados.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-red-600" />
                  Resp. Seguridad
                </Label>
                <Select value={seguridadId} onValueChange={setSeguridadId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar (opcional)" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    {usuariosSeleccionados.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Resumen */}
          {proyectoSeleccionado && personalSeleccionado.length > 0 && objetivosDia && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-800">
                <strong>Resumen:</strong> Jornada para{' '}
                <span className="font-semibold">{proyectoSeleccionado.codigo}</span>
                {' '}el día{' '}
                <span className="font-semibold">
                  {new Date(fechaTrabajo + 'T12:00:00').toLocaleDateString('es-CL')}
                </span>
                {' '}con{' '}
                <span className="font-semibold">{personalSeleccionado.length} persona(s)</span>
                {supervisorId && (
                  <>
                    {' '}- Supervisor: <span className="font-semibold">
                      {usuarios.find(u => u.id === supervisorId)?.name?.split(' ')[0]}
                    </span>
                  </>
                )}
                {seguridadId && (
                  <>
                    {' '}- Seguridad: <span className="font-semibold">
                      {usuarios.find(u => u.id === seguridadId)?.name?.split(' ')[0]}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !proyectoId || !objetivosDia || personalSeleccionado.length === 0 || !supervisorId}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Jornada
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
