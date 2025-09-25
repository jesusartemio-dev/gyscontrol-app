'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Plus, Trash2, Package, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/plantilla-utils'

// Define the interface for gasto items
interface PlantillaGastoItemIndependiente {
  id: string
  plantillaGastoId: string
  nombre: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  plantillaId: string
  onItemsCreated: (items: PlantillaGastoItemIndependiente[]) => void
}

interface SelectedGasto {
  nombre: string
  descripcion: string
  cantidad: number
  precioUnitario: number
}

export default function PlantillaGastoIndependienteMultiAddModal({
  isOpen,
  onClose,
  plantillaId,
  onItemsCreated
}: Props) {
  const [selectedGastos, setSelectedGastos] = useState<SelectedGasto[]>([])
  const [saving, setSaving] = useState(false)

  // ✅ Add gasto to selection
  const handleAddGasto = () => {
    setSelectedGastos(prev => [...prev, {
      nombre: '',
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
    }])
  }

  // ✅ Update gasto fields
  const handleUpdateGasto = (index: number, field: keyof SelectedGasto, value: string | number) => {
    setSelectedGastos(prev => prev.map((gasto, i) =>
      i === index ? { ...gasto, [field]: value } : gasto
    ))
  }

  // ✅ Remove gasto from selection
  const handleRemoveGasto = (index: number) => {
    setSelectedGastos(prev => prev.filter((_, i) => i !== index))
  }

  // ✅ Calculate total amount
  const totalAmount = selectedGastos.reduce((sum, item) =>
    sum + (item.cantidad * item.precioUnitario), 0
  )

  // ✅ Save selected gastos as plantilla items
  const handleSave = async () => {
    if (selectedGastos.length === 0) {
      toast.error('Agrega al menos un gasto')
      return
    }

    // Validate that all gastos have required fields
    const invalidItems = selectedGastos.filter(item =>
      !item.nombre.trim() || item.cantidad <= 0
    )

    if (invalidItems.length > 0) {
      toast.error('Todos los gastos deben tener nombre y cantidad válida')
      return
    }

    try {
      setSaving(true)
      const createdItems: PlantillaGastoItemIndependiente[] = []

      for (const selectedGasto of selectedGastos) {
        const response = await fetch(`/api/plantillas/gastos/${plantillaId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: selectedGasto.nombre.trim(),
            descripcion: selectedGasto.descripcion.trim(),
            cantidad: selectedGasto.cantidad,
            precioUnitario: selectedGasto.precioUnitario,
          })
        })

        if (!response.ok) {
          throw new Error('Error al crear item')
        }

        const createdItem = await response.json()
        createdItems.push(createdItem)
      }

      toast.success(`Se agregaron ${createdItems.length} gastos exitosamente`)
      onItemsCreated(createdItems)
      handleClose()
    } catch (error) {
      console.error('Error saving items:', error)
      toast.error('Error al guardar los gastos')
    } finally {
      setSaving(false)
    }
  }

  // ✅ Close modal and reset state
  const handleClose = () => {
    setSelectedGastos([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Agregar Gastos a la Plantilla
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {selectedGastos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm text-gray-500 mb-4">No hay gastos agregados</p>
              <Button onClick={handleAddGasto} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Gasto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedGastos.map((gasto, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-purple-900">Gasto {index + 1}</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveGasto(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`nombre-${index}`}>Nombre del Gasto *</Label>
                      <Input
                        id={`nombre-${index}`}
                        placeholder="Ej: Transporte, Alimentación, etc."
                        value={gasto.nombre}
                        onChange={(e) => handleUpdateGasto(index, 'nombre', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`cantidad-${index}`}>Cantidad *</Label>
                      <Input
                        id={`cantidad-${index}`}
                        type="number"
                        min="1"
                        value={gasto.cantidad}
                        onChange={(e) => handleUpdateGasto(index, 'cantidad', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`precio-${index}`}>Precio Unitario</Label>
                      <Input
                        id={`precio-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={gasto.precioUnitario}
                        onChange={(e) => handleUpdateGasto(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total</Label>
                      <div className="flex items-center h-10 px-3 bg-gray-50 border border-gray-200 rounded-md">
                        <span className="font-medium text-green-600">
                          {formatCurrency(gasto.cantidad * gasto.precioUnitario)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`descripcion-${index}`}>Descripción (opcional)</Label>
                    <Input
                      id={`descripcion-${index}`}
                      placeholder="Descripción del gasto"
                      value={gasto.descripcion}
                      onChange={(e) => handleUpdateGasto(index, 'descripcion', e.target.value)}
                    />
                  </div>
                </motion.div>
              ))}

              <div className="flex justify-center pt-4">
                <Button onClick={handleAddGasto} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Otro Gasto
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center w-full pt-3 border-t bg-white">
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              {selectedGastos.length > 0 && `${selectedGastos.length} gasto${selectedGastos.length > 1 ? 's' : ''} agregado${selectedGastos.length > 1 ? 's' : ''}`}
            </div>
            {selectedGastos.length > 0 && (
              <div className="text-sm font-bold text-purple-600">
                Total: {formatCurrency(totalAmount)}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedGastos.length === 0 || saving}
              className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-3 w-3" />
                  Agregar ({selectedGastos.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}