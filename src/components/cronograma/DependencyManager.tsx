'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

// Tipos de dependencia con descripciones
const TIPOS_DEPENDENCIA = {
  finish_to_start: {
    label: 'Termina-Inicia (FS)',
    descripcion: 'La tarea destino inicia cuando la tarea origen termina',
    icon: '→'
  },
  start_to_start: {
    label: 'Inicia-Inicia (SS)',
    descripcion: 'La tarea destino inicia cuando la tarea origen inicia',
    icon: '⇄'
  },
  finish_to_finish: {
    label: 'Termina-Termina (FF)',
    descripcion: 'La tarea destino termina cuando la tarea origen termina',
    icon: '⇥'
  },
  start_to_finish: {
    label: 'Inicia-Termina (SF)',
    descripcion: 'La tarea destino termina cuando la tarea origen inicia',
    icon: '⇤'
  }
}

interface Tarea {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  esHito?: boolean
}

interface Dependencia {
  id: string
  tareaOrigen: Tarea
  tareaDependiente: Tarea
  tipo: keyof typeof TIPOS_DEPENDENCIA
  lagMinutos: number
}

interface DependencyManagerProps {
  cotizacionId: string
  tareas: Tarea[]
}

export function DependencyManager({ cotizacionId, tareas: tareasPadre }: DependencyManagerProps) {
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dependenciaToDelete, setDependenciaToDelete] = useState<string | null>(null)
  const [tareaOrigenId, setTareaOrigenId] = useState('')
  const [tareaDependienteId, setTareaDependienteId] = useState('')
  const [tipo, setTipo] = useState<keyof typeof TIPOS_DEPENDENCIA>('finish_to_start')
  const [lagMinutos, setLagMinutos] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tareasDisponibles, setTareasDisponibles] = useState<any[]>([])
  const { toast } = useToast()

  // Cargar tareas disponibles desde la API (con fechas correctas)
  useEffect(() => {
    const cargarTareasDisponibles = async () => {
      console.log('🎯 DEPENDENCY MANAGER - CARGANDO TAREAS DESDE API')
      console.log('🎯 PADRE TIENE:', tareasPadre.length, 'tareas')

      try {
        console.log('🎯 HACIENDO FETCH A API...')
        const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tareas-disponibles`, {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          console.log('🎯 API OK - RECIBIDOS:', data.data?.length, 'registros')

          // Mantener el formato jerárquico del padre pero con fechas de la API
          const tareasConFechas = tareasPadre.map(tareaPadre => {
            const tareaApi = data.data?.find((t: any) => t.nombre === tareaPadre.nombre)
            const encontrado = !!tareaApi
            console.log(`🎯 ${encontrado ? '✅' : '❌'} ${tareaPadre.nombre}`)
            return {
              ...tareaPadre,
              fechaInicio: tareaApi?.fechaInicio || tareaPadre.fechaInicio,
              fechaFin: tareaApi?.fechaFin || tareaPadre.fechaFin
            }
          })

          console.log('🎯 RESULTADO FINAL:', tareasConFechas.length, 'tareas con formato jerárquico + fechas')
          console.log('🎯 EJEMPLOS:')
          tareasConFechas.slice(0, 3).forEach((t, i) => {
            console.log(`  ${i+1}. ${t.nombre} -> ${t.fechaInicio ? 'CON FECHA' : 'SIN FECHA'}`)
          })

          setTareasDisponibles(tareasConFechas)
        } else {
          console.error('🎯 API ERROR - STATUS:', response.status)
        }
      } catch (error) {
        console.error('🎯 ERROR FETCH:', error)
        // Fallback: usar tareas del padre
        setTareasDisponibles(tareasPadre)
      }
    }

    if (tareasPadre.length > 0) {
      cargarTareasDisponibles()
    } else {
      console.log('🎯 ESPERANDO TAREAS DEL PADRE...')
    }
  }, [cotizacionId, tareasPadre])

  // Cargar dependencias existentes
  useEffect(() => {
    cargarDependencias()
  }, [cotizacionId])

  const cargarDependencias = async () => {
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/dependencias`)
      if (response.ok) {
        const data = await response.json()
        setDependencias(data.data || [])
      }
    } catch (error) {
      console.error('Error cargando dependencias:', error)
    }
  }

  const crearDependencia = async () => {

    if (!tareaOrigenId || !tareaDependienteId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar ambas tareas',
        variant: 'destructive'
      })
      return
    }

    if (tareaOrigenId === tareaDependienteId) {
      toast({
        title: 'Error',
        description: 'No puede crear una dependencia de una tarea consigo misma',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/dependencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareaOrigenId,
          tareaDependienteId,
          tipo,
          lagMinutos
        })
      })

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Dependencia creada correctamente'
        })
        setShowCreateForm(false)
        setTareaOrigenId('')
        setTareaDependienteId('')
        setLagMinutos(0)
        cargarDependencias()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Error al crear dependencia',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (dependenciaId: string) => {
    setDependenciaToDelete(dependenciaId)
    setShowDeleteDialog(true)
  }

  const eliminarDependencia = async () => {
    if (!dependenciaToDelete) return

    setLoading(true)
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/dependencias/${dependenciaToDelete}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Dependencia eliminada correctamente'
        })
        cargarDependencias()
        setShowDeleteDialog(false)
        setDependenciaToDelete(null)
      } else {
        toast({
          title: 'Error',
          description: 'Error al eliminar dependencia',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getTareaDisplayName = (tarea: Tarea) => {
    if (!tarea.fechaInicio || !tarea.fechaFin) {
      return `${tarea.nombre} (Sin fechas asignadas)${tarea.esHito ? ' 🎯' : ''}`
    }

    try {
      // Las fechas vienen como strings ISO desde la API
      const fechaInicioObj = new Date(tarea.fechaInicio)
      const fechaFinObj = new Date(tarea.fechaFin)

      const fechaInicio = fechaInicioObj.toLocaleDateString('es-ES')
      const fechaFin = fechaFinObj.toLocaleDateString('es-ES')
      return `${tarea.nombre} (${fechaInicio} - ${fechaFin})${tarea.esHito ? ' 🎯' : ''}`
    } catch (error) {
      return `${tarea.nombre} (Error en fechas)${tarea.esHito ? ' 🎯' : ''}`
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRight className="w-4 h-4 mr-2" />
          Gestionar Dependencias ({dependencias.length})
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Dependencias Avanzadas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de dependencias existentes */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Dependencias Existentes</h3>
              <Button
                onClick={() => setShowCreateForm(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Dependencia
              </Button>
            </div>

            {dependencias.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ArrowRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay dependencias configuradas</p>
                <p className="text-sm">Las tareas se ejecutan secuencialmente por defecto</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dependencias.map((dep) => (
                  <Card key={dep.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Tarea origen */}
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {getTareaDisplayName(dep.tareaOrigen)}
                            </Badge>
                          </div>

                          {/* Tipo de dependencia */}
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-blue-600">
                              {TIPOS_DEPENDENCIA[dep.tipo].icon}
                            </span>
                            <Badge variant="secondary">
                              {TIPOS_DEPENDENCIA[dep.tipo].label}
                            </Badge>
                            {dep.lagMinutos > 0 && (
                              <Badge variant="outline">
                                +{dep.lagMinutos}min
                              </Badge>
                            )}
                          </div>

                          {/* Tarea destino */}
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {getTareaDisplayName(dep.tareaDependiente)}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleDeleteClick(dep.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="mt-2 text-sm text-gray-600">
                        {TIPOS_DEPENDENCIA[dep.tipo].descripcion}
                        {dep.lagMinutos > 0 && ` (con ${dep.lagMinutos} minutos de retraso)`}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Formulario de creación */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Crear Nueva Dependencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tarea-origen">Tarea Origen (Predecesora)</Label>
                    <Select value={tareaOrigenId} onValueChange={setTareaOrigenId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tarea origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {tareasDisponibles.map((tarea) => (
                          <SelectItem key={tarea.id} value={tarea.id}>
                            {getTareaDisplayName(tarea)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tarea-dependiente">Tarea Destino (Sucesora)</Label>
                    <Select value={tareaDependienteId} onValueChange={setTareaDependienteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tarea destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {tareasDisponibles.map((tarea) => (
                          <SelectItem key={tarea.id} value={tarea.id}>
                            {getTareaDisplayName(tarea)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tipo">Tipo de Dependencia</Label>
                    <Select value={tipo} onValueChange={(value: keyof typeof TIPOS_DEPENDENCIA) => setTipo(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPOS_DEPENDENCIA).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            <div>
                              <div className="font-medium">{info.label}</div>
                              <div className="text-xs text-gray-500">{info.descripcion}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="lag">Retraso (minutos)</Label>
                    <Input
                      id="lag"
                      type="number"
                      value={lagMinutos}
                      onChange={(e) => setLagMinutos(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tiempo adicional entre tareas (0 = sin retraso)
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    onClick={() => setShowCreateForm(false)}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                  <Button onClick={crearDependencia} disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Dependencia'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información de ayuda */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Información Importante</h4>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>• Las dependencias se aplican automáticamente al generar o actualizar el cronograma</li>
                    <li>• El sistema previene la creación de ciclos que causarían dependencias circulares</li>
                    <li>• Las dependencias se exportan automáticamente al XML de MS Project</li>
                    <li>• Los hitos (tareas con duración 0) se identifican automáticamente</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>

      {/* Modal de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar esta dependencia? Esta acción eliminará permanentemente la relación entre las tareas y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarDependencia}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Eliminando...' : 'Eliminar Dependencia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}