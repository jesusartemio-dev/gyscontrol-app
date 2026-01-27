'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Award,
  RefreshCw
} from 'lucide-react'

interface MetricaProgreso {
  periodo: string
  periodoKey?: string
  horasRegistradas: number
  horasObjetivo: number
  tareasCompletadas: number
  tareasAsignadas: number
  eficiencia: number
  tendencia: 'up' | 'down' | 'stable'
}

interface ProyectoProgreso {
  id?: string
  nombre: string
  codigo?: string
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

interface ProgresoPersonalDashboardProps {
  metricas?: MetricaProgreso[]
  proyectos?: ProyectoProgreso[]
  logros?: Logro[]
  objetivos?: Objetivo[]
  loading?: boolean
  onRecargar?: () => void
}

export function ProgresoPersonalDashboard({
  metricas = [],
  proyectos = [],
  logros = [],
  objetivos = [],
  loading = false,
  onRecargar
}: ProgresoPersonalDashboardProps) {
  const [periodoActivo, setPeriodoActivo] = useState('semana')

  const metricaActual = metricas.find(m => {
    switch (periodoActivo) {
      case 'semana': return m.periodo === 'Esta semana' || m.periodoKey === 'semana'
      case 'mes': return m.periodo === 'Este mes' || m.periodoKey === 'mes'
      default: return m.periodo === 'Esta semana'
    }
  }) || metricas[0]

  const getEficienciaColor = (eficiencia: number) => {
    if (eficiencia >= 90) return 'text-green-600'
    if (eficiencia >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getLogroIcon = (tipo: string) => {
    switch (tipo) {
      case 'tareas': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'eficiencia': return <TrendingUp className="h-5 w-5 text-blue-500" />
      case 'horas': return <Clock className="h-5 w-5 text-purple-500" />
      default: return <Award className="h-5 w-5 text-yellow-500" />
    }
  }

  const getObjetivoIcon = (tipo: string) => {
    switch (tipo) {
      case 'tareas': return <Target className="h-5 w-5 text-orange-500" />
      case 'horas': return <Clock className="h-5 w-5 text-blue-500" />
      case 'eficiencia': return <TrendingUp className="h-5 w-5 text-green-500" />
      default: return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 w-8 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 w-12 bg-gray-300 rounded mb-1"></div>
                  <div className="h-4 w-20 bg-gray-300 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selector de periodo con boton actualizar */}
      <div className="flex items-center justify-between">
        <Tabs value={periodoActivo} onValueChange={setPeriodoActivo} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="semana">Esta Semana</TabsTrigger>
            <TabsTrigger value="mes">Este Mes</TabsTrigger>
            <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
          </TabsList>
        </Tabs>
        {onRecargar && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRecargar}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        )}
      </div>

      {/* Contenido segun tab */}
      {periodoActivo === 'comparativa' ? (
        <ComparativaMetricas metricas={metricas} />
      ) : (
        metricaActual && <MetricaCard metrica={metricaActual} />
      )}

      {/* Proyectos activos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progreso por Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {proyectos.length > 0 ? (
            proyectos.map((proyecto, index) => (
              <div key={proyecto.id || index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    {proyecto.codigo ? `${proyecto.codigo} - ` : ''}{proyecto.nombre}
                  </h3>
                  <Badge variant="outline">
                    {proyecto.progreso}% completado
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Horas</p>
                    <p className="font-medium">
                      {proyecto.horasRegistradas}h / {proyecto.horasObjetivo}h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tareas</p>
                    <p className="font-medium">
                      {proyecto.tareasCompletadas} / {proyecto.tareasTotal}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Eficiencia</p>
                    <p className={`font-medium ${getEficienciaColor(proyecto.progreso)}`}>
                      {proyecto.progreso}%
                    </p>
                  </div>
                </div>

                <Progress value={proyecto.progreso} className="h-2" />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No tienes proyectos con tareas asignadas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logros y objetivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Logros Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logros.length > 0 ? (
              logros.map((logro, index) => (
                <div key={index} className="flex items-center gap-3">
                  {getLogroIcon(logro.tipo)}
                  <div>
                    <p className="font-medium">{logro.titulo}</p>
                    <p className="text-sm text-gray-600">{logro.descripcion}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Award className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Completa tareas para desbloquear logros</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Proximos Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {objetivos.length > 0 ? (
              objetivos.map((objetivo, index) => (
                <div key={index} className="flex items-center gap-3">
                  {getObjetivoIcon(objetivo.tipo)}
                  <div>
                    <p className="font-medium">{objetivo.titulo}</p>
                    <p className="text-sm text-gray-600">{objetivo.descripcion}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm">Todos los objetivos completados!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricaCard({ metrica }: { metrica: MetricaProgreso }) {
  const getEficienciaColor = (eficiencia: number) => {
    if (eficiencia >= 90) return 'text-green-600'
    if (eficiencia >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{metrica.horasRegistradas}h</p>
              <p className="text-sm text-gray-600">Horas Registradas</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Objetivo: {metrica.horasObjetivo}h
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{metrica.tareasCompletadas}</p>
              <p className="text-sm text-gray-600">Tareas Completadas</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            De {metrica.tareasAsignadas} asignadas
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-bold ${getEficienciaColor(metrica.eficiencia)}`}>
                {metrica.eficiencia}%
              </p>
              <p className="text-sm text-gray-600">Eficiencia</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            {metrica.tendencia === 'up' && (
              <>
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Mejorando</span>
              </>
            )}
            {metrica.tendencia === 'down' && (
              <>
                <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
                <span className="text-red-600">Decreciendo</span>
              </>
            )}
            {metrica.tendencia === 'stable' && (
              <span className="text-gray-600">Estable</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {metrica.tareasAsignadas - metrica.tareasCompletadas}
              </p>
              <p className="text-sm text-gray-600">Tareas Pendientes</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ComparativaMetricas({ metricas }: { metricas: MetricaProgreso[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativa de Periodos</CardTitle>
      </CardHeader>
      <CardContent>
        {metricas.length > 0 ? (
          <div className="space-y-4">
            {metricas.map((metrica, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{metrica.periodo}</h3>
                  <div className="flex items-center gap-2">
                    {metrica.tendencia === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : metrica.tendencia === 'down' ? (
                      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-gray-400"></div>
                    )}
                    <span className="text-sm text-gray-600">
                      Eficiencia: {metrica.eficiencia}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
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
                    <span className="text-gray-600">Progreso:</span>
                    <Progress value={metrica.eficiencia} className="h-2 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No hay datos para comparar</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
