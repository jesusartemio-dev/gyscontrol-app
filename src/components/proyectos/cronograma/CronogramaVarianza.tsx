'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface VarianzaEntidad {
  nombre: string
  nivel: 'fase' | 'edt' | 'actividad' | 'tarea'
  faseNombre?: string
  edtNombre?: string
  actividadNombre?: string
  fechaInicioPlan: string | null
  fechaFinPlan: string | null
  fechaInicioReal: string | null
  fechaFinReal: string | null
  deltaIniciosDias: number | null
  deltaFinDias: number | null
  horasPlan: number
  horasReales: number
  deltaHoras: number
  porcentajePlan: number
  porcentajeReal: number
}

interface VarianzaKPIs {
  spiGlobal: number
  porcentajeATiempo: number
  porcentajeRetrasadas: number
  porcentajeAdelantadas: number
  varianzaTotalDias: number
  varianzaTotalHoras: number
  totalEntidades: number
}

interface VarianzaData {
  disponible: boolean
  baseline: { id: string; nombre: string }
  ejecucion: { id: string; nombre: string }
  kpis: VarianzaKPIs
  varianzas: VarianzaEntidad[]
}

interface CronogramaVarianzaProps {
  proyectoId: string
  proyectoNombre: string
}

export function CronogramaVarianza({ proyectoId, proyectoNombre }: CronogramaVarianzaProps) {
  const [data, setData] = useState<VarianzaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nivelFiltro, setNivelFiltro] = useState<'edt' | 'actividad' | 'tarea'>('edt')
  const { toast } = useToast()

  const fetchVarianza = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/varianza`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Error obteniendo varianza')
      }
      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVarianza()
  }, [proyectoId])

  const handleExportExcel = async () => {
    if (!data) return
    try {
      const { exportarVarianzaAExcel } = await import('@/lib/utils/cronogramaVarianzaExcel')
      exportarVarianzaAExcel({
        kpis: data.kpis,
        varianzas: data.varianzas,
        nombreProyecto: proyectoNombre
      })
      toast({ title: 'Excel exportado correctamente' })
    } catch (err) {
      toast({ title: 'Error al exportar', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Calculando varianza...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-amber-700">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchVarianza}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { kpis, varianzas } = data
  const filteredVarianzas = varianzas.filter(v => v.nivel === nivelFiltro)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  const getDeltaColor = (delta: number | null) => {
    if (delta === null) return 'text-gray-400'
    if (delta <= 0) return 'text-green-600'
    if (delta <= 5) return 'text-amber-600'
    return 'text-red-600'
  }

  const getDeltaBg = (delta: number | null) => {
    if (delta === null) return ''
    if (delta <= 0) return 'bg-green-50'
    if (delta <= 5) return 'bg-amber-50'
    return 'bg-red-50'
  }

  const getDeltaIcon = (delta: number | null) => {
    if (delta === null) return <Minus className="h-3 w-3" />
    if (delta < 0) return <ArrowDownRight className="h-3 w-3" />
    if (delta > 0) return <ArrowUpRight className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">SPI</p>
              {kpis.spiGlobal >= 1 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${kpis.spiGlobal >= 1 ? 'text-green-600' : kpis.spiGlobal >= 0.8 ? 'text-amber-600' : 'text-red-600'}`}>
              {kpis.spiGlobal.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">Schedule Performance Index</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">A Tiempo</p>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{kpis.porcentajeATiempo}%</p>
            <p className="text-[10px] text-muted-foreground">{kpis.totalEntidades} EDTs evaluados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Varianza Tiempo</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className={`text-2xl font-bold ${kpis.varianzaTotalDias <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {kpis.varianzaTotalDias > 0 ? '+' : ''}{kpis.varianzaTotalDias}d
            </p>
            <p className="text-[10px] text-muted-foreground">Retrasadas: {kpis.porcentajeRetrasadas}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Varianza Horas</p>
              <AlertTriangle className={`h-4 w-4 ${kpis.varianzaTotalHoras <= 0 ? 'text-green-500' : 'text-amber-500'}`} />
            </div>
            <p className={`text-2xl font-bold ${kpis.varianzaTotalHoras <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {kpis.varianzaTotalHoras > 0 ? '+' : ''}{kpis.varianzaTotalHoras.toFixed(1)}h
            </p>
            <p className="text-[10px] text-muted-foreground">Plan vs Real</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Nivel:</span>
          <Select value={nivelFiltro} onValueChange={(v) => setNivelFiltro(v as any)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edt">EDT</SelectItem>
              <SelectItem value="actividad">Actividad</SelectItem>
              <SelectItem value="tarea">Tarea</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">{filteredVarianzas.length} elementos</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportExcel}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Excel
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchVarianza}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabla de varianza */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {nivelFiltro !== 'edt' && <th className="text-left p-2 font-medium">Fase</th>}
                  {nivelFiltro === 'tarea' && <th className="text-left p-2 font-medium">EDT</th>}
                  <th className="text-left p-2 font-medium">
                    {nivelFiltro === 'edt' ? 'EDT' : nivelFiltro === 'actividad' ? 'Actividad' : 'Tarea'}
                  </th>
                  <th className="text-center p-2 font-medium">Inicio Plan</th>
                  <th className="text-center p-2 font-medium">Inicio Real</th>
                  <th className="text-center p-2 font-medium">Delta Inicio</th>
                  <th className="text-center p-2 font-medium">Fin Plan</th>
                  <th className="text-center p-2 font-medium">Fin Real</th>
                  <th className="text-center p-2 font-medium">Delta Fin</th>
                  <th className="text-right p-2 font-medium">H.Plan</th>
                  <th className="text-right p-2 font-medium">H.Real</th>
                  <th className="text-right p-2 font-medium">Delta H</th>
                  <th className="text-center p-2 font-medium">% Avance</th>
                </tr>
              </thead>
              <tbody>
                {filteredVarianzas.map((v, i) => (
                  <tr key={i} className={`border-b hover:bg-muted/30 ${getDeltaBg(v.deltaFinDias)}`}>
                    {nivelFiltro !== 'edt' && (
                      <td className="p-2 text-muted-foreground">{v.faseNombre || '-'}</td>
                    )}
                    {nivelFiltro === 'tarea' && (
                      <td className="p-2 text-muted-foreground">{v.edtNombre || '-'}</td>
                    )}
                    <td className="p-2 font-medium max-w-[200px] truncate" title={v.nombre}>{v.nombre}</td>
                    <td className="text-center p-2">{formatDate(v.fechaInicioPlan)}</td>
                    <td className="text-center p-2">{formatDate(v.fechaInicioReal)}</td>
                    <td className={`text-center p-2 font-medium ${getDeltaColor(v.deltaIniciosDias)}`}>
                      <span className="inline-flex items-center gap-0.5">
                        {getDeltaIcon(v.deltaIniciosDias)}
                        {v.deltaIniciosDias !== null ? `${v.deltaIniciosDias > 0 ? '+' : ''}${v.deltaIniciosDias}d` : '-'}
                      </span>
                    </td>
                    <td className="text-center p-2">{formatDate(v.fechaFinPlan)}</td>
                    <td className="text-center p-2">{formatDate(v.fechaFinReal)}</td>
                    <td className={`text-center p-2 font-medium ${getDeltaColor(v.deltaFinDias)}`}>
                      <span className="inline-flex items-center gap-0.5">
                        {getDeltaIcon(v.deltaFinDias)}
                        {v.deltaFinDias !== null ? `${v.deltaFinDias > 0 ? '+' : ''}${v.deltaFinDias}d` : '-'}
                      </span>
                    </td>
                    <td className="text-right p-2">{v.horasPlan > 0 ? v.horasPlan.toFixed(1) : '-'}</td>
                    <td className="text-right p-2">{v.horasReales > 0 ? v.horasReales.toFixed(1) : '-'}</td>
                    <td className={`text-right p-2 font-medium ${v.deltaHoras > 0 ? 'text-red-600' : v.deltaHoras < 0 ? 'text-green-600' : ''}`}>
                      {v.horasPlan > 0 || v.horasReales > 0
                        ? `${v.deltaHoras > 0 ? '+' : ''}${v.deltaHoras.toFixed(1)}`
                        : '-'
                      }
                    </td>
                    <td className="text-center p-2">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              v.porcentajeReal >= 100 ? 'bg-green-500' :
                              v.porcentajeReal >= 50 ? 'bg-blue-500' :
                              v.porcentajeReal > 0 ? 'bg-amber-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${Math.min(100, v.porcentajeReal)}%` }}
                          />
                        </div>
                        <span className="text-[10px]">{v.porcentajeReal}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVarianzas.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center p-6 text-muted-foreground">
                      No hay datos de varianza para este nivel
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
