'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  BarChart3,
  Award
} from 'lucide-react'
import { format, subDays, subWeeks, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

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

interface ProgresoPersonalDashboardProps {
  metricas?: MetricaProgreso[]
  proyectos?: ProyectoProgreso[]
  loading?: boolean
}

export function ProgresoPersonalDashboard({ 
  metricas = [], 
  proyectos = [],
  loading = false
}: ProgresoPersonalDashboardProps) {
  const [periodoActivo, setPeriodoActivo] = useState('semana')

  const metricaActual = metricas.find(m => {
    switch (periodoActivo) {
      case 'semana': return m.periodo === 'Esta semana'
      case 'mes': return m.periodo === 'Este mes'
      default: return m.periodo === 'Esta semana'
    }
  }) || metricas[0]

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default: return <div className="h-4 w-4 rounded-full bg-gray-400"></div>
    }
  }

  const getEficienciaColor = (eficiencia: number) => {
    if (eficiencia >= 90) return 'text-green-600'
    if (eficiencia >= 75) return 'text-yellow-600'
    return 'text-red-600'
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
      {/* Selector de período */}
      <Tabs value={periodoActivo} onValueChange={setPeriodoActivo}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="semana">Esta Semana</TabsTrigger>
          <TabsTrigger value="mes">Este Mes</TabsTrigger>
          <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
        </TabsList>

        <TabsContent value="semana" className="space-y-6">
          <MetricaCard metrica={metricaActual} />
        </TabsContent>

        <TabsContent value="mes" className="space-y-6">
          <MetricaCard metrica={metricas.find(m => m.periodo === 'Este mes') || metricaActual} />
        </TabsContent>

        <TabsContent value="comparativa" className="space-y-6">
          <ComparativaMetricas metricas={metricas} />
        </TabsContent>
      </Tabs>

      {/* Proyectos activos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progreso por Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {proyectos.map((proyecto, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{proyecto.nombre}</h3>
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
          ))}
        </CardContent>
      </Card>

      {/* Objetivos y logros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Logros Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">5 tareas completadas esta semana</p>
                <p className="text-sm text-gray-600">¡Excelente rendimiento!</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Eficiencia por encima del 80%</p>
                <p className="text-sm text-gray-600">Meta cumplida</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">120 horas registradas este mes</p>
                <p className="text-sm text-gray-600">Próximo objetivo: 160h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Próximos Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Completar 3 tareas pendientes</p>
                <p className="text-sm text-gray-600">Vencimiento: {format(new Date(), 'dd/MM/yyyy', { locale: es })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Registrar 8 horas esta semana</p>
                <p className="text-sm text-gray-600">Faltan 3 horas para la meta</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Mantener eficiencia: 75%</p>
                <p className="text-sm text-gray-600">Actual: 80%</p>
              </div>
            </div>
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
        <CardTitle>Comparativa de Períodos</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}