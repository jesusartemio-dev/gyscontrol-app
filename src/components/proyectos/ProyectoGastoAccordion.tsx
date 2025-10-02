'use client'

// ===================================================
// 📁 Componente: ProyectoGastoAccordion.tsx
// 📌 Descripción: Accordion para mostrar grupos de gastos con ítems anidados
// ===================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Receipt, DollarSign, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { ProyectoGastoCotizado } from '@/types'

interface Props {
  gasto: ProyectoGastoCotizado
  onUpdatedItem?: () => void
}

export default function ProyectoGastoAccordion({ gasto, onUpdatedItem }: Props) {
  const [abierto, setAbierto] = useState(false)

  // 📊 Cálculos de estadísticas
  const totalItems = gasto.items?.length || 0
  const cantidadTotal = gasto.items?.reduce((sum, item) => sum + item.cantidad, 0) || 0
  const costoTotal = gasto.items?.reduce((sum, item) => sum + item.costoCliente, 0) || 0
  const progreso = totalItems > 0 ? (gasto.items?.filter(item => item.costoReal > 0).length || 0) / totalItems * 100 : 0

  // 🎨 Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header del Accordion */}
      <CardHeader className="p-0">
        <motion.button
          onClick={() => setAbierto(!abierto)}
          className="w-full p-4 text-left hover:bg-slate-50 transition-colors duration-200 rounded-t-lg"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between">
            {/* Información Principal */}
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: abierto ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </motion.div>

              <div className="p-2 bg-orange-100 rounded-lg">
                <Receipt className="h-5 w-5 text-orange-600" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">{gasto.nombre}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-slate-600">
                  {totalItems} {totalItems === 1 ? 'gasto' : 'gastos'} • {cantidadTotal} total
                </span>
                  {totalItems > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progreso}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {Math.round(progreso)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Información Financiera y Estados */}
            <div className="flex items-center gap-4">
              {/* Totales Financieros */}
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-700">
                    Cliente: {formatCurrency(gasto.subtotalCliente)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="text-slate-600">
                    Interno: {formatCurrency(gasto.subtotalInterno)}
                  </span>
                </div>
              </div>

              {/* Progress Badge */}
              <div className="flex space-x-1">
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {totalItems} items
                </Badge>
                {progreso === 100 && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completado
                  </Badge>
                )}
              </div>
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
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-4">
              <Separator className="mb-4" />

              {/* Lista de Items de Gasto */}
              {gasto.items && gasto.items.length > 0 ? (
                <div className="space-y-3">
                  {gasto.items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{item.nombre}</h4>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-slate-600">
                              Cantidad: <span className="font-medium">{item.cantidad}</span>
                            </span>
                            <span className="text-sm text-slate-600">
                              Precio Unitario: <span className="font-medium">{formatCurrency(item.precioUnitario)}</span>
                            </span>
                            <span className="text-sm text-slate-600">
                              Factor Seguridad: <span className="font-medium">{item.factorSeguridad}%</span>
                            </span>
                          </div>
                          {item.descripcion && (
                            <p className="text-sm text-slate-500 mt-1">{item.descripcion}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900">
                            {formatCurrency(item.costoCliente)}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatCurrency(item.precioUnitario)} base
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Interno: {formatCurrency(item.costoInterno)}
                          </div>
                          <div className="flex gap-1 mt-2">
                            <Badge
                              variant={item.costoReal > 0 ? 'default' : 'secondary'}
                            >
                              {item.costoReal > 0 ? 'Ejecutado' : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Receipt className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium mb-1">No hay gastos registrados</p>
                  <p className="text-xs">Los gastos aparecerán aquí una vez que sean agregados.</p>
                </div>
              )}

              {/* Resumen Financiero */}
              {gasto.items && gasto.items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(gasto.subtotalCliente)}
                      </div>
                      <div className="text-xs text-orange-700 font-medium">Total Cliente</div>
                    </div>

                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-lg font-bold text-slate-600">
                        {formatCurrency(gasto.subtotalInterno)}
                      </div>
                      <div className="text-xs text-slate-700 font-medium">Total Interno</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}