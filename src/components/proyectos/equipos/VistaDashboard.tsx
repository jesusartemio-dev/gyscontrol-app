'use client'

// ===================================================
// 📁 Archivo: VistaDashboard.tsx
// 📌 Ubicación: src/components/proyectos/equipos/VistaDashboard.tsx
// 🔧 Descripción: Dashboard analítico con gráficos y métricas avanzadas
//
// 🎨 Mejoras UX/UI aplicadas:
// - Métricas KPI destacadas
// - Gráficos de barras y donut simulados
// - Cards informativos con gradientes
// - Análisis de tendencias
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  ArrowLeftRight,
  Target,
  Calculator,
  PieChart,
  Activity,
  Zap,
  Shield,
  Award
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { ProyectoEquipoCotizadoItem, ListaEquipoItem } from '@/types'

// 🎯 Tipos para el componente
interface ComparisonData {
  type: 'mantenido' | 'reemplazado' | 'agregado' | 'descartado' | 'no_incluido'
  category: string
  pei: ProyectoEquipoCotizadoItem | null
  lei: ListaEquipoItem | null
  grupo: string
  costoPEI: number
  costoLEI: number
  diferencia: number
  estado: string
  trazabilidad?: {
    original: ProyectoEquipoCotizadoItem
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

// 🎨 Animation variants
// ✅ Usando variantes centralizadas de animación

// 📊 Función para calcular métricas
const calculateMetrics = (comparisons: ComparisonData[]) => {
  const total = comparisons.length
  const mantenidos = comparisons.filter(c => c.type === 'mantenido').length
  const reemplazados = comparisons.filter(c => c.type === 'reemplazado').length
  const agregados = comparisons.filter(c => c.type === 'agregado').length
  const descartados = comparisons.filter(c => c.type === 'descartado').length
  
  const totalCostoPEI = comparisons.reduce((sum, c) => sum + c.costoPEI, 0)
  const totalCostoLEI = comparisons.reduce((sum, c) => sum + c.costoLEI, 0)
  const totalDiferencia = comparisons.reduce((sum, c) => sum + c.diferencia, 0)
  
  const impactoAlto = comparisons.filter(c => Math.abs(c.diferencia) > 1000).length
  const impactoMedio = comparisons.filter(c => Math.abs(c.diferencia) > 500 && Math.abs(c.diferencia) <= 1000).length
  const impactoBajo = comparisons.filter(c => Math.abs(c.diferencia) > 0 && Math.abs(c.diferencia) <= 500).length
  
  const porcentajeMantenidos = total > 0 ? (mantenidos / total) * 100 : 0
  const porcentajeReemplazados = total > 0 ? (reemplazados / total) * 100 : 0
  const porcentajeAgregados = total > 0 ? (agregados / total) * 100 : 0
  const porcentajeDescartados = total > 0 ? (descartados / total) * 100 : 0
  
  const eficiencia = total > 0 ? ((mantenidos + reemplazados) / total) * 100 : 0
  const variabilidad = totalCostoPEI > 0 ? Math.abs(totalDiferencia / totalCostoPEI) * 100 : 0
  
  return {
    total,
    mantenidos,
    reemplazados,
    agregados,
    descartados,
    totalCostoPEI,
    totalCostoLEI,
    totalDiferencia,
    impactoAlto,
    impactoMedio,
    impactoBajo,
    porcentajeMantenidos,
    porcentajeReemplazados,
    porcentajeAgregados,
    porcentajeDescartados,
    eficiencia,
    variabilidad
  }
}

// 📊 Componente de gráfico de barras simulado
const BarChart = ({ data, title }: { data: { label: string; value: number; color: string }[], title: string }) => {
  const maxValue = Math.max(...data.map(d => d.value))
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <div className="space-y-2">
        {data.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="flex items-center space-x-3"
          >
            <div className="w-20 text-xs text-gray-600 truncate">{item.label}</div>
            <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className={`h-full rounded-full ${item.color}`}
              />
            </div>
            <div className="w-12 text-xs font-medium text-gray-700 text-right">
              {item.value}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 🍩 Componente de gráfico donut simulado
const DonutChart = ({ data, title }: { data: { label: string; value: number; color: string; percentage: number }[], title: string }) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          {/* Simulación visual del donut */}
          <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
          {data.map((item, index) => {
            const rotation = data.slice(0, index).reduce((sum, d) => sum + (d.percentage * 3.6), 0)
            return (
              <motion.div
                key={item.label}
                initial={{ rotate: 0 }}
                animate={{ rotate: rotation }}
                transition={{ duration: 1, delay: index * 0.2 }}
                className={`absolute inset-0 rounded-full border-8 border-transparent`}
                style={{
                  borderTopColor: item.color.includes('green') ? '#10b981' : 
                                 item.color.includes('blue') ? '#3b82f6' :
                                 item.color.includes('purple') ? '#8b5cf6' :
                                 item.color.includes('red') ? '#ef4444' : '#6b7280',
                  transform: `rotate(${rotation}deg)`,
                  borderRightColor: item.percentage > 25 ? 'inherit' : 'transparent'
                }}
              />
            )
          })}
          <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
            <PieChart className="h-6 w-6 text-gray-400" />
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
              <span className="text-gray-600">{item.label}</span>
            </div>
            <span className="font-medium text-gray-700">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const VistaDashboard = memo(function VistaDashboard({ 
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
  
  // 📊 Cálculo de métricas optimizado con useMemo
  const metrics = useMemo(() => calculateMetrics(comparisons), [comparisons])
  
  // 📊 Datos para gráficos optimizados con useMemo
  const chartData = useMemo(() => {
    const barChartData = [
      { label: 'Mantenidos', value: metrics.mantenidos, color: 'bg-green-500' },
      { label: 'Reemplazados', value: metrics.reemplazados, color: 'bg-blue-500' },
      { label: 'Agregados', value: metrics.agregados, color: 'bg-purple-500' },
      { label: 'Descartados', value: metrics.descartados, color: 'bg-red-500' }
    ]
    
    const donutChartData = [
      { label: 'Mantenidos', value: metrics.mantenidos, color: 'bg-green-500', percentage: metrics.porcentajeMantenidos },
      { label: 'Reemplazados', value: metrics.reemplazados, color: 'bg-blue-500', percentage: metrics.porcentajeReemplazados },
      { label: 'Agregados', value: metrics.agregados, color: 'bg-purple-500', percentage: metrics.porcentajeAgregados },
      { label: 'Descartados', value: metrics.descartados, color: 'bg-red-500', percentage: metrics.porcentajeDescartados }
    ]
    
    const impactData = [
      { label: 'Alto', value: metrics.impactoAlto, color: 'bg-red-500' },
      { label: 'Medio', value: metrics.impactoMedio, color: 'bg-yellow-500' },
      { label: 'Bajo', value: metrics.impactoBajo, color: 'bg-green-500' }
    ]
    
    return { barChartData, donutChartData, impactData }
  }, [metrics])

  return (
    <motion.div
      className={`space-y ${containerSpacing} ${className}`}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 📊 KPIs Principales */}
      <motion.div variants={staggerItemVariants}>
        <div className={`grid ${gridClasses}`}>
          {/* Total Items */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Items</p>
                  <p className="text-2xl font-bold text-blue-900">{metrics.total}</p>
                  <p className="text-xs text-blue-600">Comparaciones realizadas</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* Eficiencia */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Eficiencia</p>
                  <p className="text-2xl font-bold text-green-900">{metrics.eficiencia.toFixed(1)}%</p>
                  <p className="text-xs text-green-600">Items aprovechados</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          {/* Impacto Financiero */}
          <Card className={`bg-gradient-to-br ${
            metrics.totalDiferencia >= 0 
              ? 'from-red-50 to-red-100 border-red-200' 
              : 'from-green-50 to-green-100 border-green-200'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    metrics.totalDiferencia >= 0 ? 'text-red-700' : 'text-green-700'
                  }`}>Impacto Total</p>
                  <p className={`text-2xl font-bold ${
                    metrics.totalDiferencia >= 0 ? 'text-red-900' : 'text-green-900'
                  }`}>
                    {metrics.totalDiferencia >= 0 ? '+' : ''}{formatCurrency(metrics.totalDiferencia)}
                  </p>
                  <p className={`text-xs ${
                    metrics.totalDiferencia >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>Diferencia total</p>
                </div>
                {metrics.totalDiferencia >= 0 ? 
                  <TrendingUp className="h-8 w-8 text-red-600" /> : 
                  <TrendingDown className="h-8 w-8 text-green-600" />
                }
              </div>
            </CardContent>
          </Card>

          {/* Variabilidad */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Variabilidad</p>
                  <p className="text-2xl font-bold text-purple-900">{metrics.variabilidad.toFixed(1)}%</p>
                  <p className="text-xs text-purple-600">Desviación de costos</p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* 📈 Gráficos y Análisis */}
      <motion.div variants={staggerItemVariants}>
        <div className={`grid ${chartGridClasses}`}>
          {/* Distribución por Tipo */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Distribución por Tipo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={chartData.barChartData} title="Cantidad de Items" />
            </CardContent>
          </Card>

          {/* Composición Porcentual */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                <span>Composición Porcentual</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={chartData.donutChartData} title="Distribución %" />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* 🎯 Métricas Detalladas */}
      <motion.div variants={staggerItemVariants}>
        <div className={`grid ${getResponsiveClasses({ xs: 'grid-cols-1 gap-4', lg: 'grid-cols-3 gap-6' })}`}>
          {/* Análisis de Impacto */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <span>Análisis de Impacto</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={chartData.impactData} title="Nivel de Impacto Financiero" />
            </CardContent>
          </Card>

          {/* Métricas de Calidad */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span>Métricas de Calidad</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Tasa de Mantenimiento</span>
                  <span className="font-medium">{metrics.porcentajeMantenidos.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.porcentajeMantenidos} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Tasa de Reemplazo</span>
                  <span className="font-medium">{metrics.porcentajeReemplazados.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.porcentajeReemplazados} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Eficiencia General</span>
                  <span className="font-medium">{metrics.eficiencia.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.eficiencia} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Resumen Financiero */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span>Resumen Financiero</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">Costo Comercial</span>
                <span className="font-semibold text-blue-900">
                  {formatCurrency(metrics.totalCostoPEI)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">Costo Proyectos</span>
                <span className="font-semibold text-green-900">
                  {formatCurrency(metrics.totalCostoLEI)}
                </span>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-lg ${
                metrics.totalDiferencia >= 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <span className={`text-sm ${
                  metrics.totalDiferencia >= 0 ? 'text-red-700' : 'text-green-700'
                }`}>Diferencia Neta</span>
                <span className={`font-semibold ${
                  metrics.totalDiferencia >= 0 ? 'text-red-900' : 'text-green-900'
                }`}>
                  {metrics.totalDiferencia >= 0 ? '+' : ''}{formatCurrency(metrics.totalDiferencia)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  )
})

export default VistaDashboard
