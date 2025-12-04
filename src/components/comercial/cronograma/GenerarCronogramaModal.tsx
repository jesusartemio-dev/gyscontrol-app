'use client'

/**
 * 🎯 GenerarCronogramaModal - Modal de configuración para generación de cronograma
 *
 * Modal interactivo que permite al usuario configurar cómo se generará el cronograma,
 * con vista previa de reglas y opciones personalizables.
 *
 * @author Kilo Code - Arquitectura GYS
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Calendar, ArrowRight, Settings, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import DependenciasFlow from './DependenciasFlow'

interface GenerarCronogramaModalProps {
  cotizacionId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: any) => void
}

interface CalendarioLaboral {
  id: string
  nombre: string
  descripcion?: string
  activo: boolean
}

type ModoGeneracion = 'basica' | 'dependencias'

interface OpcionesGeneracion {
  fechaInicio: string
  calendarioId: string
  aplicarDependencias: boolean
  identificarHitos: boolean
  dependenciasPersonalizadas: any[]
}

export function GenerarCronogramaModal({
  cotizacionId,
  isOpen,
  onClose,
  onSuccess
}: GenerarCronogramaModalProps) {
  const [modoGeneracion, setModoGeneracion] = useState<ModoGeneracion>('basica')
  const [opciones, setOpciones] = useState<OpcionesGeneracion>({
    fechaInicio: '',
    calendarioId: '',
    aplicarDependencias: false,
    identificarHitos: false,
    dependenciasPersonalizadas: []
  })
  const [calendarios, setCalendarios] = useState<CalendarioLaboral[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [cotizacionData, setCotizacionData] = useState<any>(null)
  const [tareasDisponibles, setTareasDisponibles] = useState<any[]>([])
  const [dependenciasPersonalizadas, setDependenciasPersonalizadas] = useState<any[]>([])
  const [tareaOrigenSeleccionada, setTareaOrigenSeleccionada] = useState<string>('')
  const [tipoDependenciaSeleccionada, setTipoDependenciaSeleccionada] = useState<string>('finish_to_start')
  const [tareaDestinoSeleccionada, setTareaDestinoSeleccionada] = useState<string>('')
  const { toast } = useToast()

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      cargarDatosIniciales()
    }
  }, [isOpen])

  const cargarDatosIniciales = async () => {
    try {
      // Cargar datos de la cotización
      const cotizacionResponse = await fetch(`/api/cotizacion/${cotizacionId}`)
      if (cotizacionResponse.ok) {
        const cotizacion = await cotizacionResponse.json()
        setCotizacionData(cotizacion)
        setOpciones(prev => ({
          ...prev,
          fechaInicio: cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio).toISOString().split('T')[0] : '',
          calendarioId: cotizacion.calendarioLaboralId || ''
        }))
      }

      // Cargar calendarios laborales
      const calendariosResponse = await fetch('/api/configuracion/calendario-laboral')
      if (calendariosResponse.ok) {
        const calendariosData = await calendariosResponse.json()
        setCalendarios(calendariosData.data || [])
      }

      // Cargar tareas disponibles para el modo dependencias (solo si hay servicios)
      // Nota: Las tareas se cargan después de que se genera el cronograma básico
      // por eso aquí no cargamos nada inicialmente
    } catch (error) {
      console.error('Error cargando datos iniciales:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos iniciales.',
        variant: 'destructive'
      })
    }
  }

  // Vista previa de reglas según selección
  const reglasAplicadas = useMemo(() => {
    const reglas = [
      'GYS-GEN-01: FS+1 obligatorio entre hermanos',
      'GYS-GEN-02: Primer hijo inicia con padre',
      'GYS-GEN-03: Roll-up jerárquico de horas',
      'GYS-GEN-04: Auto-ajuste de fechas padres',
      'GYS-GEN-05: Calendario laboral dinámico',
      'GYS-GEN-15: Roll-up final de fechas',
      'GYS-GEN-16: Consistencia horas padre-hijo',
      'GYS-GEN-18: Re-encadenado temporal automático'
    ]

    if (modoGeneracion === 'dependencias') {
      reglas.push('Dependencias avanzadas definidas por usuario')
      reglas.push('Identificación automática de hitos')
    }

    return reglas
  }, [modoGeneracion])

  // Información contextual según modo
  const informacionModo = useMemo(() => {
    switch (modoGeneracion) {
      case 'basica':
        return {
          titulo: 'Generación Básica',
          descripcion: 'Solo reglas automáticas estándar del sistema GYS',
          color: 'blue'
        }
      case 'dependencias':
        return {
          titulo: 'Con Dependencias Avanzadas',
          descripcion: 'Incluye dependencias definidas por usuario y hitos automáticos',
          color: 'green'
        }
      default:
        return {
          titulo: 'Generación Básica',
          descripcion: 'Solo reglas automáticas estándar',
          color: 'blue'
        }
    }
  }, [modoGeneracion])

  const handleGenerar = async () => {

    // Continuar con la generación normal
    setIsLoading(true)

    try {
      const requestData = {
        modo: modoGeneracion,
        opciones: modoGeneracion === 'dependencias'
          ? {
              ...opciones,
              dependenciasPersonalizadas: dependenciasPersonalizadas
            }
          : undefined
      }

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/generar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error generando cronograma')
      }

      const result = await response.json()

      toast({
        title: 'Cronograma generado',
        description: `Se generaron ${result.data.totalElements} elementos exitosamente.`
      })

      onSuccess(result.data)
      onClose()

    } catch (error) {
      console.error('Error generando cronograma:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar el cronograma.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleModoChange = (nuevoModo: ModoGeneracion) => {
    setModoGeneracion(nuevoModo)

    // Ajustar opciones según modo
    if (nuevoModo === 'dependencias') {
      setOpciones(prev => ({
        ...prev,
        aplicarDependencias: true,
        identificarHitos: true
      }))

      // Cargar tareas disponibles cuando se selecciona modo dependencias
      cargarTareasDisponibles()
    } else if (nuevoModo === 'basica') {
      setOpciones(prev => ({
        ...prev,
        aplicarDependencias: false,
        identificarHitos: false
      }))
    }
  }

  // Verificar si ya existe un cronograma básico generado
  const tieneCronogramaBasico = tareasDisponibles.length > 0

  const cargarTareasDisponibles = async () => {
    try {
      console.log('🔄 Cargando tareas disponibles para cotización:', cotizacionId)
      const tareasResponse = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tareas-disponibles`)
      console.log('📡 Respuesta de API tareas:', tareasResponse.status, tareasResponse.ok)

      if (tareasResponse.ok) {
        const tareasData = await tareasResponse.json()
        console.log('📋 Datos de tareas recibidos:', tareasData)
        console.log('📊 Número de tareas:', tareasData.data?.length || 0)
        setTareasDisponibles(tareasData.data || [])
      } else {
        console.error('❌ Error en respuesta de API:', tareasResponse.status, tareasResponse.statusText)
      }
    } catch (error) {
      console.error('💥 Error cargando tareas disponibles:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configurar Generación de Cronograma
          </DialogTitle>
          <DialogDescription>
            Selecciona cómo quieres generar el cronograma y revisa las reglas que se aplicarán.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selección de Modo */}
          <div>
            <Label className="text-base font-medium mb-4 block">Tipo de Generación</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all ${
                  modoGeneracion === 'basica'
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-blue-300'
                }`}
                onClick={() => handleModoChange('basica')}
              >
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <div className="font-medium text-blue-900">Básica</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Solo reglas automáticas estándar
                  </div>
                  {modoGeneracion === 'basica' && (
                    <Badge className="mt-2 bg-blue-600">Seleccionado</Badge>
                  )}
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  modoGeneracion === 'dependencias'
                    ? 'border-green-500 bg-green-50'
                    : 'hover:border-green-300'
                } ${tareasDisponibles.length === 0 ? 'opacity-60' : ''}`}
                onClick={() => handleModoChange('dependencias')}
              >
                <CardContent className="p-4 text-center">
                  <ArrowRight className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <div className="font-medium text-green-900">Con Dependencias</div>
                  <div className="text-sm text-green-700 mt-1">
                    Incluye dependencias avanzadas
                  </div>
                  {tareasDisponibles.length === 0 && (
                    <div className="text-xs text-orange-600 mt-1">
                      ⚠️ Requiere cronograma básico
                    </div>
                  )}
                  {modoGeneracion === 'dependencias' && (
                    <Badge className="mt-2 bg-green-600">Seleccionado</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Vista Previa de Reglas */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">Reglas que se aplicarán</h3>
              </div>
              <ul className="space-y-2">
                {reglasAplicadas.map((regla, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{regla}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>


          {/* Editor de Dependencias Simple - Solo para modo dependencias con tareas disponibles */}
          {modoGeneracion === 'dependencias' && tareasDisponibles.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Configurar Dependencias</h3>
                </div>
                <div className="mb-4 text-sm text-gray-600">
                  Selecciona tareas para crear dependencias simples. Se aplicarán automáticamente las reglas GYS-GEN.
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Tarea Origen (Predecesora)</Label>
                      <Select value={tareaOrigenSeleccionada} onValueChange={setTareaOrigenSeleccionada}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tarea origen" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            console.log('🔍 Procesando tareas para selector origen:', tareasDisponibles)
                            // Agrupar tareas por EDT y actividad
                            const tareasAgrupadas = tareasDisponibles.reduce((acc, tarea) => {
                              const edtNombre = tarea.cotizacionActividad?.cotizacionEdt?.nombre || tarea.edtNombre || 'Sin EDT'
                              const actividadNombre = tarea.cotizacionActividad?.nombre || tarea.actividadNombre || 'Sin Actividad'

                              if (!acc[edtNombre]) acc[edtNombre] = {}
                              if (!acc[edtNombre][actividadNombre]) acc[edtNombre][actividadNombre] = []

                              acc[edtNombre][actividadNombre].push(tarea)
                              return acc
                            }, {} as Record<string, Record<string, any[]>>)

                            console.log('📂 Tareas agrupadas:', tareasAgrupadas)

                            const elementos = Object.entries(tareasAgrupadas).map(([edtNombre, actividades]) => (
                              <div key={edtNombre}>
                                <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100">
                                  📁 {edtNombre}
                                </div>
                                {Object.entries(actividades as Record<string, any[]>).map(([actividadNombre, tareas]) => (
                                  <div key={actividadNombre}>
                                    <div className="px-4 py-1 text-xs text-gray-600 bg-gray-50">
                                      ├─ {actividadNombre}
                                    </div>
                                    {tareas.map((tarea: any) => (
                                      <SelectItem key={tarea.id} value={tarea.id} className="pl-6">
                                        {tarea.nombre} ({tarea.horasEstimadas}h)
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ))

                            console.log('🎨 Elementos renderizados:', elementos.length)
                            return elementos
                          })()}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Tipo de Dependencia</Label>
                      <Select value={tipoDependenciaSeleccionada} onValueChange={setTipoDependenciaSeleccionada}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="finish_to_start">Termina → Inicia (FS)</SelectItem>
                          <SelectItem value="start_to_start">Inicia → Inicia (SS)</SelectItem>
                          <SelectItem value="finish_to_finish">Termina → Termina (FF)</SelectItem>
                          <SelectItem value="start_to_finish">Inicia → Termina (SF)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Tarea Destino (Sucesora)</Label>
                    <Select value={tareaDestinoSeleccionada} onValueChange={setTareaDestinoSeleccionada}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tarea destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          // Agrupar tareas por EDT y actividad
                          const tareasAgrupadas = tareasDisponibles.reduce((acc, tarea) => {
                            const edtNombre = tarea.cotizacionActividad?.cotizacionEdt?.nombre || tarea.edtNombre || 'Sin EDT'
                            const actividadNombre = tarea.cotizacionActividad?.nombre || tarea.actividadNombre || 'Sin Actividad'

                            if (!acc[edtNombre]) acc[edtNombre] = {}
                            if (!acc[edtNombre][actividadNombre]) acc[edtNombre][actividadNombre] = []

                            acc[edtNombre][actividadNombre].push(tarea)
                            return acc
                          }, {} as Record<string, Record<string, any[]>>)

                          return Object.entries(tareasAgrupadas).map(([edtNombre, actividades]) => (
                            <div key={edtNombre}>
                              <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100">
                                📁 {edtNombre}
                              </div>
                              {Object.entries(actividades as Record<string, any[]>).map(([actividadNombre, tareas]) => (
                                <div key={actividadNombre}>
                                  <div className="px-4 py-1 text-xs text-gray-600 bg-gray-50">
                                    ├─ {actividadNombre}
                                  </div>
                                  {tareas.map((tarea: any) => (
                                    <SelectItem key={tarea.id} value={tarea.id} className="pl-6">
                                      {tarea.nombre} ({tarea.horasEstimadas}h)
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      console.log('🆕 Intentando agregar dependencia...')
                      console.log('📋 Valores seleccionados:', {
                        origen: tareaOrigenSeleccionada,
                        tipo: tipoDependenciaSeleccionada,
                        destino: tareaDestinoSeleccionada
                      })

                      // Validar que se hayan seleccionado tareas
                      if (!tareaOrigenSeleccionada || !tareaDestinoSeleccionada) {
                        toast({
                          title: 'Selección incompleta',
                          description: 'Debes seleccionar una tarea origen y una tarea destino.',
                          variant: 'destructive'
                        })
                        return
                      }

                      // Validar que no sea la misma tarea
                      if (tareaOrigenSeleccionada === tareaDestinoSeleccionada) {
                        toast({
                          title: 'Selección inválida',
                          description: 'La tarea origen y destino no pueden ser la misma.',
                          variant: 'destructive'
                        })
                        return
                      }

                      // Buscar nombres de tareas para mostrar
                      const tareaOrigen = tareasDisponibles.find(t => t.id === tareaOrigenSeleccionada)
                      const tareaDestino = tareasDisponibles.find(t => t.id === tareaDestinoSeleccionada)

                      // Agregar dependencia
                      const nuevaDependencia = {
                        id: Date.now().toString(), // ID temporal
                        tareaOrigenId: tareaOrigenSeleccionada,
                        tareaDependienteId: tareaDestinoSeleccionada,
                        tipo: tipoDependenciaSeleccionada,
                        tareaOrigenNombre: tareaOrigen?.nombre || 'Tarea origen',
                        tareaDestinoNombre: tareaDestino?.nombre || 'Tarea destino'
                      }

                      console.log('✅ Agregando dependencia:', nuevaDependencia)

                      setDependenciasPersonalizadas(prev => [...prev, nuevaDependencia])

                      // Limpiar selectores
                      setTareaOrigenSeleccionada('')
                      setTareaDestinoSeleccionada('')
                      setTipoDependenciaSeleccionada('finish_to_start')

                      toast({
                        title: 'Dependencia agregada',
                        description: `Se agregó dependencia ${tipoDependenciaSeleccionada} entre las tareas.`,
                      })
                    }}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Agregar Dependencia
                  </Button>

                  {dependenciasPersonalizadas.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium mb-2 block">Dependencias Configuradas:</Label>
                      <div className="space-y-2">
                        {dependenciasPersonalizadas.map((dep, index) => (
                          <div key={dep.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">
                              {dep.tareaOrigenNombre} → {dep.tareaDestinoNombre} ({dep.tipo})
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                              onClick={() => {
                                console.log('🗑️ Eliminando dependencia:', dep.id)
                                setDependenciasPersonalizadas(prev =>
                                  prev.filter(d => d.id !== dep.id)
                                )
                                toast({
                                  title: 'Dependencia eliminada',
                                  description: 'La dependencia ha sido removida.',
                                })
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información Contextual */}
          <Card className={`border-${informacionModo.color}-200 bg-${informacionModo.color}-50`}>
            <CardContent className="pt-6">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 text-${informacionModo.color}-600`} />
                {informacionModo.titulo}
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• {informacionModo.descripcion}</li>
                <li>• Las reglas GYS-GEN garantizan secuencialidad automática</li>
                <li>• El calendario laboral respeta días no laborables</li>
                {modoGeneracion === 'basica' && (
                  <>
                    <li>• Genera EDTs, actividades y tareas automáticamente</li>
                    <li>• Ideal para comenzar rápidamente</li>
                  </>
                )}
                {modoGeneracion === 'dependencias' && tareasDisponibles.length === 0 && (
                  <>
                    <li>• ⚠️ <strong>Primero debes generar el cronograma básico (Paso 1)</strong></li>
                    <li>• Una vez generado el básico, podrás configurar dependencias avanzadas</li>
                    <li>• Las dependencias permiten controlar el orden específico de tareas</li>
                  </>
                )}
                {modoGeneracion === 'dependencias' && tareasDisponibles.length > 0 && (
                  <>
                    <li>• ✅ Cronograma básico detectado - puedes configurar dependencias</li>
                    <li>• Selecciona tareas origen y destino para crear dependencias</li>
                    <li>• Elige el tipo de dependencia (FS/SS/FF/SF)</li>
                    <li>• Se aplicarán automáticamente las reglas GYS-GEN</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-2 pt-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerar}
            disabled={isLoading || (modoGeneracion === 'dependencias' && tareasDisponibles.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            <Calendar className="h-4 w-4 mr-2" />
            Generar Cronograma
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}