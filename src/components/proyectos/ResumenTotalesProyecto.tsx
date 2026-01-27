'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Calculator,
  Wrench,
  Truck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Receipt,
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Proyecto } from '@/types'

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

// Calculate variance between plan and real
function calcularVarianza(plan: number, real: number): { porcentaje: number; estado: 'ok' | 'warning' | 'danger'; diferencia: number } {
  if (plan === 0) return { porcentaje: 0, estado: 'ok', diferencia: real }
  const porcentaje = (real / plan) * 100
  const diferencia = real - plan

  let estado: 'ok' | 'warning' | 'danger' = 'ok'
  if (porcentaje > 100) estado = 'danger'
  else if (porcentaje > 80) estado = 'warning'

  return { porcentaje, estado, diferencia }
}

// Get status color classes
const getStatusColor = (estado: 'ok' | 'warning' | 'danger'): string => {
  switch (estado) {
    case 'danger': return 'text-red-600'
    case 'warning': return 'text-amber-600'
    default: return 'text-emerald-600'
  }
}

const getStatusBgColor = (estado: 'ok' | 'warning' | 'danger'): string => {
  switch (estado) {
    case 'danger': return 'bg-red-500'
    case 'warning': return 'bg-amber-500'
    default: return 'bg-emerald-500'
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

interface Props {
  proyecto: Proyecto
}

export default function ResumenTotalesProyecto({ proyecto }: Props) {
  // Calculate stats
  const equiposCount = proyecto.equipos?.length || 0
  const serviciosCount = proyecto.servicios?.length || 0
  const gastosCount = proyecto.gastos?.length || 0

  // Calculate totals from items (Plan)
  const totalEquiposInterno = proyecto.equipos?.reduce((acc, e) => acc + (e.subtotalInterno || 0), 0) || 0
  const totalEquiposCliente = proyecto.equipos?.reduce((acc, e) => acc + (e.subtotalCliente || 0), 0) || 0
  const totalServiciosInterno = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalInterno || 0), 0) || 0
  const totalServiciosCliente = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalCliente || 0), 0) || 0
  const totalGastosInterno = proyecto.gastos?.reduce((acc, g) => acc + (g.subtotalInterno || 0), 0) || 0
  const totalGastosCliente = proyecto.gastos?.reduce((acc, g) => acc + (g.subtotalCliente || 0), 0) || 0

  // Calculate real totals
  const totalEquiposReal = proyecto.equipos?.reduce((acc, e) => acc + (e.subtotalReal || 0), 0) || 0
  const totalServiciosReal = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalReal || 0), 0) || 0
  const totalGastosReal = proyecto.gastos?.reduce((acc, g) => acc + (g.subtotalReal || 0), 0) || 0

  // Calculate varianzas
  const varianzaEquipos = calcularVarianza(totalEquiposCliente, totalEquiposReal)
  const varianzaServicios = calcularVarianza(totalServiciosCliente, totalServiciosReal)
  const varianzaGastos = calcularVarianza(totalGastosCliente, totalGastosReal)

  const categorias = [
    {
      key: `equipos-${proyecto.id}`,
      type: 'equipos',
      count: equiposCount,
      totalInterno: totalEquiposInterno,
      totalCliente: totalEquiposCliente,
      totalReal: totalEquiposReal,
      varianza: varianzaEquipos,
      config: categoriasConfig.equipos
    },
    {
      key: `servicios-${proyecto.id}`,
      type: 'servicios',
      count: serviciosCount,
      totalInterno: totalServiciosInterno,
      totalCliente: totalServiciosCliente,
      totalReal: totalServiciosReal,
      varianza: varianzaServicios,
      config: categoriasConfig.servicios
    },
    {
      key: `gastos-${proyecto.id}`,
      type: 'gastos',
      count: gastosCount,
      totalInterno: totalGastosInterno,
      totalCliente: totalGastosCliente,
      totalReal: totalGastosReal,
      varianza: varianzaGastos,
      config: categoriasConfig.gastos
    }
  ]

  const totalInterno = proyecto.totalInterno || (totalEquiposInterno + totalServiciosInterno + totalGastosInterno)
  const totalCliente = proyecto.totalCliente || (totalEquiposCliente + totalServiciosCliente + totalGastosCliente)
  const totalReal = proyecto.totalReal || (totalEquiposReal + totalServiciosReal + totalGastosReal)
  const varianzaTotal = calcularVarianza(totalCliente, totalReal)
  const rentabilidadTotal = calcularRenta(totalCliente, totalInterno)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <Receipt className="h-4 w-4 text-blue-600" />
            Resumen Financiero
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 pt-2">
          {/* Categorías */}
          <div className="space-y-2">
            {categorias.map((categoria, index) => {
              const IconComponent = categoria.config.icon
              const rentabilidad = calcularRenta(categoria.totalCliente, categoria.totalInterno)

              return (
                <motion.div
                  key={categoria.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`p-2 rounded-lg border ${categoria.config.borderColor} ${categoria.config.bgColor} transition-all hover:shadow-md`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`h-3 w-3 ${categoria.config.color}`} />
                        <span className={`text-sm font-medium ${categoria.config.color}`}>
                          {categoria.config.label}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1">
                          {categoria.count}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={`${rentabilidad.color} border-current text-xs`}>
                        <Percent className="h-2 w-2 mr-1" />
                        {rentabilidad.valor}
                      </Badge>
                    </div>

                    {/* Plan vs Real progress */}
                    {categoria.totalCliente > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Target className="h-2.5 w-2.5" />
                            Plan: {formatCurrency(categoria.totalCliente)}
                          </span>
                          <span className={`font-medium flex items-center gap-1 ${getStatusColor(categoria.varianza.estado)}`}>
                            {categoria.varianza.estado === 'danger' ? (
                              <TrendingUp className="h-2.5 w-2.5" />
                            ) : categoria.varianza.estado === 'ok' && categoria.totalReal > 0 ? (
                              <TrendingDown className="h-2.5 w-2.5" />
                            ) : null}
                            Real: {formatCurrency(categoria.totalReal)}
                          </span>
                        </div>
                        <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all ${getStatusBgColor(categoria.varianza.estado)}`}
                            style={{ width: `${Math.min(categoria.varianza.porcentaje, 100)}%` }}
                          />
                          {categoria.varianza.porcentaje > 100 && (
                            <div
                              className="absolute inset-y-0 bg-red-300 rounded-r-full"
                              style={{ left: '100%', width: `${Math.min(categoria.varianza.porcentaje - 100, 50)}%` }}
                            />
                          )}
                        </div>
                        <div className="flex justify-end">
                          <span className={`text-[10px] font-medium ${getStatusColor(categoria.varianza.estado)}`}>
                            {categoria.varianza.porcentaje.toFixed(0)}% ejecutado
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          <Separator className="my-2" />

          {/* Totales */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-2"
          >
            {/* Totales intermedios */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">Interno</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">
                  {formatCurrency(totalInterno)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Cliente</span>
                </div>
                <span className="text-xs font-semibold text-blue-800">
                  {formatCurrency(totalCliente)}
                </span>
              </div>
            </div>

            {/* Plan vs Real Summary */}
            {totalReal > 0 && (
              <div className={`p-2 rounded-lg border ${
                varianzaTotal.estado === 'danger' ? 'bg-red-50 border-red-200' :
                varianzaTotal.estado === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    {varianzaTotal.estado === 'danger' ? (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    ) : varianzaTotal.estado === 'warning' ? (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    )}
                    Ejecución Total
                  </span>
                  <span className={`text-xs font-bold ${getStatusColor(varianzaTotal.estado)}`}>
                    {varianzaTotal.porcentaje.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-gray-600">Plan: {formatCurrency(totalCliente)}</span>
                  <ArrowRight className="h-2.5 w-2.5 text-gray-400" />
                  <span className={`font-medium ${getStatusColor(varianzaTotal.estado)}`}>
                    Real: {formatCurrency(totalReal)}
                  </span>
                </div>
                {varianzaTotal.diferencia !== 0 && (
                  <div className={`text-[10px] mt-1 ${getStatusColor(varianzaTotal.estado)}`}>
                    {varianzaTotal.diferencia > 0 ? '+' : ''}{formatCurrency(varianzaTotal.diferencia)}
                    {varianzaTotal.diferencia > 0 ? ' sobre presupuesto' : ' bajo presupuesto'}
                  </div>
                )}
              </div>
            )}

            {/* Total final */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-bold text-base">Total</span>
                </div>
                <span className="font-bold text-lg">
                  {formatCurrency(proyecto.grandTotal || 0)}
                </span>
              </div>

              {/* Rentabilidad total */}
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-green-400">
                <span className="text-green-100 text-xs">Rentabilidad</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                  <TrendingUp className="h-2 w-2 mr-1" />
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
