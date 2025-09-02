'use client'

// ===================================================
// 📁 Archivo: PlantillaEquipoItemList.tsx
// 📌 Ubicación: src/components/plantillas/
// 🔧 Lista de ítems de equipos en la plantilla con edición inline
// ===================================================

import { useState } from 'react'
import { updatePlantillaEquipoItem, deletePlantillaEquipoItem } from '@/lib/services/plantillaEquipoItem'
import type { PlantillaEquipoItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Edit3, Trash2, Save, X, Package, DollarSign, Hash, Tag, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  items: PlantillaEquipoItem[]
  onDeleted: (id: string) => void
  onUpdated: (item: PlantillaEquipoItem) => void
}

export default function PlantillaEquipoItemList({ items, onDeleted, onUpdated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [quantityErrors, setQuantityErrors] = useState<{ [key: string]: string }>({})

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const validateQuantity = (quantity: number, itemId: string): boolean => {
    if (quantity <= 0 || isNaN(quantity)) {
      setQuantityErrors(prev => ({ ...prev, [itemId]: 'La cantidad debe ser mayor a cero' }))
      return false
    } else if (quantity > 1000) {
      setQuantityErrors(prev => ({ ...prev, [itemId]: 'La cantidad no puede ser mayor a 1000' }))
      return false
    } else {
      setQuantityErrors(prev => ({ ...prev, [itemId]: '' }))
      return true
    }
  }

  const iniciarEdicion = (item: PlantillaEquipoItem) => {
    setEditingId(item.id)
    setNuevaCantidad(item.cantidad)
    setError(null)
    setQuantityErrors({})
  }

  const cancelarEdicion = () => {
    setEditingId(null)
    setNuevaCantidad(0)
    setError(null)
    setQuantityErrors({})
  }

  const handleQuantityChange = (value: string, itemId: string) => {
    const num = Number(value)
    setNuevaCantidad(num)
    validateQuantity(num, itemId)
  }

  const guardarEdicion = async (item: PlantillaEquipoItem) => {
    if (!validateQuantity(nuevaCantidad, item.id)) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const costoCliente = nuevaCantidad * (item.precioCliente ?? item.costoCliente / item.cantidad)
      const actualizado = await updatePlantillaEquipoItem(item.id, {
        cantidad: nuevaCantidad,
        costoCliente
      })
      onUpdated(actualizado)
      setEditingId(null)
      setNuevaCantidad(0)
      setQuantityErrors({})
    } catch (err) {
      console.error(err)
      setError('Error al actualizar ítem. Por favor, inténtelo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const eliminarItem = async (id: string) => {
    try {
      setDeletingId(id)
      setError(null)
      await deletePlantillaEquipoItem(id)
      onDeleted(id)
    } catch (err) {
      console.error(err)
      setError('Error al eliminar ítem. Por favor, inténtelo nuevamente.')
    } finally {
      setDeletingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No hay equipos en esta plantilla
        </h3>
        <p className="text-sm text-muted-foreground">
          Agrega equipos usando el formulario de arriba para comenzar.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Equipos en la Plantilla
            <Badge variant="secondary" className="ml-auto">
              {items.length} {items.length === 1 ? 'equipo' : 'equipos'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Código
                    </div>
                  </TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[120px] text-center">Cantidad</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[100px] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="group hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {item.codigo}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm leading-tight">
                            {item.descripcion}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === item.id ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min={1}
                              max={1000}
                              value={nuevaCantidad || ''}
                              onChange={(e) => handleQuantityChange(e.target.value, item.id)}
                              className={`w-20 text-center ${quantityErrors[item.id] ? 'border-red-500' : ''}`}
                              disabled={loading}
                            />
                            {quantityErrors[item.id] && (
                              <p className="text-xs text-red-600">
                                {quantityErrors[item.id]}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm font-medium">
                            {item.cantidad}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(item.costoCliente)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {editingId === item.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => guardarEdicion(item)}
                                disabled={loading || !!quantityErrors[item.id]}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                {loading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelarEdicion}
                                disabled={loading}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => iniciarEdicion(item)}
                                disabled={loading || deletingId === item.id}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={loading || deletingId === item.id}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    {deletingId === item.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ¿Estás seguro de que deseas eliminar <strong>{item.codigo} - {item.descripcion}</strong> de esta plantilla?
                                      <br /><br />
                                      Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => eliminarItem(item.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
