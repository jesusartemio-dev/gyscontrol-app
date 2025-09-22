'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, RefreshCw, Settings } from 'lucide-react'
import { FasesList } from './FasesList'
import { EdtsPorFase } from './EdtsPorFase'
import { TareasPorProyecto } from './TareasPorProyecto'
import { GanttPorFases } from './GanttPorFases'
import { CronogramaComparisonView } from './CronogramaComparisonView'
import { FaseFormModal } from './FaseFormModal'
import { toast } from '@/hooks/use-toast'
import type { Proyecto } from '@/types/modelos'

// ✅ Tipos locales
interface ProyectoFase {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: 'planificado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado'
  porcentajeAvance: number
  createdAt: string
  updatedAt: string
  edts: any[]
  metricas: {
    totalEdts: number
    edtsCompletados: number
    progresoFase: number
    horasPlanTotal: number
    horasRealesTotal: number
  }
}

interface ProyectoFasesViewProps {
  proyectoId: string
  proyecto: Proyecto
}

type VistaActiva = 'fases' | 'edts' | 'tareas' | 'gantt' | 'comparacion'
type ModalActivo = 'crear_fase' | 'editar_fase' | null

export function ProyectoFasesView({ proyectoId, proyecto }: ProyectoFasesViewProps) {
  // ✅ Estados principales
  const [fases, setFases] = useState<ProyectoFase[]>([])
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('fases')
  const [modalActivo, setModalActivo] = useState<ModalActivo>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [faseSeleccionada, setFaseSeleccionada] = useState<ProyectoFase | null>(null)

  // ✅ Cargar fases
  const cargarFases = async (mostrarLoading = true) => {
    if (mostrarLoading) setLoading(true)
    if (!mostrarLoading) setRefreshing(true)

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/fases`)
      const result = await response.json()

      if (result.success) {
        setFases(result.data || [])
        toast({
          title: 'Datos actualizados',
          description: 'Las fases del proyecto han sido actualizadas correctamente'
        })
      } else {
        throw new Error(result.error || 'Error al cargar fases')
      }
    } catch (error) {
      console.error('Error al cargar fases:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las fases del proyecto',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ✅ Efectos
  useEffect(() => {
    cargarFases()
  }, [proyectoId])

  // ✅ Handlers de fases
  const handleCrearFase = async (data: any) => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/fases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        await cargarFases(false)
        setModalActivo(null)
        toast({
          title: 'Fase creada',
          description: 'La fase ha sido creada correctamente'
        })
      } else {
        throw new Error(result.error || 'Error al crear fase')
      }
    } catch (error) {
      console.error('Error al crear fase:', error)
      throw error // Re-throw para que el modal lo maneje
    }
  }

  const handleEditarFase = (fase: ProyectoFase) => {
    setFaseSeleccionada(fase)
    setModalActivo('editar_fase')
  }

  const handleActualizarFase = async (data: any) => {
    if (!faseSeleccionada) return

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/fases/${faseSeleccionada.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        await cargarFases(false)
        setModalActivo(null)
        setFaseSeleccionada(null)
        toast({
          title: 'Fase actualizada',
          description: 'La fase ha sido actualizada correctamente'
        })
      } else {
        throw new Error(result.error || 'Error al actualizar fase')
      }
    } catch (error) {
      console.error('Error al actualizar fase:', error)
      throw error // Re-throw para que el modal lo maneje
    }
  }

  const handleEliminarFase = async (faseId: string) => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/fases/${faseId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await cargarFases(false)
        toast({
          title: 'Fase eliminada',
          description: 'La fase ha sido eliminada correctamente'
        })
      } else {
        throw new Error(result.error || 'Error al eliminar fase')
      }
    } catch (error) {
      console.error('Error al eliminar fase:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la fase',
        variant: 'destructive'
      })
    }
  }

  // ✅ Estadísticas rápidas
  const estadisticas = {
    totalFases: fases.length,
    fasesCompletadas: fases.filter(f => f.estado === 'completado').length,
    progresoGeneral: fases.length > 0 ?
      fases.reduce((sum, f) => sum + f.metricas.progresoFase, 0) / fases.length : 0,
    totalEdts: fases.reduce((sum, f) => sum + f.metricas.totalEdts, 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ✅ Header con estadísticas y acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {estadisticas.totalFases} fases • {estadisticas.totalEdts} EDTs • {estadisticas.fasesCompletadas} completadas
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarFases(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalActivo('crear_fase')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Fase
          </Button>
        </div>
      </div>

      {/* ✅ Navegación por tabs */}
      <Tabs value={vistaActiva} onValueChange={(value) => setVistaActiva(value as VistaActiva)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fases">📋 Fases</TabsTrigger>
          <TabsTrigger value="edts">🔧 EDTs por Fase</TabsTrigger>
          <TabsTrigger value="tareas">📝 Tareas</TabsTrigger>
          <TabsTrigger value="gantt">📊 Gantt Jerárquico</TabsTrigger>
          <TabsTrigger value="comparacion">📈 Comparación</TabsTrigger>
        </TabsList>

        {/* ✅ Vista Fases */}
        <TabsContent value="fases" className="space-y-6 mt-6">
          <FasesList
            fases={fases}
            onFaseEdit={handleEditarFase}
            onFaseDelete={handleEliminarFase}
            onRefresh={() => cargarFases(false)}
          />
        </TabsContent>

        {/* ✅ Vista EDTs por Fase */}
        <TabsContent value="edts" className="space-y-6 mt-6">
          <EdtsPorFase
            fases={fases}
            proyectoId={proyectoId}
            onRefresh={() => cargarFases(false)}
          />
        </TabsContent>

        {/* ✅ Vista Tareas */}
        <TabsContent value="tareas" className="space-y-6 mt-6">
          <TareasPorProyecto
            fases={fases}
            proyectoId={proyectoId}
            onRefresh={() => cargarFases(false)}
          />
        </TabsContent>

        {/* ✅ Vista Gantt Jerárquico */}
        <TabsContent value="gantt" className="space-y-6 mt-6">
          <GanttPorFases
            fases={fases}
            proyectoId={proyectoId}
          />
        </TabsContent>

        {/* ✅ Vista Comparación */}
        <TabsContent value="comparacion" className="space-y-6 mt-6">
          <CronogramaComparisonView
            proyectoId={proyectoId}
          />
        </TabsContent>
      </Tabs>

      {/* ✅ Modal para crear fase */}
      <FaseFormModal
        open={modalActivo === 'crear_fase'}
        onOpenChange={() => setModalActivo(null)}
        onSubmit={handleCrearFase}
        proyecto={proyecto}
      />

      {/* ✅ Modal para editar fase */}
      <FaseFormModal
        open={modalActivo === 'editar_fase'}
        onOpenChange={() => {
          setModalActivo(null)
          setFaseSeleccionada(null)
        }}
        onSubmit={handleActualizarFase}
        fase={faseSeleccionada}
        proyecto={proyecto}
      />
    </div>
  )
}