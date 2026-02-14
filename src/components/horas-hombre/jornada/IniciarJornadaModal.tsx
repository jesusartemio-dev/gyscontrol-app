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
  Loader2,
  Search,
  Play,
  Shield,
  HardHat
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
  const sessionUserId = session?.user?.id

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [edts, setEdts] = useState<EdtProyecto[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const [proyectoId, setProyectoId] = useState('')
  const [proyectoEdtId, setProyectoEdtId] = useState('')
  const [fechaTrabajo, setFechaTrabajo] = useState(new Date().toISOString().split('T')[0])
  const [objetivosDia, setObjetivosDia] = useState('')
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
        // Auto-seleccionar EDT "CON" (Construcción) si existe
        const conEdt = edtsUnicos.find((e: EdtProyecto) =>
          e.edt?.nombre?.toUpperCase().startsWith('CON')
        )
        if (conEdt) {
          setProyectoEdtId(conEdt.id)
        }
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
        // Auto-seleccionar al usuario actual como parte del equipo y supervisor
        if (sessionUserId) {
          const currentUser = usuariosFiltrados.find((u: Usuario) => u.id === sessionUserId)
          if (currentUser) {
            setPersonalSeleccionado([currentUser.id])
            setSupervisorId(currentUser.id)
          }
        }
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const togglePersonal = (userId: string) => {
    const isAdding = !personalSeleccionado.includes(userId)
    setPersonalSeleccionado(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
    // Auto-asignar seguridad si se selecciona desde el tab "Seguridad"
    if (isAdding && filtroRol === 'seguridad') {
      setSeguridadId(userId)
    }
    // Si se deselecciona alguien que era supervisor o seguridad, limpiar
    if (!isAdding) {
      if (userId === supervisorId) setSupervisorId('')
      if (userId === seguridadId) setSeguridadId('')
    }
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
          personalPlanificado
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Play className="h-4 w-4 text-green-600" />
            Nueva Jornada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Proyecto, EDT y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                <Building className="h-3.5 w-3.5" />
                Proyecto *
              </Label>
              <Select value={proyectoId} onValueChange={setProyectoId} disabled={loading}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar" />
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

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                <FolderOpen className="h-3.5 w-3.5" />
                EDT
              </Label>
              <Select
                value={proyectoEdtId}
                onValueChange={setProyectoEdtId}
                disabled={!proyectoId || edts.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={!proyectoId ? 'Proyecto primero' : edts.length === 0 ? 'Sin cronograma' : 'Seleccionar'} />
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

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                <Calendar className="h-3.5 w-3.5" />
                Fecha *
              </Label>
              <Input
                type="date"
                value={fechaTrabajo}
                onChange={e => setFechaTrabajo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Objetivos del día */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-gray-600">
              <Target className="h-3.5 w-3.5" />
              Objetivos del día *
            </Label>
            <Textarea
              placeholder="¿Qué se planifica hacer hoy?"
              value={objetivosDia}
              onChange={e => setObjetivosDia(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Personal planificado */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                <Users className="h-3.5 w-3.5" />
                Personal * ({personalSeleccionado.length})
              </Label>
              <div className="flex gap-1.5">
                <button type="button" onClick={seleccionarTodosFiltrados} className="text-[11px] text-blue-600 hover:underline">
                  Todos
                </button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={deseleccionarTodos} className="text-[11px] text-gray-500 hover:underline">
                  Ninguno
                </button>
              </div>
            </div>

            {/* Filtro por rol + búsqueda en una fila */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-wrap gap-1 flex-1">
                {ROLE_TABS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFiltroRol(tab.key)}
                    className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                      filtroRol === tab.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                    {tab.key !== 'todos' && (
                      <span className="ml-0.5 opacity-70">
                        {usuarios.filter(u => u.role === tab.key).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="relative sm:w-40">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  value={busquedaPersonal}
                  onChange={e => setBusquedaPersonal(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* Lista de personal */}
            <div className="border rounded-lg max-h-40 overflow-y-auto">
              {usuarios.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-xs">
                  Cargando usuarios...
                </div>
              ) : usuariosMostrados.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-xs">
                  No se encontró personal
                </div>
              ) : (
                <div className="divide-y">
                  {usuariosMostrados.map(u => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={personalSeleccionado.includes(u.id)}
                        onCheckedChange={() => togglePersonal(u.id)}
                      />
                      <span className="flex-1 min-w-0 text-sm truncate">
                        {u.name || u.email}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatRol(u.role)}</span>
                      {personalSeleccionado.includes(u.id) && (
                        <div className="flex gap-0.5 shrink-0">
                          {u.id === supervisorId && (
                            <Badge className="bg-orange-100 text-orange-700 text-[9px] px-1 py-0">SUP</Badge>
                          )}
                          {u.id === seguridadId && (
                            <Badge className="bg-red-100 text-red-700 text-[9px] px-1 py-0">SEG</Badge>
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
                {personalSeleccionado.slice(0, 10).map(userId => {
                  const usuario = usuarios.find(u => u.id === userId)
                  const esSupervisor = userId === supervisorId
                  const esSeguridad = userId === seguridadId
                  return (
                    <Badge
                      key={userId}
                      variant="secondary"
                      className={`text-[11px] px-1.5 py-0 ${esSupervisor ? 'bg-orange-100 text-orange-800' : esSeguridad ? 'bg-red-100 text-red-800' : ''}`}
                    >
                      {usuario?.name?.split(' ')[0] || 'Usuario'}
                      {esSupervisor && ' ★'}
                      {esSeguridad && ' ⛑'}
                    </Badge>
                  )
                })}
                {personalSeleccionado.length > 10 && (
                  <Badge variant="outline" className="text-[11px] px-1.5 py-0">
                    +{personalSeleccionado.length - 10}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Responsables - Supervisor y Seguridad */}
          {personalSeleccionado.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-gray-50 rounded-lg border">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <HardHat className="h-3.5 w-3.5 text-orange-600" />
                  Supervisor *
                </Label>
                <Select value={supervisorId} onValueChange={setSupervisorId}>
                  <SelectTrigger className="bg-white h-9">
                    <SelectValue placeholder="Seleccionar" />
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

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Shield className="h-3.5 w-3.5 text-red-600" />
                  Seguridad
                </Label>
                <Select value={seguridadId} onValueChange={setSeguridadId}>
                  <SelectTrigger className="bg-white h-9">
                    <SelectValue placeholder="Opcional" />
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

          {/* Botones */}
          <div className="flex gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !proyectoId || !objetivosDia || personalSeleccionado.length === 0 || !supervisorId}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1.5" />
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
