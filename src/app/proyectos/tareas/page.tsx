// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/tareas/
// 🔧 Descripción: Página principal para gestión de tareas
//    Funciones: Dashboard, lista de tareas, filtros, acciones CRUD
//
// 🧠 Funcionalidades:
//    - Dashboard con métricas de tareas
//    - Lista de tareas con filtros avanzados
//    - Formulario modal para crear/editar
//    - Integración con SubtareaAccordion
//    - Estados de carga y error
//    - Navegación breadcrumb
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
  Calendar,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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

import TareaList from '@/components/proyectos/TareaList'
import TareaForm from '@/components/proyectos/TareaForm'
import SubtareaAccordion from '@/components/proyectos/SubtareaAccordion'

import type { Tarea, User, ProyectoServicio } from '@/types/modelos'
import { getTareas } from '@/lib/services/tareas'

// 📊 Métricas del dashboard
interface DashboardMetrics {
  totalTareas: number
  tareasCompletadas: number
  tareasPendientes: number
  tareasEnProgreso: number
  progresoGeneral: number
  horasEstimadas: number
  horasReales: number
}

// 🔧 Filtros de búsqueda
interface FiltrosTareas {
  busqueda: string
  estado?: string
  prioridad?: string
  asignadoId?: string
  proyectoServicioId?: string
}

const TareasPage: React.FC = () => {
  // 🔄 Estados del componente
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [proyectosServicios, setProyectosServicios] = useState<ProyectoServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<FiltrosTareas>({
    busqueda: ''
  })
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTareas: 0,
    tareasCompletadas: 0,
    tareasPendientes: 0,
    tareasEnProgreso: 0,
    progresoGeneral: 0,
    horasEstimadas: 0,
    horasReales: 0
  })
  const [showTareaForm, setShowTareaForm] = useState(false)
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null)
  const [selectedProyectoServicio, setSelectedProyectoServicio] = useState<string>('')
  const { toast } = useToast()

  // 🔄 Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [])

  // 🔄 Recargar tareas cuando cambian los filtros
  useEffect(() => {
    if (selectedProyectoServicio) {
      loadTareas()
    }
  }, [filtros, selectedProyectoServicio])

  // 📊 Calcular métricas cuando cambian las tareas
  useEffect(() => {
    calculateMetrics()
  }, [tareas])

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

  // 🔄 Cargar tareas
  const loadTareas = async () => {
    if (!selectedProyectoServicio) return
    
    try {
      const params = {
        proyectoServicioId: selectedProyectoServicio,
        ...filtros,
        page: 1,
        limit: 100 // Cargar todas las tareas para el dashboard
      }
      
      const response = await getTareas(params)
      setTareas(response.data)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas',
        variant: 'destructive'
      })
    }
  }

  // 📊 Calcular métricas del dashboard
  const calculateMetrics = () => {
    const totalTareas = tareas.length
    const tareasCompletadas = tareas.filter(t => t.estado === 'completada').length
    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente').length
    const tareasEnProgreso = tareas.filter(t => t.estado === 'en_progreso').length
    
    const progresoGeneral = totalTareas > 0 
      ? Math.round(tareas.reduce((sum, t) => sum + t.porcentajeCompletado, 0) / totalTareas)
      : 0
    
    const horasEstimadas = tareas.reduce((sum, t) => sum + t.horasPlan, 0)
    const horasReales = tareas.reduce((sum, t) => sum + t.horasReales, 0)
    
    setMetrics({
      totalTareas,
      tareasCompletadas,
      tareasPendientes,
      tareasEnProgreso,
      progresoGeneral,
      horasEstimadas,
      horasReales
    })
  }

  // 🔧 Manejar cambio de filtros
  const handleFilterChange = (key: keyof FiltrosTareas, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value === 'all' ? undefined : value || undefined }))
  }

  // ➕ Abrir formulario para crear tarea
  const handleCreateTarea = () => {
    if (!selectedProyectoServicio) {
      toast({
        title: 'Selecciona un proyecto',
        description: 'Debes seleccionar un proyecto antes de crear una tarea',
        variant: 'destructive'
      })
      return
    }
    
    setEditingTarea(null)
    setShowTareaForm(true)
  }

  // ✏️ Abrir formulario para editar tarea
  const handleEditTarea = (tarea: Tarea) => {
    setEditingTarea(tarea)
    setShowTareaForm(true)
  }

  // 💾 Manejar éxito del formulario
  const handleTareaFormSuccess = (tarea: Tarea) => {
    setShowTareaForm(false)
    setEditingTarea(null)
    loadTareas() // Recargar lista
  }

  // 🗑️ Manejar eliminación de tarea
  const handleDeleteTarea = () => {
    loadTareas() // Recargar lista
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
            <BreadcrumbPage>Gestión de Tareas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📊 Header con métricas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Tareas</h1>
          <p className="text-muted-foreground">
            Administra las tareas y subtareas de tus proyectos
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadTareas}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          
          <Button onClick={handleCreateTarea}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* 📊 Dashboard de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tareas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTareas}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.horasEstimadas}h estimadas
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
              <CardTitle className="text-sm font-medium">Completadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.tareasCompletadas}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.totalTareas > 0 ? Math.round((metrics.tareasCompletadas / metrics.totalTareas) * 100) : 0}% del total
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
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.tareasEnProgreso}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.horasReales}h trabajadas
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
              <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.progresoGeneral}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.tareasPendientes} pendientes
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 🔧 Filtros y controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 🏗️ Selector de proyecto */}
            <div className="lg:col-span-2">
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
            </div>
            
            {/* 🔍 Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tareas..."
                value={filtros.busqueda}
                onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* 📊 Filtro por estado */}
            <Select
              value={filtros.estado || ''}
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
              value={filtros.prioridad || ''}
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
          </div>
        </CardContent>
      </Card>

      {/* 📋 Lista de tareas */}
      {selectedProyectoServicio ? (
        <div className="space-y-6">
          {/* 📝 Lista principal de tareas */}
          <TareaList
               proyectoServicioId={selectedProyectoServicio}
               onTareaSelect={(tarea) => console.log('Tarea seleccionada:', tarea)}
               onTareaCreate={handleCreateTarea}
               onTareaEdit={handleEditTarea}
               showActions={true}
               compact={false}
             />
          
          <Separator />
          
          {/* 📂 Acordeón de subtareas */}
          {tareas.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Subtareas por Tarea</h2>
              <SubtareaAccordion
                tareas={tareas}
                usuarios={usuarios}
                onSubtareaChange={(tareaId, subtareas) => {
                  // Actualizar el progreso de la tarea padre si es necesario
                  loadTareas()
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Selecciona un Proyecto</h3>
              <p className="text-muted-foreground">
                Selecciona un proyecto para ver y gestionar sus tareas
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 📝 Modal del formulario de tarea */}
      <Dialog open={showTareaForm} onOpenChange={setShowTareaForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}
            </DialogTitle>
          </DialogHeader>
          
          <TareaForm
            proyectoServicioId={selectedProyectoServicio}
            tarea={editingTarea}
            usuarios={usuarios}
            onSuccess={handleTareaFormSuccess}
            onCancel={() => setShowTareaForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TareasPage