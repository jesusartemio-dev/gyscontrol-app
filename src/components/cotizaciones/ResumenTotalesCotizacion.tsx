'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Calculator, 
  Wrench, 
  Truck, 
  DollarSign, 
  TrendingUp, 
  Percent,
  Receipt,
  Target,
  CheckCircle2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { generateEquiposKey, generateServiciosKey, generateGastosKey } from '@/lib/utils/uniqueKeyGenerator'
import type { Cotizacion } from '@/types'

// Configuración de categorías con iconos y colores
const categoriasConfig = {
  equipos: {
    icon: Calculator,
    label: 'Equipos',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  servicios: {
    icon: Wrench,
    label: 'Servicios',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  gastos: {
    icon: Truck,
    label: 'Gastos',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
}

function calcularRenta(pCliente: number, pInterno: number): { valor: string; color: string } {
  if (pInterno === 0) return { valor: '∞', color: 'text-green-600' }
  const renta = ((pCliente - pInterno) / pInterno) * 100
  
  let color = 'text-gray-500'
  if (renta >= 30) color = 'text-green-600'
  else if (renta >= 15) color = 'text-yellow-600'
  else if (renta >= 0) color = 'text-orange-600'
  else color = 'text-red-600'
  
  return { valor: `${renta.toFixed(1)}%`, color }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

// Formato compacto sin símbolo
function formatCompact(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  cotizacion: Cotizacion
}

export default function ResumenTotalesCotizacion({ cotizacion }: Props) {
  // 🔧 Generate unique keys using singleton generator to avoid React 19 duplicate key issues
  const contextId = React.useMemo(() => cotizacion.id || 'default', [cotizacion.id]);
  
  const categorias = [
    {
      key: generateEquiposKey(contextId),
      id: `equipos-section-${contextId}`,
      type: 'equipos',
      totalInterno: cotizacion.totalEquiposInterno,
      totalCliente: cotizacion.totalEquiposCliente,
      config: categoriasConfig.equipos
    },
    {
      key: generateServiciosKey(contextId),
      id: `servicios-section-${contextId}`,
      type: 'servicios',
      totalInterno: cotizacion.totalServiciosInterno,
      totalCliente: cotizacion.totalServiciosCliente,
      config: categoriasConfig.servicios
    },
    {
      key: generateGastosKey(contextId),
      id: `gastos-section-${contextId}`,
      type: 'gastos',
      totalInterno: cotizacion.totalGastosInterno,
      totalCliente: cotizacion.totalGastosCliente,
      config: categoriasConfig.gastos
    }
  ]

  const rentabilidadTotal = calcularRenta(cotizacion.totalCliente, cotizacion.totalInterno)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xs"
    >
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-1 pt-2 px-3">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <Receipt className="h-3.5 w-3.5 text-blue-600" />
            Resumen Financiero
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-1.5 pt-1 px-3 pb-3">
          {/* Header de columnas */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            <span>Categoría</span>
            <span className="text-right">Interno</span>
            <span className="text-right">Cliente</span>
            <span className="text-center">Rent.</span>
          </div>

          {/* Categorías */}
          <div className="space-y-1">
            {categorias.map((categoria, index) => {
              const IconComponent = categoria.config.icon
              const rentabilidad = calcularRenta(categoria.totalCliente, categoria.totalInterno)

              return (
                <motion.div
                  key={categoria.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`px-1.5 py-1 rounded border ${categoria.config.borderColor} ${categoria.config.bgColor}`}
                >
                  <div className="grid grid-cols-4 gap-1 items-center">
                    <div className="flex items-center gap-1">
                      <IconComponent className={`h-3 w-3 ${categoria.config.color} flex-shrink-0`} />
                      <span className={`text-[10px] font-medium ${categoria.config.color} truncate`}>
                        {categoria.config.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[10px] text-gray-600">
                        ${formatCompact(categoria.totalInterno)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono text-[10px] font-medium ${categoria.config.color}`}>
                        ${formatCompact(categoria.totalCliente)}
                      </span>
                    </div>
                    <div className="text-center">
                      <Badge variant="outline" className={`${rentabilidad.color} border-current text-[9px] px-1 py-0`}>
                        <Percent className="h-2 w-2 mr-0.5" />
                        {rentabilidad.valor}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <Separator className="my-1.5" />

          {/* Totales */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-1"
          >
            {/* Totales intermedios en una fila */}
            <div className="flex items-center justify-between text-[10px] px-1">
              <div className="flex items-center gap-1">
                <Target className="h-2.5 w-2.5 text-gray-500" />
                <span className="text-gray-600">Total Interno</span>
              </div>
              <span className="font-mono font-semibold text-gray-700">
                ${formatCompact(cotizacion.totalInterno)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] px-1">
              <div className="flex items-center gap-1">
                <DollarSign className="h-2.5 w-2.5 text-blue-600" />
                <span className="text-blue-700">Total Cliente</span>
              </div>
              <span className="font-mono font-semibold text-blue-800">
                ${formatCompact(cotizacion.totalCliente)}
              </span>
            </div>

            {/* Descuento */}
            {cotizacion.descuento > 0 && (
              <div className="flex items-center justify-between text-[10px] px-1 py-0.5 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5 text-yellow-600 rotate-180" />
                  <span className="text-yellow-700">Descuento</span>
                </div>
                <span className="font-mono font-semibold text-yellow-800">
                  -${formatCompact(cotizacion.descuento)}
                </span>
              </div>
            )}

            {/* Total final */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="font-bold text-sm">Total Final</span>
                </div>
                <span className="font-bold text-base font-mono">
                  {formatCurrency(cotizacion.grandTotal)}
                </span>
              </div>

              {/* Rentabilidad total */}
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-green-400/50">
                <span className="text-green-100 text-[10px]">Rentabilidad Total</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] px-1.5 py-0">
                  <TrendingUp className="h-2 w-2 mr-0.5" />
                  {rentabilidadTotal.valor}
                </Badge>
              </div>
            </motion.div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
