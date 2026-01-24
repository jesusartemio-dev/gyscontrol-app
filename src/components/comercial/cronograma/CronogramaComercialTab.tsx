'use client'

/**
 * 📅 CronogramaComercialTab - Componente principal del tab de cronograma
 * Vista compacta y profesional del cronograma comercial
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
import {
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  Settings,
  CheckCircle,
  TreePine,
  TrendingUp,
  Trash2,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { DependencyManager } from '../../cronograma/DependencyManager'
import { AutoDependencyGenerator } from '../../cronograma/AutoDependencyGenerator'
import { CotizacionEdtForm } from './CotizacionEdtForm'
import { GenerarCronogramaModal } from './GenerarCronogramaModal'
import { CronogramaTreeView } from '../../cronograma/CronogramaTreeView'
import { CronogramaGanttView } from './CronogramaGanttView'
import { CronogramaGanttViewPro } from './CronogramaGanttViewPro'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

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
  const [showConfigPanel, setShowConfigPanel] = useState(false)
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
        }
      } catch (error) {
        console.error('Error loading cotizacion data:', error)
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
    loadCronogramaTareas()
    toast({
      title: 'Datos actualizados',
      description: 'El cronograma ha sido actualizado.'
    })
  }

  // Función para cargar tareas del cronograma
  const loadCronogramaTareas = async () => {
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tareas-disponibles`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
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
        edtNombre: tarea.edtNombre,
        actividadNombre: tarea.actividadNombre,
        tareaNombre: tarea.nombre
      })
    })
    return Array.from(tareasMap.values())
  }

  // Función para guardar fecha de inicio
  const handleSaveFechas = async () => {
    try {
      setIsLoading(true)
      const requestData = {
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null
      }
      const response = await fetch(`/api/cotizacion/${cotizacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      if (!response.ok) throw new Error('Error al guardar fecha')
      toast({
        title: 'Fecha guardada',
        description: 'La fecha de inicio ha sido actualizada.'
      })
      setCotizacionData((prev: any) => ({ ...prev, fechaInicio: requestData.fechaInicio }))
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la fecha.',
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
      const requestData = { calendarioLaboralId: calendarioLaboralId || null }
      const response = await fetch(`/api/cotizacion/${cotizacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      if (!response.ok) throw new Error('Error al guardar calendario')
      toast({
        title: 'Calendario guardado',
        description: 'El calendario laboral ha sido actualizado.'
      })
      setCotizacionData((prev: any) => ({ ...prev, calendarioLaboralId: requestData.calendarioLaboralId }))
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el calendario.',
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

  // Función para eliminar todo el cronograma
  const handleDeleteCronograma = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/eliminar`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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
        description: `Se eliminaron ${result.data.totalEliminados} elementos.`,
        variant: 'destructive'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el cronograma.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para abrir modal de importación de fases
  const handleOpenImportFasesModal = async () => {
    try {
      const existingFasesResponse = await fetch(`/api/cotizacion/${cotizacionId}/fases`, {
        credentials: 'include'
      })
      if (existingFasesResponse.ok) {
        const existingFasesResult = await existingFasesResponse.json()
        if (existingFasesResult.success && existingFasesResult.data?.length > 0) {
          toast({
            title: 'Fases ya existen',
            description: `Esta cotización ya tiene ${existingFasesResult.data.length} fases.`
          })
          return
        }
      }

      const response = await fetch('/api/configuracion/fases', { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          toast({ title: 'Error de autenticación', variant: 'destructive' })
          return
        }
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success || !result.data?.length) {
        toast({
          title: 'Sin fases configuradas',
          description: 'Ve a Configuración > Fases por Defecto para crearlas.',
          variant: 'destructive'
        })
        return
      }

      setFasesToImport(result.data)
      setSelectedFases(new Set(result.data.map((f: any) => f.id)))
      setShowImportFasesModal(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Error de conexión.', variant: 'destructive' })
    }
  }

  // Función para importar fases
  const handleImportFases = async () => {
    try {
      setIsLoading(true)
      const fasesSeleccionadas = fasesToImport.filter(f => selectedFases.has(f.id))
      if (fasesSeleccionadas.length === 0) {
        toast({ title: 'Selección requerida', variant: 'destructive' })
        return
      }
      if (!cotizacionData?.fechaInicio) {
        toast({
          title: 'Fecha de inicio requerida',
          description: 'Configura la fecha de inicio primero.',
          variant: 'destructive'
        })
        setShowConfigPanel(true)
        setShowImportFasesModal(false)
        return
      }

      const fasesOrdenadas = fasesSeleccionadas.sort((a, b) => a.orden - b.orden)
      let successCount = 0
      let fechaActual = new Date(cotizacionData.fechaInicio)
      let fechaFinProyecto = new Date(cotizacionData.fechaInicio)

      for (const fase of fasesOrdenadas) {
        const fechaInicioFase = new Date(fechaActual)
        const fechaFinFase = new Date(fechaInicioFase)
        fechaFinFase.setDate(fechaInicioFase.getDate() + (fase.duracionDias || 0))

        const createResponse = await fetch(`/api/cotizacion/${cotizacionId}/fases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          fechaActual = new Date(fechaFinFase)
          fechaActual.setDate(fechaActual.getDate() + 1)
          if (fechaFinFase > fechaFinProyecto) fechaFinProyecto = new Date(fechaFinFase)
        }
      }

      if (successCount > 0) {
        await fetch(`/api/cotizacion/${cotizacionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fechaFin: fechaFinProyecto.toISOString() })
        })
        setCotizacionData((prev: any) => ({ ...prev, fechaFin: fechaFinProyecto.toISOString() }))
        setFechaFin(fechaFinProyecto.toISOString().split('T')[0])
        handleRefresh()
        setShowImportFasesModal(false)
        toast({
          title: 'Fases importadas',
          description: `Se importaron ${successCount} fases.`
        })
      }
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Cronograma</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{cotizacionCodigo}</span>
              {fechaInicio && (
                <>
                  <span>•</span>
                  <span>Inicio: {new Date(fechaInicio).toLocaleDateString('es-ES')}</span>
                </>
              )}
              {fechaFin && (
                <>
                  <span>•</span>
                  <span>Fin: {new Date(fechaFin).toLocaleDateString('es-ES')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón de configuración rápida */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className="h-8"
          >
            <Settings className="h-4 w-4 mr-1" />
            Config
            {showConfigPanel ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Dropdown de herramientas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Zap className="h-4 w-4 mr-1" />
                Herramientas
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleOpenImportFasesModal}>
                <Download className="h-4 w-4 mr-2" />
                Importar Fases
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <DependencyManager
                  cotizacionId={cotizacionId}
                  tareas={cronogramaTareas}
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <AutoDependencyGenerator
                  cotizacionId={cotizacionId}
                  tareas={[]}
                  onDependenciesGenerated={(dependencies) => {
                    handleRefresh()
                    toast({
                      title: 'Dependencias generadas',
                      description: `Se generaron ${dependencies.length} dependencias.`
                    })
                  }}
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteCronogramaModal(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Cronograma
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Panel de configuración colapsable */}
      {showConfigPanel && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fecha de inicio */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Fecha de Inicio</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveFechas}
                    disabled={isLoading || !fechaInicio}
                    className="h-8 px-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Fecha de fin (solo lectura) */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Fecha de Fin (auto)</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  readOnly
                  className="h-8 text-sm bg-gray-100 cursor-not-allowed"
                />
              </div>

              {/* Calendario laboral */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Calendario Laboral</Label>
                <div className="flex gap-2">
                  <Select value={calendarioLaboralId} onValueChange={setCalendarioLaboralId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Predeterminado</SelectItem>
                      {calendarios.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleSaveCalendario}
                    disabled={isLoading}
                    className="h-8 px-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            title: 'Cronograma generado',
            description: `Se generaron ${result.totalElements} elementos.`
          })
        }}
      />

      {/* Modal de confirmación para eliminar cronograma */}
      <Dialog open={showDeleteCronogramaModal} onOpenChange={setShowDeleteCronogramaModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Eliminar Todo el Cronograma
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente todos los elementos del cronograma.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-red-900 mb-2">Se eliminarán:</p>
            <ul className="text-red-800 space-y-1 text-xs">
              <li>• Todas las fases, EDTs y actividades</li>
              <li>• Todas las tareas y dependencias</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
            >
              {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar Todo
            </Button>
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
              Selecciona las fases a importar. Las fechas se calcularán desde el{' '}
              {cotizacionData?.fechaInicio
                ? new Date(cotizacionData.fechaInicio).toLocaleDateString('es-ES')
                : 'inicio del proyecto'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {fasesToImport.map((fase) => (
              <div key={fase.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox
                  id={`fase-${fase.id}`}
                  checked={selectedFases.has(fase.id)}
                  onCheckedChange={(checked) => {
                    const newSelected = new Set(selectedFases)
                    if (checked) newSelected.add(fase.id)
                    else newSelected.delete(fase.id)
                    setSelectedFases(newSelected)
                  }}
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`fase-${fase.id}`} className="text-sm font-medium cursor-pointer">
                    {fase.nombre}
                  </Label>
                  {fase.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5">{fase.descripcion}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">Orden: {fase.orden}</Badge>
                    <Badge variant="secondary" className="text-xs">{fase.duracionDias || 0} días</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedFases.size} de {fasesToImport.length} seleccionadas
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowImportFasesModal(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleImportFases} disabled={isLoading || selectedFases.size === 0}>
                {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Importar {selectedFases.size > 0 && `(${selectedFases.size})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="jerarquia" className="text-sm">
            <TreePine className="h-4 w-4 mr-1.5" />
            Jerarquía
          </TabsTrigger>
          <TabsTrigger value="gantt" className="text-sm">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Gantt
          </TabsTrigger>
          <TabsTrigger value="gantt-pro" className="text-sm">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Gantt Pro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jerarquia" className="mt-4">
          <CronogramaTreeView
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            fechaInicioProyecto={fechaInicio}
          />
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <CronogramaGanttView
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="gantt-pro" className="mt-4">
          <CronogramaGanttViewPro
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
