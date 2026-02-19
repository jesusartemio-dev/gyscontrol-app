'use client'

/**
 * 📅 ProyectoCronogramaTab - Componente principal del cronograma de proyectos
 * Vista compacta y profesional (similar a CronogramaComercialTab)
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
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
  Layers,
  ListTree,
  Clock,
  Wand2,
  FileText,
  Target,
  Play,
  Star,
  Upload,
  GitCompare,
  Lock,
  Unlock,
  Table2
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ProyectoCronogramaTreeView } from './ProyectoCronogramaTreeView'
import { ProyectoGanttView } from './ProyectoGanttView'
import { CronogramaGanttViewPro } from '@/components/comercial/cronograma/CronogramaGanttViewPro'
import { ProyectoDependencyManager } from './ProyectoDependencyManager'
import { convertToMSProjectXML, downloadMSProjectXML } from '@/lib/utils/msProjectXmlExport'
import { exportCronogramaToExcel } from '@/lib/utils/msProjectExcelExport'
import ImportExcelCronogramaModal from './ImportExcelCronogramaModal'
import { CronogramaVarianza } from './CronogramaVarianza'
import { CronogramaTableView } from './CronogramaTableView'
import type { ProyectoCronograma } from '@/types/modelos'

interface CronogramaStats {
  fases: number
  edts: number
  actividades: number
  tareas: number
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
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showDeleteCronogramaModal, setShowDeleteCronogramaModal] = useState(false)
  const [showGenerarCronogramaModal, setShowGenerarCronogramaModal] = useState(false)
  const [showImportExcelModal, setShowImportExcelModal] = useState(false)

  // Estado de datos
  const [selectedCronograma, setSelectedCronograma] = useState<ProyectoCronograma | undefined>(cronograma)
  const [cronogramas, setCronogramas] = useState<ProyectoCronograma[]>([])
  const [proyectoData, setProyectoData] = useState<any>(null) // Datos originales del proyecto
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [stats, setStats] = useState<CronogramaStats>({ fases: 0, edts: 0, actividades: 0, tareas: 0 })

  // Estado del calendario laboral
  const [calendarioAsignado, setCalendarioAsignado] = useState<{ id: string; nombre: string; horasPorDia: number } | null>(null)
  const [calendariosDisponibles, setCalendariosDisponibles] = useState<{ id: string; nombre: string; horasPorDia: number; diasLaborables: string[] }[]>([])
  const [savingCalendario, setSavingCalendario] = useState(false)

  const { toast } = useToast()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  // Desbloquear/bloquear cronograma (toggle baseline)
  const handleToggleBloqueo = async () => {
    if (!selectedCronograma) return
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/proyectos/${proyectoId}/cronograma/${selectedCronograma.id}/baseline`,
        { method: 'PUT' }
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cambiar estado de bloqueo')
      }
      const result = await response.json()
      // Actualizar cronograma seleccionado y lista
      setSelectedCronograma(result.data)
      setCronogramas(prev => prev.map(c => c.id === result.data.id ? result.data : c))
      toast({
        title: result.data.bloqueado ? 'Cronograma bloqueado' : 'Cronograma desbloqueado',
        description: result.message
      })
      handleRefresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cambiar el estado.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar cronogramas disponibles
  useEffect(() => {
    const loadCronogramas = async () => {
      try {
        const response = await fetch(`/api/proyectos/${proyectoId}/cronograma`)
        if (response.ok) {
          const data = await response.json()
          const lista = data.data || []
          setCronogramas(lista)
          // Seleccionar por prioridad: ejecución > planificación > comercial
          if (!selectedCronograma && lista.length > 0) {
            const preferido =
              lista.find((c: ProyectoCronograma) => c.tipo === 'ejecucion') ||
              lista.find((c: ProyectoCronograma) => c.tipo === 'planificacion') ||
              lista[0]
            setSelectedCronograma(preferido)
          }
        }
      } catch (error) {
        console.error('Error loading cronogramas:', error)
      }
    }
    loadCronogramas()
  }, [proyectoId])

  // Cargar calendario laboral asignado al proyecto
  useEffect(() => {
    const loadCalendario = async () => {
      try {
        const res = await fetch(`/api/proyectos/${proyectoId}/calendario`)
        if (res.ok) {
          const data = await res.json()
          setCalendarioAsignado(data.calendarioAsignado)
          setCalendariosDisponibles(data.calendarios || [])
        }
      } catch (error) {
        console.error('Error loading calendario:', error)
      }
    }
    loadCalendario()
  }, [proyectoId])

  const handleCalendarioChange = async (calendarioId: string) => {
    setSavingCalendario(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/calendario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarioId: calendarioId || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setCalendarioAsignado(data.calendarioAsignado)
        toast({ title: 'Calendario actualizado' })
      }
    } catch {
      toast({ title: 'Error al asignar calendario', variant: 'destructive' })
    } finally {
      setSavingCalendario(false)
    }
  }

  // Cargar datos del proyecto
  const loadProyectoDataFn = async () => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}`)
      if (response.ok) {
        const result = await response.json()
        // La API de proyectos retorna { success: true, data: proyecto }
        const proyecto = result.data || result
        if (proyecto) {
          console.log('📅 [PROYECTO] Datos cargados:', {
            fechaInicio: proyecto.fechaInicio,
            fechaFin: proyecto.fechaFin
          })
          setProyectoData(proyecto)
          const fechaDefault = new Date().toISOString().split('T')[0]
          setFechaInicio(proyecto.fechaInicio ? new Date(proyecto.fechaInicio).toISOString().split('T')[0] : fechaDefault)
          setFechaFin(proyecto.fechaFin ? new Date(proyecto.fechaFin).toISOString().split('T')[0] : '')
        }
      }
    } catch (error) {
      console.error('Error loading proyecto data:', error)
    }
  }

  useEffect(() => {
    loadProyectoDataFn()
  }, [proyectoId])

  // Cargar estadísticas del cronograma
  const loadCronogramaStats = async () => {
    try {
      const cronogramaId = selectedCronograma?.id
      const url = cronogramaId
        ? `/api/proyectos/${proyectoId}/cronograma/tree?cronogramaId=${cronogramaId}`
        : `/api/proyectos/${proyectoId}/cronograma/tree`

      const response = await fetch(url)
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
    loadCronogramaStats()
  }, [proyectoId, selectedCronograma, refreshKey])

  // Nota: Proyecto no tiene calendarioLaboralId - solo Cotizacion lo soporta

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    loadCronogramaStats()
    onRefresh?.()
    toast({ title: 'Datos actualizados' })
  }

  const handleSaveConfiguracion = async () => {
    try {
      setIsLoading(true)

      // Detectar cambio de fecha
      const fechaOriginal = proyectoData?.fechaInicio
        ? new Date(proyectoData.fechaInicio).toISOString().split('T')[0]
        : ''
      const fechaCambio = fechaInicio !== fechaOriginal

      if (fechaCambio && fechaInicio) {
        // Buscar cronograma no-comercial para desplazar
        let cronogramaParaDesplazar = selectedCronograma?.id
        if (selectedCronograma?.tipo === 'comercial') {
          const cronogramaEditable = cronogramas.find(c => c.tipo !== 'comercial')
          cronogramaParaDesplazar = cronogramaEditable?.id
        }

        // Verificar si hay cronograma con contenido
        const treeUrl = cronogramaParaDesplazar
          ? `/api/proyectos/${proyectoId}/cronograma/tree?cronogramaId=${cronogramaParaDesplazar}`
          : `/api/proyectos/${proyectoId}/cronograma/tree`

        const checkResponse = await fetch(treeUrl)
        const cronogramaData = checkResponse.ok ? await checkResponse.json() : null
        const tieneCronograma = cronogramaData?.data?.tree?.length > 0

        if (tieneCronograma && cronogramaParaDesplazar) {
          const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/desplazar-fechas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nuevaFechaInicio: fechaInicio,
              cronogramaId: cronogramaParaDesplazar
            })
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
          const response = await fetch(`/api/proyectos/${proyectoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fechaInicio: new Date(fechaInicio).toISOString() })
          })
          if (!response.ok) throw new Error('Error al guardar fecha')
          toast({ title: 'Configuración guardada' })
        }
      }

      loadProyectoDataFn()
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

  const handleGenerarCronograma = async () => {
    if (!selectedCronograma) {
      toast({ title: 'Error', description: 'Seleccione un cronograma primero.', variant: 'destructive' })
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        title: 'Cronograma generado',
        description: `Se generaron ${result.data?.totalElements || 0} elementos.`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCronograma = async () => {
    if (!selectedCronograma) return

    // Remover foco para evitar error de aria-hidden
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/proyectos/${proyectoId}/cronograma/eliminar?cronogramaId=${selectedCronograma.id}`,
        { method: 'DELETE', credentials: 'include' }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error eliminando')
      }

      const result = await response.json()

      setIsLoading(false)
      requestAnimationFrame(() => setShowDeleteCronogramaModal(false))

      toast({
        title: 'Cronograma eliminado',
        description: `Se eliminaron ${result.data?.totalEliminados || 0} elementos.`,
        variant: 'destructive'
      })

      setTimeout(() => handleRefresh(), 200)
    } catch (error) {
      setIsLoading(false)
      requestAnimationFrame(() => setShowDeleteCronogramaModal(false))
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar.',
        variant: 'destructive'
      })
    }
  }

  const handleExportXML = async () => {
    try {
      setIsLoading(true)
      toast({ title: 'Generando XML...', description: 'Obteniendo datos del cronograma.' })

      const cronogramaId = selectedCronograma?.id
      const treeUrl = cronogramaId
        ? `/api/proyectos/${proyectoId}/cronograma/tree?cronogramaId=${cronogramaId}`
        : `/api/proyectos/${proyectoId}/cronograma/tree`

      const treeResponse = await fetch(treeUrl)
      if (!treeResponse.ok) throw new Error('Error al obtener estructura')
      const treeData = await treeResponse.json()

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
      }

      const transformToGanttTasks = (items: any[], parentId?: string): GanttTask[] => {
        if (!items || !Array.isArray(items)) return []
        return items.map((item: any) => {
          const itemData = item.data || {}
          const tipo = (item.type || 'tarea') as 'fase' | 'edt' | 'actividad' | 'tarea'
          const fechaInicio = itemData.fechaInicio || itemData.fechaInicioComercial
          const fechaFin = itemData.fechaFin || itemData.fechaFinComercial

          const task: GanttTask = {
            id: item.id?.replace(/^(fase|edt|actividad|tarea)-/, '') || item.id,
            nombre: item.nombre || 'Sin nombre',
            tipo,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
            fechaFin: fechaFin ? new Date(fechaFin) : null,
            progreso: itemData.progreso || 0,
            estado: itemData.estado || 'pendiente',
            nivel: item.level || 0,
            parentId
          }

          if (item.children?.length > 0) {
            task.children = transformToGanttTasks(item.children, item.id)
          }
          return task
        })
      }

      const treeArray = treeData?.data?.tree || treeData?.tree || []
      const ganttTasks = transformToGanttTasks(Array.isArray(treeArray) ? treeArray : [])

      if (ganttTasks.length === 0) {
        toast({ title: 'Sin datos', description: 'No hay elementos para exportar.', variant: 'destructive' })
        return
      }

      const xmlContent = convertToMSProjectXML(ganttTasks, `Cronograma - ${proyectoNombre}`, null)
      const filename = `cronograma-${proyectoNombre.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xml`
      downloadMSProjectXML(xmlContent, filename)

      toast({ title: 'Exportación completada', description: `Archivo ${filename} descargado.` })
    } catch (error) {
      toast({
        title: 'Error en exportación',
        description: error instanceof Error ? error.message : 'No se pudo exportar.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setIsLoading(true)
      toast({ title: 'Generando Excel...', description: 'Obteniendo datos del cronograma.' })

      const cronogramaId = selectedCronograma?.id

      // Fetch tree + dependencies in parallel
      const treeUrl = cronogramaId
        ? `/api/proyectos/${proyectoId}/cronograma/tree?cronogramaId=${cronogramaId}`
        : `/api/proyectos/${proyectoId}/cronograma/tree`

      const [treeResponse, depsResponse] = await Promise.all([
        fetch(treeUrl),
        fetch(`/api/proyectos/${proyectoId}/cronograma/dependencias`),
      ])

      if (!treeResponse.ok) throw new Error('Error al obtener estructura')
      const treeData = await treeResponse.json()
      const treeArray = treeData?.data?.tree || treeData?.tree || []

      if (!Array.isArray(treeArray) || treeArray.length === 0) {
        toast({ title: 'Sin datos', description: 'No hay elementos para exportar.', variant: 'destructive' })
        return
      }

      const dependencias = depsResponse.ok
        ? (await depsResponse.json()).data || []
        : []

      // Use 8 as default horasPorDia (could be fetched from calendar if needed)
      exportCronogramaToExcel(treeArray, dependencias, proyectoNombre, 8)

      toast({ title: 'Exportación completada', description: 'Archivo Excel descargado.' })
    } catch (error) {
      toast({
        title: 'Error en exportación',
        description: error instanceof Error ? error.message : 'No se pudo exportar.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Eliminar cronograma completo (no solo contenido)
  const handleEliminarCronogramaCompleto = async () => {
    if (!selectedCronograma) return

    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/proyectos/${proyectoId}/cronograma?cronogramaId=${selectedCronograma.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar')
      }

      // Recargar cronogramas
      const cronogramasResponse = await fetch(`/api/proyectos/${proyectoId}/cronograma`)
      if (cronogramasResponse.ok) {
        const data = await cronogramasResponse.json()
        setCronogramas(data.data || [])
        setSelectedCronograma(data.data?.[0])
      }

      toast({ title: 'Cronograma eliminado', variant: 'destructive' })
      handleRefresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper para obtener info del tipo de cronograma
  const getTipoInfo = (tipo: string) => {
    switch (tipo) {
      case 'comercial':
        return { icon: FileText, label: 'Comercial', color: 'text-blue-600', bg: 'bg-blue-100', nombre: 'Comercial' }
      case 'planificacion':
        return { icon: Target, label: 'Línea Base', color: 'text-purple-600', bg: 'bg-purple-100', nombre: 'Línea Base' }
      case 'ejecucion':
        return { icon: Play, label: 'Ejecución', color: 'text-green-600', bg: 'bg-green-100', nombre: 'Ejecución' }
      default:
        return { icon: Calendar, label: tipo, color: 'text-gray-600', bg: 'bg-gray-100', nombre: tipo }
    }
  }

  // Crear Línea Base (desde Comercial o generando)
  const handleCrearLineaBase = async () => {
    const comercial = cronogramas.find(c => c.tipo === 'comercial')

    try {
      setIsLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'planificacion',
          nombre: 'Línea Base',
          copiarDesdeId: comercial?.id // Copiar desde comercial si existe
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear Línea Base')
      }

      const result = await response.json()

      // Recargar cronogramas
      const cronogramasResponse = await fetch(`/api/proyectos/${proyectoId}/cronograma`)
      if (cronogramasResponse.ok) {
        const data = await cronogramasResponse.json()
        setCronogramas(data.data || [])
        if (result.data) setSelectedCronograma(result.data)
      }

      toast({ title: 'Línea Base creada', description: comercial ? 'Copiada desde Comercial' : 'Cronograma vacío creado' })
      handleRefresh()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo crear.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  // Iniciar Ejecución (copia de Línea Base)
  const handleIniciarEjecucion = async () => {
    const lineaBase = cronogramas.find(c => c.tipo === 'planificacion' && c.esBaseline)

    if (!lineaBase) {
      toast({ title: 'Error', description: 'Debe existir una Línea Base aprobada primero.', variant: 'destructive' })
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ejecucion',
          nombre: 'Ejecución',
          copiarDesdeId: lineaBase.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al iniciar ejecución')
      }

      const result = await response.json()

      // Recargar cronogramas
      const cronogramasResponse = await fetch(`/api/proyectos/${proyectoId}/cronograma`)
      if (cronogramasResponse.ok) {
        const data = await cronogramasResponse.json()
        setCronogramas(data.data || [])
        if (result.data) setSelectedCronograma(result.data)
      }

      toast({ title: 'Ejecución iniciada', description: 'Copiada desde Línea Base' })
      handleRefresh()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo crear.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const totalItems = stats.fases + stats.edts + stats.actividades + stats.tareas
  const hasCronograma = totalItems > 0
  const tieneLineaBase = cronogramas.some(c => c.tipo === 'planificacion')
  const tieneBaseline = cronogramas.some(c => c.esBaseline)
  const tieneEjecucion = cronogramas.some(c => c.tipo === 'ejecucion')
  const puedeCrearLineaBase = !tieneLineaBase
  const puedeIniciarEjecucion = tieneBaseline && !tieneEjecucion
  const esComercial = selectedCronograma?.tipo === 'comercial'
  const esBloqueado = selectedCronograma?.bloqueado === true || selectedCronograma?.tipo === 'comercial'

  return (
    <div className="space-y-4">
      {/* Header Compacto */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Calendar className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold">Cronograma</h2>

        {/* Selector de Cronograma con tipos */}
        <Select
          value={selectedCronograma?.id || ''}
          onValueChange={(value) => {
            const cron = cronogramas.find(c => c.id === value)
            if (cron) {
              setSelectedCronograma(cron)
              setRefreshKey(prev => prev + 1)
            }
          }}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Seleccionar cronograma...">
              {selectedCronograma && (() => {
                const info = getTipoInfo(selectedCronograma.tipo)
                const Icon = info.icon
                return (
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3 w-3 ${info.color}`} />
                    <span className={info.color}>{info.label}</span>
                    {selectedCronograma.esBaseline && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    {(selectedCronograma.bloqueado || selectedCronograma.tipo === 'comercial') && <Lock className="h-3 w-3 text-amber-500" />}
                  </div>
                )
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[...cronogramas].sort((a, b) => {
              const orden: Record<string, number> = { ejecucion: 0, planificacion: 1, comercial: 2 }
              return (orden[a.tipo] ?? 3) - (orden[b.tipo] ?? 3)
            }).map((cron) => {
              const info = getTipoInfo(cron.tipo)
              const Icon = info.icon
              return (
                <SelectItem key={cron.id} value={cron.id}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3 w-3 ${info.color}`} />
                    <span className={info.color}>{info.label}</span>
                    {cron.esBaseline && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    {(cron.bloqueado || cron.tipo === 'comercial') && <Lock className="h-3 w-3 text-amber-500" />}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {/* Indicador de bloqueo */}
        {esBloqueado && (
          <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-300 bg-amber-50">
            <Lock className="h-3 w-3 mr-1" />
            Cronograma bloqueado
          </Badge>
        )}

        {/* Botones de acción para crear cronogramas */}
        {puedeCrearLineaBase && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-purple-600 border-purple-300 hover:bg-purple-50"
            onClick={handleCrearLineaBase}
            disabled={isLoading}
          >
            <Target className="h-3.5 w-3.5 mr-1" />
            Crear Línea Base
          </Button>
        )}
        {puedeIniciarEjecucion && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-green-600 border-green-300 hover:bg-green-50"
            onClick={handleIniciarEjecucion}
            disabled={isLoading}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            Iniciar Ejecución
          </Button>
        )}

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

        {/* Calendario badge */}
        {calendarioAsignado && (
          <Badge variant="outline" className="hidden sm:flex text-xs font-normal text-indigo-600 border-indigo-200">
            <Calendar className="h-3 w-3 mr-1" />
            {calendarioAsignado.horasPorDia}h/día
          </Badge>
        )}

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
              {/* Desbloquear - solo admin cuando esta bloqueado */}
              {selectedCronograma?.bloqueado && isAdmin && (
                <>
                  <DropdownMenuItem onSelect={() => {
                    setDropdownOpen(false)
                    setTimeout(() => handleToggleBloqueo(), 100)
                  }} disabled={isLoading}>
                    <Unlock className="h-4 w-4 mr-2" />
                    Desbloquear Cronograma
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {!esComercial && (
                <>
                  <DropdownMenuItem onSelect={() => {
                    setDropdownOpen(false)
                    setTimeout(() => setShowGenerarCronogramaModal(true), 100)
                  }} disabled={esBloqueado}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generar Cronograma
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => {
                    setDropdownOpen(false)
                    setTimeout(() => setShowImportExcelModal(true), 100)
                  }} disabled={esBloqueado}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar desde Excel (MS Project)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem asChild>
                <ProyectoDependencyManager
                  proyectoId={proyectoId}
                  cronogramaId={selectedCronograma?.id}
                  onDependenciaChange={handleRefresh}
                />
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => {
                setDropdownOpen(false)
                setTimeout(() => handleExportXML(), 100)
              }} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Exportar XML
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => {
                setDropdownOpen(false)
                setTimeout(() => handleExportExcel(), 100)
              }} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel (MS Project)
              </DropdownMenuItem>

              {!esComercial && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      setDropdownOpen(false)
                      setTimeout(() => setShowDeleteCronogramaModal(true), 150)
                    }}
                    className="text-red-600 focus:text-red-600"
                    disabled={!hasCronograma || esBloqueado}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Vaciar Contenido
                  </DropdownMenuItem>
                  {!selectedCronograma?.esBaseline && cronogramas.length > 1 && !esBloqueado && (
                    <DropdownMenuItem
                      onSelect={() => {
                        setDropdownOpen(false)
                        setTimeout(() => handleEliminarCronogramaCompleto(), 150)
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Cronograma
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
                  <Label className="text-xs text-muted-foreground">Calendario Laboral</Label>
                  <Select
                    value={calendarioAsignado?.id || ''}
                    onValueChange={handleCalendarioChange}
                    disabled={savingCalendario}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Sin calendario asignado" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendariosDisponibles.map(cal => (
                        <SelectItem key={cal.id} value={cal.id}>
                          {cal.nombre} ({cal.horasPorDia}h/día)
                        </SelectItem>
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

      {/* Modal de generación */}
      <Dialog open={showGenerarCronogramaModal} onOpenChange={setShowGenerarCronogramaModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Wand2 className="h-5 w-5" />
              Generar Cronograma
            </DialogTitle>
            <DialogDescription>
              Se generará la estructura basada en los servicios del proyecto.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-800">Se crearán: Fases, EDTs, Actividades y Tareas desde los servicios cotizados.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowGenerarCronogramaModal(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleGenerarCronograma} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Generar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Modal de importar Excel */}
      <ImportExcelCronogramaModal
        open={showImportExcelModal}
        onOpenChange={setShowImportExcelModal}
        proyectoId={proyectoId}
        onImportSuccess={handleRefresh}
      />

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
          <TabsTrigger value="tabla" className="text-xs px-3">
            <Table2 className="h-3.5 w-3.5 mr-1.5" />
            Tabla
          </TabsTrigger>
          {tieneBaseline && tieneEjecucion && (
            <TabsTrigger value="varianza" className="text-xs px-3">
              <GitCompare className="h-3.5 w-3.5 mr-1.5" />
              Varianza
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="jerarquia" className="mt-3">
          <ProyectoCronogramaTreeView
            proyectoId={proyectoId}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            fechaInicioProyecto={fechaInicio}
            selectedCronograma={selectedCronograma}
          />
        </TabsContent>

        <TabsContent value="gantt" className="mt-3">
          <ProyectoGanttView
            proyectoId={proyectoId}
            cronogramaId={selectedCronograma?.id}
            onItemClick={(item) => {
              toast({
                title: 'Elemento seleccionado',
                description: `${item.nombre} (${item.tipo})`
              })
            }}
          />
        </TabsContent>

        <TabsContent value="gantt-pro" className="mt-3">
          <CronogramaGanttViewPro
            cotizacionId={proyectoId}
            cronogramaId={selectedCronograma?.id}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="tabla" className="mt-3">
          <CronogramaTableView
            proyectoId={proyectoId}
            cronogramaId={selectedCronograma?.id}
            refreshKey={refreshKey}
            horasPorDia={calendarioAsignado?.horasPorDia}
          />
        </TabsContent>

        {tieneBaseline && tieneEjecucion && (
          <TabsContent value="varianza" className="mt-3">
            <CronogramaVarianza
              proyectoId={proyectoId}
              proyectoNombre={proyectoNombre}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
