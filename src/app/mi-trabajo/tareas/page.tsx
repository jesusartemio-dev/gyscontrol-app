'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckSquare, TrendingUp, Filter, AlertCircle, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { TareasAsignadasDashboard } from '@/components/tareas/TareasAsignadasDashboard'
import { format } from 'date-fns'

interface TareaAsignada {
  id: string
  nombre: string
  descripcion?: string
  tipo: 'proyecto_tarea' | 'tarea'
  proyectoId: string
  proyectoNombre: string
  edtNombre: string
  responsableId?: string
  responsableNombre?: string
  fechaInicio: Date
  fechaFin: Date
  horasPlan: number
  horasReales: number
  progreso: number
  estado: string
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  diasRestantes: number
}

interface Metricas {
  totalTareas: number
  tareasActivas: number
  tareasCompletadas: number
  tareasProximasVencer: number
  tareasVencidas: number
  horasRegistradas: number
}

export default function MisTareasPage() {
  const [tareas, setTareas] = useState<TareaAsignada[]>([])
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()

  // Cargar tareas asignadas al usuario
  const cargarTareas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tareas/mis-asignadas')

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: 'No autorizado',
            description: 'Debe iniciar sesion para ver sus tareas',
            variant: 'destructive'
          })
          return
        }
        throw new Error('Error al cargar tareas')
      }

      const data = await response.json()

      if (data.success) {
        setTareas(data.data.tareas)
        setMetricas(data.data.metricas)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error cargando tareas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas asignadas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar tareas cuando hay sesion
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      toast({
        title: 'No autenticado',
        description: 'Debe iniciar sesion para acceder a esta pagina',
        variant: 'destructive'
      })
      setLoading(false)
      return
    }

    cargarTareas()
  }, [status, session])

  // Marcar tarea como completada
  const marcarCompletada = async (tareaId: string, tipo: string) => {
    try {
      const response = await fetch('/api/tareas/mis-asignadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareaId,
          tipo,
          estado: 'completada'
        })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar tarea')
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Tarea completada',
          description: 'La tarea ha sido marcada como completada'
        })
        cargarTareas() // Recargar lista
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarea',
        variant: 'destructive'
      })
    }
  }

  // Exportar a CSV
  const exportarCSV = () => {
    if (tareas.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay tareas para exportar',
        variant: 'destructive'
      })
      return
    }

    const csvRows = [
      'Nombre,Proyecto,EDT,Estado,Prioridad,Fecha Inicio,Fecha Fin,Dias Restantes,Horas Plan,Horas Reales,Progreso'
    ]

    tareas.forEach(t => {
      csvRows.push(
        `"${t.nombre}","${t.proyectoNombre}","${t.edtNombre}","${t.estado}","${t.prioridad}","${format(new Date(t.fechaInicio), 'dd/MM/yyyy')}","${format(new Date(t.fechaFin), 'dd/MM/yyyy')}",${t.diasRestantes},${t.horasPlan},${t.horasReales},${t.progreso}%`
      )
    })

    if (metricas) {
      csvRows.push('')
      csvRows.push('Resumen')
      csvRows.push(`Total Tareas,${metricas.totalTareas}`)
      csvRows.push(`Tareas Activas,${metricas.tareasActivas}`)
      csvRows.push(`Tareas Completadas,${metricas.tareasCompletadas}`)
      csvRows.push(`Proximas a Vencer,${metricas.tareasProximasVencer}`)
      csvRows.push(`Vencidas,${metricas.tareasVencidas}`)
      csvRows.push(`Horas Registradas,${metricas.horasRegistradas}`)
    }

    const csvContent = csvRows.join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mis-tareas-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Exportado',
      description: 'Archivo CSV descargado correctamente'
    })
  }

  // Si no hay sesion, mostrar mensaje
  if (!session?.user && status !== 'loading') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Acceso Denegado
              </h2>
              <p className="text-gray-600">
                Debe iniciar sesion para ver sus tareas asignadas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Tareas</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tus tareas asignadas y registra horas trabajadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportarCSV}
            disabled={tareas.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => router.push('/mi-trabajo/progreso')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Ver Progreso
          </Button>
        </div>
      </div>

      {/* Informacion del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">Gestion Completa</p>
                <p className="text-sm text-gray-600">
                  Todas tus tareas asignadas en un solo lugar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-lg font-semibold">Seguimiento de Progreso</p>
                <p className="text-sm text-gray-600">
                  Monitorea el avance y fechas de vencimiento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-lg font-semibold">Filtros Inteligentes</p>
                <p className="text-sm text-gray-600">
                  Filtra por prioridad y estado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard de tareas asignadas */}
      <TareasAsignadasDashboard
        tareas={tareas}
        metricas={metricas}
        loading={loading}
        onMarcarCompletada={marcarCompletada}
        onRecargar={cargarTareas}
      />
    </div>
  )
}
