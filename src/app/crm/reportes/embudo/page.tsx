'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface EtapaEmbudo {
  nombre: string
  estado: string
  cantidad: number
  valorTotal: number
  tiempoPromedio: number
}

const estadosCerrados = ['cerrada_ganada', 'cerrada_perdida', 'seguimiento_proyecto', 'feedback_mejora']

const getEstadoColor = (estado: string) => {
  const colors: Record<string, string> = {
    inicio: 'text-purple-600',
    prospecto: 'text-purple-600',
    contacto_cliente: 'text-blue-600',
    contacto_inicial: 'text-blue-600',
    validacion_tecnica: 'text-cyan-600',
    validacion_comercial: 'text-violet-600',
    negociacion: 'text-orange-600',
    seguimiento_proyecto: 'text-teal-600',
    feedback_mejora: 'text-red-600',
    cerrada_ganada: 'text-green-600',
    cerrada_perdida: 'text-red-600'
  }
  return colors[estado] || 'text-gray-600'
}

export default function EmbudoReportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [embudoData, setEmbudoData] = useState<EtapaEmbudo[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/crm/reportes/embudo')
        if (response.ok) {
          const data = await response.json()
          setEmbudoData(data.etapas)
        }
      } catch (error) {
        console.error('Error loading embudo data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)

  const totalValue = embudoData.reduce((sum, stage) => sum + stage.valorTotal, 0)
  const totalCantidad = embudoData.reduce((sum, stage) => sum + stage.cantidad, 0)
  const activeValue = embudoData
    .filter(stage => !estadosCerrados.includes(stage.estado))
    .reduce((sum, stage) => sum + stage.valorTotal, 0)

  const valorGanado = embudoData
    .filter(s => s.estado === 'cerrada_ganada' || s.estado === 'seguimiento_proyecto')
    .reduce((sum, s) => sum + s.valorTotal, 0)
  const conversionRate = totalValue > 0 ? (valorGanado / totalValue) * 100 : 0

  const tiempoPromedio = embudoData.length > 0
    ? Math.round(embudoData.reduce((sum, s) => sum + s.tiempoPromedio, 0) / embudoData.length)
    : 0

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Filtrar etapas con datos
  const embudoConDatos = embudoData.filter(e => e.cantidad > 0)

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Embudo de Ventas</h1>
        <p className="text-sm text-muted-foreground">Análisis por etapas del pipeline</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-muted-foreground">{totalCantidad} oportunidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Valor Activo</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(activeValue)}</p>
            <p className="text-xs text-muted-foreground">en pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Conversión</p>
            <p className="text-2xl font-bold text-purple-600">{conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(valorGanado)} ganado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Tiempo Promedio</p>
            <p className="text-2xl font-bold text-orange-600">{tiempoPromedio} días</p>
            <p className="text-xs text-muted-foreground">por etapa</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de etapas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por Etapa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {embudoConDatos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin oportunidades en el embudo</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Etapa</th>
                    <th className="text-right p-3 font-medium">Cantidad</th>
                    <th className="text-right p-3 font-medium">Valor</th>
                    <th className="text-right p-3 font-medium">Días Prom.</th>
                    <th className="p-3 font-medium w-32">% Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {embudoConDatos.map((stage) => {
                    const porcentaje = totalValue > 0 ? (stage.valorTotal / totalValue) * 100 : 0
                    return (
                      <tr
                        key={stage.estado}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => router.push(`/crm/oportunidades?estado=${stage.estado}`)}
                      >
                        <td className="p-3">
                          <span className={`font-medium ${getEstadoColor(stage.estado)}`}>
                            {stage.nombre}
                          </span>
                        </td>
                        <td className="p-3 text-right">{stage.cantidad}</td>
                        <td className="p-3 text-right">{formatCurrency(stage.valorTotal)}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {Math.round(stage.tiempoPromedio)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Progress value={porcentaje} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {porcentaje.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen visual compacto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Flujo del Embudo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {embudoConDatos.map((stage, index) => {
            const porcentaje = totalValue > 0 ? (stage.valorTotal / totalValue) * 100 : 0
            const maxCantidad = Math.max(...embudoConDatos.map(s => s.cantidad))
            const widthPercent = maxCantidad > 0 ? (stage.cantidad / maxCantidad) * 100 : 0

            return (
              <div key={stage.estado} className="flex items-center gap-3">
                <span className={`text-xs w-28 truncate ${getEstadoColor(stage.estado)}`}>
                  {stage.nombre}
                </span>
                <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/20 flex items-center px-2 transition-all"
                    style={{ width: `${Math.max(widthPercent, 10)}%` }}
                  >
                    <span className="text-xs font-medium">{stage.cantidad}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {formatCurrency(stage.valorTotal)}
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
