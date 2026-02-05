'use client'

/**
 * RegistroCampoWizard - Wizard para registrar horas de campo (cuadrilla)
 *
 * Pasos:
 * 1. Seleccionar Proyecto
 * 2. Seleccionar EDT y Tarea (opcional)
 * 3. Seleccionar Cuadrilla (múltiples personas)
 * 4. Definir Fecha, Horas y Ajustes por persona
 * 5. Confirmar y Enviar
 */

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Building,
  FolderOpen,
  Users,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  User,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SeleccionCuadrilla } from './SeleccionCuadrilla'
import type { MiembroCuadrilla } from '@/types/registroCampo'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface EdtProyecto {
  id: string
  nombre: string
  tareas?: { id: string; nombre: string }[]
}

interface RegistroCampoWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  fechaInicial?: string
}

interface MiembroConInfo extends MiembroCuadrilla {
  nombre: string
  email: string
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
  const [usuarios, setUsuarios] = useState<Record<string, { name: string; email: string }>>({})

  // Estado del formulario
  const [proyectoId, setProyectoId] = useState<string>('')
  const [proyectoEdtId, setProyectoEdtId] = useState<string>('')
  const [proyectoTareaId, setProyectoTareaId] = useState<string>('')
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState<string[]>([])
  const [miembrosConHoras, setMiembrosConHoras] = useState<MiembroConInfo[]>([])
  const [fechaTrabajo, setFechaTrabajo] = useState(fechaInicial || new Date().toISOString().split('T')[0])
  const [horasBase, setHorasBase] = useState(8)
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setPaso(1)
      setProyectoId('')
      setProyectoEdtId('')
      setProyectoTareaId('')
      setMiembrosSeleccionados([])
      setMiembrosConHoras([])
      setFechaTrabajo(fechaInicial || new Date().toISOString().split('T')[0])
      setHorasBase(8)
      setDescripcion('')
      setUbicacion('')
      cargarProyectos()
    }
  }, [open, fechaInicial])

  // Cargar EDTs cuando cambia el proyecto
  useEffect(() => {
    if (proyectoId) {
      cargarEdts()
    } else {
      setEdts([])
      setProyectoEdtId('')
      setProyectoTareaId('')
    }
  }, [proyectoId])

  // Actualizar miembros con horas cuando cambian los seleccionados
  useEffect(() => {
    const nuevosConHoras = miembrosSeleccionados.map(userId => {
      const existente = miembrosConHoras.find(m => m.usuarioId === userId)
      const info = usuarios[userId] || { name: 'Usuario', email: '' }
      return {
        usuarioId: userId,
        horas: existente?.horas || horasBase,
        observaciones: existente?.observaciones || '',
        nombre: info.name,
        email: info.email
      }
    })
    setMiembrosConHoras(nuevosConHoras)
  }, [miembrosSeleccionados, horasBase])

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
        setEdts(data.edts || [])
      }
    } catch (error) {
      console.error('Error cargando EDTs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar info de usuarios cuando se seleccionan
  const handleMiembrosChange = async (ids: string[]) => {
    setMiembrosSeleccionados(ids)

    // Cargar info de usuarios nuevos
    const nuevosIds = ids.filter(id => !usuarios[id])
    if (nuevosIds.length > 0) {
      try {
        const response = await fetch(`/api/proyecto/${proyectoId}/personal`)
        if (response.ok) {
          const data = await response.json()
          const personalDinamico = data.data?.personalDinamico || []
          const rolesFijos = data.data?.rolesFijos || {}

          const nuevosUsuarios: Record<string, { name: string; email: string }> = {}

          personalDinamico.forEach((p: any) => {
            nuevosUsuarios[p.userId] = {
              name: p.user.name || p.user.email,
              email: p.user.email
            }
          })

          Object.values(rolesFijos).forEach((u: any) => {
            if (u?.id) {
              nuevosUsuarios[u.id] = {
                name: u.name || u.email,
                email: u.email
              }
            }
          })

          setUsuarios(prev => ({ ...prev, ...nuevosUsuarios }))
        }
      } catch (error) {
        console.error('Error cargando usuarios:', error)
      }
    }
  }

  const handleHorasChange = (userId: string, horas: number) => {
    setMiembrosConHoras(prev =>
      prev.map(m => m.usuarioId === userId ? { ...m, horas } : m)
    )
  }

  const handleObservacionesChange = (userId: string, observaciones: string) => {
    setMiembrosConHoras(prev =>
      prev.map(m => m.usuarioId === userId ? { ...m, observaciones } : m)
    )
  }

  const aplicarHorasATodos = () => {
    setMiembrosConHoras(prev =>
      prev.map(m => ({ ...m, horas: horasBase }))
    )
  }

  const handleSubmit = async () => {
    if (miembrosConHoras.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un miembro',
        variant: 'destructive'
      })
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        proyectoId,
        proyectoEdtId: proyectoEdtId || undefined,
        proyectoTareaId: proyectoTareaId || undefined,
        fechaTrabajo,
        horasBase,
        descripcion: descripcion || undefined,
        ubicacion: ubicacion || undefined,
        miembros: miembrosConHoras.map(m => ({
          usuarioId: m.usuarioId,
          horas: m.horas,
          observaciones: m.observaciones || undefined
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
      case 1: return !!proyectoId
      case 2: return true // EDT es opcional
      case 3: return miembrosSeleccionados.length > 0
      case 4: return fechaTrabajo && horasBase > 0 && miembrosConHoras.every(m => m.horas > 0)
      default: return true
    }
  }

  const proyectoSeleccionado = proyectos.find(p => p.id === proyectoId)
  const edtSeleccionado = edts.find(e => e.id === proyectoEdtId)
  const tareaSeleccionada = edtSeleccionado?.tareas?.find(t => t.id === proyectoTareaId)
  const totalHoras = miembrosConHoras.reduce((sum, m) => sum + m.horas, 0)

  const pasos = [
    { num: 1, titulo: 'Proyecto', icon: Building },
    { num: 2, titulo: 'EDT/Tarea', icon: FolderOpen },
    { num: 3, titulo: 'Cuadrilla', icon: Users },
    { num: 4, titulo: 'Horas', icon: Clock },
    { num: 5, titulo: 'Confirmar', icon: CheckCircle }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <Progress value={(paso / 5) * 100} className="h-2" />
        </div>

        {/* Resumen de selecciones */}
        {(proyectoSeleccionado || miembrosSeleccionados.length > 0) && (
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
                {tareaSeleccionada && (
                  <Badge variant="outline" className="bg-white">
                    {tareaSeleccionada.nombre}
                  </Badge>
                )}
                {miembrosSeleccionados.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    <Users className="h-3 w-3 mr-1" />
                    {miembrosSeleccionados.length} personas
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contenido del paso */}
        <div className="min-h-[300px]">
          {/* Paso 1: Seleccionar Proyecto */}
          {paso === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Paso 1: Seleccionar Proyecto
              </h3>
              <p className="text-sm text-gray-600">
                Seleccione el proyecto donde se realizó el trabajo de campo.
              </p>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* Paso 2: Seleccionar EDT y Tarea */}
          {paso === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-purple-600" />
                Paso 2: Seleccionar EDT y Tarea (Opcional)
              </h3>
              <p className="text-sm text-gray-600">
                Opcionalmente seleccione el EDT y tarea específica del trabajo.
              </p>

              <div className="space-y-3">
                <div>
                  <Label>EDT</Label>
                  <Select value={proyectoEdtId} onValueChange={(v) => {
                    setProyectoEdtId(v)
                    setProyectoTareaId('')
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin EDT específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin EDT específico</SelectItem>
                      {edts.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {proyectoEdtId && edtSeleccionado?.tareas && edtSeleccionado.tareas.length > 0 && (
                  <div>
                    <Label>Tarea</Label>
                    <Select value={proyectoTareaId} onValueChange={setProyectoTareaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin tarea específica" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin tarea específica</SelectItem>
                        {edtSeleccionado.tareas.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 3: Seleccionar Cuadrilla */}
          {paso === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Paso 3: Seleccionar Cuadrilla
              </h3>
              <p className="text-sm text-gray-600">
                Seleccione las personas que trabajaron en campo.
              </p>
              <SeleccionCuadrilla
                proyectoId={proyectoId}
                seleccionados={miembrosSeleccionados}
                onChange={handleMiembrosChange}
              />
            </div>
          )}

          {/* Paso 4: Definir Horas */}
          {paso === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Paso 4: Definir Fecha y Horas
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de Trabajo</Label>
                  <Input
                    type="date"
                    value={fechaTrabajo}
                    onChange={(e) => setFechaTrabajo(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Horas Base (para todos)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0.5}
                      max={24}
                      step={0.5}
                      value={horasBase}
                      onChange={(e) => setHorasBase(parseFloat(e.target.value) || 0)}
                    />
                    <Button variant="outline" size="sm" onClick={aplicarHorasATodos}>
                      Aplicar a todos
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label>Ubicación (opcional)</Label>
                <Input
                  placeholder="Ej: Obra San Isidro, Mz A Lt 5"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                />
              </div>

              <div>
                <Label>Descripción del trabajo</Label>
                <Textarea
                  placeholder="Describa brevemente el trabajo realizado..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Ajuste de horas por persona */}
              <div>
                <Label className="mb-2 block">Horas por persona</Label>
                <Card>
                  <CardContent className="p-2 max-h-[200px] overflow-y-auto">
                    {miembrosConHoras.map(m => (
                      <div key={m.usuarioId} className="flex items-center gap-3 p-2 border-b last:border-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.nombre}</p>
                          <p className="text-xs text-gray-500 truncate">{m.email}</p>
                        </div>
                        <Input
                          type="number"
                          min={0.5}
                          max={24}
                          step={0.5}
                          value={m.horas}
                          onChange={(e) => handleHorasChange(m.usuarioId, parseFloat(e.target.value) || 0)}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-gray-500">h</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <div className="text-right mt-2 text-sm font-medium">
                  Total: <span className="text-green-600">{totalHoras}h</span> ({miembrosConHoras.length} personas)
                </div>
              </div>
            </div>
          )}

          {/* Paso 5: Confirmar */}
          {paso === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Paso 5: Confirmar Registro
              </h3>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Proyecto:</span>
                      <p className="font-medium">{proyectoSeleccionado?.codigo} - {proyectoSeleccionado?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Fecha:</span>
                      <p className="font-medium">{new Date(fechaTrabajo + 'T12:00:00').toLocaleDateString('es-PE')}</p>
                    </div>
                    {edtSeleccionado && (
                      <div>
                        <span className="text-gray-600">EDT:</span>
                        <p className="font-medium">{edtSeleccionado.nombre}</p>
                      </div>
                    )}
                    {tareaSeleccionada && (
                      <div>
                        <span className="text-gray-600">Tarea:</span>
                        <p className="font-medium">{tareaSeleccionada.nombre}</p>
                      </div>
                    )}
                    {ubicacion && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Ubicación:</span>
                        <p className="font-medium">{ubicacion}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-gray-600 mb-2">Cuadrilla ({miembrosConHoras.length} personas):</p>
                    <div className="flex flex-wrap gap-2">
                      {miembrosConHoras.map(m => (
                        <Badge key={m.usuarioId} variant="secondary" className="bg-white">
                          {m.nombre}: {m.horas}h
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-gray-600">Total de horas:</span>
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

          {paso < 5 ? (
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
