'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface MetricasUsuario {
  usuarioId: string
  usuario: { id: string; name: string; email: string }
  metricas: {
    cotizacionesGeneradas: number
    cotizacionesAprobadas: number
    proyectosCerrados: number
    valorTotalVendido: number
    tasaConversion?: number
    llamadasRealizadas: number
    reunionesAgendadas: number
  }
}

interface RendimientoData {
  comerciales: MetricasUsuario[]
  resumen: {
    totalCotizaciones: number
    totalProyectos: number
    totalValor: number
    promedioConversion: number
    periodo: string
  }
  periodo: string
}

export default function RendimientoReportPage() {
  const [data, setData] = useState<RendimientoData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/crm/reportes/rendimiento')
        if (response.ok) {
          setData(await response.json())
        }
      } catch (error) {
        console.error('Error loading rendimiento:', error)
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

  if (!data || data.comerciales.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendimiento</h1>
          <p className="text-sm text-muted-foreground">Métricas por comercial</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay datos de rendimiento disponibles
          </CardContent>
        </Card>
      </div>
    )
  }

  const { resumen, comerciales } = data

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rendimiento</h1>
        <p className="text-sm text-muted-foreground">Métricas por comercial - {resumen.periodo}</p>
      </div>

      {/* KPIs generales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Cotizaciones</p>
            <p className="text-2xl font-bold">{resumen.totalCotizaciones}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Proyectos</p>
            <p className="text-2xl font-bold text-green-600">{resumen.totalProyectos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Valor Vendido</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(resumen.totalValor)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Conversión Prom.</p>
            <p className="text-2xl font-bold text-purple-600">{resumen.promedioConversion.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de comerciales */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por Comercial</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Comercial</th>
                  <th className="text-right p-3 font-medium">Cotizaciones</th>
                  <th className="text-right p-3 font-medium">Proyectos</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="text-right p-3 font-medium">Conversión</th>
                  <th className="text-right p-3 font-medium">Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comerciales.map((c) => (
                  <tr key={c.usuarioId} className="hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium">{c.usuario.name}</p>
                      <p className="text-xs text-muted-foreground">{c.usuario.email}</p>
                    </td>
                    <td className="p-3 text-right">{c.metricas.cotizacionesGeneradas}</td>
                    <td className="p-3 text-right font-medium text-green-600">{c.metricas.proyectosCerrados}</td>
                    <td className="p-3 text-right">{formatCurrency(c.metricas.valorTotalVendido)}</td>
                    <td className="p-3 text-right">
                      <span className="font-medium text-blue-600">{(c.metricas.tasaConversion || 0).toFixed(1)}%</span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {c.metricas.llamadasRealizadas + c.metricas.reunionesAgendadas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detalle por comercial - compacto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {comerciales.map((c) => (
          <Card key={c.usuarioId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{c.usuario.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{c.metricas.cotizacionesGeneradas}</p>
                  <p className="text-xs text-muted-foreground">Cotiz.</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{c.metricas.proyectosCerrados}</p>
                  <p className="text-xs text-muted-foreground">Proy.</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">{(c.metricas.tasaConversion || 0).toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Conv.</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Objetivo: 10 proyectos</span>
                  <span>{c.metricas.proyectosCerrados}/10</span>
                </div>
                <Progress value={(c.metricas.proyectosCerrados / 10) * 100} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
