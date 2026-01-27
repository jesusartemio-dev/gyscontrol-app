'use client'

// ===================================================
// 📁 Archivo: PlantillaEquipoItemForm.tsx
// 📌 Ubicación: src/components/plantillas/
// 🔧 Agrega ítems de equipos a la plantilla con selección desde modal
// ===================================================

import { useState, useEffect } from 'react'
import { createPlantillaEquipoItem } from '@/lib/services/plantillaEquipoItem'
import type { CatalogoEquipo, PlantillaEquipoItem, PlantillaEquipoItemPayload } from '@/types'
import EquipoCatalogoModal from '@/components/catalogo/EquipoCatalogoModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Search, Plus, Loader2, Package, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  plantillaEquipoId: string
  onCreated: (item: PlantillaEquipoItem) => void
}

export default function PlantillaEquipoItemForm({ plantillaEquipoId, onCreated }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [equipo, setEquipo] = useState<CatalogoEquipo | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<{ cantidad?: string; equipo?: string }>({})

  // Reset success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const validateForm = () => {
    const newErrors: { cantidad?: string; equipo?: string } = {}
    
    if (!equipo) {
      newErrors.equipo = 'Debe seleccionar un equipo del catálogo'
    }
    
    if (cantidad <= 0 || isNaN(cantidad)) {
      newErrors.cantidad = 'La cantidad debe ser mayor a cero'
    } else if (cantidad > 1000) {
      newErrors.cantidad = 'La cantidad no puede ser mayor a 1000'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCantidadChange = (value: string) => {
    const num = Number(value)
    setCantidad(num)
    
    // Real-time validation
    if (num <= 0 || isNaN(num)) {
      setErrors(prev => ({ ...prev, cantidad: 'La cantidad debe ser mayor a cero' }))
    } else if (num > 1000) {
      setErrors(prev => ({ ...prev, cantidad: 'La cantidad no puede ser mayor a 1000' }))
    } else {
      setErrors(prev => ({ ...prev, cantidad: undefined }))
    }
  }

  const handleEquipoSelect = (selectedEquipo: CatalogoEquipo) => {
    setEquipo(selectedEquipo)
    setErrors(prev => ({ ...prev, equipo: undefined }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!validateForm()) {
      return
    }

    if (!equipo!.categoriaEquipo?.nombre || !equipo!.unidad?.nombre) {
      setError('Este equipo no tiene categoría o unidad asignada.')
      return
    }

    // ✅ Validar que el equipo tenga ID
    if (!equipo?.id) {
      setError('El equipo seleccionado no tiene ID válido.')
      return
    }

    try {
      setLoading(true)

      // 🔄 Enviar datos mínimos al servicio (el servicio construye el payload completo)
      const servicePayload = {
        plantillaEquipoId,
        catalogoEquipoId: equipo.id,
        cantidad,
        observaciones: `${equipo.marca} - ${equipo.descripcion}`
      }

      console.log('🔍 Enviando desde componente:', servicePayload)
      const creado = await createPlantillaEquipoItem(servicePayload)
      onCreated(creado)
      
      // Reset form
      setCantidad(1)
      setEquipo(null)
      setErrors({})
      setSuccess(true)
    } catch (err: any) {
      console.error('❌ Error completo:', err)
      const errorMessage = err?.message || 'Error al crear ítem. Por favor, inténtelo nuevamente.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Agregar Equipo a la Plantilla
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ¡Equipo agregado exitosamente a la plantilla!
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Equipment Selection */}
            <div className="space-y-2">
              <Label htmlFor="equipo-selector" className="text-sm font-medium">
                Equipo del Catálogo
              </Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAbierto(true)}
                className={`w-full justify-start text-left h-auto p-3 ${errors.equipo ? 'border-red-500' : ''}`}
                disabled={loading}
              >
                <Search className="h-4 w-4 mr-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {equipo ? (
                    <div className="space-y-1">
                      <div className="font-medium text-sm truncate">
                        {equipo.codigo} - {equipo.descripcion}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {equipo.categoriaEquipo?.nombre || 'Sin categoría'}
                        </Badge>
                        <span>•</span>
                        <span>{equipo.unidad?.nombre || 'Sin unidad'}</span>
                        {equipo.marca && (
                          <>
                            <span>•</span>
                            <span>{equipo.marca}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Seleccionar equipo del catálogo</span>
                  )}
                </div>
              </Button>
              {errors.equipo && (
                <p className="text-sm text-red-600">{errors.equipo}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quantity Input */}
              <div className="space-y-2">
                <Label htmlFor="cantidad" className="text-sm font-medium">
                  Cantidad
                </Label>
                <Input
                  id="cantidad"
                  type="number"
                  min={1}
                  max={1000}
                  value={cantidad || ''}
                  onChange={(e) => handleCantidadChange(e.target.value)}
                  className={errors.cantidad ? 'border-red-500' : ''}
                  placeholder="Ingrese cantidad"
                  disabled={loading}
                />
                {errors.cantidad && (
                  <p className="text-sm text-red-600">{errors.cantidad}</p>
                )}
              </div>

              {/* Price Display */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Precio Unitario</Label>
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-sm font-medium">
                    {equipo ? formatCurrency(equipo.precioVenta) : 'Seleccione equipo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Calculation */}
            {equipo && cantidad > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-blue-50 p-4 rounded-lg border border-blue-200"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Total estimado:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(cantidad * equipo.precioVenta)}
                  </span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {cantidad} × {formatCurrency(equipo.precioVenta)}
                </div>
              </motion.div>
            )}

            <Separator />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !equipo || cantidad <= 0}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Agregando equipo...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar a Plantilla
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <EquipoCatalogoModal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSeleccionar={handleEquipoSelect}
      />
    </motion.div>
  )
}
