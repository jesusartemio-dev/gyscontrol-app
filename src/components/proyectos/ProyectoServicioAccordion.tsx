'use client'

// ===================================================
// 📁 Componente: ProyectoServicioAccordion.tsx
// 📌 Descripción: Accordion para mostrar grupos de servicios con ítems anidados
// ===================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Settings, DollarSign, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { ProyectoServicioCotizado } from '@/types'

interface Props {
  servicio: ProyectoServicioCotizado
  onUpdatedItem?: () => void
}

export default function ProyectoServicioAccordion({ servicio, onUpdatedItem }: Props) {
  const [abierto, setAbierto] = useState(false)

  // 📊 Cálculos de estadísticas
  const totalItems = servicio.items?.length || 0
  const horasTotales = servicio.items?.reduce((sum, item) => sum + item.cantidadHoras, 0) || 0
  const horasEjecutadas = servicio.items?.reduce((sum, item) => sum + item.horasEjecutadas, 0) || 0
  const progreso = horasTotales > 0 ? (horasEjecutadas / horasTotales) * 100 : 0

  // 🎨 Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
              
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900">{servicio.nombre}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-slate-600">
                  {totalItems} {totalItems === 1 ? 'servicio' : 'servicios'} • {horasTotales}h total
                </span>
                  {totalItems > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
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
                    Cliente: {formatCurrency(servicio.subtotalCliente)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="text-slate-600">
                    Interno: {formatCurrency(servicio.subtotalInterno)}
                  </span>
                </div>
              </div>

              {/* Progress Badge */}
              <div className="flex space-x-1">
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {horasEjecutadas}h / {horasTotales}h
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
              
              {/* Lista de Items de Servicio */}
              {servicio.items && servicio.items.length > 0 ? (
                <div className="space-y-3">
                  {servicio.items.map((item, index) => (
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
                              Horas: <span className="font-medium">{item.cantidadHoras}h</span>
                            </span>
                            <span className="text-sm text-slate-600">
                              Ejecutadas: <span className="font-medium">{item.horasEjecutadas}h</span>
                            </span>
                            <span className="text-sm text-slate-600">
                              EDT: <span className="font-medium">{item.categoria}</span>
                            </span>
                          </div>
                          {item.motivoCambio && (
                            <p className="text-sm text-amber-600 mt-1 italic">Motivo: {item.motivoCambio}</p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900">
                            {formatCurrency(item.costoCliente)}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatCurrency(item.costoHoraCliente)} / hora
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Interno: {formatCurrency(item.costoInterno)}
                          </div>
                          <div className="flex gap-1 mt-2">
                            {item.nuevo && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                Nuevo
                              </Badge>
                            )}
                            <Badge 
                              variant={item.horasEjecutadas >= item.cantidadHoras ? 'default' : 'secondary'}
                            >
                              {item.horasEjecutadas >= item.cantidadHoras ? 'Completado' : 'En Progreso'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Settings className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium mb-1">No hay servicios registrados</p>
                  <p className="text-xs">Los servicios aparecerán aquí una vez que sean agregados.</p>
                </div>
              )}
              
              {/* Resumen Financiero */}
              {servicio.items && servicio.items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(servicio.subtotalCliente)}
                      </div>
                      <div className="text-xs text-purple-700 font-medium">Total Cliente</div>
                    </div>
                    
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-lg font-bold text-slate-600">
                        {formatCurrency(servicio.subtotalInterno)}
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