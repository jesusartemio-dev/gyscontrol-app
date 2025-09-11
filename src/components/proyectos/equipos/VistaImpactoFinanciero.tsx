'use client'

// ===================================================
// 📁 Archivo: VistaImpactoFinanciero.tsx
// 📌 Ubicación: src/components/proyectos/equipos/VistaImpactoFinanciero.tsx
// 🔧 Descripción: Vista de impacto financiero con análisis detallado
//
// 🎨 Mejoras UX/UI aplicadas:
// - Análisis financiero detallado con gráficos
// - Métricas de rentabilidad y eficiencia
// - Comparativas de costos por categoría
// - Proyecciones y tendencias
// ===================================================

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  staggerContainerVariants,
  staggerItemVariants 
} from '@/lib/animations/masterDetailAnimations'
import { 
  useIsMobile,
  useIsTouchDevice,
  touchInteractions,
  getResponsiveClasses
} from '@/lib/responsive/breakpoints'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  PieChart,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Activity,
  Zap,
  Shield,
  Award,
  Package,
  Layers,
  Filter,
  Eye,
  Minus
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { ProyectoEquipoItem, ListaEquipoItem } from '@/types'

// 🎯 Tipos para el componente
interface ComparisonData {
  type: 'mantenido' | 'reemplazado' | 'agregado' | 'descartado' | 'no_incluido'
  category: string
  pei: ProyectoEquipoItem | null
  lei: ListaEquipoItem | null
  grupo: string
  costoPEI: number
  costoLEI: number
  diferencia: number
  estado: string
  trazabilidad?: {
    original: ProyectoEquipoItem
    reemplazo: ListaEquipoItem
    motivo: string
  }
}

interface Summary {
  mantenidos: number
  reemplazados: number
  agregados: number
  descartados: number
  totalItems: number
  impactoFinanciero: number
  porcentajeCambio: number
}

interface Props {
  comparisons: ComparisonData[]
  summary: Summary
  totalPEI: number
  totalLEI: number
  diferencia: number
  porcentajeDiferencia: number
  className?: string
}



// 📊 Función para calcular métricas financieras
const calculateFinancialMetrics = (comparisons: ComparisonData[]) => {
  const totalCostoPEI = comparisons.reduce((sum, c) => sum + c.costoPEI, 0)
  const totalCostoLEI = comparisons.reduce((sum, c) => sum + c.costoLEI, 0)
  const totalDiferencia = comparisons.reduce((sum, c) => sum + c.diferencia, 0)
  
  // Análisis por tipo
  const mantenidos = comparisons.filter(c => c.type === 'mantenido')
  const reemplazados = comparisons.filter(c => c.type === 'reemplazado')
  const agregados = comparisons.filter(c => c.type === 'agregado')
  const descartados = comparisons.filter(c => c.type === 'descartado')
  
  const costoMantenidos = mantenidos.reduce((sum, c) => sum + c.costoLEI, 0)
  const costoReemplazados = reemplazados.reduce((sum, c) => sum + c.costoLEI, 0)
  const costoAgregados = agregados.reduce((sum, c) => sum + c.costoLEI, 0)
  const ahorroDescartados = descartados.reduce((sum, c) => sum + c.costoPEI, 0)
  
  const diferenciaMantenidos = mantenidos.reduce((sum, c) => sum + c.diferencia, 0)
  const diferenciaReemplazados = reemplazados.reduce((sum, c) => sum + c.diferencia, 0)
  const diferenciaAgregados = agregados.reduce((sum, c) => sum + c.diferencia, 0)
  const diferenciaDescartados = descartados.reduce((sum, c) => sum + c.diferencia, 0)
  
  // Análisis por categoría
  const categorias = Array.from(new Set(comparisons.map(c => c.category)))
  const analisisPorCategoria = categorias.map(categoria => {
    const items = comparisons.filter(c => c.category === categoria)
    const costoPEI = items.reduce((sum, c) => sum + c.costoPEI, 0)
    const costoLEI = items.reduce((sum, c) => sum + c.costoLEI, 0)
    const diferencia = items.reduce((sum, c) => sum + c.diferencia, 0)
    const porcentajeImpacto = totalDiferencia !== 0 ? (diferencia / totalDiferencia) * 100 : 0
    
    return {
      categoria,
      items: items.length,
      costoPEI,
      costoLEI,
      diferencia,
      porcentajeImpacto
    }
  }).sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia))
  
  // Métricas de eficiencia
  const eficienciaGeneral = totalCostoPEI > 0 ? ((totalCostoPEI - totalDiferencia) / totalCostoPEI) * 100 : 0
  const variabilidad = totalCostoPEI > 0 ? Math.abs(totalDiferencia / totalCostoPEI) * 100 : 0
  const roi = totalCostoPEI > 0 ? (totalDiferencia / totalCostoPEI) * 100 : 0
  
  // Análisis de riesgo
  const itemsAltoImpacto = comparisons.filter(c => Math.abs(c.diferencia) > 1000).length
  const itemsMedioImpacto = comparisons.filter(c => Math.abs(c.diferencia) > 500 && Math.abs(c.diferencia) <= 1000).length
  const itemsBajoImpacto = comparisons.filter(c => Math.abs(c.diferencia) > 0 && Math.abs(c.diferencia) <= 500).length
  const itemsSinImpacto = comparisons.filter(c => c.diferencia === 0).length
  
  return {
    totalCostoPEI,
    totalCostoLEI,
    totalDiferencia,
    mantenidos: {
      count: mantenidos.length,
      costo: costoMantenidos,
      diferencia: diferenciaMantenidos
    },
    reemplazados: {
      count: reemplazados.length,
      costo: costoReemplazados,
      diferencia: diferenciaReemplazados
    },
    agregados: {
      count: agregados.length,
      costo: costoAgregados,
      diferencia: diferenciaAgregados
    },
    descartados: {
      count: descartados.length,
      ahorro: ahorroDescartados,
      diferencia: diferenciaDescartados
    },
    analisisPorCategoria,
    eficienciaGeneral,
    variabilidad,
    roi,
    riesgo: {
      alto: itemsAltoImpacto,
      medio: itemsMedioImpacto,
      bajo: itemsBajoImpacto,
      sinImpacto: itemsSinImpacto
    }
  }
}

// 📊 Componente de gráfico de barras horizontal
const HorizontalBarChart = ({ data, title }: { 
  data: { label: string; value: number; color: string; percentage: number }[], 
  title: string 
}) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <div className="space-y-3">
        {data.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="space-y-1"
          >
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className={`h-full rounded-full ${item.color}`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 💰 Componente de métrica financiera
const FinancialMetric = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'blue' 
}: {
  title: string
  value: string
  subtitle: string
  icon: any
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange'
}) => {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    green: 'from-green-50 to-green-100 border-green-200 text-green-700',
    red: 'from-red-50 to-red-100 border-red-200 text-red-700',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-700'
  }
  
  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-80">{title}</p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <div className={`flex items-center ${
                  trend === 'up' ? 'text-red-600' : 
                  trend === 'down' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {trend === 'up' && <ArrowUpRight className="h-4 w-4" />}
                  {trend === 'down' && <ArrowDownRight className="h-4 w-4" />}
                  {trend === 'neutral' && <Minus className="h-4 w-4" />}
                </div>
              )}
            </div>
            <p className="text-xs opacity-70 mt-1">{subtitle}</p>
          </div>
          <Icon className="h-8 w-8 opacity-60" />
        </div>
      </CardContent>
    </Card>
  )
}

const VistaImpactoFinanciero = memo(function VistaImpactoFinanciero({ 
  comparisons, 
  summary, 
  totalPEI, 
  totalLEI, 
  diferencia, 
  porcentajeDiferencia, 
  className = '' 
}: Props) {
  // 📱 Responsive hooks
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const gridClasses = getResponsiveClasses({
    xs: 'grid-cols-1 gap-6',
    md: 'grid-cols-2 gap-4',
    lg: 'grid-cols-4 gap-4'
  });
  const chartGridClasses = getResponsiveClasses({
    xs: 'grid-cols-1 gap-4',
    lg: 'grid-cols-2 gap-6'
  });
  const containerSpacing = getResponsiveClasses({
    xs: 'space-y-4',
    md: 'space-y-6'
  });
  
  const metrics = useMemo(() => calculateFinancialMetrics(comparisons), [comparisons])
  
  // 📊 Datos para gráficos
  const impactoPorTipo = useMemo(() => [
    {
      label: 'Mantenidos',
      value: Math.abs(metrics.mantenidos.diferencia),
      color: 'bg-green-500',
      percentage: metrics.totalDiferencia !== 0 ? (Math.abs(metrics.mantenidos.diferencia) / Math.abs(metrics.totalDiferencia)) * 100 : 0
    },
    {
      label: 'Reemplazados',
      value: Math.abs(metrics.reemplazados.diferencia),
      color: 'bg-blue-500',
      percentage: metrics.totalDiferencia !== 0 ? (Math.abs(metrics.reemplazados.diferencia) / Math.abs(metrics.totalDiferencia)) * 100 : 0
    },
    {
      label: 'Agregados',
      value: Math.abs(metrics.agregados.diferencia),
      color: 'bg-purple-500',
      percentage: metrics.totalDiferencia !== 0 ? (Math.abs(metrics.agregados.diferencia) / Math.abs(metrics.totalDiferencia)) * 100 : 0
    },
    {
      label: 'Descartados',
      value: Math.abs(metrics.descartados.diferencia),
      color: 'bg-red-500',
      percentage: metrics.totalDiferencia !== 0 ? (Math.abs(metrics.descartados.diferencia) / Math.abs(metrics.totalDiferencia)) * 100 : 0
    }
  ].filter(item => item.value > 0), [metrics])
  
  const impactoPorCategoria = useMemo(() => metrics.analisisPorCategoria.slice(0, 5).map(cat => ({
    label: cat.categoria,
    value: Math.abs(cat.diferencia),
    color: 'bg-gradient-to-r from-blue-400 to-purple-500',
    percentage: Math.abs(cat.porcentajeImpacto)
  })), [metrics.analisisPorCategoria])

  return (
    <motion.div
      className={`space-y ${containerSpacing} ${className}`}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 💰 Métricas principales */}
      <motion.div variants={staggerItemVariants}>
        <div className={`grid ${gridClasses}`}>
          <FinancialMetric
            title="Costo Comercial"
            value={formatCurrency(metrics.totalCostoPEI)}
            subtitle="Presupuesto original"
            icon={DollarSign}
            color="blue"
          />
          
          <FinancialMetric
            title="Costo Proyectos"
            value={formatCurrency(metrics.totalCostoLEI)}
            subtitle="Presupuesto ajustado"
            icon={Calculator}
            color="green"
          />
          
          <FinancialMetric
            title="Impacto Neto"
            value={formatCurrency(metrics.totalDiferencia)}
            subtitle="Diferencia total"
            icon={TrendingUp}
            trend={metrics.totalDiferencia > 0 ? 'up' : metrics.totalDiferencia < 0 ? 'down' : 'neutral'}
            color={metrics.totalDiferencia > 0 ? 'red' : metrics.totalDiferencia < 0 ? 'green' : 'blue'}
          />
          
          <FinancialMetric
            title="ROI"
            value={`${metrics.roi >= 0 ? '+' : ''}${metrics.roi.toFixed(1)}%`}
            subtitle="Retorno de inversión"
            icon={Percent}
            trend={metrics.roi > 0 ? 'up' : metrics.roi < 0 ? 'down' : 'neutral'}
            color={metrics.roi > 0 ? 'red' : metrics.roi < 0 ? 'green' : 'blue'}
          />
        </div>
      </motion.div>

      {/* 📊 Análisis detallado */}
      <motion.div variants={staggerItemVariants}>
        <div className={`grid ${chartGridClasses}`}>
          {/* Impacto por tipo */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Impacto por Tipo de Cambio</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={impactoPorTipo} title="Distribución del Impacto Financiero" />
            </CardContent>
          </Card>

          {/* Impacto por categoría */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-purple-600" />
                <span>Impacto por Categoría</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={impactoPorCategoria} title="Top 5 Categorías con Mayor Impacto" />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* 🎯 Métricas de eficiencia */}
      <motion.div variants={staggerItemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Eficiencia general */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-600" />
                <span>Eficiencia General</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Eficiencia del Proyecto</span>
                  <span className="font-medium">{metrics.eficienciaGeneral.toFixed(1)}%</span>
                </div>
                <Progress value={Math.max(0, Math.min(100, metrics.eficienciaGeneral))} className="h-3" />
                <p className="text-xs text-gray-600 mt-1">
                  {metrics.eficienciaGeneral >= 90 ? 'Excelente' :
                   metrics.eficienciaGeneral >= 75 ? 'Buena' :
                   metrics.eficienciaGeneral >= 60 ? 'Regular' : 'Necesita mejora'}
                </p>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Variabilidad de Costos</span>
                  <span className="font-medium">{metrics.variabilidad.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(100, metrics.variabilidad)} className="h-3" />
                <p className="text-xs text-gray-600 mt-1">
                  {metrics.variabilidad <= 10 ? 'Muy estable' :
                   metrics.variabilidad <= 25 ? 'Estable' :
                   metrics.variabilidad <= 50 ? 'Moderada' : 'Alta variabilidad'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Análisis de riesgo */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-orange-600" />
                <span>Análisis de Riesgo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">Alto Impacto</span>
                </div>
                <Badge variant="default" className="bg-red-500 hover:bg-red-600">{metrics.riesgo.alto}</Badge>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">Medio Impacto</span>
                </div>
                <Badge variant="outline">{metrics.riesgo.medio}</Badge>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">Bajo Impacto</span>
                </div>
                <Badge variant="default">{metrics.riesgo.bajo}</Badge>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <Minus className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Sin Impacto</span>
                </div>
                <Badge variant="secondary">{metrics.riesgo.sinImpacto}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resumen por tipo */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Resumen por Tipo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700">Mantenidos ({metrics.mantenidos.count})</span>
                  <span className="font-medium">{formatCurrency(metrics.mantenidos.costo)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">Reemplazados ({metrics.reemplazados.count})</span>
                  <span className="font-medium">{formatCurrency(metrics.reemplazados.costo)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-purple-700">Agregados ({metrics.agregados.count})</span>
                  <span className="font-medium">{formatCurrency(metrics.agregados.costo)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-red-700">Descartados ({metrics.descartados.count})</span>
                  <span className="font-medium text-green-600">-{formatCurrency(metrics.descartados.ahorro)}</span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Proyecto</span>
                  <span className={metrics.totalDiferencia >= 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(metrics.totalCostoLEI)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* 📈 Proyecciones y recomendaciones */}
      <motion.div variants={staggerItemVariants}>
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-purple-600" />
              <span>Recomendaciones Financieras</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Oportunidades de Optimización</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  {metrics.riesgo.alto > 0 && (
                    <li className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Revisar {metrics.riesgo.alto} items de alto impacto para posibles optimizaciones</span>
                    </li>
                  )}
                  {metrics.variabilidad > 25 && (
                    <li className="flex items-start space-x-2">
                      <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Alta variabilidad detectada - considerar estandarización de procesos</span>
                    </li>
                  )}
                  {metrics.totalDiferencia > 0 && (
                    <li className="flex items-start space-x-2">
                      <TrendingDown className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Buscar alternativas para reducir el sobrecosto de {formatCurrency(metrics.totalDiferencia)}</span>
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Indicadores Clave</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Eficiencia del proyecto:</span>
                    <span className={`font-medium ${
                      metrics.eficienciaGeneral >= 90 ? 'text-green-600' :
                      metrics.eficienciaGeneral >= 75 ? 'text-blue-600' :
                      metrics.eficienciaGeneral >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {metrics.eficienciaGeneral.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ROI del proyecto:</span>
                    <span className={`font-medium ${
                      metrics.roi >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items optimizados:</span>
                    <span className="font-medium text-blue-600">
                      {((metrics.mantenidos.count + metrics.reemplazados.count) / comparisons.length * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
})

export default VistaImpactoFinanciero
