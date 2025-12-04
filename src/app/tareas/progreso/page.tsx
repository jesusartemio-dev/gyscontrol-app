'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Target, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ProgresoPersonalDashboard } from '@/components/tareas/ProgresoPersonalDashboard'

interface MetricaProgreso {
  periodo: string
  horasRegistradas: number
  horasObjetivo: number
  tareasCompletadas: number
  tareasAsignadas: number
  eficiencia: number
  tendencia: 'up' | 'down' | 'stable'
}

interface ProyectoProgreso {
  nombre: string
  horasRegistradas: number
  horasObjetivo: number
  progreso: number
  tareasCompletadas: number
  tareasTotal: number
}

export default function ProgresoPersonalPage() {
  const [metricas, setMetricas] = useState<MetricaProgreso[]>([])
  const [proyectos, setProyectos] = useState<ProyectoProgreso[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Simulación de datos
  useEffect(() => {
    const metricasSimuladas: MetricaProgreso[] = [
      {
        periodo: 'Esta semana',
        horasRegistradas: 32,
        horasObjetivo: 40,
        tareasCompletadas: 5,
        tareasAsignadas: 7,
        eficiencia: 80,
        tendencia: 'up'
      },
      {
        periodo: 'Semana anterior',
        horasRegistradas: 28,
        horasObjetivo: 40,
        tareasCompletadas: 4,
        tareasAsignadas: 6,
        eficiencia: 70,
        tendencia: 'stable'
      },
      {
        periodo: 'Este mes',
        horasRegistradas: 120,
        horasObjetivo: 160,
        tareasCompletadas: 18,
        tareasAsignadas: 22,
        eficiencia: 75,
        tendencia: 'up'
      }
    ]

    const proyectosSimulados: ProyectoProgreso[] = [
      {
        nombre: 'Centro de Datos ABC',
        horasRegistradas: 85,
        horasObjetivo: 100,
        progreso: 85,
        tareasCompletadas: 12,
        tareasTotal: 15
      },
      {
        nombre: 'Oficinas Corporativas XYZ',
        horasRegistradas: 45,
        horasObjetivo: 60,
        progreso: 75,
        tareasCompletadas: 8,
        tareasTotal: 12
      }
    ]

    setMetricas(metricasSimuladas)
    setProyectos(proyectosSimulados)
    setLoading(false)
  }, [])

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
          <Button variant="outline" onClick={() => router.push('/tareas/asignadas')}>
            <Target className="h-4 w-4 mr-2" />
            Ver Tareas
          </Button>
          <Button variant="outline" onClick={() => router.push('/tareas/equipo')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Ver Equipo
          </Button>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">Métricas Detalladas</p>
                <p className="text-sm text-gray-600">
                  Horas, tareas y eficiencia por período
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
                <p className="text-lg font-semibold">Análisis Comparativo</p>
                <p className="text-sm text-gray-600">
                  Tendencias y evolución temporal
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
        loading={loading}
      />
    </div>
  )
}