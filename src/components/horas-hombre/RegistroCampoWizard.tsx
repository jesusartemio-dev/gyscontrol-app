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
  Edit2
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
    resetTareaForm()
  }, [proyectoEdtId])

  const resetTareaForm = () => {
    setEditandoTareaId(null)
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
      const response = await fetch('/api/proyectos?estado=en_ejecucion')
      if (response.ok) {
        const data = await response.json()
        setProyectos(data.proyectos || data || [])
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
      const response = await fetch(`/api/proyecto/${proyectoId}/personal`)
      if (response.ok) {
        const data = await response.json()
        const personalDinamico = data.data?.personalDinamico || []
        const rolesFijos = data.data?.rolesFijos || {}

        const todosPersonal: PersonalProyecto[] = []

        // Agregar roles fijos
        if (rolesFijos.gestor) {
          todosPersonal.push({
            userId: rolesFijos.gestor.id,
            rol: 'gestor',
            user: rolesFijos.gestor
          })
        }
        if (rolesFijos.supervisor) {
          todosPersonal.push({
            userId: rolesFijos.supervisor.id,
            rol: 'supervisor',
            user: rolesFijos.supervisor
          })
        }
        if (rolesFijos.lider) {
          todosPersonal.push({
            userId: rolesFijos.lider.id,
            rol: 'lider',
            user: rolesFijos.lider
          })
        }

        // Agregar personal dinámico
        personalDinamico.forEach((p: PersonalProyecto) => {
          if (!todosPersonal.some(t => t.userId === p.userId)) {
            todosPersonal.push(p)
          }
        })

        setPersonal(todosPersonal)
      }
    } catch (error) {
      console.error('Error cargando personal:', error)
    }
  }

  const edtSeleccionado = Array.isArray(edts) ? edts.find(e => e.id === proyectoEdtId) : undefined
  const tareasDisponibles = Array.isArray(edtSeleccionado?.tareas) ? edtSeleccionado.tareas : []

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
    // Validar
    if (!tareaForm.proyectoTareaId && !tareaForm.nombreTareaExtra.trim()) {
      toast({
        title: 'Error',
        description: 'Seleccione una tarea del cronograma o ingrese un nombre de tarea extra',
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
      const tareaDelCronograma = tareasDisponibles.find(t => t.id === tarea.proyectoTareaId)
      return tareaDelCronograma?.nombre || 'Tarea'
    }
    return tarea.nombreTareaExtra || 'Tarea Extra'
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

  const proyectoSeleccionado = Array.isArray(proyectos) ? proyectos.find(p => p.id === proyectoId) : undefined

  // Calcular totales (con verificación de arrays)
  const tareasArray = Array.isArray(tareas) ? tareas : []
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

        {/* Resumen */}
        {(proyectoSeleccionado || tareas.length > 0) && (
          <Card className="mb-4 bg-gray-50">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2 text-sm">
                {proyectoSeleccionado && (
                  <Badge variant="outline" className="bg-white">
                    <Building className="h-3 w-3 mr-1" />
                    {proyectoSeleccionado.codigo}
                  </Badge>
                )}
                {edtSeleccionado && (
                  <Badge variant="outline" className="bg-white">
                    <FolderOpen className="h-3 w-3 mr-1" />
                    {edtSeleccionado.nombre}
                  </Badge>
                )}
                {tareas.length > 0 && (
                  <>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      <ListTodo className="h-3 w-3 mr-1" />
                      {totalTareas} tarea(s)
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      <Users className="h-3 w-3 mr-1" />
                      {miembrosUnicos.size} persona(s)
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <Clock className="h-3 w-3 mr-1" />
                      {totalHoras}h total
                    </Badge>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contenido del paso */}
        <div className="min-h-[350px]">
          {/* Paso 1: Proyecto y EDT */}
          {paso === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Paso 1: Seleccionar Proyecto y EDT
              </h3>
              <p className="text-sm text-gray-600">
                Seleccione el proyecto y EDT donde se realizó el trabajo de campo.
              </p>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Proyecto *</Label>
                    <Select value={proyectoId} onValueChange={setProyectoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proyecto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {proyectos.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-medium">{p.codigo}</span> - {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {proyectoId && (
                    <div>
                      <Label>EDT *</Label>
                      <Select value={proyectoEdtId} onValueChange={setProyectoEdtId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar EDT..." />
                        </SelectTrigger>
                        <SelectContent>
                          {edts.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Agregar Tareas */}
          {paso === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-purple-600" />
                Paso 2: Agregar Tareas con Personal
              </h3>
              <p className="text-sm text-gray-600">
                Agregue las tareas realizadas. Puede agregar varias tareas, cada una con su propio personal.
              </p>

              {/* Lista de tareas agregadas */}
              {tareas.length > 0 && (
                <div className="space-y-2">
                  <Label>Tareas agregadas ({tareas.length})</Label>
                  {tareas.map(tarea => (
                    <Card key={tarea.id} className="bg-green-50 border-green-200">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{getNombreTarea(tarea)}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tarea.miembros.map(m => (
                                <Badge key={m.usuarioId} variant="secondary" className="text-xs">
                                  {getNombreUsuario(m.usuarioId)}: {m.horas}h
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-green-700 mt-1">
                              Total: {tarea.miembros.reduce((s, m) => s + m.horas, 0)}h
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => editarTarea(tarea)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => eliminarTarea(tarea.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Formulario para agregar/editar tarea */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {editandoTareaId ? 'Editar Tarea' : 'Agregar Nueva Tarea'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Seleccionar tarea o nombre extra */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tarea del Cronograma</Label>
                      <Select
                        value={tareaForm.proyectoTareaId || ''}
                        onValueChange={(v) => setTareaForm(prev => ({
                          ...prev,
                          proyectoTareaId: v || null,
                          nombreTareaExtra: v ? '' : prev.nombreTareaExtra
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Ninguna --</SelectItem>
                          {tareasDisponibles.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.proyectoActividad ? `${t.proyectoActividad.nombre} > ` : ''}{t.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>O Tarea Extra</Label>
                      <Input
                        placeholder="Nombre de tarea extra..."
                        value={tareaForm.nombreTareaExtra}
                        onChange={(e) => setTareaForm(prev => ({
                          ...prev,
                          nombreTareaExtra: e.target.value,
                          proyectoTareaId: e.target.value ? null : prev.proyectoTareaId
                        }))}
                        disabled={!!tareaForm.proyectoTareaId}
                      />
                    </div>
                  </div>

                  {/* Seleccionar personal */}
                  <div>
                    <Label>Personal para esta tarea</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-[150px] overflow-y-auto p-2 border rounded-md">
                      {personal.map(p => (
                        <div
                          key={p.userId}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                            tareaForm.miembrosSeleccionados.includes(p.userId)
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleToggleMiembro(p.userId)}
                        >
                          <Checkbox
                            checked={tareaForm.miembrosSeleccionados.includes(p.userId)}
                            onCheckedChange={() => handleToggleMiembro(p.userId)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.user.name || p.user.email}</p>
                            <p className="text-xs text-gray-500">{p.rol}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Horas por miembro */}
                  {tareaForm.miembrosSeleccionados.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Horas por persona</Label>
                        <div className="flex items-center gap-2">
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
                            className="w-20"
                          />
                          <Button variant="outline" size="sm" onClick={aplicarHorasATodos}>
                            Aplicar a todos
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 max-h-[120px] overflow-y-auto">
                        {tareaForm.miembrosSeleccionados.map(userId => (
                          <div key={userId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="flex-1 text-sm">{getNombreUsuario(userId)}</span>
                            <Input
                              type="number"
                              min={0.5}
                              max={24}
                              step={0.5}
                              value={tareaForm.horasPorMiembro[userId] || tareaForm.horasBase}
                              onChange={(e) => handleHorasChange(userId, parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                            <span className="text-sm text-gray-500">h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={guardarTarea}
                    className="w-full"
                    disabled={!tareaForm.proyectoTareaId && !tareaForm.nombreTareaExtra.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editandoTareaId ? 'Actualizar Tarea' : 'Agregar Tarea'}
                  </Button>

                  {editandoTareaId && (
                    <Button variant="outline" onClick={resetTareaForm} className="w-full">
                      Cancelar Edición
                    </Button>
                  )}
                </CardContent>
              </Card>
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
                  {tareas.map(tarea => (
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
                    {tareas.map(tarea => (
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
