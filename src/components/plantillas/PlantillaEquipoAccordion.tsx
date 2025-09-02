'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import PlantillaEquipoItemForm from './PlantillaEquipoItemForm'
import PlantillaEquipoItemList from './PlantillaEquipoItemList'
import { PlantillaEquipoAccordionSkeleton } from './PlantillaEquipoSkeleton'
import type { PlantillaEquipo, PlantillaEquipoItem } from '@/types'
import { useState, useEffect } from 'react'
import { Pencil, Trash2, Briefcase, DollarSign, TrendingUp, Package, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { 
  formatCurrency, 
  calculateTotalClient, 
  calculateRental, 
  getProfitMarginVariant, 
  getRentalVariant,
  calculateProfitMargin,
  validateQuantity
} from '@/lib/utils/plantilla-utils'

interface Props {
  equipo: PlantillaEquipo
  onCreated: (item: PlantillaEquipoItem) => void
  onDeleted: (itemId: string) => void
  onUpdated: (item: PlantillaEquipoItem) => void
  onDeletedGrupo: () => void
  onUpdatedNombre: (nuevoNombre: string) => void
  isLoading?: boolean
}

export default function PlantillaEquipoAccordion({
  equipo,
  onCreated,
  onDeleted,
  onUpdated,
  onDeletedGrupo,
  onUpdatedNombre,
  isLoading = false
}: Props) {
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(equipo.nombre)
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Show skeleton while loading
  if (isLoading) {
    return <PlantillaEquipoAccordionSkeleton />
  }

  useEffect(() => {
    setNuevoNombre(equipo.nombre)
  }, [equipo.nombre])

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError('El nombre no puede estar vacío')
      return false
    }
    if (name.trim().length < 3) {
      setNameError('El nombre debe tener al menos 3 caracteres')
      return false
    }
    if (name.trim().length > 100) {
      setNameError('El nombre no puede tener más de 100 caracteres')
      return false
    }
    setNameError(null)
    return true
  }

  const handleNameChange = (value: string) => {
    setNuevoNombre(value)
    validateName(value)
  }

  const handleBlur = () => {
    if (validateName(nuevoNombre) && nuevoNombre.trim() !== equipo.nombre) {
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
      setNameError(null)
    }
  }

  // Calculate totals using utilities
  const items = equipo.items || []
  const totalCliente = calculateTotalClient(items)
  const renta = calculateRental(totalCliente)
  const rentabilidad = calculateProfitMargin(items)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-r from-white to-gray-50">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value={equipo.id} className="border-0">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-6 py-4 gap-4 hover:bg-gray-50/50 transition-colors">
              {/* Botón de expandir/contraer */}
              <AccordionTrigger className="flex justify-start hover:no-underline p-0 [&[data-state=open]>svg]:rotate-90" />

              {/* Nombre editable */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase size={18} className="text-blue-600" />
                </div>
                {editando ? (
                  <div className="flex-1 space-y-1">
                    <Input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyPress}
                      autoFocus
                      className={`h-8 text-sm font-medium ${nameError ? 'border-red-500' : ''}`}
                      placeholder="Nombre del grupo"
                      maxLength={100}
                      disabled={loading}
                    />
                    {nameError && (
                      <p className="text-xs text-red-600">{nameError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span
                      onClick={() => setEditando(true)}
                      className="font-semibold text-base text-gray-800 cursor-pointer hover:text-blue-600 transition-colors truncate"
                    >
                      {equipo.nombre}
                    </span>
                    <span className="text-xs text-gray-500">Click para editar</span>
                  </div>
                )}
              </div>

              {/* Cantidad de ítems */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Package size={12} />
                  {items.length} ítem{items.length !== 1 ? 's' : ''}
                </Badge>
                <Badge 
                  variant={getProfitMarginVariant(rentabilidad) as "outline" | "secondary" | "default"}
                  className="flex items-center gap-1"
                >
                  <TrendingUp size={10} />
                  {rentabilidad.toFixed(1)}% rent.
                </Badge>
              </div>

              {/* Totales con mejor diseño */}
              <div className="text-right">
                <div className="grid grid-cols-3 gap-2 text-xs mb-1">
                  <span className="text-gray-500">Interno</span>
                  <span className="text-gray-500">Cliente</span>
                  <span className="text-gray-500">Rent.</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <DollarSign size={12} className="text-gray-600" />
                    <span className="text-gray-700">{formatCurrency(equipo.subtotalInterno || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign size={12} className="text-green-600" />
                    <span className="text-green-600">{formatCurrency(equipo.subtotalCliente || 0)}</span>
                  </div>
                  <Badge variant={getRentalVariant(renta)} className="text-xs flex items-center gap-1">
                    <TrendingUp size={10} />
                    {renta.toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {/* Acciones mejoradas */}
              <div className="flex gap-2 items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditando(true)}
                  disabled={loading}
                  className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                  title="Editar nombre"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Pencil size={14} />
                  )}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loading}
                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                      title="Eliminar grupo"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar grupo de equipos?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará permanentemente el grupo "{equipo.nombre}" y todos sus {items.length} ítem{items.length !== 1 ? 's' : ''}. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDeletedGrupo}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Eliminar grupo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <AccordionContent className="px-6 pb-6 space-y-6 bg-gray-50/30">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="space-y-4"
              >
                <PlantillaEquipoItemForm plantillaEquipoId={equipo.id} onCreated={onCreated} />
                <PlantillaEquipoItemList items={equipo.items} onDeleted={onDeleted} onUpdated={onUpdated} />
              </motion.div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </motion.div>
  )
}
