'use client'

/**
 * IniciarJornadaModal - Modal para iniciar una nueva jornada de campo
 *
 * Permite al supervisor definir:
 * - Proyecto y EDT
 * - Fecha de trabajo
 * - Objetivos del día
 * - Personal planificado
 * - Ubicación (opcional)
 */

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
  Play
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

interface PersonalPlanificado {
  userId: string
  nombre: string
}

interface IniciarJornadaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (jornadaId: string) => void
}

export function IniciarJornadaModal({
  open,
  onOpenChange,
  onSuccess
}: IniciarJornadaModalProps) {
  const { toast } = useToast()

  // Estado de carga
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Datos de selección
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [edts, setEdts] = useState<EdtProyecto[]>([])
  const [personal, setPersonal] = useState<PersonalProyecto[]>([])

  // Formulario
  const [proyectoId, setProyectoId] = useState('')
  const [proyectoEdtId, setProyectoEdtId] = useState('')
  const [fechaTrabajo, setFechaTrabajo] = useState(new Date().toISOString().split('T')[0])
  const [objetivosDia, setObjetivosDia] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [personalSeleccionado, setPersonalSeleccionado] = useState<string[]>([])

  // Búsqueda de personal
  const [busquedaPersonal, setBusquedaPersonal] = useState('')

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setProyectoId('')
      setProyectoEdtId('')
      setFechaTrabajo(new Date().toISOString().split('T')[0])
      setObjetivosDia('')
      setUbicacion('')
      setPersonalSeleccionado([])
      setBusquedaPersonal('')
      cargarProyectos()
    }
  }, [open])

  // Cargar EDTs y personal cuando cambia el proyecto
  useEffect(() => {
    if (proyectoId) {
      cargarEdts()
      cargarPersonal()
    } else {
      setEdts([])
      setPersonal([])
      setProyectoEdtId('')
      setPersonalSeleccionado([])
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

        // Eliminar duplicados por nombre de EDT (mantener solo el primero de cada nombre)
        const nombresVistos = new Set<string>()
        const edtsUnicos = allEdts.filter((edt: { nombre: string }) => {
          if (nombresVistos.has(edt.nombre)) {
            return false
          }
          nombresVistos.add(edt.nombre)
          return true
        })

        setEdts(edtsUnicos)
      }
    } catch (error) {
      console.error('Error cargando EDTs:', error)
    }
  }

  const cargarPersonal = async () => {
    try {
      const response = await fetch(`/api/proyecto/${proyectoId}/personal`)
      if (response.ok) {
        const data = await response.json()
        // Combinar roles fijos y dinámicos
        const personalDinamico = data.data?.personalDinamico || []
        const rolesFijos = data.data?.rolesFijos || {}

        const todoElPersonal: PersonalProyecto[] = []
        const idsAgregados = new Set<string>()

        // Helper para agregar sin duplicados
        const agregarSiNoExiste = (userId: string, rol: string, user: PersonalProyecto['user']) => {
          if (!idsAgregados.has(userId)) {
            idsAgregados.add(userId)
            todoElPersonal.push({ userId, rol, user })
          }
        }

        // Agregar roles fijos (evitando duplicados)
        if (rolesFijos.comercial) {
          agregarSiNoExiste(rolesFijos.comercial.id, 'Comercial', rolesFijos.comercial)
        }
        if (rolesFijos.gestor) {
          agregarSiNoExiste(rolesFijos.gestor.id, 'Gestor', rolesFijos.gestor)
        }
        if (rolesFijos.supervisor) {
          agregarSiNoExiste(rolesFijos.supervisor.id, 'Supervisor', rolesFijos.supervisor)
        }
        if (rolesFijos.lider) {
          agregarSiNoExiste(rolesFijos.lider.id, 'Líder', rolesFijos.lider)
        }

        // Agregar personal dinámico (evitando duplicados)
        for (const p of personalDinamico) {
          if (!idsAgregados.has(p.user.id)) {
            idsAgregados.add(p.user.id)
            todoElPersonal.push({
              userId: p.user.id,
              rol: p.rol,
              user: p.user
            })
          }
        }

        setPersonal(todoElPersonal)
      }
    } catch (error) {
      console.error('Error cargando personal:', error)
    }
  }

  const togglePersonal = (userId: string) => {
    setPersonalSeleccionado(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const seleccionarTodos = () => {
    const personalFiltrado = personal.filter(p =>
      p.user.name?.toLowerCase().includes(busquedaPersonal.toLowerCase()) ||
      p.user.email.toLowerCase().includes(busquedaPersonal.toLowerCase())
    )
    setPersonalSeleccionado(personalFiltrado.map(p => p.userId))
  }

  const deseleccionarTodos = () => {
    setPersonalSeleccionado([])
  }

  const handleSubmit = async () => {
    // Validaciones
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

    // Construir lista de personal planificado
    const personalPlanificado: PersonalPlanificado[] = personalSeleccionado.map(userId => {
      const persona = personal.find(p => p.userId === userId)
      return {
        userId,
        nombre: persona?.user.name || persona?.user.email || 'Sin nombre'
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

  const proyectoSeleccionado = proyectos.find(p => p.id === proyectoId)
  const personalFiltrado = personal.filter(p =>
    p.user.name?.toLowerCase().includes(busquedaPersonal.toLowerCase()) ||
    p.user.email.toLowerCase().includes(busquedaPersonal.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            Iniciar Jornada de Campo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                      {p.codigo} - {p.nombre}
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
                  <SelectValue placeholder="Seleccionar EDT" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[250px]">
                  {edts.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
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
          {proyectoId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Personal planificado * ({personalSeleccionado.length} seleccionados)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={seleccionarTodos}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deseleccionarTodos}
                  >
                    Ninguno
                  </Button>
                </div>
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
                {personal.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No hay personal asignado a este proyecto
                  </div>
                ) : personalFiltrado.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No se encontró personal con ese nombre
                  </div>
                ) : (
                  <div className="divide-y">
                    {personalFiltrado.map(p => (
                      <label
                        key={p.userId}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={personalSeleccionado.includes(p.userId)}
                          onCheckedChange={() => togglePersonal(p.userId)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {p.user.name || p.user.email}
                          </div>
                          <div className="text-xs text-gray-500">{p.rol}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Personas seleccionadas */}
              {personalSeleccionado.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {personalSeleccionado.slice(0, 5).map(userId => {
                    const persona = personal.find(p => p.userId === userId)
                    return (
                      <Badge key={userId} variant="secondary" className="text-xs">
                        {persona?.user.name?.split(' ')[0] || 'Usuario'}
                      </Badge>
                    )
                  })}
                  {personalSeleccionado.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{personalSeleccionado.length - 5} más
                    </Badge>
                  )}
                </div>
              )}
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
              disabled={submitting || !proyectoId || !objetivosDia || personalSeleccionado.length === 0}
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
