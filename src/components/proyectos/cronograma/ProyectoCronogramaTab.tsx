'use client'

/**
 * 📅 ProyectoCronogramaTab - Componente principal del tab de cronograma de proyectos
 *
 * Componente principal que gestiona la vista completa del cronograma de proyectos.
 * Incluye lista de EDTs, vista Gantt, métricas y filtros adaptados para proyectos.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar, BarChart3, Filter, RefreshCw, FolderOpen, Settings, MapPin, Wrench, Link, Eye, EyeOff, CheckSquare, TreePine, TrendingUp, Download, Trash2, Clock, CheckCircle, Target, PlayCircle, Wand2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ProyectoFasesList } from '@/components/proyectos/fases/ProyectoFasesList'
import { ProyectoEdtList } from '@/components/proyectos/cronograma/ProyectoEdtList'
import { ProyectoActividadList } from '@/components/proyectos/cronograma/ProyectoActividadList'
import { ProyectoDependenciasVisual } from '@/components/proyectos/cronograma/ProyectoDependenciasVisual'
import { ProyectoCronogramaMetrics } from '@/components/proyectos/cronograma/ProyectoCronogramaMetrics'
import { ProyectoCronogramaFilters, type FilterState } from '@/components/proyectos/cronograma/ProyectoCronogramaFilters'
import { ProyectoCronogramaSelector } from '@/components/proyectos/cronograma/ProyectoCronogramaSelector'
import { ProyectoGanttView } from '@/components/proyectos/cronograma/ProyectoGanttView'
import { ProyectoTareasView } from '@/components/proyectos/cronograma/ProyectoTareasView'
import { ProyectoCronogramaTreeView } from './ProyectoCronogramaTreeView'
import { CronogramaGanttViewPro } from '@/components/comercial/cronograma/CronogramaGanttViewPro'
import { ProyectoDependencyManager } from './ProyectoDependencyManager'
import { CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { convertToMSProjectXML, downloadMSProjectXML } from '@/lib/utils/msProjectXmlExport'
import type { ProyectoCronograma, ProyectoFase, ProyectoEdt } from '@/types/modelos'

const TIPO_CRONOGRAMA_INFO = {
  comercial: {
    label: 'Comercial',
    description: 'Cronograma basado en la cotización y estimaciones comerciales',
    icon: Calendar,
    color: 'bg-blue-100 text-blue-800',
    bgColor: 'bg-blue-50'
  },
  planificacion: {
    label: 'Planificación',
    description: 'Cronograma detallado de planificación y preparación',
    icon: Target,
    color: 'bg-purple-100 text-purple-800',
    bgColor: 'bg-purple-50'
  },
  ejecucion: {
    label: 'Ejecución',
    description: 'Cronograma real de ejecución y seguimiento del proyecto',
    icon: PlayCircle,
    color: 'bg-green-100 text-green-800',
    bgColor: 'bg-green-50'
  }
}

interface ProyectoCronogramaTabProps {
  proyectoId: string
  proyectoNombre: string
  cronograma?: ProyectoCronograma
  onRefresh?: () => void
}

export function ProyectoCronogramaTab({
  proyectoId,
  proyectoNombre,
  cronograma,
  onRefresh
}: ProyectoCronogramaTabProps) {
  const [activeTab, setActiveTab] = useState('jerarquia')
  const [showEdtForm, setShowEdtForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCronograma, setSelectedCronograma] = useState<ProyectoCronograma | undefined>(cronograma)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [calendarios, setCalendarios] = useState<any[]>([])
  const [calendarioLaboralId, setCalendarioLaboralId] = useState('')
  const [proyectoData, setProyectoData] = useState<any>(null)
  const [showCronogramaSelector, setShowCronogramaSelector] = useState(false)
  const [showDeleteCronogramaModal, setShowDeleteCronogramaModal] = useState(false)
  const [showGenerarCronogramaModal, setShowGenerarCronogramaModal] = useState(false)
  const [cronogramaTareas, setCronogramaTareas] = useState<any[]>([])
  const { toast } = useToast()

  // Update selected cronograma when prop changes
  useEffect(() => {
    setSelectedCronograma(cronograma)
  }, [cronograma])

  // Cargar datos del proyecto
  useEffect(() => {
    const loadProyectoData = async () => {
      try {
        const response = await fetch(`/api/proyectos/${proyectoId}`)
        if (response.ok) {
          const proyecto = await response.json()
          if (proyecto) {
            setProyectoData(proyecto)
            setFechaInicio(proyecto.fechaInicio ? new Date(proyecto.fechaInicio).toISOString().split('T')[0] : '')
            setFechaFin(proyecto.fechaFin ? new Date(proyecto.fechaFin).toISOString().split('T')[0] : '')
            setCalendarioLaboralId(proyecto.calendarioLaboralId || '')
          }
        }
      } catch (error) {
        console.error('Error loading proyecto data:', error)
      }
    }
    loadProyectoData()
  }, [proyectoId])

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
    onRefresh?.()
    toast({
      title: 'Datos actualizados',
      description: 'El cronograma ha sido actualizado correctamente.'
    })
  }

  // Función para exportar cronograma a XML (MS Project)
  const handleExportXML = async () => {
    try {
      setIsLoading(true)
      toast({
        title: 'Generando XML...',
        description: 'Obteniendo datos del cronograma para exportación.'
      })

      // Obtener datos jerárquicos del cronograma
      const cronogramaId = selectedCronograma?.id
      const treeUrl = cronogramaId
        ? `/api/proyectos/${proyectoId}/cronograma/tree?cronogramaId=${cronogramaId}`
        : `/api/proyectos/${proyectoId}/cronograma/tree`

      const treeResponse = await fetch(treeUrl)
      if (!treeResponse.ok) {
        throw new Error('Error al obtener estructura del cronograma')
      }
      const treeData = await treeResponse.json()

      // Obtener calendario laboral si está configurado
      let calendarioLaboral = null
      if (proyectoData?.calendarioLaboralId) {
        try {
          const calResponse = await fetch(`/api/configuracion/calendarios/${proyectoData.calendarioLaboralId}`)
          if (calResponse.ok) {
            calendarioLaboral = await calResponse.json()
          }
        } catch (e) {
          console.warn('No se pudo cargar calendario laboral, usando valores por defecto')
        }
      }

      // Transformar datos al formato GanttTask esperado por msProjectXmlExport
      interface GanttTask {
        id: string
        nombre: string
        tipo: 'fase' | 'edt' | 'actividad' | 'tarea'
        fechaInicio: Date | null
        fechaFin: Date | null
        progreso: number
        estado: string
        nivel: number
        parentId?: string
        children?: GanttTask[]
        horasEstimadas?: number
        responsable?: string
        descripcion?: string
        dependenciaId?: string
      }

      const transformToGanttTasks = (items: any[], parentId?: string): GanttTask[] => {
        if (!items || !Array.isArray(items)) return []

        return items.map((item: any) => {
          // La API devuelve estructura con 'type', 'data', 'children', 'level'
          const itemData = item.data || {}
          const tipo = (item.type || 'tarea') as 'fase' | 'edt' | 'actividad' | 'tarea'
          const nivel = item.level || 0

          // Obtener fechas - pueden estar en data.fechaInicio o data.fechaInicioComercial
          const fechaInicio = itemData.fechaInicio || itemData.fechaInicioComercial
          const fechaFin = itemData.fechaFin || itemData.fechaFinComercial

          const task: GanttTask = {
            id: item.id?.replace(/^(fase|edt|actividad|tarea)-/, '') || item.id,
            nombre: item.nombre || 'Sin nombre',
            tipo: tipo,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
            fechaFin: fechaFin ? new Date(fechaFin) : null,
            progreso: itemData.progreso || 0,
            estado: itemData.estado || 'pendiente',
            nivel: nivel,
            parentId: parentId,
            horasEstimadas: itemData.horasEstimadas ? Number(itemData.horasEstimadas) : undefined,
            responsable: itemData.responsable?.name || itemData.responsable?.nombre,
            descripcion: itemData.descripcion,
            dependenciaId: itemData.dependenciaId
          }

          // Procesar hijos recursivamente
          if (item.children && Array.isArray(item.children) && item.children.length > 0) {
            task.children = transformToGanttTasks(item.children, item.id)
          }

          return task
        })
      }

      // La API devuelve { success: true, data: { tree: [...] } }
      const treeArray = treeData?.data?.tree || treeData?.tree || treeData?.data || []
      const ganttTasks = transformToGanttTasks(Array.isArray(treeArray) ? treeArray : [])

      if (ganttTasks.length === 0) {
        toast({
          title: 'Sin datos',
          description: 'No hay elementos en el cronograma para exportar.',
          variant: 'destructive'
        })
        return
      }

      // Generar XML usando la utilidad
      const xmlContent = convertToMSProjectXML(
        ganttTasks,
        `Cronograma - ${proyectoNombre}`,
        calendarioLaboral
      )

      // Descargar archivo
      const filename = `cronograma-${proyectoNombre.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xml`
      downloadMSProjectXML(xmlContent, filename)

      toast({
        title: 'Exportación completada',
        description: `Archivo ${filename} descargado correctamente. Compatible con MS Project.`
      })

    } catch (error) {
      console.error('Error exportando XML:', error)
      toast({
        title: 'Error en exportación',
        description: error instanceof Error ? error.message : 'No se pudo generar el archivo XML.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para cambiar de cronograma
  const handleCronogramaChange = (cronograma: ProyectoCronograma) => {
    setSelectedCronograma(cronograma)
    setRefreshKey(prev => prev + 1) // Forzar recarga de componentes hijos
    toast({
      title: 'Cronograma cambiado',
      description: `Ahora trabajando con: ${cronograma.nombre}`
    })
  }

  // Función para crear nuevo cronograma
  const handleCronogramaCreate = () => {
    setRefreshKey(prev => prev + 1)
    toast({
      title: 'Cronograma creado',
      description: 'El nuevo cronograma ha sido creado exitosamente.'
    })
  }

  // Función para generar cronograma automáticamente
  const handleGenerarCronograma = async () => {
    if (!selectedCronograma) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un cronograma primero.',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/generar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          cronogramaId: selectedCronograma.id,
          generarFases: true,
          generarEdts: true,
          generarActividades: true,
          generarTareas: true,
          fechaInicioProyecto: fechaInicio || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error generando cronograma')
      }

      const result = await response.json()

      setShowGenerarCronogramaModal(false)
      handleRefresh()
      toast({
        title: 'Cronograma generado exitosamente',
        description: result.data?.message || `Se generaron ${result.data?.totalElements || 0} elementos del cronograma.`
      })

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

  // Función para eliminar todo el cronograma
  const handleDeleteCronograma = async () => {
    if (!selectedCronograma) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un cronograma primero.',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/eliminar?cronogramaId=${selectedCronograma.id}`, {
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
        description: `Se eliminaron ${result.data?.totalEliminados || 0} elementos del cronograma.`,
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

  // Función para guardar fecha de inicio de línea base
  const handleSaveFechas = async () => {
    try {
      setIsLoading(true)
      const requestData = {
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null
        // fechaFin se calcula automáticamente según los elementos hijos
      }

      const response = await fetch(`/api/proyectos/${proyectoId}`, {
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
        description: 'La fecha de inicio del proyecto ha sido actualizada.'
      })

      // Actualizar datos locales
      setProyectoData((prev: any) => ({
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

      const response = await fetch(`/api/proyectos/${proyectoId}`, {
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
      setProyectoData((prev: any) => ({
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

  // Función después de crear EDT
  const handleEdtCreated = () => {
    setShowEdtForm(false)
    handleRefresh()
    toast({
      title: 'EDT creado',
      description: 'El EDT del proyecto ha sido creado exitosamente.'
    })
  }

  // Función para crear fases por defecto desde configuración global
  const handleCreateDefaultFases = async () => {
    try {
      // Primero verificar si ya existen fases en este proyecto
      const existingFasesResponse = await fetch(`/api/proyectos/${proyectoId}/fases`, {
        credentials: 'include'
      })

      if (existingFasesResponse.ok) {
        const existingFasesResult = await existingFasesResponse.json()
        if (existingFasesResult.success && existingFasesResult.data && existingFasesResult.data.length > 0) {
          toast({
            title: 'Fases ya existen',
            description: `Este proyecto ya tiene ${existingFasesResult.data.length} fases. Ve a la pestaña "Fases" para verlas.`,
            variant: 'default'
          })
          return
        }
      }

      // Obtener fases por defecto desde configuración global
      const response = await fetch('/api/configuracion/fases', {
        credentials: 'include' // Incluir cookies de autenticación
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

      // Crear fases en el proyecto basadas en la configuración global
      let successCount = 0
      let errorCount = 0

      for (const faseDefault of result.data) {
        try {
          const createResponse = await fetch(`/api/proyectos/${proyectoId}/fases`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              nombre: faseDefault.nombre,
              descripcion: faseDefault.descripcion,
              orden: faseDefault.orden
            })
          })

          if (createResponse.ok) {
            successCount++
          } else {
            const errorText = await createResponse.text()
            console.error(`Error creando fase ${faseDefault.nombre}:`, errorText)
            errorCount++
          }
        } catch (createError) {
          console.error(`Error creando fase ${faseDefault.nombre}:`, createError)
          errorCount++
        }
      }

      if (successCount > 0) {
        handleRefresh()
        toast({
          title: 'Fases creadas exitosamente',
          description: `Se crearon ${successCount} fases${errorCount > 0 ? ` (${errorCount} errores)` : ''}. Ve a la pestaña "Fases" para verlas.`,
        })
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron crear las fases. Verifica la configuración y permisos.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error en handleCreateDefaultFases:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión. Inténtalo de nuevo.',
        variant: 'destructive'
      })
    }
  }


  return (
    <div className="space-y-6">
      {/* Selector de Cronograma */}
      <ProyectoCronogramaSelector
        proyectoId={proyectoId}
        selectedCronograma={selectedCronograma}
        onCronogramaChange={handleCronogramaChange}
        onCronogramaCreate={handleCronogramaCreate}
      />

      {/* Header del Tab */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestión del Cronograma</h2>
          <p className="text-sm text-gray-600">
            {selectedCronograma
              ? `Trabajando con: ${selectedCronograma.nombre}`
              : 'Selecciona un cronograma para comenzar'
            }
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

          {selectedCronograma && selectedCronograma.tipo !== 'comercial' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowGenerarCronogramaModal(true)}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Generar Cronograma
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteCronogramaModal(true)}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Cronograma
              </Button>

              <ProyectoDependencyManager
                proyectoId={proyectoId}
                cronogramaId={selectedCronograma?.id}
                onDependenciaChange={handleRefresh}
              />
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportXML}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar XML
          </Button>
        </div>
      </div>

      {/* Modal de confirmación para generar cronograma */}
      <Dialog open={showGenerarCronogramaModal} onOpenChange={setShowGenerarCronogramaModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Wand2 className="h-5 w-5" />
              Generar Cronograma Automático
            </DialogTitle>
            <DialogDescription>
              Se generará la estructura del cronograma basándose en los servicios del proyecto y la cotización.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">🏗️ Elementos que se generarán:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Fases del proyecto (Ingeniería, Procura, Construcción, Pruebas)</li>
                <li>• EDTs agrupados por categoría de servicio</li>
                <li>• Actividades desde los servicios cotizados</li>
                <li>• Tareas desde los items de cada servicio</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Importante</h4>
              <p className="text-sm text-yellow-800">
                Si ya existen elementos en el cronograma, no se duplicarán.
                Solo se crearán los elementos faltantes.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Cronograma: {selectedCronograma?.nombre}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowGenerarCronogramaModal(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerarCronograma}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                <Wand2 className="h-4 w-4 mr-2" />
                Generar Cronograma
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar cronograma */}
      <Dialog open={showDeleteCronogramaModal} onOpenChange={setShowDeleteCronogramaModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Eliminar Todo el Cronograma
            </DialogTitle>
            <DialogDescription className="text-red-700">
              Esta acción es <strong>irreversible</strong> y eliminará permanentemente todos los elementos del cronograma actual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-3">🗑️ Elementos que serán eliminados:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Todas las fases del cronograma</li>
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
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Cronograma: {selectedCronograma?.nombre}
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

      {/* Contenido principal con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="metricas" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="filtros" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
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
                  <input
                    id="fechaInicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-muted-foreground">
                    Fecha planificada de inicio del proyecto
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaFin" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha de Fin Estimada
                  </Label>
                  <input
                    id="fechaFin"
                    type="date"
                    value={fechaFin}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
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
                  Guardar Fecha de Inicio
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 Importante</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• La fecha de inicio será la línea base para todo el cronograma</li>
                  <li>• Las fases, EDTs, actividades y tareas se calcularán desde esta fecha</li>
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
          <ProyectoCronogramaTreeView
            proyectoId={proyectoId}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            fechaInicioProyecto={fechaInicio}
            selectedCronograma={selectedCronograma}
          />
        </TabsContent>

        {/* Tab de Vista Gantt */}
        <TabsContent value="gantt" className="space-y-4">
          <ProyectoGanttView
            proyectoId={proyectoId}
            cronogramaId={selectedCronograma?.id}
            onItemClick={(item) => {
              toast({
                title: 'Elemento seleccionado',
                description: `${item.nombre} (${item.tipo})`,
              });
            }}
          />
        </TabsContent>

        {/* Tab de Gantt Profesional */}
        <TabsContent value="gantt-pro" className="space-y-4">
          <CronogramaGanttViewPro
            cotizacionId={proyectoId}
            cronogramaId={selectedCronograma?.id}
            refreshKey={refreshKey}
          />
        </TabsContent>

        {/* Tab de Métricas */}
        <TabsContent value="metricas" className="space-y-4">
          <ProyectoCronogramaMetrics
            proyectoId={proyectoId}
          />
        </TabsContent>

        {/* Tab de Filtros */}
        <TabsContent value="filtros" className="space-y-4">
          <ProyectoCronogramaFilters
            onFiltersChange={(filters: FilterState) => {
              console.log('Filtros aplicados:', filters)
              toast({
                title: 'Filtros aplicados',
                description: 'Los filtros se aplicarán en la próxima versión.',
                variant: 'default'
              })
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Información adicional */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">🏗️ Proyecto</Badge>
                <span>Nivel superior del proyecto</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">📋 Fases</Badge>
                <span>Etapas del proyecto (Planificación, Ejecución, Cierre)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">🔧 EDTs</Badge>
                <span>Estructura de Desglose de Trabajo</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">⚙️ Actividades</Badge>
                <span>Agrupaciones de trabajo directamente bajo EDTs</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">🔗 Dependencias</Badge>
                <span>Relaciones entre tareas del proyecto</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">✅ Tareas</Badge>
                <span>Actividades específicas dentro de actividades</span>
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