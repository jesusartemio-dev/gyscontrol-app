'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface MetricasData {
  periodo: string
  totales: {
    cotizacionesGeneradas: number
    cotizacionesAprobadas: number
    proyectosCerrados: number
    valorTotalVendido: number
    margenTotalObtenido: number
    llamadasRealizadas: number
    reunionesAgendadas: number
    propuestasEnviadas: number
    emailsEnviados: number
  }
  promedios: {
    tiempoPromedioCierre: number
    tasaConversion: number
    valorPromedioProyecto: number
  }
  tendencias: Array<{
    periodo: string
    cotizaciones: number
    proyectos: number
    valor: number
    conversion: number
  }>
}

export default function MetricasReportPage() {
  const [data, setData] = useState<MetricasData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/crm/reportes/metricas?periodo=2024-Q4')
        if (response.ok) {
          setData(await response.json())
        }
      } catch (error) {
        console.error('Error loading metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const margenPorcentaje = data.totales.valorTotalVendido > 0
    ? ((data.totales.margenTotalObtenido / data.totales.valorTotalVendido) * 100).toFixed(1)
    : '0'

  const tasaCotizacionAprobada = data.totales.cotizacionesGeneradas > 0
    ? ((data.totales.cotizacionesAprobadas / data.totales.cotizacionesGeneradas) * 100).toFixed(1)
    : '0'

  const tasaProyectoCerrado = data.totales.cotizacionesGeneradas > 0
    ? ((data.totales.proyectosCerrados / data.totales.cotizacionesGeneradas) * 100).toFixed(1)
    : '0'

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
          <p className="text-sm text-muted-foreground">KPIs comerciales - {data.periodo}</p>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Conversión</p>
            <p className="text-2xl font-bold text-blue-600">{data.promedios.tasaConversion.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Valor Promedio</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.promedios.valorPromedioProyecto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Tiempo Cierre</p>
            <p className="text-2xl font-bold text-orange-600">{data.promedios.tiempoPromedioCierre}d</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Margen</p>
            <p className="text-2xl font-bold text-purple-600">{margenPorcentaje}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Embudo de conversión */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Embudo de Conversión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Cotizaciones generadas</span>
              <span className="font-medium">{data.totales.cotizacionesGeneradas}</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Cotizaciones aprobadas</span>
              <span className="font-medium">{data.totales.cotizacionesAprobadas} ({tasaCotizacionAprobada}%)</span>
            </div>
            <Progress value={Number(tasaCotizacionAprobada)} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Proyectos cerrados</span>
              <span className="font-medium">{data.totales.proyectosCerrados} ({tasaProyectoCerrado}%)</span>
            </div>
            <Progress value={Number(tasaProyectoCerrado)} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Actividad y Valor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Actividad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm py-1.5 border-b">
              <span className="text-muted-foreground">Llamadas</span>
              <span className="font-medium">{data.totales.llamadasRealizadas}</span>
            </div>
            <div className="flex justify-between text-sm py-1.5 border-b">
              <span className="text-muted-foreground">Reuniones</span>
              <span className="font-medium">{data.totales.reunionesAgendadas}</span>
            </div>
            <div className="flex justify-between text-sm py-1.5 border-b">
              <span className="text-muted-foreground">Propuestas</span>
              <span className="font-medium">{data.totales.propuestasEnviadas}</span>
            </div>
            <div className="flex justify-between text-sm py-1.5">
              <span className="text-muted-foreground">Emails</span>
              <span className="font-medium">{data.totales.emailsEnviados}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Valor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm py-1.5 border-b">
              <span className="text-muted-foreground">Total vendido</span>
              <span className="font-medium">{formatCurrency(data.totales.valorTotalVendido)}</span>
            </div>
            <div className="flex justify-between text-sm py-1.5 border-b">
              <span className="text-muted-foreground">Margen obtenido</span>
              <span className="font-medium text-green-600">{formatCurrency(data.totales.margenTotalObtenido)}</span>
            </div>
            <div className="flex justify-between text-sm py-1.5">
              <span className="text-muted-foreground">Valor promedio</span>
              <span className="font-medium">{formatCurrency(data.promedios.valorPromedioProyecto)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendencias */}
      {data.tendencias.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Periodo</th>
                    <th className="text-right p-3 font-medium">Cotizaciones</th>
                    <th className="text-right p-3 font-medium">Proyectos</th>
                    <th className="text-right p-3 font-medium">Valor</th>
                    <th className="text-right p-3 font-medium">Conversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.tendencias.map((t, idx) => (
                    <tr key={`${t.periodo}-${idx}`} className="hover:bg-muted/30">
                      <td className="p-3">{t.periodo}</td>
                      <td className="p-3 text-right">{t.cotizaciones}</td>
                      <td className="p-3 text-right">{t.proyectos}</td>
                      <td className="p-3 text-right">{formatCurrency(t.valor)}</td>
                      <td className="p-3 text-right font-medium text-blue-600">{t.conversion.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
