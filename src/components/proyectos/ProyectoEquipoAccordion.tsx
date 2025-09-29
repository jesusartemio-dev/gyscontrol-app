'use client'

// ===================================================
// 📁 Componente: ProyectoEquipoAccordion.tsx
// 📌 Descripción: Accordion para mostrar grupos de equipos con ítems anidados
// ===================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Package, DollarSign, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import ProyectoEquipoItemTabla from './ProyectoEquipoItemTabla'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { ProyectoEquipoCotizado } from '@/types'

interface Props {
  equipo: ProyectoEquipoCotizado
  modoRevision?: boolean
  onUpdatedItem?: () => void
}

export default function ProyectoEquipoAccordion({
  equipo,
  modoRevision = false,
  onUpdatedItem
}: Props) {
  const [abierto, setAbierto] = useState(false)

  // Calculations
  const presupuestoTotal = equipo.items.reduce((sum, item) => sum + item.costoInterno, 0)
  const costoRealTotal = equipo.items.reduce((sum, item) => sum + item.costoReal, 0)
  const totalItems = equipo.items.length
  const itemsCompletados = equipo.items.filter(item => 
    item.estado?.toLowerCase() === 'completado' || item.estado?.toLowerCase() === 'entregado'
  ).length
  const itemsPendientes = equipo.items.filter(item => 
    item.estado?.toLowerCase() === 'pendiente' || item.estado?.toLowerCase() === 'en proceso'
  ).length
  const itemsConProblemas = equipo.items.filter(item => 
    item.estado?.toLowerCase() === 'problema' || item.estado?.toLowerCase() === 'cancelado'
  ).length
  
  const progreso = totalItems > 0 ? (itemsCompletados / totalItems) * 100 : 0
  const variacion = presupuestoTotal > 0 ? ((costoRealTotal - presupuestoTotal) / presupuestoTotal) * 100 : 0

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Get status color
  const getStatusColor = () => {
    if (itemsConProblemas > 0) return 'text-red-600'
    if (itemsPendientes > 0) return 'text-yellow-600'
    if (itemsCompletados === totalItems) return 'text-green-600'
    return 'text-blue-600'
  }

  // Get variation color
  const getVariationColor = () => {
    if (variacion > 10) return 'text-red-600'
    if (variacion > 0) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <Card className="overflow-hidden">
      {/* Header del Accordion */}
      <CardHeader className="p-0">
        <motion.button
          onClick={() => setAbierto(!abierto)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 transition-all duration-200 border-b"
          whileHover={{ scale: 1.001 }}
          whileTap={{ scale: 0.999 }}
        >
          <div className="flex items-center space-x-4">
            <motion.div
              animate={{ rotate: abierto ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </motion.div>
            
            <div className="flex items-center space-x-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-foreground">{equipo.nombre || 'Grupo sin nombre'}</h3>
                <p className="text-sm text-muted-foreground">{totalItems} items</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Progress Section */}
            <div className="text-center min-w-[100px]">
              <p className="text-xs text-muted-foreground mb-1">Progreso</p>
              <div className="flex items-center space-x-2">
                <Progress value={progreso} className="w-16 h-2" />
                <span className="text-sm font-medium">{Math.round(progreso)}%</span>
              </div>
            </div>
            
            {/* Budget Section */}
            <div className="text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground">Presupuesto</p>
              <p className="font-bold text-blue-600 flex items-center justify-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(presupuestoTotal)}
              </p>
            </div>
            
            {/* Real Cost Section */}
            <div className="text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground">Costo Real</p>
              <p className="font-bold text-green-600 flex items-center justify-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(costoRealTotal)}
              </p>
            </div>
            
            {/* Variation Section */}
            <div className="text-center min-w-[100px]">
              <p className="text-xs text-muted-foreground">Variación</p>
              <p className={`font-bold ${getVariationColor()}`}>
                {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}%
              </p>
            </div>
            
            {/* Status Badges */}
            <div className="flex space-x-1">
              {itemsCompletados > 0 && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {itemsCompletados}
                </Badge>
              )}
              {itemsPendientes > 0 && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {itemsPendientes}
                </Badge>
              )}
              {itemsConProblemas > 0 && (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {itemsConProblemas}
                </Badge>
              )}
            </div>
          </div>
        </motion.button>
      </CardHeader>

      {/* Contenido del Accordion */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <CardContent className="p-0">
              {/* Summary Stats */}
              <div className="px-6 py-4 bg-slate-50/50 border-b">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{itemsCompletados}</p>
                    <p className="text-sm text-muted-foreground">Completados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{itemsPendientes}</p>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${getVariationColor()}`}>
                      {formatCurrency(Math.abs(costoRealTotal - presupuestoTotal))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {variacion >= 0 ? 'Sobrecosto' : 'Ahorro'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Items Table */}
              <div className="p-6">
                <ProyectoEquipoItemTabla items={equipo.items} onUpdated={onUpdatedItem} />
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
