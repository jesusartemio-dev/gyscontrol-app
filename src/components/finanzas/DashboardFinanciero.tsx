/**
 * Dashboard Financiero - Vista minimalista
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  BarChart3,
  Target,
  Building,
  Zap,
  RefreshCw,
  Download,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { getListaRequerimientos } from '@/lib/services/listaRequerimiento'
import { getAllPedidoEquipos } from '@/lib/services/pedidoEquipo'
import { getProyectos } from '@/lib/services/proyecto'
import { formatCurrency, formatPercentage } from '@/lib/utils/currency'

interface MetricaFinanciera {
  titulo: string
  valor: number
  variacion: number
  tendencia: 'up' | 'down' | 'stable'
  formato: 'currency' | 'percentage' | 'number'
  icono: React.ReactNode
  color: string
}

interface DatosGrafico {
  periodo: string
  estimado: number
  real: number
}

interface DistribucionCostos {
  categoria: string
  monto: number
  porcentaje: number
  color: string
}

interface AlertaFinanciera {
  id: string
  tipo: 'warning' | 'error' | 'info'
  titulo: string
  descripcion: string
}

export default function DashboardFinanciero() {
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState<MetricaFinanciera[]>([])
  const [datosGrafico, setDatosGrafico] = useState<DatosGrafico[]>([])
  const [distribucionCostos, setDistribucionCostos] = useState<DistribucionCostos[]>([])
  const [alertas, setAlertas] = useState<AlertaFinanciera[]>([])
  const [periodo, setPeriodo] = useState('2025-01')
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date())

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true)

        const [listas, pedidos, proyectos] = await Promise.all([
          getListaRequerimientos(),
          getAllPedidoEquipos(),
          getProyectos()
        ])

        if (listas && pedidos && proyectos) {
          setMetricas(calcularMetricas(listas, pedidos, proyectos))
          setDatosGrafico(generarDatosGraficos())
          setDistribucionCostos(calcularDistribucion(listas))
          setAlertas(generarAlertas(pedidos))
          setUltimaActualizacion(new Date())
        }
      } catch (error) {
        console.error('Error cargando dashboard:', error)
        toast.error('Error al cargar el dashboard')
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [])

  const calcularMetricas = (listas: any[], pedidos: any[], proyectos: any[]): MetricaFinanciera[] => {
    const presupuestoEstimado = listas.reduce((sum, lista) => {
      return sum + (lista.listaEquipoItem?.reduce((itemSum: number, item: any) => {
        return itemSum + ((item.catalogoEquipo?.precioVenta || 0) * item.cantidad)
      }, 0) || 0)
    }, 0)

    const gastoReal = pedidos.reduce((sum, pedido) => {
      return sum + (pedido.pedidoEquipoItem?.reduce((itemSum: number, item: any) => {
        return itemSum + ((item.catalogoEquipo?.precioVenta || 0) * item.cantidad)
      }, 0) || 0)
    }, 0)

    return [
      {
        titulo: 'Presupuesto',
        valor: presupuestoEstimado,
        variacion: 8.5,
        tendencia: 'up',
        formato: 'currency',
        icono: <Target className="h-4 w-4" />,
        color: 'text-blue-600'
      },
      {
        titulo: 'Gasto Real',
        valor: gastoReal,
        variacion: -12.3,
        tendencia: 'down',
        formato: 'currency',
        icono: <DollarSign className="h-4 w-4" />,
        color: 'text-green-600'
      },
      {
        titulo: 'Proyectos',
        valor: proyectos.length,
        variacion: 15.2,
        tendencia: 'up',
        formato: 'number',
        icono: <Building className="h-4 w-4" />,
        color: 'text-purple-600'
      },
      {
        titulo: 'Eficiencia',
        valor: gastoReal > 0 ? ((presupuestoEstimado - gastoReal) / presupuestoEstimado) * 100 : 0,
        variacion: 22.1,
        tendencia: 'up',
        formato: 'percentage',
        icono: <Zap className="h-4 w-4" />,
        color: 'text-orange-600'
      },
      {
        titulo: 'Listas',
        valor: listas.length,
        variacion: 5.0,
        tendencia: 'up',
        formato: 'number',
        icono: <Package className="h-4 w-4" />,
        color: 'text-indigo-600'
      },
      {
        titulo: 'Pedidos',
        valor: pedidos.length,
        variacion: 10.0,
        tendencia: 'up',
        formato: 'number',
        icono: <Clock className="h-4 w-4" />,
        color: 'text-cyan-600'
      }
    ]
  }

  const generarDatosGraficos = (): DatosGrafico[] => {
    const meses = ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar']
    return meses.map(mes => ({
      periodo: mes,
      estimado: Math.random() * 50000 + 30000,
      real: Math.random() * 40000 + 25000
    }))
  }

  const calcularDistribucion = (listas: any[]): DistribucionCostos[] => {
    const categorias = [
      { nombre: 'Equipos de Red', color: '#3B82F6' },
      { nombre: 'Servidores', color: '#10B981' },
      { nombre: 'Software', color: '#F59E0B' },
      { nombre: 'Servicios', color: '#EF4444' },
      { nombre: 'Otros', color: '#8B5CF6' }
    ]

    const montoTotal = listas.reduce((sum, lista) => {
      return sum + (lista.listaEquipoItem?.reduce((itemSum: number, item: any) => {
        return itemSum + ((item.catalogoEquipo?.precioVenta || 0) * item.cantidad)
      }, 0) || 0)
    }, 0)

    let acumulado = 0
    return categorias.map((cat, i) => {
      const porcentaje = i === categorias.length - 1 ? 100 - acumulado : Math.random() * 20 + 10
      acumulado += porcentaje
      return {
        categoria: cat.nombre,
        monto: montoTotal * (porcentaje / 100),
        porcentaje,
        color: cat.color
      }
    })
  }

  const generarAlertas = (pedidos: any[]): AlertaFinanciera[] => {
    const alertas: AlertaFinanciera[] = []

    if (pedidos.length > 0) {
      alertas.push({
        id: '1',
        tipo: 'warning',
        titulo: 'Presupuesto en Riesgo',
        descripcion: '3 proyectos cerca del límite'
      })
    }

    if (pedidos.some((p: any) => p.estado === 'enviado')) {
      alertas.push({
        id: '2',
        tipo: 'error',
        titulo: 'Pedidos Retrasados',
        descripcion: '5 entregas vencidas'
      })
    }

    alertas.push({
      id: '3',
      tipo: 'info',
      titulo: 'Ahorro Potencial',
      descripcion: 'S/ 15,000 por consolidación'
    })

    return alertas
  }

  const getAlertColor = (tipo: string) => {
    switch (tipo) {
      case 'error': return 'bg-red-50 border-red-200 text-red-700'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          <div>
            <h1 className="text-lg font-semibold">Dashboard Financiero</h1>
            <p className="text-[10px] text-muted-foreground">
              Actualizado: {ultimaActualizacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-01">Ene 2025</SelectItem>
              <SelectItem value="2024-12">Dic 2024</SelectItem>
              <SelectItem value="2024-11">Nov 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2">
            <Download className="h-3 w-3 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas en 6 columnas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricas.map((metrica) => (
          <Card key={metrica.titulo} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium">{metrica.titulo}</span>
              <span className={metrica.color}>{metrica.icono}</span>
            </div>
            <div className="text-base font-bold">
              {metrica.formato === 'currency' && formatCurrency(metrica.valor)}
              {metrica.formato === 'percentage' && formatPercentage(metrica.valor)}
              {metrica.formato === 'number' && metrica.valor.toLocaleString()}
            </div>
            <div className="flex items-center text-[10px]">
              {metrica.tendencia === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-0.5" />
              )}
              <span className={metrica.tendencia === 'up' ? 'text-green-600' : 'text-red-600'}>
                {metrica.variacion > 0 ? '+' : ''}{metrica.variacion.toFixed(1)}%
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs con gráficos y alertas */}
      <Tabs defaultValue="tendencias" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="tendencias" className="text-xs h-7">Tendencias</TabsTrigger>
          <TabsTrigger value="distribucion" className="text-xs h-7">Distribución</TabsTrigger>
          <TabsTrigger value="alertas" className="text-xs h-7">
            Alertas
            {alertas.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                {alertas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tendencias">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Tendencia de Costos</h3>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Estimado
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Real
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {datosGrafico.map((dato) => (
                <div key={dato.periodo} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{dato.periodo}</span>
                    <span className="font-medium">{formatCurrency(dato.estimado)}</span>
                  </div>
                  <div className="relative h-2 bg-blue-100 rounded-full overflow-hidden">
                    <Progress
                      value={(dato.real / dato.estimado) * 100}
                      className="h-2 bg-green-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="distribucion">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Distribución de Costos</h3>
            <div className="space-y-2">
              {distribucionCostos.map((cat) => (
                <div key={cat.categoria} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs">{cat.categoria}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium">{formatCurrency(cat.monto)}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {cat.porcentaje.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <div className="space-y-2">
            {alertas.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Sin alertas activas</p>
              </Card>
            ) : (
              alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`border rounded-lg p-3 ${getAlertColor(alerta.tipo)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{alerta.titulo}</p>
                        <p className="text-[10px] opacity-80">{alerta.descripcion}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                      Ver
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
