'use client'

/**
 * RegistroCampoWizard - Wizard para registrar horas de campo (cuadrilla)
 *
 * Nueva estructura: 1 Registro = 1 Proyecto + 1 EDT + N Tareas
 * Cada Tarea tiene su propio personal con horas independientes
 *
 * Pasos:
 * 1. Seleccionar Proyecto y EDT
 * 2. Agregar Tareas con Personal
 * 3. Definir Fecha y Ubicación
 * 4. Confirmar y Enviar
 */

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Building,
  FolderOpen,
  ListTodo,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  User,
  AlertCircle,
  Plus,
  Trash2,
  Users,
  Edit2,
  Search,
  UserCheck,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { TareaWizard, MiembroCuadrilla } from '@/types/registroCampo'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface EdtProyecto {
  id: string
  nombre: string
  tareas?: TareaDelCronograma[]
}

interface TareaDelCronograma {
  id: string
  nombre: string
  proyectoActividad?: { nombre: string } | null
}

interface PersonalProyecto {
  userId: string
  rol: string
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
}

interface RegistroCampoWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  fechaInicial?: string
}

export function RegistroCampoWizard({
  open,
  onOpenChange,
  onSuccess,
  fechaInicial
}: RegistroCampoWizardProps) {
  const { toast } = useToast()

  // Estado del wizard
  const [paso, setPaso] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Datos de selección
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [edts, setEdts] = useState<EdtProyecto[]>([])
  const [personal, setPersonal] = useState<PersonalProyecto[]>([])

  // Estado del formulario
  const [proyectoId, setProyectoId] = useState<string>('')
  const [proyectoEdtId, setProyectoEdtId] = useState<string>('')
  const [tareas, setTareas] = useState<TareaWizard[]>([])
  const [fechaTrabajo, setFechaTrabajo] = useState(fechaInicial || new Date().toISOString().split('T')[0])
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  // Estado para agregar/editar tarea
  const [editandoTareaId, setEditandoTareaId] = useState<string | null>(null)
  const [actividadSeleccionadaId, setActividadSeleccionadaId] = useState<string | null>(null)
  const [tipoTarea, setTipoTarea] = useState<'cronograma' | 'extra'>('cronograma')
  const [tareasDirectas, setTareasDirectas] = useState<TareaDelCronograma[]>([])
  const [loadingTareasDirectas, setLoadingTareasDirectas] = useState(false)

  // Estado para búsqueda y filtro de personal
  const [busquedaPersonal, setBusquedaPersonal] = useState('')
  const [filtroRol, setFiltroRol] = useState<string>('Proyectos')
  const [tareaForm, setTareaForm] = useState<{
    proyectoTareaId: string | null
    nombreTareaExtra: string
    descripcion: string
    miembrosSeleccionados: string[]
    horasBase: number
    horasPorMiembro: Record<string, number>
  }>({
    proyectoTareaId: null,
    nombreTareaExtra: '',
    descripcion: '',
    miembrosSeleccionados: [],
    horasBase: 8,
    horasPorMiembro: {}
  })

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setPaso(1)
      setProyectoId('')
      setProyectoEdtId('')
      setTareas([])
      setFechaTrabajo(fechaInicial || new Date().toISOString().split('T')[0])
      setDescripcion('')
      setUbicacion('')
      resetTareaForm()
      cargarProyectos()
    }
  }, [open, fechaInicial])

  // Cargar EDTs y personal cuando cambia el proyecto
  useEffect(() => {
    if (proyectoId) {
      cargarEdts()
      cargarPersonal()
    } else {
      setEdts([])
      setPersonal([])
      setProyectoEdtId('')
      setTareas([])
    }
  }, [proyectoId])

  // Resetear tareas cuando cambia el EDT
  useEffect(() => {
    setTareas([])
    setTareasDirectas([])
    resetTareaForm()
  }, [proyectoEdtId])

  const resetTareaForm = () => {
    setEditandoTareaId(null)
    setActividadSeleccionadaId(null)
    setTipoTarea('cronograma')
    setTareaForm({
      proyectoTareaId: null,
      nombreTareaExtra: '',
      descripcion: '',
      miembrosSeleccionados: [],
      horasBase: 8,
      horasPorMiembro: {}
    })
  }

  const cargarProyectos = async () => {
    try {
      setLoading(true)
      // Obtener todos los proyectos (sin filtro)
      const response = await fetch('/api/proyectos')
      if (response.ok) {
        const data = await response.json()
        // Manejar diferentes estructuras de respuesta
        const proyectosData = data.proyectos || data.data || data || []
        setProyectos(Array.isArray(proyectosData) ? proyectosData : [])
        console.log('Proyectos cargados:', proyectosData.length)
      } else {
        console.error('Error response:', response.status)
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarEdts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/edts-proyecto-simple?proyectoId=${proyectoId}`)
      if (response.ok) {
        const data = await response.json()
        // Asegurar que edts sea siempre un array
        const edtsData = Array.isArray(data.edts) ? data.edts : []
        // Asegurar que cada EDT tenga tareas como array
        const edtsConTareas = edtsData.map((edt: any) => ({
          ...edt,
          tareas: Array.isArray(edt.tareas) ? edt.tareas : []
        }))
        setEdts(edtsConTareas)
      }
    } catch (error) {
      console.error('Error cargando EDTs:', error)
      setEdts([])
    } finally {
      setLoading(false)
    }
  }

  const cargarPersonal = async () => {
    try {
      // Cargar TODOS los usuarios del sistema para registro de campo
      const response = await fetch('/api/admin/usuarios')
      if (response.ok) {
        const usuarios = await response.json()

        // Convertir al formato PersonalProyecto
        const todosPersonal: PersonalProyecto[] = usuarios.map((u: any) => ({
          userId: u.id,
          rol: formatearRol(u.role),
          user: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role
          }
        }))

        console.log('👥 Personal cargado:', todosPersonal.length, 'usuarios')
        setPersonal(todosPersonal)
      }
    } catch (error) {
      console.error('Error cargando personal:', error)
    }
  }

  // Formatear el rol para mostrar en la UI
  const formatearRol = (role: string): string => {
    const roles: Record<string, string> = {
      'admin': 'Admin',
      'proyectos': 'Proyectos',
      'seguridad': 'Seguridad',
      'comercial': 'Comercial',
      'gestor': 'Gestor',
      'coordinador': 'Coordinador',
      'presupuestos': 'Presupuestos'
    }
    return roles[role] || role
  }

  const edtSeleccionado = Array.isArray(edts) ? edts.find(e => e.id === proyectoEdtId) : undefined
  const tareasDisponibles = Array.isArray(edtSeleccionado?.tareas) ? edtSeleccionado.tareas : []

  // Cargar tareas directas (sin actividad) cuando se selecciona modo "extra"
  const cargarTareasDirectas = async () => {
    if (!proyectoEdtId) return
    try {
      setLoadingTareasDirectas(true)
      const response = await fetch(`/api/horas-hombre/tareas-directas-edt/${proyectoEdtId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.tareas) {
          setTareasDirectas(data.tareas)
          console.log('📋 Tareas directas cargadas:', data.tareas.length)
        }
      }
    } catch (error) {
      console.error('Error cargando tareas directas:', error)
    } finally {
      setLoadingTareasDirectas(false)
    }
  }

  // Cargar tareas directas cuando se cambia a modo "extra"
  useEffect(() => {
    if (tipoTarea === 'extra' && proyectoEdtId) {
      cargarTareasDirectas()
    }
  }, [tipoTarea, proyectoEdtId])

  // Extraer actividades únicas de las tareas
  const actividadesUnicas = React.useMemo(() => {
    const actividadesMap = new Map<string, { id: string; nombre: string; cantidadTareas: number }>()
    tareasDisponibles.forEach(t => {
      if (t.proyectoActividad?.nombre) {
        const nombre = t.proyectoActividad.nombre
        if (!actividadesMap.has(nombre)) {
          actividadesMap.set(nombre, { id: nombre, nombre, cantidadTareas: 0 })
        }
        actividadesMap.get(nombre)!.cantidadTareas++
      }
    })
    return Array.from(actividadesMap.values())
  }, [tareasDisponibles])

  // Filtrar tareas por actividad seleccionada
  const tareasFiltradas = React.useMemo(() => {
    if (!actividadSeleccionadaId) return []
    return tareasDisponibles.filter(t => t.proyectoActividad?.nombre === actividadSeleccionadaId)
  }, [tareasDisponibles, actividadSeleccionadaId])

  const handleToggleMiembro = (userId: string) => {
    setTareaForm(prev => {
      const nuevosSeleccionados = prev.miembrosSeleccionados.includes(userId)
        ? prev.miembrosSeleccionados.filter(id => id !== userId)
        : [...prev.miembrosSeleccionados, userId]

      // Inicializar horas si es nuevo
      const nuevasHoras = { ...prev.horasPorMiembro }
      if (!nuevasHoras[userId]) {
        nuevasHoras[userId] = prev.horasBase
      }

      return {
        ...prev,
        miembrosSeleccionados: nuevosSeleccionados,
        horasPorMiembro: nuevasHoras
      }
    })
  }

  const handleHorasChange = (userId: string, horas: number) => {
    setTareaForm(prev => ({
      ...prev,
      horasPorMiembro: { ...prev.horasPorMiembro, [userId]: horas }
    }))
  }

  const aplicarHorasATodos = () => {
    setTareaForm(prev => {
      const nuevasHoras: Record<string, number> = {}
      prev.miembrosSeleccionados.forEach(id => {
        nuevasHoras[id] = prev.horasBase
      })
      return { ...prev, horasPorMiembro: nuevasHoras }
    })
  }

  const guardarTarea = () => {
    // Validar - ahora siempre se requiere seleccionar una tarea (del cronograma o directa)
    if (!tareaForm.proyectoTareaId) {
      toast({
        title: 'Error',
        description: tipoTarea === 'cronograma'
          ? 'Seleccione una tarea del cronograma'
          : 'Seleccione una tarea directa',
        variant: 'destructive'
      })
      return
    }

    if (tareaForm.miembrosSeleccionados.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un miembro para la tarea',
        variant: 'destructive'
      })
      return
    }

    const miembros: MiembroCuadrilla[] = tareaForm.miembrosSeleccionados.map(userId => ({
      usuarioId: userId,
      horas: tareaForm.horasPorMiembro[userId] || tareaForm.horasBase
    }))

    if (editandoTareaId) {
      // Actualizar tarea existente
      setTareas(prev => prev.map(t =>
        t.id === editandoTareaId
          ? {
              ...t,
              proyectoTareaId: tareaForm.proyectoTareaId,
              nombreTareaExtra: tareaForm.nombreTareaExtra || null,
              descripcion: tareaForm.descripcion,
              miembros
            }
          : t
      ))
    } else {
      // Agregar nueva tarea
      const nuevaTarea: TareaWizard = {
        id: `temp-${Date.now()}`,
        proyectoTareaId: tareaForm.proyectoTareaId,
        nombreTareaExtra: tareaForm.nombreTareaExtra || null,
        descripcion: tareaForm.descripcion,
        miembros
      }
      setTareas(prev => [...prev, nuevaTarea])
    }

    resetTareaForm()
  }

  const editarTarea = (tarea: TareaWizard) => {
    setEditandoTareaId(tarea.id)
    setTareaForm({
      proyectoTareaId: tarea.proyectoTareaId,
      nombreTareaExtra: tarea.nombreTareaExtra || '',
      descripcion: tarea.descripcion,
      miembrosSeleccionados: tarea.miembros.map(m => m.usuarioId),
      horasBase: 8,
      horasPorMiembro: Object.fromEntries(tarea.miembros.map(m => [m.usuarioId, m.horas]))
    })
  }

  const eliminarTarea = (tareaId: string) => {
    setTareas(prev => prev.filter(t => t.id !== tareaId))
    if (editandoTareaId === tareaId) {
      resetTareaForm()
    }
  }

  const getNombreTarea = (tarea: TareaWizard): string => {
    if (tarea.proyectoTareaId) {
      // Buscar en tareas del cronograma (con actividad)
      const tareaDelCronograma = tareasDisponibles.find(t => t.id === tarea.proyectoTareaId)
      if (tareaDelCronograma) return tareaDelCronograma.nombre
      // Buscar en tareas directas (sin actividad)
      const tareaDirecta = tareasDirectas.find(t => t.id === tarea.proyectoTareaId)
      if (tareaDirecta) return tareaDirecta.nombre
      return 'Tarea'
    }
    return tarea.nombreTareaExtra || 'Tarea Directa'
  }

  const getNombreUsuario = (userId: string): string => {
    if (!Array.isArray(personal)) return 'Usuario'
    const p = personal.find(p => p.userId === userId)
    return p?.user.name || p?.user.email || 'Usuario'
  }

  const handleSubmit = async () => {
    if (tareas.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe agregar al menos una tarea',
        variant: 'destructive'
      })
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        proyectoId,
        proyectoEdtId: proyectoEdtId || undefined,
        fechaTrabajo,
        descripcion: descripcion || undefined,
        ubicacion: ubicacion || undefined,
        tareas: tareas.map(t => ({
          proyectoTareaId: t.proyectoTareaId || undefined,
          nombreTareaExtra: t.nombreTareaExtra || undefined,
          descripcion: t.descripcion || undefined,
          miembros: t.miembros.map(m => ({
            usuarioId: m.usuarioId,
            horas: m.horas,
            observaciones: m.observaciones || undefined
          }))
        }))
      }

      const response = await fetch('/api/horas-hombre/campo/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar')
      }

      toast({
        title: 'Registro creado',
        description: data.message
      })

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al registrar',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const puedeAvanzar = () => {
    switch (paso) {
      case 1: return !!proyectoId && !!proyectoEdtId
      case 2: return tareas.length > 0
      case 3: return !!fechaTrabajo
      default: return true
    }
  }

  // Variables seguras para evitar errores de .map() en non-arrays
  const proyectosArray = Array.isArray(proyectos) ? proyectos : []
  const edtsArray = Array.isArray(edts) ? edts : []
  const personalArray = Array.isArray(personal) ? personal : []
  const tareasArray = Array.isArray(tareas) ? tareas : []
  const miembrosSeleccionadosArray = Array.isArray(tareaForm.miembrosSeleccionados) ? tareaForm.miembrosSeleccionados : []

  // Obtener roles únicos para el filtro
  const rolesUnicos = React.useMemo(() => {
    const roles = new Set(personalArray.map(p => p.rol))
    return Array.from(roles).sort()
  }, [personalArray])

  // Filtrar personal por búsqueda y rol
  const personalFiltrado = React.useMemo(() => {
    return personalArray.filter(p => {
      const nombreMatch = (p.user.name || p.user.email || '').toLowerCase().includes(busquedaPersonal.toLowerCase())
      const rolMatch = filtroRol === 'todos' || p.rol === filtroRol
      return nombreMatch && rolMatch
    })
  }, [personalArray, busquedaPersonal, filtroRol])

  // Funciones de selección rápida
  const seleccionarTodos = () => {
    const idsVisibles = personalFiltrado.map(p => p.userId)
    setTareaForm(prev => {
      const nuevosSeleccionados = [...new Set([...prev.miembrosSeleccionados, ...idsVisibles])]
      const nuevasHoras = { ...prev.horasPorMiembro }
      idsVisibles.forEach(id => {
        if (!nuevasHoras[id]) nuevasHoras[id] = prev.horasBase
      })
      return { ...prev, miembrosSeleccionados: nuevosSeleccionados, horasPorMiembro: nuevasHoras }
    })
  }

  const deseleccionarTodos = () => {
    const idsVisibles = new Set(personalFiltrado.map(p => p.userId))
    setTareaForm(prev => ({
      ...prev,
      miembrosSeleccionados: prev.miembrosSeleccionados.filter(id => !idsVisibles.has(id))
    }))
  }

  const seleccionarPorRol = (rol: string) => {
    const idsPorRol = personalArray.filter(p => p.rol === rol).map(p => p.userId)
    setTareaForm(prev => {
      const nuevosSeleccionados = [...new Set([...prev.miembrosSeleccionados, ...idsPorRol])]
      const nuevasHoras = { ...prev.horasPorMiembro }
      idsPorRol.forEach(id => {
        if (!nuevasHoras[id]) nuevasHoras[id] = prev.horasBase
      })
      return { ...prev, miembrosSeleccionados: nuevosSeleccionados, horasPorMiembro: nuevasHoras }
    })
  }

  const proyectoSeleccionado = proyectosArray.find(p => p.id === proyectoId)

  // Calcular totales
  const totalTareas = tareasArray.length
  const miembrosUnicos = new Set(tareasArray.flatMap(t => Array.isArray(t.miembros) ? t.miembros.map(m => m.usuarioId) : []))
  const totalHoras = tareasArray.reduce((sum, t) => sum + (Array.isArray(t.miembros) ? t.miembros.reduce((s, m) => s + m.horas, 0) : 0), 0)

  const pasos = [
    { num: 1, titulo: 'Proyecto', icon: Building },
    { num: 2, titulo: 'Tareas', icon: ListTodo },
    { num: 3, titulo: 'Fecha', icon: Clock },
    { num: 4, titulo: 'Confirmar', icon: CheckCircle }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Registro de Horas en Campo
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            {pasos.map(p => (
              <div
                key={p.num}
                className={`flex flex-col items-center ${paso >= p.num ? 'text-green-600' : 'text-gray-400'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  paso > p.num ? 'bg-green-600 text-white' :
                  paso === p.num ? 'bg-green-100 text-green-600 ring-2 ring-green-600' :
                  'bg-gray-100'
                }`}>
                  <p.icon className="h-4 w-4" />
                </div>
                <span className="text-xs mt-1 hidden sm:block">{p.titulo}</span>
              </div>
            ))}
          </div>
          <Progress value={(paso / 4) * 100} className="h-2" />
        </div>

        {/* Resumen mínimo - estilo breadcrumb */}
        {(proyectoSeleccionado || tareas.length > 0) && (
          <div className="flex items-center text-sm text-gray-600 mb-3 pb-2 border-b">
            {proyectoSeleccionado && (
              <>
                <span className="font-semibold text-gray-900">{proyectoSeleccionado.codigo}</span>
                {edtSeleccionado && (
                  <>
                    <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                    <span className="text-gray-700">{edtSeleccionado.nombre}</span>
                  </>
                )}
              </>
            )}
            {tareas.length > 0 && (
              <div className="ml-auto flex items-center gap-3 text-xs">
                <span className="text-purple-600 font-medium">{totalTareas} tarea(s)</span>
                <span className="text-blue-600 font-medium">{miembrosUnicos.size} pers.</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">{totalHoras}h</span>
              </div>
            )}
          </div>
        )}

        {/* Contenido del paso */}
        <div className="min-h-[280px]">
          {/* Paso 1: Proyecto y EDT - COMPACTO */}
          {paso === 1 && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Proyecto *</Label>
                    <Select value={proyectoId} onValueChange={setProyectoId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {proyectosArray.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono font-semibold">{p.codigo}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">EDT *</Label>
                    <Select
                      value={proyectoEdtId}
                      onValueChange={setProyectoEdtId}
                      disabled={!proyectoId}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={proyectoId ? "Seleccionar..." : "Primero elija proyecto"} />
                      </SelectTrigger>
                      <SelectContent>
                        {edtsArray.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Agregar Tareas - COMPACTO */}
          {paso === 2 && (
            <div className="space-y-3">
              {/* Lista de tareas agregadas - compacta */}
              {tareas.length > 0 && (
                <div className="space-y-1">
                  {tareasArray.map(tarea => (
                    <div key={tarea.id} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getNombreTarea(tarea)}</p>
                        <p className="text-xs text-green-700">
                          {tarea.miembros.length} personas • {tarea.miembros.reduce((s, m) => s + m.horas, 0)}h
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editarTarea(tarea)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => eliminarTarea(tarea.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario compacto */}
              <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                  {/* Tipo de tarea: Cronograma o Extra */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={tipoTarea === 'cronograma' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTipoTarea('cronograma')
                        setTareaForm(prev => ({ ...prev, nombreTareaExtra: '' }))
                      }}
                      className="flex-1"
                    >
                      📋 Del Cronograma
                    </Button>
                    <Button
                      type="button"
                      variant={tipoTarea === 'extra' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTipoTarea('extra')
                        setActividadSeleccionadaId(null)
                        setTareaForm(prev => ({ ...prev, proyectoTareaId: null, nombreTareaExtra: '' }))
                      }}
                      className="flex-1"
                    >
                      🎯 Tarea Directa
                    </Button>
                  </div>

                  {tipoTarea === 'cronograma' ? (
                    <div className="space-y-2">
                      {/* Seleccionar Actividad */}
                      <div>
                        <Label className="text-xs text-blue-600 font-medium">Actividad</Label>
                        <Select
                          value={actividadSeleccionadaId || '__none__'}
                          onValueChange={(v) => {
                            setActividadSeleccionadaId(v === '__none__' ? null : v)
                            setTareaForm(prev => ({ ...prev, proyectoTareaId: null }))
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar actividad..." />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                            <SelectItem value="__none__" className="text-xs py-2.5">-- Seleccione --</SelectItem>
                            {actividadesUnicas.map(a => (
                              <SelectItem key={a.id} value={a.id} className="text-xs py-2.5">
                                <span className="truncate">{a.nombre} ({a.cantidadTareas})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Seleccionar Tarea (solo si hay actividad) */}
                      {actividadSeleccionadaId && (
                        <div>
                          <Label className="text-xs text-green-600 font-medium">Tarea</Label>
                          <Select
                            value={tareaForm.proyectoTareaId || '__none__'}
                            onValueChange={(v) => setTareaForm(prev => ({
                              ...prev,
                              proyectoTareaId: v === '__none__' ? null : v
                            }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar tarea..." />
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                              <SelectItem value="__none__" className="text-xs py-2.5">-- Seleccione --</SelectItem>
                              {tareasFiltradas.filter(t => t.id).map(t => (
                                <SelectItem key={t.id} value={t.id} className="text-xs py-2.5">
                                  <span className="truncate">{t.nombre}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {!actividadSeleccionadaId && actividadesUnicas.length === 0 && (
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          Sin actividades. Use "Tarea Directa".
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Tarea Directa (sin actividad) */
                    <div className="space-y-2">
                      <Label className="text-xs text-orange-600 font-medium">Tarea Directa</Label>
                      {loadingTareasDirectas ? (
                        <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Cargando...</span>
                        </div>
                      ) : tareasDirectas.length > 0 ? (
                        <Select
                          value={tareaForm.proyectoTareaId || '__none__'}
                          onValueChange={(v) => {
                            const tareaId = v === '__none__' ? null : v
                            const tareaSeleccionada = tareasDirectas.find(t => t.id === tareaId)
                            setTareaForm(prev => ({
                              ...prev,
                              proyectoTareaId: tareaId,
                              nombreTareaExtra: tareaSeleccionada?.nombre || ''
                            }))
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar tarea..." />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                            <SelectItem value="__none__" className="text-xs py-2.5">-- Seleccione --</SelectItem>
                            {tareasDirectas.filter(t => t.id).map(t => (
                              <SelectItem key={t.id} value={t.id} className="text-xs py-2.5">
                                <span className="truncate">{t.nombre}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          Sin tareas directas en este EDT.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Seleccionar personal - MEJORADO */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Personal para esta tarea
                        {tareaForm.miembrosSeleccionados.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {tareaForm.miembrosSeleccionados.length} seleccionado(s)
                          </Badge>
                        )}
                      </Label>
                    </div>

                    {/* Buscador y filtros */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por nombre..."
                          value={busquedaPersonal}
                          onChange={(e) => setBusquedaPersonal(e.target.value)}
                          className="pl-8 h-9"
                        />
                        {busquedaPersonal && (
                          <button
                            onClick={() => setBusquedaPersonal('')}
                            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <Select value={filtroRol} onValueChange={setFiltroRol}>
                        <SelectTrigger className="w-[130px] h-9">
                          <SelectValue placeholder="Filtrar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los roles</SelectItem>
                          {rolesUnicos.map(rol => (
                            <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Lista de personal */}
                    <div className="border rounded-md max-h-[200px] overflow-y-auto">
                      {personalFiltrado.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No se encontraron usuarios
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1 p-2">
                          {personalFiltrado.map(p => {
                            const isSelected = tareaForm.miembrosSeleccionados.includes(p.userId)
                            return (
                              <div
                                key={p.userId}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-green-100 border-2 border-green-400 shadow-sm'
                                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                }`}
                                onClick={() => handleToggleMiembro(p.userId)}
                              >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'bg-green-500 text-white' : 'bg-gray-200'
                                }`}>
                                  {isSelected ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <User className="h-3 w-3 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-green-800' : ''}`}>
                                    {p.user.name || p.user.email}
                                  </p>
                                  <p className="text-xs text-gray-500">{p.rol}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Horas por miembro - MEJORADO */}
                  {tareaForm.miembrosSeleccionados.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-blue-800">
                          <Clock className="h-4 w-4" />
                          Horas por persona ({miembrosSeleccionadosArray.length})
                        </Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-600">Horas base:</span>
                          <Input
                            type="number"
                            min={0.5}
                            max={24}
                            step={0.5}
                            value={tareaForm.horasBase}
                            onChange={(e) => setTareaForm(prev => ({
                              ...prev,
                              horasBase: parseFloat(e.target.value) || 8
                            }))}
                            className="w-16 h-8 text-center"
                          />
                          <Button variant="secondary" size="sm" onClick={aplicarHorasATodos} className="h-8">
                            Aplicar
                          </Button>
                        </div>
                      </div>
                      <div className="bg-white rounded-md border max-h-[150px] overflow-y-auto">
                        {miembrosSeleccionadosArray.map((userId, index) => (
                          <div
                            key={userId}
                            className={`flex items-center gap-3 p-2 ${index !== 0 ? 'border-t' : ''}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="flex-1 text-sm font-medium">{getNombreUsuario(userId)}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleHorasChange(userId, Math.max(0.5, (tareaForm.horasPorMiembro[userId] || tareaForm.horasBase) - 0.5))}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min={0.5}
                                max={24}
                                step={0.5}
                                value={tareaForm.horasPorMiembro[userId] || tareaForm.horasBase}
                                onChange={(e) => handleHorasChange(userId, parseFloat(e.target.value) || 0)}
                                className="w-16 h-7 text-center"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleHorasChange(userId, Math.min(24, (tareaForm.horasPorMiembro[userId] || tareaForm.horasBase) + 0.5))}
                              >
                                +
                              </Button>
                              <span className="text-xs text-gray-500 w-4">h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Badge variant="outline" className="bg-white">
                          Total: {miembrosSeleccionadosArray.reduce((sum, id) =>
                            sum + (tareaForm.horasPorMiembro[id] || tareaForm.horasBase), 0
                          )}h
                        </Badge>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={guardarTarea}
                    className="w-full"
                    disabled={!tareaForm.proyectoTareaId || tareaForm.miembrosSeleccionados.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editandoTareaId ? 'Actualizar Tarea' : 'Agregar Tarea'}
                  </Button>

                  {editandoTareaId && (
                    <Button variant="outline" onClick={resetTareaForm} className="w-full" size="sm">
                      Cancelar
                    </Button>
                  )}
                </div>
            </div>
          )}

          {/* Paso 3: Fecha y Ubicación */}
          {paso === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Paso 3: Fecha y Ubicación
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de Trabajo *</Label>
                  <Input
                    type="date"
                    value={fechaTrabajo}
                    onChange={(e) => setFechaTrabajo(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Ubicación (opcional)</Label>
                  <Input
                    placeholder="Ej: Obra San Isidro, Mz A Lt 5"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Descripción general (opcional)</Label>
                <Textarea
                  placeholder="Describa brevemente el trabajo realizado en campo..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Resumen de tareas */}
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Resumen de Tareas</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {tareasArray.map(tarea => (
                    <div key={tarea.id} className="flex justify-between py-1 border-b last:border-0">
                      <span className="text-sm">{getNombreTarea(tarea)}</span>
                      <span className="text-sm text-gray-500">
                        {tarea.miembros.length} pers. / {tarea.miembros.reduce((s, m) => s + m.horas, 0)}h
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-medium">
                    <span>Total</span>
                    <span className="text-green-600">{miembrosUnicos.size} personas / {totalHoras}h</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Paso 4: Confirmar */}
          {paso === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Paso 4: Confirmar Registro
              </h3>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Proyecto:</span>
                      <p className="font-medium">{proyectoSeleccionado?.codigo} - {proyectoSeleccionado?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">EDT:</span>
                      <p className="font-medium">{edtSeleccionado?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Fecha:</span>
                      <p className="font-medium">{new Date(fechaTrabajo + 'T12:00:00').toLocaleDateString('es-PE')}</p>
                    </div>
                    {ubicacion && (
                      <div>
                        <span className="text-gray-600">Ubicación:</span>
                        <p className="font-medium">{ubicacion}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-gray-600 mb-2">Tareas registradas:</p>
                    {tareasArray.map(tarea => (
                      <div key={tarea.id} className="mb-3 p-2 bg-white rounded">
                        <p className="font-medium text-sm">{getNombreTarea(tarea)}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tarea.miembros.map(m => (
                            <Badge key={m.usuarioId} variant="secondary" className="text-xs">
                              {getNombreUsuario(m.usuarioId)}: {m.horas}h
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center">
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <p className="text-sm">{totalTareas} tarea(s) - {miembrosUnicos.size} persona(s) única(s)</p>
                    </div>
                    <span className="text-2xl font-bold text-green-700">{totalHoras}h</span>
                  </div>
                </CardContent>
              </Card>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Este registro quedará pendiente de aprobación</p>
                  <p>Un gestor o gerente deberá aprobar las horas antes de que aparezcan en el timesheet de cada persona.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => paso > 1 ? setPaso(paso - 1) : onOpenChange(false)}
            disabled={submitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {paso === 1 ? 'Cancelar' : 'Anterior'}
          </Button>

          {paso < 4 ? (
            <Button
              onClick={() => setPaso(paso + 1)}
              disabled={!puedeAvanzar() || loading}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Crear Registro
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RegistroCampoWizard
