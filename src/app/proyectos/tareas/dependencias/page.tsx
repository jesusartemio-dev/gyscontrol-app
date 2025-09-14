// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/tareas/dependencias/
// 🔧 Descripción: Página para gestión de dependencias entre tareas
//    Funciones: Crear, visualizar y eliminar dependencias, análisis de ciclos
//
// 🧠 Funcionalidades:
//    - Lista de dependencias con filtros
//    - Formulario para crear nuevas dependencias
//    - Visualización gráfica de dependencias
//    - Detección de ciclos y conflictos
//    - Análisis de ruta crítica
//    - Estados de carga y error
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Eye,
  Network,
  Route,
  Clock
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

import type { DependenciaTarea, Tarea, ProyectoServicio } from '@/types/modelos'
import {
  getDependencias,
  createDependencia,
  deleteDependencia,
  detectCycles,
  getCriticalPath
} from '@/lib/services/dependencias'

// 📊 Métricas de dependencias
interface DependenciasMetrics {
  totalDependencias: number
  ciclosDetectados: number
  rutaCritica: {
    criticalPath: string[]
    totalDuration: number
    tasks: {
      id: string
      nombre: string
      duracion: number
      fechaInicio: string
      fechaFin: string
    }[]
  }
  complejidadRed: number
}

// 🔧 Filtros de dependencias
interface FiltrosDependencias {
  busqueda: string
  tareaOrigenId?: string
  tareaDestinoId?: string
  tipo?: string
}

// 📝 Formulario de nueva dependencia
interface NuevaDependencia {
  tareaOrigenId: string
  tareaDestinoId: string
  tipo: 'fin_a_inicio' | 'inicio_a_inicio' | 'fin_a_fin' | 'inicio_a_fin'
  retrasoMinimo: number
}

const DependenciasPage: React.FC = () => {
  // 🔄 Estados del componente
  const [proyectosServicios, setProyectosServicios] = useState<ProyectoServicio[]>([])
  const [selectedProyectoServicio, setSelectedProyectoServicio] = useState<string>('')
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [dependencias, setDependencias] = useState<DependenciaTarea[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDependencias, setLoadingDependencias] = useState(false)
  const [filtros, setFiltros] = useState<FiltrosDependencias>({
    busqueda: ''
  })
  const [metrics, setMetrics] = useState<DependenciasMetrics>({
    totalDependencias: 0,
    ciclosDetectados: 0,
    rutaCritica: {
      criticalPath: [],
      totalDuration: 0,
      tasks: []
    },
    complejidadRed: 0
  })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [nuevaDependencia, setNuevaDependencia] = useState<NuevaDependencia>({
    tareaOrigenId: '',
    tareaDestinoId: '',
    tipo: 'fin_a_inicio',
    retrasoMinimo: 0
  })
  const [creatingDependencia, setCreatingDependencia] = useState(false)
  const { toast } = useToast()

  // 🔄 Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [])

  // 🔄 Cargar dependencias cuando cambia el proyecto
  useEffect(() => {
    if (selectedProyectoServicio) {
      loadDependencias()
      loadTareas()
    }
  }, [selectedProyectoServicio, filtros])

  // 📊 Calcular métricas cuando cambian las dependencias
  useEffect(() => {
    if (selectedProyectoServicio && dependencias.length > 0) {
      calculateMetrics()
    }
  }, [dependencias, selectedProyectoServicio])

  // 🔄 Cargar datos iniciales
  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // TODO: Implementar servicio para obtener proyectos
      // const proyectosData = await getProyectosServicios()
      
      // Mock data por ahora
      const proyectosData: ProyectoServicio[] = []
      
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

  // 🔄 Cargar tareas del proyecto
  const loadTareas = async () => {
    if (!selectedProyectoServicio) return
    
    try {
      // TODO: Implementar servicio para obtener tareas
      // const tareasData = await getTareas({ proyectoServicioId: selectedProyectoServicio })
      
      // Mock data por ahora
      const tareasData: Tarea[] = []
      
      setTareas(tareasData)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas',
        variant: 'destructive'
      })
    }
  }

  // 🔄 Cargar dependencias
  const loadDependencias = async () => {
    if (!selectedProyectoServicio) return
    
    try {
      setLoadingDependencias(true)
      
      const params = {
        proyectoServicioId: selectedProyectoServicio,
        ...filtros,
        page: 1,
        limit: 100
      }
      
      const response = await getDependencias(params)
      setDependencias(response.data)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las dependencias',
        variant: 'destructive'
      })
    } finally {
      setLoadingDependencias(false)
    }
  }

  // 📊 Calcular métricas
  const calculateMetrics = async () => {
    if (!selectedProyectoServicio) return
    
    try {
      const [cycles, criticalPath] = await Promise.all([
        detectCycles(selectedProyectoServicio),
        getCriticalPath(selectedProyectoServicio)
      ])
      
      const complejidadRed = dependencias.length > 0 
        ? Math.round((dependencias.length / tareas.length) * 100) / 100
        : 0
      
      setMetrics({
        totalDependencias: dependencias.length,
        ciclosDetectados: cycles.cycles.length,
        rutaCritica: criticalPath,
        complejidadRed
      })
      
    } catch (error) {
      console.error('Error calculating metrics:', error)
    }
  }

  // 🔧 Manejar cambio de filtros
  const handleFilterChange = (key: keyof FiltrosDependencias, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value === 'all' ? undefined : value || undefined }))
  }

  // ➕ Crear nueva dependencia
  const handleCreateDependencia = async () => {
    if (!selectedProyectoServicio) return
    
    try {
      setCreatingDependencia(true)
      
      await createDependencia({
        ...nuevaDependencia
      })
      
      toast({
        title: 'Éxito',
        description: 'Dependencia creada correctamente'
      })
      
      setShowCreateForm(false)
      setNuevaDependencia({
        tareaOrigenId: '',
        tareaDestinoId: '',
        tipo: 'fin_a_inicio',
        retrasoMinimo: 0
      })
      
      loadDependencias()
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la dependencia',
        variant: 'destructive'
      })
    } finally {
      setCreatingDependencia(false)
    }
  }

  // 🗑️ Eliminar dependencia
  const handleDeleteDependencia = async (dependenciaId: string) => {
    try {
      await deleteDependencia(dependenciaId)
      
      toast({
        title: 'Éxito',
        description: 'Dependencia eliminada correctamente'
      })
      
      loadDependencias()
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la dependencia',
        variant: 'destructive'
      })
    }
  }

  // 🎨 Obtener badge de tipo de dependencia
  const getTipoBadge = (tipo: string) => {
    const tipos = {
    fin_a_inicio: { label: 'FS', variant: 'default' as const, description: 'Fin a Inicio' },
    inicio_a_inicio: { label: 'SS', variant: 'secondary' as const, description: 'Inicio a Inicio' },
    fin_a_fin: { label: 'FF', variant: 'outline' as const, description: 'Fin a Fin' },
    inicio_a_fin: { label: 'SF', variant: 'destructive' as const, description: 'Inicio a Fin' }
  }

  const config = tipos[tipo as keyof typeof tipos] || tipos.fin_a_inicio
    
    return (
      <Badge variant={config.variant} title={config.description}>
        {config.label}
      </Badge>
    )
  }

  // 🔍 Obtener nombre de tarea por ID
  const getTareaNombre = (tareaId: string) => {
    const tarea = tareas.find(t => t.id === tareaId)
    return tarea ? tarea.nombre : 'Tarea no encontrada'
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
            <BreadcrumbPage>Dependencias</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📊 Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dependencias de Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona las relaciones y dependencias entre tareas
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadDependencias} disabled={loadingDependencias}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingDependencias ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button disabled={!selectedProyectoServicio}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Dependencia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Dependencia</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Tarea origen */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tarea Origen</label>
                  <Select
                    value={nuevaDependencia.tareaOrigenId}
                    onValueChange={(value) => setNuevaDependencia(prev => ({ ...prev, tareaOrigenId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tarea origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {tareas.map((tarea) => (
                        <SelectItem key={tarea.id} value={tarea.id}>
                          {tarea.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Tarea destino */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tarea Destino</label>
                  <Select
                    value={nuevaDependencia.tareaDestinoId}
                    onValueChange={(value) => setNuevaDependencia(prev => ({ ...prev, tareaDestinoId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tarea destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {tareas
                        .filter(t => t.id !== nuevaDependencia.tareaOrigenId)
                        .map((tarea) => (
                          <SelectItem key={tarea.id} value={tarea.id}>
                            {tarea.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Tipo de dependencia */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Dependencia</label>
                  <Select
                    value={nuevaDependencia.tipo}
                    onValueChange={(value) => setNuevaDependencia(prev => ({ ...prev, tipo: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fin_a_inicio">Fin a Inicio (FS)</SelectItem>
                            <SelectItem value="inicio_a_inicio">Inicio a Inicio (SS)</SelectItem>
                            <SelectItem value="fin_a_fin">Fin a Fin (FF)</SelectItem>
                            <SelectItem value="inicio_a_fin">Inicio a Fin (SF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Retraso */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Retraso Mínimo (días)</label>
                  <Input
                    type="number"
                    value={nuevaDependencia.retrasoMinimo}
                    onChange={(e) => setNuevaDependencia(prev => ({ ...prev, retrasoMinimo: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateDependencia}
                    disabled={!nuevaDependencia.tareaOrigenId || !nuevaDependencia.tareaDestinoId || creatingDependencia}
                  >
                    {creatingDependencia ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Crear Dependencia
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 📊 Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dependencias</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalDependencias}</div>
              <p className="text-xs text-muted-foreground">
                entre {tareas.length} tareas
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
              <CardTitle className="text-sm font-medium">Ciclos Detectados</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${metrics.ciclosDetectados > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.ciclosDetectados > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.ciclosDetectados}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.ciclosDetectados > 0 ? 'Requiere atención' : 'Red válida'}
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
              <Route className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.rutaCritica.criticalPath.length}</div>
              <p className="text-xs text-muted-foreground">
                tareas críticas
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
              <CardTitle className="text-sm font-medium">Complejidad Red</CardTitle>
              <Network className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.complejidadRed}</div>
              <p className="text-xs text-muted-foreground">
                dependencias por tarea
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 🔧 Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            
            {/* 🔍 Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar dependencias..."
                value={filtros.busqueda}
                onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* 📊 Filtro por tarea origen */}
            <Select
              value={filtros.tareaOrigenId || ''}
              onValueChange={(value) => handleFilterChange('tareaOrigenId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tarea origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tareas origen</SelectItem>
                {tareas.map((tarea) => (
                  <SelectItem key={tarea.id} value={tarea.id}>
                    {tarea.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* 📊 Filtro por tarea destino */}
            <Select
              value={filtros.tareaDestinoId || ''}
              onValueChange={(value) => handleFilterChange('tareaDestinoId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tarea destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tareas destino</SelectItem>
                {tareas.map((tarea) => (
                  <SelectItem key={tarea.id} value={tarea.id}>
                    {tarea.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 📋 Lista de dependencias */}
      {selectedProyectoServicio ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Lista de Dependencias
              {loadingDependencias && (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dependencias.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarea Origen</TableHead>
                    <TableHead>Tarea Destino</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Retraso Mínimo</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dependencias.map((dependencia) => (
                    <TableRow key={dependencia.id}>
                      <TableCell className="font-medium">
                        {getTareaNombre(dependencia.tareaOrigenId)}
                      </TableCell>
                      <TableCell>
                        {getTareaNombre(dependencia.tareaDestinoId)}
                      </TableCell>
                      <TableCell>
                        {getTipoBadge(dependencia.tipo)}
                      </TableCell>
                      <TableCell>
                        {dependencia.retrasoMinimo > 0 ? (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {dependencia.retrasoMinimo}d
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Sin retraso mínimo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(dependencia.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar dependencia?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. La dependencia entre las tareas será eliminada permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDependencia(dependencia.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No hay dependencias</h3>
                  <p className="text-muted-foreground mb-4">
                    No se encontraron dependencias para este proyecto
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Dependencia
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Selecciona un Proyecto</h3>
              <p className="text-muted-foreground">
                Selecciona un proyecto para ver y gestionar las dependencias entre sus tareas
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DependenciasPage