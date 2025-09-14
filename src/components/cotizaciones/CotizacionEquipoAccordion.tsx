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
import CotizacionEquipoItemForm from './CotizacionEquipoItemForm'
import CotizacionEquipoItemTable from './CotizacionEquipoItemTable'
import type { CotizacionEquipo, CotizacionEquipoItem } from '@/types'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Pencil, 
  Trash2, 
  Package, 
  TrendingUp, 
  DollarSign,
  Calculator,
  AlertCircle
} from 'lucide-react'

// Utility functions for formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const getRentabilityColor = (percentage: number): string => {
  if (percentage >= 30) return 'text-green-600'
  if (percentage >= 15) return 'text-yellow-600'
  return 'text-red-600'
}

const getRentabilityBadgeVariant = (percentage: number): "default" | "secondary" | "destructive" | "outline" => {
  if (percentage >= 30) return 'default'
  if (percentage >= 15) return 'secondary'
  return 'destructive'
}

interface Props {
  equipo: CotizacionEquipo
  onCreated: (item: CotizacionEquipoItem) => void
  onDeleted: (itemId: string) => void
  onUpdated: (item: CotizacionEquipoItem) => void
  onDeletedGrupo: () => void
  onUpdatedNombre: (nuevoNombre: string) => void
}

export default function CotizacionEquipoAccordion({
  equipo,
  onCreated,
  onDeleted,
  onUpdated,
  onDeletedGrupo,
  onUpdatedNombre
}: Props) {
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(equipo.nombre)

  useEffect(() => {
    setNuevoNombre(equipo.nombre)
  }, [equipo.nombre])

  const handleBlur = () => {
    if (nuevoNombre.trim() && nuevoNombre !== equipo.nombre) {
      onUpdatedNombre(nuevoNombre.trim())
    }
    setEditando(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    }
    if (e.key === 'Escape') {
      setNuevoNombre(equipo.nombre)
      setEditando(false)
    }
  }

  const renta = equipo.subtotalInterno > 0
    ? ((equipo.subtotalCliente - equipo.subtotalInterno) / equipo.subtotalInterno) * 100
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow duration-200">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value={equipo.id} className="border-none">
            {/* Header del Accordion */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>svg]:rotate-90">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="h-5 w-5 text-primary" />
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
                            className="text-lg font-semibold bg-transparent border-b-2 border-primary focus:outline-none focus:border-primary-dark min-w-[200px]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3 
                            className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditando(true)
                            }}
                          >
                            {equipo.nombre}
                          </h3>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {equipo.items.length} ítem{equipo.items.length !== 1 ? 's' : ''}
                          </Badge>
                          {renta > 0 && (
                            <Badge variant={getRentabilityBadgeVariant(renta) as "secondary" | "default" | "outline"} className="text-xs">
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
                      {formatCurrency(equipo.subtotalInterno)}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <DollarSign className="h-3 w-3" />
                      Cliente
                    </div>
                    <div className="font-semibold text-sm text-green-600">
                      {formatCurrency(equipo.subtotalCliente)}
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
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('¿Estás seguro de que deseas eliminar este grupo de equipos?')) {
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
                    {formatCurrency(equipo.subtotalInterno)}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Cliente</div>
                  <div className="font-semibold text-sm text-green-600">
                    {formatCurrency(equipo.subtotalCliente)}
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
                >
                  <CotizacionEquipoItemForm 
                    cotizacionEquipoId={equipo.id} 
                    onCreated={onCreated} 
                  />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {equipo.items.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No hay equipos agregados</h3>
                      <p className="text-muted-foreground mb-4">
                        Agrega equipos a este grupo para comenzar
                      </p>
                    </div>
                  ) : (
                    <CotizacionEquipoItemTable 
                      items={equipo.items} 
                      onDeleted={onDeleted} 
                      onUpdated={onUpdated} 
                    />
                  )}
                </motion.div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </motion.div>
  )
}
