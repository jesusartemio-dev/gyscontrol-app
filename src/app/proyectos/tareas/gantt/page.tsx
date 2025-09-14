// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/tareas/gantt/
// 🔧 Descripción: Página del Gantt Chart para visualización de cronogramas
//    Funciones: Visualización timeline, dependencias, ruta crítica, métricas
//
// 🧠 Funcionalidades:
//    - Gantt Chart interactivo con zoom y filtros
//    - Visualización de dependencias entre tareas
//    - Identificación de ruta crítica
//    - Panel de métricas y análisis
//    - Exportación de reportes
//    - Estados de carga y error
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  BarChart3,
  Download,
  Filter,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Settings
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

import GanttChart from '@/components/proyectos/GanttChart'

import type { ProyectoServicio, User } from '@/types/modelos'
import type { GanttChartPayload, GanttMetricsPayload } from '@/types/payloads'
import { getGanttData, exportarDatosGantt, generarReporteProgreso } from '@/lib/services/gantt'

// 🔧 Configuración de vista del Gantt
interface GanttViewConfig {
  zoomLevel: 'day' | 'week' | 'month'
  showDependencies: boolean
  showCriticalPath: boolean
  showProgress: boolean
  groupBy: 'none' | 'assignee' | 'priority' | 'status'
}

// 📊 Filtros del Gantt
interface GanttFilters {
  estado?: string
  prioridad?: string
  asignadoId?: string
  fechaInicio?: string
  fechaFin?: string
}

const GanttPage: React.FC = () => {
  // 🔄 Estados del componente
  const [proyectosServicios, setProyectosServicios] = useState<ProyectoServicio[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [selectedProyectoServicio, setSelectedProyectoServicio] = useState<string>('')
  const [ganttData, setGanttData] = useState<GanttChartPayload | null>(null)
  const [metrics, setMetrics] = useState<GanttMetricsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingGantt, setLoadingGantt] = useState(false)
  const [viewConfig, setViewConfig] = useState<GanttViewConfig>({
    zoomLevel: 'week',
    showDependencies: true,
    showCriticalPath: true,
    showProgress: true,
    groupBy: 'none'
  })
  const [filters, setFilters] = useState<GanttFilters>({})
  const { toast } = useToast()

  // 🔄 Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [])

  // 🔄 Cargar datos del Gantt cuando cambia el proyecto
  useEffect(() => {
    if (selectedProyectoServicio) {
      loadGanttData()
    }
  }, [selectedProyectoServicio, filters])

  // 🔄 Cargar datos iniciales
  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // TODO: Implementar servicios para obtener usuarios y proyectos
      // const [usuariosData, proyectosData] = await Promise.all([
      //   getUsuarios(),
      //   getProyectosServicios()
      // ])
      
      // Mock data por ahora
      const usuariosData: User[] = []
      const proyectosData: ProyectoServicio[] = []
      
      setUsuarios(usuariosData)
      setProyectosServicios(proyectosData)
      
      // Si hay proyectos, seleccionar el primero por defecto
      if (proyectosData.length > 0) {
        setSelectedProyectoServicio(proyectosData[0].id)
      }
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos iniciales',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 📊 Cargar datos del Gantt
  const loadGanttData = async () => {
    if (!selectedProyectoServicio) return
    
    try {
      setLoadingGantt(true)
      
      const data = await getGanttData(selectedProyectoServicio)
      setGanttData(data)
      setMetrics(data.metricas)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del Gantt',
        variant: 'destructive'
      })
    } finally {
      setLoadingGantt(false)
    }
  }

  // 🔧 Manejar cambio de configuración de vista
  const handleViewConfigChange = (key: keyof GanttViewConfig, value: any) => {
    setViewConfig(prev => ({ ...prev, [key]: value }))
  }

  // 🔧 Manejar cambio de filtros
  const handleFilterChange = (key: keyof GanttFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? undefined : value || undefined }))
  }

  // 📥 Exportar datos del Gantt
  const handleExportData = async (format: 'json' | 'csv') => {
    if (!selectedProyectoServicio || !ganttData) {
      toast({
        title: 'Error',
        description: 'No hay datos para exportar',
        variant: 'destructive'
      })
      return
    }
    
    try {
      // Obtener datos del Gantt
      const ganttData = await getGanttData(selectedProyectoServicio)
      
      // Exportar según formato
      let content: string
      let mimeType: string
      let extension: string
      
      if (format === 'csv') {
        content = exportarDatosGantt(ganttData, 'csv')
        mimeType = 'text/csv'
        extension = 'csv'
      } else {
        content = exportarDatosGantt(ganttData, 'json')
        mimeType = 'application/json'
        extension = 'json'
      }
      
      // Crear blob y enlace de descarga
      const blob = new Blob([content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `gantt-chart-${new Date().toISOString().split('T')[0]}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Éxito',
        description: `Reporte exportado en formato ${format.toUpperCase()}`,
      })
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar el reporte',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Cargando datos...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 🧭 Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/proyectos">Proyectos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/proyectos/tareas">Tareas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Gantt Chart</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📊 Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gantt Chart</h1>
          <p className="text-muted-foreground">
            Visualiza el cronograma y dependencias de las tareas
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadGanttData} disabled={loadingGantt}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingGantt ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button variant="outline" onClick={() => handleExportData('json')}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
          
          <Button variant="outline" onClick={() => handleExportData('csv')}>
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* 📊 Métricas del proyecto */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duración Total</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.ceil((new Date(metrics.fechaFinProyecto).getTime() - new Date(metrics.fechaInicioProyecto).getTime()) / (1000 * 60 * 60 * 24))} días
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(metrics.fechaInicioProyecto).toLocaleDateString()} - {new Date(metrics.fechaFinProyecto).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.progresoGeneral}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.tareasCompletadas} de {metrics.tareasTotal} tareas
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ruta Crítica</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">-</div>
                <p className="text-xs text-muted-foreground">
                  tareas en ruta crítica
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Carga de Trabajo</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.horasTotales}h</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.horasCompletadas}h trabajadas
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* 🔧 Controles y filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración y Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="view" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view">Vista</TabsTrigger>
                <TabsTrigger value="filters">Filtros</TabsTrigger>
            </TabsList>
            
            <TabsContent value="view" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 🏗️ Selector de proyecto */}
                <Select
                  value={selectedProyectoServicio}
                  onValueChange={setSelectedProyectoServicio}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectosServicios.map((proyecto) => (
                      <SelectItem key={proyecto.id} value={proyecto.id}>
                        {proyecto.categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* 🔍 Nivel de zoom */}
                <Select
                  value={viewConfig.zoomLevel}
                  onValueChange={(value) => handleViewConfigChange('zoomLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Vista Diaria</SelectItem>
                    <SelectItem value="week">Vista Semanal</SelectItem>
                    <SelectItem value="month">Vista Mensual</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* 📊 Agrupar por */}
                <Select
                  value={viewConfig.groupBy}
                  onValueChange={(value) => handleViewConfigChange('groupBy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin agrupar</SelectItem>
                    <SelectItem value="assignee">Por asignado</SelectItem>
                    <SelectItem value="priority">Por prioridad</SelectItem>
                    <SelectItem value="status">Por estado</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* ⚙️ Opciones de visualización */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewConfig.showDependencies ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleViewConfigChange('showDependencies', !viewConfig.showDependencies)}
                  >
                    Dependencias
                  </Button>
                  
                  <Button
                    variant={viewConfig.showCriticalPath ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleViewConfigChange('showCriticalPath', !viewConfig.showCriticalPath)}
                  >
                    Ruta Crítica
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="filters" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 📊 Filtro por estado */}
                <Select
                  value={filters.estado || ''}
                  onValueChange={(value) => handleFilterChange('estado', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* 🎯 Filtro por prioridad */}
                <Select
                  value={filters.prioridad || ''}
                  onValueChange={(value) => handleFilterChange('prioridad', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las prioridades</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* 👤 Filtro por asignado */}
                <Select
                  value={filters.asignadoId || ''}
                  onValueChange={(value) => handleFilterChange('asignadoId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Asignado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 📊 Gantt Chart */}
      {selectedProyectoServicio ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Cronograma de Tareas
              {loadingGantt && (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProyectoServicio ? (
              <GanttChart
                proyectoServicioId={selectedProyectoServicio}
                height={600}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
                  <p className="text-muted-foreground">
                    No se encontraron tareas para mostrar en el Gantt Chart
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Selecciona un Proyecto</h3>
              <p className="text-muted-foreground">
                Selecciona un proyecto para visualizar su cronograma en el Gantt Chart
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default GanttPage