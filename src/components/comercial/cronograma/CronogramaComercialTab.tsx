'use client'

/**
 * CronogramaComercialTab - Componente principal del cronograma comercial
 * Vista compacta y profesional
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
  Calculator,
  Layers,
  ListTree,
  Clock
} from 'lucide-react'
import { DependencyManager } from '../../cronograma/DependencyManager'
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

interface CronogramaStats {
  fases: number
  edts: number
  actividades: number
  tareas: number
}

interface CronogramaComercialTabProps {
  cotizacionId: string
  cotizacionCodigo: string
  hideHeader?: boolean
}

export function CronogramaComercialTab({
  cotizacionId,
  cotizacionCodigo,
  hideHeader = false
}: CronogramaComercialTabProps) {
  const [activeTab, setActiveTab] = useState('jerarquia')
  const [showEdtForm, setShowEdtForm] = useState(false)
  const [showImportFasesModal, setShowImportFasesModal] = useState(false)
  const [showGenerarCronogramaModal, setShowGenerarCronogramaModal] = useState(false)
  const [showDeleteCronogramaModal, setShowDeleteCronogramaModal] = useState(false)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
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
  const [stats, setStats] = useState<CronogramaStats>({ fases: 0, edts: 0, actividades: 0, tareas: 0 })
  const { toast } = useToast()

  // Cargar datos de la cotización
  const loadCotizacionData = async () => {
    try {
      const response = await fetch(`/api/cotizacion/${cotizacionId}`)
      if (response.ok) {
        const cotizacion = await response.json()
        if (cotizacion) {
          setCotizacionData(cotizacion)
          const fechaDefault = new Date().toISOString().split('T')[0]
          setFechaInicio(cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio).toISOString().split('T')[0] : fechaDefault)
          setFechaFin(cotizacion.fechaFin ? new Date(cotizacion.fechaFin).toISOString().split('T')[0] : '')
          setCalendarioLaboralId(cotizacion.calendarioLaboralId || '')
        }
      }
    } catch (error) {
      console.error('Error loading cotizacion data:', error)
    }
  }

  // Cargar estadísticas del cronograma
  const loadCronogramaStats = async () => {
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree`)
      if (response.ok) {
        const data = await response.json()
        if (data?.data?.tree) {
          const tree = data.data.tree
          let fases = 0, edts = 0, actividades = 0, tareas = 0

          tree.forEach((fase: any) => {
            fases++
            fase.children?.forEach((edt: any) => {
              edts++
              edt.children?.forEach((actividad: any) => {
                actividades++
                tareas += actividad.children?.length || 0
              })
            })
          })

          setStats({ fases, edts, actividades, tareas })
        }
      }
    } catch (error) {
      console.error('Error loading cronograma stats:', error)
    }
  }

  useEffect(() => {
    loadCotizacionData()
    loadCronogramaStats()
  }, [cotizacionId])

  useEffect(() => {
    loadCronogramaTareas()
  }, [cotizacionId])

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

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    loadCronogramaTareas()
    loadCotizacionData()
    loadCronogramaStats()
    toast({ title: 'Datos actualizados' })
  }

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

  const handleSaveConfiguracion = async () => {
    try {
      setIsLoading(true)
      const calendarioCambio = calendarioLaboralId !== (cotizacionData?.calendarioLaboralId || '')

      if (calendarioCambio) {
        const calResponse = await fetch(`/api/cotizacion/${cotizacionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarioLaboralId: calendarioLaboralId || null })
        })
        if (!calResponse.ok) throw new Error('Error al guardar calendario')
      }

      const fechaOriginal = cotizacionData?.fechaInicio
        ? new Date(cotizacionData.fechaInicio).toISOString().split('T')[0]
        : ''
      const fechaCambio = fechaInicio !== fechaOriginal

      if (fechaCambio && fechaInicio) {
        const checkResponse = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree`)
        const cronogramaData = checkResponse.ok ? await checkResponse.json() : null
        const tieneCronograma = cronogramaData?.data?.tree?.length > 0

        if (tieneCronograma) {
          const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/desplazar-fechas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevaFechaInicio: fechaInicio })
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Error al desplazar fechas')
          toast({
            title: 'Configuración actualizada',
            description: result.desplazamiento === 0
              ? 'Fecha de inicio establecida.'
              : `Cronograma desplazado ${result.desplazamiento > 0 ? '+' : ''}${result.desplazamiento} días.`
          })
        } else {
          const response = await fetch(`/api/cotizacion/${cotizacionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fechaInicio: new Date(fechaInicio).toISOString() })
          })
          if (!response.ok) throw new Error('Error al guardar fecha')
          toast({ title: 'Configuración guardada' })
        }
      } else if (calendarioCambio) {
        toast({ title: 'Calendario actualizado' })
      }

      loadCotizacionData()
      if (fechaCambio) handleRefresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdtCreated = () => {
    setShowEdtForm(false)
    handleRefresh()
    toast({ title: 'EDT creado exitosamente' })
  }

  const handleDeleteCronograma = async () => {
    // Remover foco del botón para evitar error de aria-hidden con Radix Dialog
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

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

      // Resetear loading
      setIsLoading(false)

      // Cerrar modal usando requestAnimationFrame para evitar conflictos con aria-hidden
      requestAnimationFrame(() => {
        setShowDeleteCronogramaModal(false)
      })

      // Mostrar toast de éxito
      toast({
        title: 'Cronograma eliminado',
        description: `Se eliminaron ${result.data.totalEliminados} elementos.`,
        variant: 'destructive'
      })

      // Actualizar datos después de que el modal se cierre completamente
      setTimeout(() => {
        setRefreshKey(prev => prev + 1)
        loadCronogramaTareas()
        loadCotizacionData()
        loadCronogramaStats()
      }, 200)
    } catch (error) {
      setIsLoading(false)
      // Cerrar modal en caso de error
      requestAnimationFrame(() => {
        setShowDeleteCronogramaModal(false)
      })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar.',
        variant: 'destructive'
      })
    }
  }

  const handleRecalcularDependencias = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/recalcular-dependencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error recalculando dependencias')
      }
      const result = await response.json()
      handleRefresh()
      toast({
        title: result.tareasActualizadas === 0 ? 'Sin cambios' : 'Dependencias recalculadas',
        description: result.tareasActualizadas === 0
          ? 'No hay dependencias para procesar'
          : `Se actualizaron ${result.tareasActualizadas} tareas.`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo recalcular.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

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
          description: 'Ve a Configuración > Fases para crearlas.',
          variant: 'destructive'
        })
        return
      }

      setFasesToImport(result.data)
      setSelectedFases(new Set(result.data.map((f: any) => f.id)))
      setShowImportFasesModal(true)
    } catch (error) {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleImportFases = async () => {
    try {
      setIsLoading(true)
      const fasesSeleccionadas = fasesToImport.filter(f => selectedFases.has(f.id))
      if (fasesSeleccionadas.length === 0) {
        toast({ title: 'Selecciona al menos una fase', variant: 'destructive' })
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
      toast({ title: 'Error al importar', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const totalItems = stats.fases + stats.edts + stats.actividades + stats.tareas
  const hasCronograma = totalItems > 0

  return (
    <div className="space-y-4">
      {/* Header Compacto */}
      {!hideHeader && (
        <div className="flex items-center gap-3 pb-3 border-b">
          <Calendar className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Cronograma</h2>

          {/* Stats Badges */}
          <div className="hidden sm:flex items-center gap-2">
            {hasCronograma ? (
              <>
                <Badge variant="secondary" className="text-xs font-normal">
                  <Layers className="h-3 w-3 mr-1" />
                  {stats.fases} fases
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal">
                  <ListTree className="h-3 w-3 mr-1" />
                  {stats.edts} EDTs
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  {stats.tareas} tareas
                </Badge>
              </>
            ) : (
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                Sin cronograma
              </Badge>
            )}
          </div>

          {/* Fechas */}
          {fechaInicio && (
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground ml-auto mr-2">
              <Clock className="h-3 w-3" />
              {new Date(fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              {fechaFin && (
                <>
                  <span>→</span>
                  {new Date(fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                </>
              )}
            </div>
          )}

          <div className="flex-1 md:flex-none" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
            >
              <Settings className={`h-4 w-4 ${showConfigPanel ? 'text-indigo-500' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Zap className="h-4 w-4 mr-1" />
                  Acciones
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => {
                  setDropdownOpen(false)
                  setTimeout(() => handleOpenImportFasesModal(), 100)
                }}>
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
                <DropdownMenuItem onSelect={() => {
                  setDropdownOpen(false)
                  setTimeout(() => handleRecalcularDependencias(), 100)
                }} disabled={isLoading}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Recalcular Fechas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setDropdownOpen(false)
                    // Esperar a que el dropdown se cierre completamente antes de abrir el dialog
                    setTimeout(() => setShowDeleteCronogramaModal(true), 150)
                  }}
                  className="text-red-600 focus:text-red-600"
                  disabled={!hasCronograma}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Todo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Panel de Configuración Colapsable */}
      <Collapsible open={showConfigPanel} onOpenChange={setShowConfigPanel}>
        <CollapsibleContent>
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha Fin (auto)</Label>
                  <Input
                    type="date"
                    value={fechaFin}
                    readOnly
                    className="h-8 text-sm bg-muted/50"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Calendario</Label>
                  <Select value={calendarioLaboralId} onValueChange={setCalendarioLaboralId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Predeterminado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Predeterminado</SelectItem>
                      {calendarios.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSaveConfiguracion}
                  disabled={isLoading || !fechaInicio}
                  size="sm"
                  className="h-8"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Aplicar
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

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

      {/* Modal de confirmación para eliminar */}
      <Dialog open={showDeleteCronogramaModal} onOpenChange={(open) => {
        if (!isLoading) setShowDeleteCronogramaModal(open)
      }}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Eliminar Cronograma
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará todos los elementos del cronograma.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <p className="text-red-800">Se eliminarán: fases, EDTs, actividades y tareas.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteCronogramaModal(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCronograma} disabled={isLoading}>
              {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de importación de fases */}
      <Dialog open={showImportFasesModal} onOpenChange={setShowImportFasesModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Importar Fases
            </DialogTitle>
            <DialogDescription>
              Selecciona las fases a importar desde la configuración.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {fasesToImport.map((fase) => (
              <div key={fase.id} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50">
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{fase.duracionDias || 0} días</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selectedFases.size} seleccionadas
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowImportFasesModal(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleImportFases} disabled={isLoading || selectedFases.size === 0}>
                {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs de Vistas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="jerarquia" className="text-xs px-3">
            <TreePine className="h-3.5 w-3.5 mr-1.5" />
            Jerarquía
          </TabsTrigger>
          <TabsTrigger value="gantt" className="text-xs px-3">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Gantt
          </TabsTrigger>
          <TabsTrigger value="gantt-pro" className="text-xs px-3">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Gantt Pro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jerarquia" className="mt-3">
          <CronogramaTreeView
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            fechaInicioProyecto={fechaInicio}
          />
        </TabsContent>

        <TabsContent value="gantt" className="mt-3">
          <CronogramaGanttView
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="gantt-pro" className="mt-3">
          <CronogramaGanttViewPro
            cotizacionId={cotizacionId}
            refreshKey={refreshKey}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
