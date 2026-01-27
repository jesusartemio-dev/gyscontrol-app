'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Target, BarChart3, AlertCircle, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { ProgresoPersonalDashboard } from '@/components/tareas/ProgresoPersonalDashboard'
import { format } from 'date-fns'

interface MetricaProgreso {
  periodo: string
  periodoKey: string
  horasRegistradas: number
  horasObjetivo: number
  tareasCompletadas: number
  tareasAsignadas: number
  eficiencia: number
  tendencia: 'up' | 'down' | 'stable'
}

interface ProyectoProgreso {
  id: string
  nombre: string
  codigo: string
  horasRegistradas: number
  horasObjetivo: number
  progreso: number
  tareasCompletadas: number
  tareasTotal: number
}

interface Logro {
  tipo: string
  titulo: string
  descripcion: string
}

interface Objetivo {
  tipo: string
  titulo: string
  descripcion: string
}

interface Resumen {
  totalTareas: number
  tareasCompletadasSemana: number
  tareasCompletadasMes: number
  horasSemana: number
  horasMes: number
  eficienciaSemana: number
  eficienciaMes: number
}

export default function MiProgresoPage() {
  const [metricas, setMetricas] = useState<MetricaProgreso[]>([])
  const [proyectos, setProyectos] = useState<ProyectoProgreso[]>([])
  const [logros, setLogros] = useState<Logro[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()

  // Cargar datos de progreso
  const cargarProgreso = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tareas/mi-progreso')

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: 'No autorizado',
            description: 'Debe iniciar sesion para ver su progreso',
            variant: 'destructive'
          })
          return
        }
        throw new Error('Error al cargar progreso')
      }

      const data = await response.json()

      if (data.success) {
        setMetricas(data.data.metricas)
        setProyectos(data.data.proyectos)
        setLogros(data.data.logros)
        setObjetivos(data.data.objetivos)
        setResumen(data.data.resumen)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error cargando progreso:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el progreso personal',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos cuando hay sesion
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

    cargarProgreso()
  }, [status, session])

  // Exportar a CSV
  const exportarCSV = () => {
    if (metricas.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay datos para exportar',
        variant: 'destructive'
      })
      return
    }

    const csvRows = [
      '=== METRICAS POR PERIODO ===',
      'Periodo,Horas Registradas,Horas Objetivo,Tareas Completadas,Tareas Asignadas,Eficiencia,Tendencia'
    ]

    metricas.forEach(m => {
      csvRows.push(
        `"${m.periodo}",${m.horasRegistradas},${m.horasObjetivo},${m.tareasCompletadas},${m.tareasAsignadas},${m.eficiencia}%,"${m.tendencia}"`
      )
    })

    csvRows.push('')
    csvRows.push('=== PROGRESO POR PROYECTO ===')
    csvRows.push('Codigo,Proyecto,Horas Registradas,Horas Objetivo,Progreso,Tareas Completadas,Tareas Total')

    proyectos.forEach(p => {
      csvRows.push(
        `"${p.codigo}","${p.nombre}",${p.horasRegistradas},${p.horasObjetivo},${p.progreso}%,${p.tareasCompletadas},${p.tareasTotal}`
      )
    })

    if (resumen) {
      csvRows.push('')
      csvRows.push('=== RESUMEN ===')
      csvRows.push(`Total Tareas Asignadas,${resumen.totalTareas}`)
      csvRows.push(`Tareas Completadas Semana,${resumen.tareasCompletadasSemana}`)
      csvRows.push(`Tareas Completadas Mes,${resumen.tareasCompletadasMes}`)
      csvRows.push(`Horas Semana,${resumen.horasSemana}`)
      csvRows.push(`Horas Mes,${resumen.horasMes}`)
      csvRows.push(`Eficiencia Semana,${resumen.eficienciaSemana}%`)
      csvRows.push(`Eficiencia Mes,${resumen.eficienciaMes}%`)
    }

    const csvContent = csvRows.join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mi-progreso-${format(new Date(), 'yyyy-MM-dd')}.csv`
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
                Debe iniciar sesion para ver su progreso personal.
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
          <h1 className="text-3xl font-bold text-gray-900">Mi Progreso</h1>
          <p className="text-gray-600 mt-1">
            Analiza tu rendimiento y productividad a lo largo del tiempo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportarCSV}
            disabled={metricas.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => router.push('/mi-trabajo/tareas')}>
            <Target className="h-4 w-4 mr-2" />
            Ver Tareas
          </Button>
        </div>
      </div>

      {/* Informacion del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">Metricas Detalladas</p>
                <p className="text-sm text-gray-600">
                  Horas, tareas y eficiencia por periodo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-lg font-semibold">Seguimiento de Objetivos</p>
                <p className="text-sm text-gray-600">
                  Compara tu rendimiento vs metas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-lg font-semibold">Analisis Comparativo</p>
                <p className="text-sm text-gray-600">
                  Tendencias y evolucion temporal
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard de progreso personal */}
      <ProgresoPersonalDashboard
        metricas={metricas}
        proyectos={proyectos}
        logros={logros}
        objetivos={objetivos}
        loading={loading}
        onRecargar={cargarProgreso}
      />
    </div>
  )
}
