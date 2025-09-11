/**
 * 📊 Lista Equipo Summary Component
 * 
 * Componente unificado que muestra las métricas esenciales de una lista de equipos
 * de forma minimalista y sin duplicación.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  CheckCircle, 
  Clock, 
  ShoppingCart, 
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { calcularCostoTotal, formatCurrency } from '@/lib/utils/costoCalculations'
import type { ListaEquipoItem } from '@/types'

// ✅ Props interface
interface ListaEquipoSummaryProps {
  items: ListaEquipoItem[]
  estado: string
  className?: string
}

// ✅ Statistics calculation helper
const calculateStats = (items: ListaEquipoItem[]) => {
  const total = items.length
  const verificados = items.filter(item => item.verificado).length
  const sinPedidos = items.filter(item => (item.cantidad - (item.cantidadPedida || 0)) > 0).length
  const enPedido = items.filter(item => (item.cantidadPedida || 0) > 0).length
  const conCotizacion = items.filter(item => item.cotizacionSeleccionada || item.costoElegido).length
  const costoTotal = calcularCostoTotal(items)
  
  return {
    total,
    verificados,
    sinPedidos,
    enPedido,
    conCotizacion,
    costoTotal
  }
}

// ✅ Status variant helper
const getStatusVariant = (estado: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (estado) {
    case 'aprobado': return 'default'
    case 'borrador': return 'secondary'
    case 'revision': return 'outline'
    default: return 'outline'
  }
}

export default function ListaEquipoSummary({ 
  items, 
  estado, 
  className = '' 
}: ListaEquipoSummaryProps) {
  const stats = calculateStats(items)
  const hasIncompleteQuotations = items.some(item => !item.cotizacionSeleccionada && !item.costoElegido)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 ${className}`}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* 📊 Essential Metrics */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Total Items */}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {stats.total} {stats.total === 1 ? 'Item' : 'Items'}
                </span>
              </div>
              
              {/* Verified Items */}
              {stats.verificados > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    {stats.verificados} Verificados
                  </span>
                </div>
              )}
              
              {/* Items in Order */}
              {stats.enPedido > 0 && (
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600">
                    {stats.enPedido} En Pedido
                  </span>
                </div>
              )}
              
              {/* Total Cost */}
              {stats.costoTotal > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-600">
                    {formatCurrency(stats.costoTotal)}
                  </span>
                </div>
              )}
            </div>
            
            {/* 🏷️ Status and Warnings */}
            <div className="flex items-center gap-3">
              {/* Quotation Warning */}
              {hasIncompleteQuotations && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600">
                    {items.filter(item => !item.cotizacionSeleccionada && !item.costoElegido).length} sin cotización
                  </span>
                </div>
              )}
              
              {/* Status Badge */}
              <Badge variant={getStatusVariant(estado)} className="capitalize">
                {estado}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
