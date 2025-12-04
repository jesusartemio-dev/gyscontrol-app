'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import CotizacionServicioItemTable from './CotizacionServicioItemTable'
import CotizacionServicioItemMultiAddModal from './CotizacionServicioItemMultiAddModal'
import type {
  CotizacionServicio,
  CotizacionServicioItem,
  CotizacionServicioItemPayload
} from '@/types'
import { useState, useEffect } from 'react'
import {
  Pencil,
  Trash2,
  Wrench,
  Settings,
  TrendingUp,
  DollarSign,
  Calculator,
  Plus,
  AlertCircle,
  List,
  Grid3X3
} from 'lucide-react'
import { motion } from 'framer-motion'

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const getRentabilityColor = (renta: number): string => {
  if (renta >= 30) return 'text-green-600'
  if (renta >= 15) return 'text-yellow-600'
  return 'text-red-600'
}

const getRentabilityBadgeVariant = (renta: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (renta >= 30) return 'default'
  if (renta >= 15) return 'secondary'
  return 'destructive'
}

interface Props {
  servicio: CotizacionServicio
  onCreated: (item: CotizacionServicioItem) => void
  onMultipleCreated?: (items: CotizacionServicioItem[]) => void
  onDeleted: (itemId: string) => void
  onUpdated: (item: CotizacionServicioItem) => void
  onDeletedGrupo: () => void
  onUpdatedNombre: (nuevoNombre: string) => void
}

export default function CotizacionServicioAccordion({
  servicio,
  onCreated,
  onMultipleCreated,
  onDeleted,
  onUpdated,
  onDeletedGrupo,
  onUpdatedNombre
}: Props) {
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(servicio.nombre || servicio.categoria)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  useEffect(() => {
    setNuevoNombre(servicio.nombre || servicio.categoria)
  }, [servicio.nombre, servicio.categoria])

  const handleBlur = () => {
    if (nuevoNombre.trim() && nuevoNombre !== (servicio.nombre || servicio.categoria)) {
      onUpdatedNombre(nuevoNombre.trim())
    }
    setEditando(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    }
    if (e.key === 'Escape') {
      setNuevoNombre(servicio.nombre || servicio.categoria)
      setEditando(false)
    }
  }

  const renta = servicio.subtotalInterno > 0
    ? ((servicio.subtotalCliente - servicio.subtotalInterno) / servicio.subtotalInterno) * 100
    : 0

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow duration-200">
          <Accordion type="multiple" defaultValue={servicio.items.length > 0 ? [servicio.id] : []} className="w-full">
            <AccordionItem value={servicio.id} className="border-none">
              {/* Header del Accordion */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>svg]:rotate-90">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Settings className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="text-left">
                          {editando ? (
                            <input
                              type="text"
                              value={nuevoNombre}
                              onChange={(e) => setNuevoNombre(e.target.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyPress}
                              autoFocus
                              className="text-lg font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 min-w-[200px]"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <h3
                              className="text-lg font-semibold text-foreground cursor-pointer hover:text-blue-500 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditando(true)
                              }}
                            >
                              {servicio.nombre}
                            </h3>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {servicio.items.length} ítem{servicio.items.length !== 1 ? 's' : ''}
                            </Badge>
                            {renta > 0 && (
                              <Badge variant={getRentabilityBadgeVariant(renta) as 'outline' | 'default' | 'secondary'} className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {renta.toFixed(1)}% rent.
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                  </div>

                  {/* Métricas Financieras */}
                  <div className="hidden md:flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Calculator className="h-3 w-3" />
                        Interno
                      </div>
                      <div className="font-semibold text-sm">
                        {formatCurrency(servicio.subtotalInterno)}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        Cliente
                      </div>
                      <div className="font-semibold text-sm text-green-600">
                        {formatCurrency(servicio.subtotalCliente)}
                      </div>
                    </div>

                    {renta > 0 && (
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          Rentabilidad
                        </div>
                        <div className={`font-semibold text-sm ${getRentabilityColor(renta)}`}>
                          {renta.toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditando(true)
                      }}
                      className="h-8 w-8 p-0 hover:bg-blue-500/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('¿Estás seguro de que deseas eliminar este grupo de servicios?')) {
                          onDeletedGrupo()
                        }
                      }}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Métricas móviles */}
                <div className="md:hidden mt-4 grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Interno</div>
                    <div className="font-semibold text-sm">
                      {formatCurrency(servicio.subtotalInterno)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Cliente</div>
                    <div className="font-semibold text-sm text-green-600">
                      {formatCurrency(servicio.subtotalCliente)}
                    </div>
                  </div>
                  {renta > 0 && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Rent.</div>
                      <div className={`font-semibold text-sm ${getRentabilityColor(renta)}`}>
                        {renta.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contenido del Accordion */}
              <AccordionContent className="px-0 pb-0">
                <Separator />
                <div className="p-6 space-y-6 bg-muted/20">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    {/* View Toggle Buttons - Hidden on mobile, shown on desktop */}
                    <div className="hidden md:flex items-center gap-1 border rounded-lg p-1">
                      <Button
                        size="sm"
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('table')}
                        className="h-8 px-3"
                      >
                        <List className="h-4 w-4 mr-1" />
                        Tabla
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'card' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('card')}
                        className="h-8 px-3"
                      >
                        <Grid3X3 className="h-4 w-4 mr-1" />
                        Cards
                      </Button>
                    </div>

                    <Button
                      onClick={() => setModalAbierto(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Item
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {servicio.items.length === 0 ? (
                      <div className="text-center py-12">
                        <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay servicios agregados</h3>
                        <p className="text-muted-foreground mb-4">
                          Agrega servicios a esta categoría para comenzar
                        </p>
                      </div>
                    ) : viewMode === 'table' ? (
                      <CotizacionServicioItemTable
                        items={servicio.items}
                        onDeleted={onDeleted}
                        onUpdated={onUpdated}
                      />
                    ) : (
                      <div className="space-y-6">
                        {servicio.items.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border rounded-lg p-6 hover:shadow-md transition-all bg-white"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-lg text-gray-900">{item.nombre}</h4>
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {item.unidadServicioNombre}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {item.formula}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{item.descripcion}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleted(item.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Formula Details */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Calculator className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-sm text-gray-700">Detalles de la Fórmula</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Recurso:</span>
                                  <div className="font-medium">{item.recursoNombre}</div>
                                  <div className="text-xs text-gray-500">${item.costoHora}/hora</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Fórmula:</span>
                                  <div className="font-medium">{item.formula}</div>
                                </div>
                                {item.formula === 'Fijo' && item.horaFijo && (
                                  <div>
                                    <span className="text-gray-500">Horas Fijas:</span>
                                    <div className="font-medium">{item.horaFijo}h</div>
                                  </div>
                                )}
                                {item.formula === 'Proporcional' && item.horaUnidad && (
                                  <div>
                                    <span className="text-gray-500">Horas por Unidad:</span>
                                    <div className="font-medium">{item.horaUnidad}h</div>
                                  </div>
                                )}
                                {item.formula === 'Escalonada' && (
                                  <>
                                    <div>
                                      <span className="text-gray-500">Horas Base:</span>
                                      <div className="font-medium">{item.horaBase || 0}h</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Horas Repetidas:</span>
                                      <div className="font-medium">{item.horaRepetido || 0}h</div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Quantity and Pricing */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Quantity Section */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  Cantidad
                                </Label>
                                <div className="text-2xl font-bold text-blue-600">
                                  {item.cantidad}
                                </div>
                              </div>

                              {/* Hours Calculation */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                  <Calculator className="h-4 w-4" />
                                  Horas Totales
                                </Label>
                                <div className="text-2xl font-bold text-purple-600">
                                  {item.horaTotal}h
                                </div>
                                <div className="text-xs text-gray-500">
                                  Calculado según fórmula
                                </div>
                              </div>

                              {/* Pricing */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  Precio Cliente
                                </Label>
                                <div className="text-2xl font-bold text-green-600">
                                  {formatCurrency(item.costoCliente)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Total: {formatCurrency(item.cantidad * item.costoCliente)}
                                </div>
                              </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Costo Interno:</span>
                                  <div className="font-medium">{formatCurrency(item.costoInterno)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Factor Seguridad:</span>
                                  <div className="font-medium">{item.factorSeguridad}x</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Margen:</span>
                                  <div className="font-medium">{(item.margen * 100).toFixed(1)}%</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Total Unitario:</span>
                                  <div className="font-medium text-green-600">{formatCurrency(item.costoCliente)}</div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </motion.div>

      <CotizacionServicioItemMultiAddModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        servicio={servicio}
        onItemsCreated={(items) => {
          if (onMultipleCreated) {
            onMultipleCreated(items)
          } else {
            items.forEach(item => onCreated(item as CotizacionServicioItem))
          }
        }}
      />
    </>
  )
}
