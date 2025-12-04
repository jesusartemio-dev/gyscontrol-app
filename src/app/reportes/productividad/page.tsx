'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Award,
  AlertTriangle,
  Calendar,
  Download,
  Filter
} from 'lucide-react'
import { format, subDays, subWeeks, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface MetricaProductividad {
  periodo: string
  horasRegistradas: number
  horasObjetivo: number
  eficiencia: number
  tareasCompletadas: number
  tareasAsignadas: number
  proyectosActivos: number
  miembrosActivos: number
  tendencia: 'up' | 'down' | 'stable'
}

interface ProyectoAnalytics {
  nombre: string
  progreso: number
  horasRegistradas: number
  horasObjetivo: number
  miembrosActivos: number
  eficienciaPromedio: number
  fechaInicio: Date
  fechaFin: Date
  estado: string
}

interface MiembroAnalytics {
  nombre: string
  rol: string
  horasRegistradas: number
  horasObjetivo: number
  eficiencia: number
  tareasCompletadas: number
  tareasAsignadas: number
  proyectosActivos: number
  ultimoRegistro: Date
  estado: 'excelente' | 'bueno' | 'regular' | 'bajo'
}

export default function ReportesProductividadPage() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes')
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState('todos')
  const [metricas, setMetricas] = useState<MetricaProductividad[]>([])
  const [proyectos, setProyectos] = useState<ProyectoAnalytics[]>([])
  const [miembros, setMiembros] = useState<MiembroAnalytics[]>([])

  // Simulación de datos
  useEffect(() => {
    const metricasSimuladas: MetricaProductividad[] = [
      {
        periodo: 'Esta semana',
        horasRegistradas: 245,
        horasObjetivo: 280,
        eficiencia: 88,
        tareasCompletadas: 42,
        tareasAsignadas: 48,
        proyectosActivos: 5,
        miembrosActivos: 12,
        tendencia: 'up'
      },
      {
        periodo: 'Semana anterior',
        horasRegistradas: 220,
        horasObjetivo: 280,
        eficiencia: 79,
        tareasCompletadas: 38,
        tareasAsignadas: 45,
        proyectosActivos: 4,
        miembrosActivos: 11,
        tendencia: 'stable'
      },
      {
        periodo: 'Este mes',
        horasRegistradas: 980,
        horasObjetivo: 1120,
        eficiencia: 88,
        tareasCompletadas: 165,
        tareasAsignadas: 190,
        proyectosActivos: 8,
        miembrosActivos: 15,
        tendencia: 'up'
      },
      {
        periodo: 'Mes anterior',
        horasRegistradas: 850,
        horasObjetivo: 1120,
        eficiencia: 76,
        tareasCompletadas: 142,
        tareasAsignadas: 175,
        proyectosActivos: 6,
        miembrosActivos: 13,
        tendencia: 'up'
      }
    ]

    const proyectosSimulados: ProyectoAnalytics[] = [
      {
        nombre: 'Centro de Datos ABC',
        progreso: 85,
        horasRegistradas: 450,
        horasObjetivo: 500,
        miembrosActivos: 8,
        eficienciaPromedio: 90,
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-03-01'),
        estado: 'en_ejecucion'
      },
      {
        nombre: 'Oficinas Corporativas XYZ',
        progreso: 65,
        horasRegistradas: 280,
        horasObjetivo: 400,
        miembrosActivos: 5,
        eficienciaPromedio: 78,
        fechaInicio: new Date('2025-01-15'),
        fechaFin: new Date('2025-04-15'),
        estado: 'en_ejecucion'
      },
      {
        nombre: 'Modernización Sistema Eléctrico',
        progreso: 45,
        horasRegistradas: 180,
        horasObjetivo: 350,
        miembrosActivos: 4,
        eficienciaPromedio: 65,
        fechaInicio: new Date('2025-02-01'),
        fechaFin: new Date('2025-05-01'),
        estado: 'en_ejecucion'
      }
    ]

    const miembrosSimulados: MiembroAnalytics[] = [
      {
        nombre: 'Juan Pérez',
        rol: 'Ingeniero Senior',
        horasRegistradas: 85,
        horasObjetivo: 80,
        eficiencia: 106,
        tareasCompletadas: 12,
        tareasAsignadas: 12,
        proyectosActivos: 2,
        ultimoRegistro: new Date('2025-01-15'),
        estado: 'excelente'
      },
      {
        nombre: 'María García',
        rol: 'Coordinadora',
        horasRegistradas: 75,
        horasObjetivo: 80,
        eficiencia: 94,
        tareasCompletadas: 18,
        tareasAsignadas: 20,
        proyectosActivos: 3,
        ultimoRegistro: new Date('2025-01-15'),
        estado: 'excelente'
      },
      {
        nombre: 'Carlos López',
        rol: 'Técnico',
        horasRegistradas: 45,
        horasObjetivo: 80,
        eficiencia: 56,
        tareasCompletadas: 6,
        tareasAsignadas: 12,
        proyectosActivos: 1,
        ultimoRegistro: new Date('2025-01-12'),
        estado: 'bajo'
      }
    ]

    setMetricas(metricasSimuladas)
    setProyectos(proyectosSimulados)
    setMiembros(miembrosSimulados)
  }, [])

  const metricaActual = metricas.find(m => {
    switch (periodoSeleccionado) {
      case 'semana': return m.periodo === 'Esta semana'
      case 'mes': return m.periodo === 'Este mes'
      default: return m.periodo === 'Este mes'
    }
  }) || metricas[0]

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'excelente': return 'bg-green-100 text-green-800'
      case 'bueno': return 'bg-blue-100 text-blue-800'
      case 'regular': return 'bg-yellow-100 text-yellow-800'
      case 'bajo': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <div className="h-4 w-4 rounded-full bg-gray-400"></div>
    }
  }

  const miembrosBajoRendimiento = miembros.filter(m => m.estado === 'bajo' || m.estado === 'regular')
  const proyectosAtrasados = proyectos.filter(p => p.progreso < 50)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes de Productividad</h1>
          <p className="text-gray-600 mt-1">
            Análisis detallado del rendimiento del equipo y proyectos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mes</SelectItem>
              <SelectItem value="comparativa">Comparativa</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Alertas críticas */}
      {(miembrosBajoRendimiento.length > 0 || proyectosAtrasados.length > 0) && (
        <div className="space-y-3">
          {miembrosBajoRendimiento.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">
                      {miembrosBajoRendimiento.length} miembro{miembrosBajoRendimiento.length > 1 ? 's' : ''} con rendimiento por debajo del promedio
                    </p>
                    <p className="text-sm text-orange-700">
                      Eficiencia menor al 75%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {proyectosAtrasados.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">
                      {proyectosAtrasados.length} proyecto{proyectosAtrasados.length > 1 ? 's' : ''} atrasado{proyectosAtrasados.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-red-700">
                      Progreso menor al 50%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metricaActual.horasRegistradas}h</p>
                <p className="text-sm text-gray-600">Horas Registradas</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {getTendenciaIcon(metricaActual.tendencia)}
              <span className="text-xs text-gray-500">
                vs período anterior
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metricaActual.eficiencia}%</p>
                <p className="text-sm text-gray-600">Eficiencia General</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={metricaActual.eficiencia} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metricaActual.tareasCompletadas}</p>
                <p className="text-sm text-gray-600">Tareas Completadas</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              De {metricaActual.tareasAsignadas} asignadas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metricaActual.miembrosActivos}</p>
                <p className="text-sm text-gray-600">Miembros Activos</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              En {metricaActual.proyectosActivos} proyectos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido por tabs */}
      <Tabs defaultValue="proyectos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proyectos">Análisis por Proyecto</TabsTrigger>
          <TabsTrigger value="miembros">Análisis por Miembro</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="proyectos" className="space-y-4">
          {proyectos.map((proyecto, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{proyecto.nombre}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {proyecto.progreso}% completado
                    </Badge>
                    <Badge className={proyecto.estado === 'en_ejecucion' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {proyecto.estado}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Horas</p>
                    <p className="font-medium">
                      {proyecto.horasRegistradas}h / {proyecto.horasObjetivo}h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Miembros Activos</p>
                    <p className="font-medium">{proyecto.miembrosActivos}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Eficiencia Promedio</p>
                    <p className={`font-medium ${proyecto.eficienciaPromedio >= 80 ? 'text-green-600' : proyecto.eficienciaPromedio >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {proyecto.eficienciaPromedio}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha Fin</p>
                    <p className="font-medium">
                      {format(proyecto.fechaFin, 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <Progress value={proyecto.progreso} className="h-3" />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="miembros" className="space-y-4">
          {miembros.map((miembro, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold">{miembro.nombre}</h3>
                      <p className="text-sm text-gray-600">{miembro.rol}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{miembro.eficiencia}%</p>
                      <p className="text-sm text-gray-600">Eficiencia</p>
                    </div>
                    <Badge className={getEstadoColor(miembro.estado)}>
                      {miembro.estado}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Horas Registradas</p>
                    <p className="font-medium">{miembro.horasRegistradas}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tareas Completadas</p>
                    <p className="font-medium">{miembro.tareasCompletadas}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Proyectos Activos</p>
                    <p className="font-medium">{miembro.proyectosActivos}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Último Registro</p>
                    <p className="font-medium">
                      {format(miembro.ultimoRegistro, 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cumplimiento</p>
                    <p className="font-medium">
                      {Math.round((miembro.horasRegistradas / miembro.horasObjetivo) * 100)}%
                    </p>
                  </div>
                </div>

                <Progress value={miembro.eficiencia} className="h-2 mt-4" />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tendencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metricas.map((metrica, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{metrica.periodo}</h3>
                      <div className="flex items-center gap-2">
                        {getTendenciaIcon(metrica.tendencia)}
                        <span className="text-sm text-gray-600">
                          Eficiencia: {metrica.eficiencia}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Horas:</span>
                        <span className="font-medium ml-2">
                          {metrica.horasRegistradas}h / {metrica.horasObjetivo}h
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tareas:</span>
                        <span className="font-medium ml-2">
                          {metrica.tareasCompletadas} / {metrica.tareasAsignadas}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Proyectos:</span>
                        <span className="font-medium ml-2">
                          {metrica.proyectosActivos}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Miembros:</span>
                        <span className="font-medium ml-2">
                          {metrica.miembrosActivos}
                        </span>
                      </div>
                    </div>

                    <Progress value={metrica.eficiencia} className="h-2 mt-3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}