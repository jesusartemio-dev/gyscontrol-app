'use client'

// ✅ Componente de comparación lado a lado mejorado para equipos
// 📡 Muestra diferencias detalladas entre ProyectoEquipoItem y ListaEquipoItem
// 🎯 Incluye trazabilidad, diferencias financieras y estados visuales

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowRight, 
  ArrowLeftRight,
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Package,
  DollarSign
} from 'lucide-react'
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

interface Props {
  item: ComparisonData
  showFinancialDetails?: boolean
  compact?: boolean
}

// 🎨 Utilidades para estilos y colores
const getTypeColor = (type: string) => {
  switch (type) {
    case 'mantenido': return 'bg-green-100 text-green-800 border-green-200'
    case 'reemplazado': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'agregado': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'descartado': return 'bg-red-100 text-red-800 border-red-200'
    case 'no_incluido': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'mantenido': return <CheckCircle className="w-4 h-4" />
    case 'reemplazado': return <ArrowLeftRight className="w-4 h-4" />
    case 'agregado': return <Package className="w-4 h-4" />
    case 'descartado': return <XCircle className="w-4 h-4" />
    case 'no_incluido': return <AlertTriangle className="w-4 h-4" />
    default: return <Info className="w-4 h-4" />
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const getDifferenceColor = (diferencia: number) => {
  if (diferencia > 0) return 'text-red-600'
  if (diferencia < 0) return 'text-green-600'
  return 'text-gray-600'
}

const getDifferenceIcon = (diferencia: number) => {
  if (diferencia > 0) return <TrendingUp className="w-4 h-4 text-red-600" />
  if (diferencia < 0) return <TrendingDown className="w-4 h-4 text-green-600" />
  return null
}

const ComparacionLadoALado = memo(function ComparacionLadoALado({ 
  item, 
  showFinancialDetails = true, 
  compact = false 
}: Props) {
  const { type, pei, lei, costoPEI, costoLEI, diferencia, trazabilidad } = item

  // 🎯 Renderizado para items reemplazados
  if (type === 'reemplazado' && trazabilidad) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTypeIcon(type)}
                <CardTitle className="text-lg">Equipo Reemplazado</CardTitle>
                <Badge className={getTypeColor(type)}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Badge>
              </div>
              {showFinancialDetails && (
                <div className="flex items-center gap-2">
                  {getDifferenceIcon(diferencia)}
                  <span className={`font-semibold ${getDifferenceColor(diferencia)}`}>
                    {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* 📋 Información de trazabilidad */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Motivo del reemplazo:</span>
              </div>
              <p className="text-sm text-blue-700">{trazabilidad.motivo}</p>
            </div>

            {/* 🔄 Comparación lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 📦 Equipo Original */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <h4 className="font-semibold text-gray-800">Original (Comercial)</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Código:</span>
                    <span className="ml-2">{trazabilidad.original.codigo}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Descripción:</span>
                    <p className="ml-2 text-gray-700">{trazabilidad.original.descripcion}</p>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Cantidad:</span>
                    <span>{trazabilidad.original.cantidad} {trazabilidad.original.unidad}</span>
                  </div>
                  {showFinancialDetails && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Costo:</span>
                      <span className="font-semibold">{formatCurrency(costoPEI)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ➡️ Flecha de reemplazo */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-blue-500" />
              </div>
              <div className="md:hidden flex justify-center py-2">
                <ArrowRight className="w-6 h-6 text-blue-500 rotate-90" />
              </div>

              {/* 🆕 Equipo de Reemplazo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h4 className="font-semibold text-gray-800">Reemplazo (Lista)</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Código:</span>
                    <span className="ml-2">{trazabilidad.reemplazo.codigo}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Descripción:</span>
                    <p className="ml-2 text-gray-700">{trazabilidad.reemplazo.descripcion}</p>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Cantidad:</span>
                    <span>{trazabilidad.reemplazo.cantidad} {trazabilidad.reemplazo.unidad}</span>
                  </div>
                  {showFinancialDetails && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Costo:</span>
                      <span className="font-semibold">{formatCurrency(costoLEI)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 💰 Resumen financiero */}
            {showFinancialDetails && (
              <>
                <Separator className="my-4" />
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-700">Impacto Financiero:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDifferenceIcon(diferencia)}
                    <span className={`font-bold text-lg ${getDifferenceColor(diferencia)}`}>
                      {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // 🎯 Renderizado para otros tipos de items
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className={`border-l-4 ${
        type === 'agregado' ? 'border-l-purple-500' :
        type === 'descartado' ? 'border-l-red-500' :
        type === 'mantenido' ? 'border-l-green-500' :
        'border-l-gray-500'
      }`}>
        <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTypeIcon(type)}
              <CardTitle className={compact ? 'text-base' : 'text-lg'}>
                {type === 'agregado' ? 'Equipo Agregado' :
                 type === 'descartado' ? 'Equipo Descartado' :
                 type === 'mantenido' ? 'Equipo Mantenido' :
                 'Equipo No Incluido'}
              </CardTitle>
              <Badge className={getTypeColor(type)}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Badge>
            </div>
            {showFinancialDetails && diferencia !== 0 && (
              <div className="flex items-center gap-2">
                {getDifferenceIcon(diferencia)}
                <span className={`font-semibold ${getDifferenceColor(diferencia)}`}>
                  {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* 📦 Información del equipo */}
          <div className="space-y-2 text-sm">
            {(pei || lei) && (
              <>
                <div>
                  <span className="font-medium text-gray-600">Código:</span>
                  <span className="ml-2">{pei?.codigo || lei?.codigo}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Descripción:</span>
                  <p className="ml-2 text-gray-700">{pei?.descripcion || lei?.descripcion}</p>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Cantidad:</span>
                  <span>{pei?.cantidad || lei?.cantidad} {pei?.unidad || lei?.unidad}</span>
                </div>
                {showFinancialDetails && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Costo:</span>
                    <span className="font-semibold">
                      {formatCurrency(pei ? costoPEI : costoLEI)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})

export default ComparacionLadoALado
