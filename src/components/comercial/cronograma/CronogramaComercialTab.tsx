'use client'

/**
 * 📅 CronogramaComercialTab - Componente principal del tab de cronograma
 *
 * Componente principal que gestiona la vista completa del cronograma comercial
 * en las cotizaciones. Incluye lista de EDTs, vista Gantt, métricas y filtros.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Plus, Calendar, BarChart3, Filter, RefreshCw, FolderOpen, Download, Settings, CheckCircle, TreePine, TrendingUp, Clock, Trash2, ArrowRight } from 'lucide-react'
import { DependencyManager } from '../../cronograma/DependencyManager'
import { AutoDependencyGenerator } from '../../cronograma/AutoDependencyGenerator'
import { CotizacionEdtForm } from './CotizacionEdtForm'
import { GenerarCronogramaModal } from './GenerarCronogramaModal'
import { CronogramaTreeView } from '../../cronograma/CronogramaTreeView'
import { CronogramaGanttView } from './CronogramaGanttView'
import { CronogramaGanttViewPro } from './CronogramaGanttViewPro'
import { useToast } from '@/hooks/use-toast'

interface CronogramaComercialTabProps {
  cotizacionId: string
  cotizacionCodigo: string
}

export function CronogramaComercialTab({
  cotizacionId,
  cotizacionCodigo
}: CronogramaComercialTabProps) {
  const [activeTab, setActiveTab] = useState('jerarquia')
  const [showEdtForm, setShowEdtForm] = useState(false)
  const [showImportFasesModal, setShowImportFasesModal] = useState(false)
  const [showGenerarCronogramaModal, setShowGenerarCronogramaModal] = useState(false)
  const [showDeleteCronogramaModal, setShowDeleteCronogramaModal] = useState(false)
  const [fasesToImport, setFasesToImport] = useState<any[]>([])
  const [selectedFases, setSelectedFases] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [cotizacionData, setCotizacionData] = useState<any>(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [calendarios, setCalendarios] = useState<any[]>([])
  const [calendarioLaboralId, setCalendarioLaboralId] = useState('')
  const [cronogramaTareas, setCronogramaTareas] = useState<any[]>([])
  const { toast } = useToast()

  // Cargar datos de la cotización
  useEffect(() => {
    const loadCotizacionData = async () => {
      try {
        const response = await fetch(`/api/cotizacion/${cotizacionId}`)
        if (response.ok) {
          const cotizacion = await response.json()
          if (cotizacion) {
            setCotizacionData(cotizacion)
            setFechaInicio(cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio).toISOString().split('T')[0] : '')
            setFechaFin(cotizacion.fechaFin ? new Date(cotizacion.fechaFin).toISOString().split('T')[0] : '')
            setCalendarioLaboralId(cotizacion.calendarioLaboralId || '')
          }
        } else {
          console.error('Error al obtener cotización por ID:', response.status, response.statusText)
          toast({
            title: 'Error de conexión',
            description: 'No se pudo cargar la información de la cotización. Verifica tu conexión.',
            variant: 'destructive'
          })
        }
      } catch (error) {
        console.error('Error loading cotizacion data:', error)
        toast({
          title: 'Error',
          description: 'Error al cargar los datos de la cotización.',
          variant: 'destructive'
        })
      }
    }
    loadCotizacionData()
  }, [cotizacionId])

  // Cargar tareas del cronograma al montar el componente
  useEffect(() => {
    loadCronogramaTareas()
  }, [cotizacionId])

  // Cargar calendarios laborales
  useEffect(() => {
    const loadCalendarios = async () => {
      try {
        const response = await fetch('/api/configuracion/calendario-laboral')
        if (response.ok) {
          const data = await response.json()
          setCalendarios(data.data || [])
        }
      } catch (error) {
        console.error('Error loading calendars:', error)
      }
    }
    loadCalendarios()
  }, [])

  // Función para refrescar datos
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    loadCronogramaTareas() // Recargar tareas cuando se refresca
    toast({
      title: 'Datos actualizados',
      description: 'El cronograma ha sido actualizado correctamente.'
    })
  }

  // Función para cargar tareas del cronograma organizadas jerárquicamente
  const loadCronogramaTareas = async () => {
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tareas-disponibles`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        // Organizar tareas por jerarquía: EDT > Actividad > Tarea
        const tareasOrganizadas = organizeTareasByHierarchy(data.data || [])
        setCronogramaTareas(tareasOrganizadas)
      }
    } catch (error) {
      console.error('Error cargando tareas del cronograma:', error)
    }
  }

  // Función para organizar tareas por jerarquía
  const organizeTareasByHierarchy = (tareasRaw: any[]) => {
    const tareasMap = new Map()

    tareasRaw.forEach(tarea => {
      const hierarchyKey = `${tarea.edtNombre || 'Sin EDT'} > ${tarea.actividadNombre || 'Sin Actividad'} > ${tarea.nombre}`
      tareasMap.set(tarea.id, {
        id: tarea.id,
        nombre: hierarchyKey,
        fechaInicio: tarea.fechaInicio,
        fechaFin: tarea.fechaFin,
        esHito: tarea.esHito || false,
        // Información adicional para contexto
        edtNombre: tarea.edtNombre,
        actividadNombre: tarea.actividadNombre,
        tareaNombre: tarea.nombre
      })
    })

    return Array.from(tareasMap.values())
  }

  // Función para guardar fecha de inicio de línea base
  const handleSaveFechas = async () => {
    try {
      setIsLoading(true)
      const requestData = {
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null
        // fechaFin se calcula automáticamente según los elementos hijos
      }

      const response = await fetch(`/api/cotizacion/${cotizacionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error('Error al guardar fecha de inicio')
      }

      toast({
        title: 'Fecha guardada',
        description: 'La fecha de inicio del cronograma ha sido actualizada.'
      })

      // Actualizar datos locales
      setCotizacionData((prev: any) => ({
        ...prev,
        fechaInicio: requestData.fechaInicio
      }))

    } catch (error) {
      console.error('Error saving fecha:', error)
      toast({
        title: 'Error',
        description: 'No se pudo guardar la fecha de inicio.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para guardar calendario laboral
  const handleSaveCalendario = async () => {
    try {
      setIsLoading(true)
      const requestData = {
        calendarioLaboralId: calendarioLaboralId || null
      }

      const response = await fetch(`/api/cotizacion/${cotizacionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error('Error al guardar calendario')
      }

      toast({
        title: 'Calendario guardado',
        description: 'El calendario laboral ha sido actualizado.'
      })

      // Actualizar datos locales
      setCotizacionData((prev: any) => ({
        ...prev,
        calendarioLaboralId: requestData.calendarioLaboralId
      }))

    } catch (error) {
      console.error('Error saving calendario:', error)
      toast({
        title: 'Error',
        description: 'No se pudo guardar el calendario laboral.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para crear nuevo EDT
  const handleCreateEdt = () => {
    setShowEdtForm(true)
  }


  // Función para abrir modal de generación de cronograma
  const handleOpenGenerarCronogramaModal = () => {
    setShowGenerarCronogramaModal(true)
  }

  // Función para abrir modal de eliminación de cronograma
  const handleOpenDeleteCronogramaModal = () => {
    setShowDeleteCronogramaModal(true)
  }

  // Función para eliminar todo el cronograma
  const handleDeleteCronograma = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/eliminar`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error eliminando cronograma')
      }

      const result = await response.json()

      setShowDeleteCronogramaModal(false)
      handleRefresh()
      toast({
        title: 'Cronograma eliminado',
        description: `Se eliminaron ${result.data.totalEliminados} elementos del cronograma.`,
        variant: 'destructive'
      })

    } catch (error) {
      console.error('Error eliminando cronograma:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el cronograma.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función después de crear EDT
  const handleEdtCreated = () => {
    setShowEdtForm(false)
    handleRefresh()
    toast({
      title: 'EDT creado',
      description: 'El EDT comercial ha sido creado exitosamente.'
    })
  }

  // Función para abrir modal de importación de fases
  const handleOpenImportFasesModal = async () => {
    try {
      // Primero verificar si ya existen fases en esta cotización
      const existingFasesResponse = await fetch(`/api/cotizacion/${cotizacionId}/fases`, {
        credentials: 'include'
      })

      if (existingFasesResponse.ok) {
        const existingFasesResult = await existingFasesResponse.json()
        if (existingFasesResult.success && existingFasesResult.data && existingFasesResult.data.length > 0) {
          toast({
            title: 'Fases ya existen',
            description: `Esta cotización ya tiene ${existingFasesResult.data.length} fases. Ve a la pestaña "Fases" para verlas.`,
            variant: 'default'
          })
          return
        }
      }

      // Obtener fases por defecto desde configuración global
      const response = await fetch('/api/configuracion/fases', {
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: 'Error de autenticación',
            description: 'Debes iniciar sesión para acceder a la configuración.',
            variant: 'destructive'
          })
          return
        }
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success || !result.data || result.data.length === 0) {
        toast({
          title: 'Error',
          description: 'No hay fases por defecto configuradas. Ve a Configuración > Fases por Defecto para crearlas.',
          variant: 'destructive'
        })
        return
      }

      setFasesToImport(result.data)
      setSelectedFases(new Set(result.data.map((f: any) => f.id)))
      setShowImportFasesModal(true)
    } catch (error) {
      console.error('Error cargando fases:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión. Inténtalo de nuevo.',
        variant: 'destructive'
      })
    }
  }

  // Función para importar fases seleccionadas con cálculo de fechas
  const handleImportFases = async () => {
    try {
      setIsLoading(true)
      const fasesSeleccionadas = fasesToImport.filter(f => selectedFases.has(f.id))

      if (fasesSeleccionadas.length === 0) {
        toast({
          title: 'Selección requerida',
          description: 'Debes seleccionar al menos una fase para importar.',
          variant: 'destructive'
        })
        return
      }

      // ✅ Verificar que existe fecha de inicio configurada
      if (!cotizacionData?.fechaInicio) {
        toast({
          title: 'Fecha de inicio requerida',
          description: 'Debes configurar la fecha de inicio del proyecto en la pestaña "Configuración" antes de importar fases.',
          variant: 'destructive'
        })
        setActiveTab('configuracion')
        setShowImportFasesModal(false)
        return
      }

      // ✅ Ordenar fases por orden para cálculo secuencial de fechas
      const fasesOrdenadas = fasesSeleccionadas.sort((a, b) => a.orden - b.orden)

      let successCount = 0
      let errorCount = 0
      let fechaActual = new Date(cotizacionData.fechaInicio)
      let fechaFinProyecto = new Date(cotizacionData.fechaInicio)

      console.log(`📅 IMPORTACIÓN FASES - Fecha inicio proyecto: ${fechaActual.toISOString().split('T')[0]}`)

      for (const fase of fasesOrdenadas) {
        try {
          // ✅ Calcular fechas de la fase
          const fechaInicioFase = new Date(fechaActual)
          const fechaFinFase = new Date(fechaInicioFase)
          fechaFinFase.setDate(fechaInicioFase.getDate() + (fase.duracionDias || 0))

          console.log(`📅 IMPORTACIÓN FASES - Fase "${fase.nombre}": ${fechaInicioFase.toISOString().split('T')[0]} - ${fechaFinFase.toISOString().split('T')[0]}`)

          const createResponse = await fetch(`/api/cotizacion/${cotizacionId}/fases`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              nombre: fase.nombre,
              descripcion: fase.descripcion,
              orden: fase.orden,
              fechaInicioPlan: fechaInicioFase.toISOString(),
              fechaFinPlan: fechaFinFase.toISOString()
            })
          })

          if (createResponse.ok) {
            successCount++
            // ✅ Actualizar fecha para siguiente fase (con 1 día de buffer)
            fechaActual = new Date(fechaFinFase)
            fechaActual.setDate(fechaActual.getDate() + 1)

            // ✅ Actualizar fecha fin del proyecto
            if (fechaFinFase > fechaFinProyecto) {
              fechaFinProyecto = new Date(fechaFinFase)
            }
          } else {
            const errorText = await createResponse.text()
            console.error(`Error creando fase ${fase.nombre}:`, errorText)
            errorCount++
          }
        } catch (createError) {
          console.error(`Error creando fase ${fase.nombre}:`, createError)
          errorCount++
        }
      }

      // ✅ Actualizar fechaFin de la cotización
      if (successCount > 0) {
        try {
          console.log(`📅 IMPORTACIÓN FASES - Actualizando fecha fin proyecto: ${fechaFinProyecto.toISOString().split('T')[0]}`)
          await fetch(`/api/cotizacion/${cotizacionId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fechaFin: fechaFinProyecto.toISOString()
            })
          })

          // ✅ Actualizar estado local
          setCotizacionData((prev: any) => ({
            ...prev,
            fechaFin: fechaFinProyecto.toISOString()
          }))
          setFechaFin(fechaFinProyecto.toISOString().split('T')[0])

        } catch (updateError) {
          console.error('Error actualizando fecha fin del proyecto:', updateError)
          // No es error crítico, continuar
        }
      }

      if (successCount > 0) {
        handleRefresh()
        setShowImportFasesModal(false)
        setActiveTab('fases') // Cambiar a la pestaña de fases
        toast({
          title: 'Fases importadas exitosamente',
          description: `Se importaron ${successCount} fases con fechas calculadas${errorCount > 0 ? ` (${errorCount} errores)` : ''}.`,
        })
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron importar las fases. Verifica la configuración y permisos.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error importando fases:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión. Inténtalo de nuevo.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header del Tab */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cronograma Jerárquico Unificado
          </h2>
          <p className="text-muted-foreground">
            Vista de árbol completa: Gestiona toda la jerarquía de 5 niveles en un solo lugar para {cotizacionCodigo}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <DependencyManager
            cotizacionId={cotizacionId}
            tareas={cronogramaTareas}
          />


          <AutoDependencyGenerator
            cotizacionId={cotizacionId}
            tareas={[]}
            onDependenciesGenerated={(dependencies) => {
              console.log('Dependencias generadas automáticamente:', dependencies)
              handleRefresh()
              toast({
                title: 'Dependencias generadas',
                description: `Se generaron ${dependencies.length} dependencias automáticamente`
              })
            }}
          />



          <Button
            variant="destructive"
            onClick={handleOpenDeleteCronogramaModal}
            size="sm"
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Todo el Cronograma
          </Button>

        </div>
      </div>

      {/* Modal de creación de EDT */}
      {showEdtForm && (
        <CotizacionEdtForm
          cotizacionId={cotizacionId}
          onSuccess={handleEdtCreated}
          onCancel={() => setShowEdtForm(false)}
        />
      )}

      {/* Modal de generación de cronograma */}
      <GenerarCronogramaModal
        cotizacionId={cotizacionId}
        isOpen={showGenerarCronogramaModal}
        onClose={() => setShowGenerarCronogramaModal(false)}
        onSuccess={(result) => {
          setShowGenerarCronogramaModal(false)
          handleRefresh()
          toast({
            title: 'Cronograma generado exitosamente',
            description: `Se generaron ${result.totalElements} elementos del cronograma.`,
          })
        }}
      />


      {/* Modal de confirmación para eliminar cronograma */}
      <Dialog open={showDeleteCronogramaModal} onOpenChange={setShowDeleteCronogramaModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Eliminar Todo el Cronograma
            </DialogTitle>
            <DialogDescription className="text-red-700">
              ⚠️ Esta acción es <strong>irreversible</strong> y eliminará permanentemente todos los elementos del cronograma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-3">🗑️ Elementos que serán eliminados:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Todas las fases del proyecto</li>
                <li>• Todos los EDTs (Elementos de Trabajo)</li>
                <li>• Todas las actividades</li>
                <li>• Todas las tareas</li>
                <li>• Todas las dependencias entre tareas</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Importante</h4>
              <p className="text-sm text-yellow-800">
                Una vez eliminados, estos elementos no podrán recuperarse. Si necesitas mantener alguna información,
                considera exportar el cronograma a XML antes de eliminarlo.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Recomendación</h4>
              <p className="text-sm text-blue-800">
                Si deseas regenerar el cronograma, puedes usar la función "Importar Cronograma Automático"
                después de la eliminación.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              ¿Estás completamente seguro de continuar?
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteCronogramaModal(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCronograma}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Todo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de importación de fases */}
      <Dialog open={showImportFasesModal} onOpenChange={setShowImportFasesModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Importar Fases
            </DialogTitle>
            <DialogDescription>
              Selecciona las fases que deseas importar desde la configuración global.
              Las fechas se calcularán automáticamente desde la fecha de inicio del proyecto ({cotizacionData?.fechaInicio ? new Date(cotizacionData.fechaInicio).toLocaleDateString('es-ES') : 'no configurada'}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Vista previa de cálculo de fechas */}
            {cotizacionData?.fechaInicio && selectedFases.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">📅 Vista Previa de Fechas</h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const fasesSeleccionadas = fasesToImport.filter(f => selectedFases.has(f.id)).sort((a, b) => a.orden - b.orden)
                    let fechaActual = new Date(cotizacionData.fechaInicio)
                    return fasesSeleccionadas.map((fase) => {
                      const fechaInicioFase = new Date(fechaActual)
                      const fechaFinFase = new Date(fechaInicioFase)
                      fechaFinFase.setDate(fechaInicioFase.getDate() + (fase.duracionDias || 0))

                      const resultado = (
                        <div key={`preview-${fase.id}`} className="flex justify-between items-center">
                          <span className="font-medium">{fase.nombre}</span>
                          <span className="text-blue-700">
                            {fechaInicioFase.toLocaleDateString('es-ES')} - {fechaFinFase.toLocaleDateString('es-ES')}
                            <span className="text-blue-500 ml-2">({fase.duracionDias || 0} días)</span>
                          </span>
                        </div>
                      )

                      // Avanzar fecha para siguiente fase
                      fechaActual = new Date(fechaFinFase)
                      fechaActual.setDate(fechaActual.getDate() + 1)

                      return resultado
                    })
                  })()}
                </div>
              </div>
            )}

            <div className="max-h-[300px] overflow-y-auto space-y-3">
              {fasesToImport.map((fase) => (
                <div key={fase.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`fase-${fase.id}`}
                    checked={selectedFases.has(fase.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedFases)
                      if (checked) {
                        newSelected.add(fase.id)
                      } else {
                        newSelected.delete(fase.id)
                      }
                      setSelectedFases(newSelected)
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`fase-${fase.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {fase.nombre}
                    </Label>
                    {fase.descripcion && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {fase.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Orden: {fase.orden}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Duración: {fase.duracionDias || 0} días
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedFases.size} de {fasesToImport.length} fases seleccionadas
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowImportFasesModal(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImportFases}
                  disabled={isLoading || selectedFases.size === 0}
                >
                  {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  <Download className="h-4 w-4 mr-2" />
                  Importar {selectedFases.size > 0 && `(${selectedFases.size})`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contenido principal con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuracion" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="jerarquia" className="flex items-center gap-2">
            <TreePine className="h-4 w-4" />
            Vista Jerárquica
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Vista Gantt
          </TabsTrigger>
          <TabsTrigger value="gantt-pro" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Gantt Profesional
          </TabsTrigger>
        </TabsList>

        {/* Tab de Configuración */}
        <TabsContent value="configuracion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Línea Base del Cronograma
              </CardTitle>
              <CardDescription>
                Establece las fechas de inicio y fin del proyecto antes de crear fases, EDTs y actividades.
                Estas fechas servirán como referencia temporal para todo el cronograma de 5 niveles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha de Inicio del Proyecto *
                  </Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFechaInicio(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Fecha planificada de inicio del proyecto/cotización
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaFin" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha de Fin Estimada
                  </Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={fechaFin}
                    readOnly
                    className="text-lg bg-gray-50 cursor-not-allowed"
                    placeholder="Se calcula automáticamente"
                  />
                  <p className="text-sm text-muted-foreground">
                    Se calcula automáticamente según las fases y EDTs agregados
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {fechaInicio && (
                    <span>
                      Fecha de inicio configurada: {new Date(fechaInicio).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleSaveFechas}
                  disabled={isLoading || !fechaInicio}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Guardar Fecha de Inicio
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 Importante</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• La fecha de inicio será la línea base para todo el cronograma</li>
                  <li>• Las fases, EDTs, zonas, actividades y tareas se calcularán desde esta fecha</li>
                  <li>• La fecha de fin se calcula automáticamente según los elementos agregados</li>
                  <li>• Se recomienda establecer la fecha de inicio antes de importar fases o crear EDTs</li>
                  <li>• Puedes modificar la fecha de inicio en cualquier momento</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Calendario Laboral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Calendario Laboral
              </CardTitle>
              <CardDescription>
                Selecciona el calendario laboral que se utilizará para calcular las fechas del cronograma.
                Los calendarios definen los días laborables, jornadas y feriados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="calendarioLaboral" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Calendario Laboral
                </Label>
                <Select
                  value={calendarioLaboralId}
                  onValueChange={setCalendarioLaboralId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar calendario laboral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Sin calendario (usar predeterminado)</SelectItem>
                    {calendarios.map((calendario) => (
                      <SelectItem key={calendario.id} value={calendario.id}>
                        {calendario.nombre}
                        {calendario.descripcion && ` - ${calendario.descripcion}`}
                        {!calendario.activo && ' (Inactivo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Calendario usado para calcular fechas laborables en cronogramas
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {calendarioLaboralId && calendarioLaboralId !== 'default' ? (
                    <span>
                      Calendario seleccionado: {calendarios.find(c => c.id === calendarioLaboralId)?.nombre || 'Cargando...'}
                    </span>
                  ) : (
                    <span>Usando calendario predeterminado del sistema</span>
                  )}
                </div>
                <Button
                  onClick={handleSaveCalendario}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Guardar Calendario
                </Button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">📅 Información del Calendario</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Los calendarios definen días laborables por semana</li>
                  <li>• Incluyen jornadas laborales (horarios de mañana y tarde)</li>
                  <li>• Consideran feriados y excepciones especiales</li>
                  <li>• Se usan para calcular fechas realistas en cronogramas</li>
                  <li>• Puedes gestionar calendarios desde Configuración  Calendarios Laborales</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Vista Jerárquica */}
        <TabsContent value="jerarquia" className="space-y-4">
          <CronogramaTreeView
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            fechaInicioProyecto={fechaInicio}
          />
        </TabsContent>

        {/* Tab de Vista Gantt */}
        <TabsContent value="gantt" className="space-y-4">
          <CronogramaGanttView
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
          />
        </TabsContent>

        {/* Tab de Gantt Profesional */}
        <TabsContent value="gantt-pro" className="space-y-4">
          <CronogramaGanttViewPro
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
          />
        </TabsContent>
      </Tabs>

      {/* Información adicional */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">🌳 Vista Jerárquica</Badge>
                <span>Gestión unificada de 6 niveles en árbol expandible</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">📊 Fases</Badge>
                <span>Etapas del proyecto desde configuración global</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">🏗️ EDTs</Badge>
                <span>Generados automáticamente por categoría de servicio</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">⚡ Actividades</Badge>
                <span>Desde servicios, ubicadas directamente bajo EDTs</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">🔧 Tareas</Badge>
                <span>Desde items de servicio, generadas automáticamente</span>
              </div>
            </div>
            <div>
              Última actualización: {new Date().toLocaleString('es-ES')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}