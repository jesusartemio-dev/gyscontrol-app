'use client'

/**
 * AnalisisTransversalEdt - Dashboard de análisis transversal por EDT
 * 
 * Resuelve el problema del usuario: ver horas y costos por EDT (PLC, HMI, ING)
 * a través de múltiples proyectos con filtros por fecha
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  Calendar,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AnalisisEdt {
  categoria: string
  totalHorasPlanificadas: number
  totalHorasReales: number
  totalProyectos: number
  proyectos: Array<{
    codigo: string
    nombre: string
    horasReales: number
  }>
  costoTotalCalculado: number
  variacionHoras: number
  variacionPorcentual: number
}

interface EstadisticasGlobales {
  totalEdts: number
  totalProyectos: number
  totalHorasReales: number
  totalHorasPlanificadas: number
  costoTotal: number
}

interface AnalisisTransversalData {
  resumenTransversal: AnalisisEdt[]
  estadisticas: EstadisticasGlobales
}

export function AnalisisTransversalEdt() {
  const [data, setData] = useState<AnalisisTransversalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtros, setFiltros] = useState({
    fechaInicio: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    soloActivos: true
  })

  const { toast } = useToast()

  const cargarAnalisis = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        incluirHoras: 'true',
        soloActivos: filtros.soloActivos.toString(),
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin
      })

      const response = await fetch(`/api/horas-hombre/edts-unificados?${params}`)
      
      if (!response.ok) {
        throw new Error('Error cargando análisis')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Error en respuesta')
      }
    } catch (error) {
      console.error('Error cargando análisis transversal:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el análisis transversal',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarAnalisis()
  }, [])

  const aplicarFiltros = () => {
    cargarAnalisis()
  }

  const exportarAnalisis = async () => {
    if (!data) return

    try {
      // Crear CSV con los datos
      const csvContent = [
        'Categoría EDT,Total Horas Planificadas,Total Horas Reales,Variación,Total Proyectos,Costo Total Calculado',
        ...data.resumenTransversal.map(edt => 
          `${edt.categoria},${edt.totalHorasPlanificadas},${edt.totalHorasReales},${edt.variacionHoras},${edt.totalProyectos},${edt.costoTotalCalculado.toFixed(2)}`
        )
      ].join('\n')

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analisis-edt-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Éxito',
        description: 'Análisis exportado correctamente'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar el análisis',
        variant: 'destructive'
      })
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando análisis transversal...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análisis Transversal por EDT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={aplicarFiltros} disabled={loading}>
                <Filter className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={exportarAnalisis} disabled={!data}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {/* Estadísticas globales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{data.estadisticas.totalEdts}</div>
                    <div className="text-sm text-gray-600">EDTs Activos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{data.estadisticas.totalProyectos}</div>
                    <div className="text-sm text-gray-600">Proyectos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{data.estadisticas.totalHorasReales.toFixed(1)}h</div>
                    <div className="text-sm text-gray-600">Horas Reales</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">${data.estadisticas.costoTotal.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Costo Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Análisis por EDT */}
          <Card>
            <CardHeader>
              <CardTitle>Análisis por Categoría EDT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.resumenTransversal.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p>No se encontraron datos para los filtros seleccionados</p>
                  </div>
                ) : (
                  data.resumenTransversal.map((edt, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      {/* Header del EDT */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-lg font-semibold">
                            {edt.categoria}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {edt.totalProyectos} proyectos
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${edt.costoTotalCalculado.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Costo Total</div>
                        </div>
                      </div>

                      {/* Métricas */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Horas Planificadas</div>
                          <div className="text-xl font-semibold">{edt.totalHorasPlanificadas.toFixed(1)}h</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Horas Reales</div>
                          <div className="text-xl font-semibold">{edt.totalHorasReales.toFixed(1)}h</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Variación</div>
                          <div className={`text-xl font-semibold ${
                            edt.variacionHoras > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {edt.variacionHoras > 0 ? '+' : ''}{edt.variacionHoras.toFixed(1)}h 
                            ({edt.variacionPorcentual > 0 ? '+' : ''}{edt.variacionPorcentual.toFixed(1)}%)
                          </div>
                        </div>
                      </div>

                      {/* Progreso vs Planificado */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progreso vs Planificado</span>
                          <span>{edt.totalHorasPlanificadas > 0 
                            ? ((edt.totalHorasReales / edt.totalHorasPlanificadas) * 100).toFixed(1) 
                            : 0}%
                          </span>
                        </div>
                        <Progress 
                          value={edt.totalHorasPlanificadas > 0 
                            ? Math.min((edt.totalHorasReales / edt.totalHorasPlanificadas) * 100, 100) 
                            : 0} 
                          className="h-2"
                        />
                      </div>

                      {/* Proyectos relacionados */}
                      <div>
                        <div className="text-sm font-medium mb-2">Proyectos:</div>
                        <div className="flex flex-wrap gap-2">
                          {edt.proyectos.map((proyecto, pIndex) => (
                            <Badge key={pIndex} variant="secondary" className="text-xs">
                              {proyecto.codigo} ({proyecto.horasReales.toFixed(1)}h)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumen ejecutivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumen Ejecutivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">EDTs con Mayor Consumo de Horas</h4>
                  <div className="space-y-2">
                    {data.resumenTransversal
                      .sort((a, b) => b.totalHorasReales - a.totalHorasReales)
                      .slice(0, 3)
                      .map((edt, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{edt.categoria}</span>
                          <span className="text-blue-600 font-semibold">{edt.totalHorasReales.toFixed(1)}h</span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">EDTs con Mayor Costo</h4>
                  <div className="space-y-2">
                    {data.resumenTransversal
                      .sort((a, b) => b.costoTotalCalculado - a.costoTotalCalculado)
                      .slice(0, 3)
                      .map((edt, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{edt.categoria}</span>
                          <span className="text-green-600 font-semibold">${edt.costoTotalCalculado.toLocaleString()}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}