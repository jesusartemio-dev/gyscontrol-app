'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Receipt,
  DollarSign,
  Shield,
  Percent,
  Calculator,
  Loader2,
  Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CotizacionGastoItem } from '@/types'
import { formatCurrency as formatUSD } from '@/lib/utils/currency'

interface Props {
  item: CotizacionGastoItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (item: CotizacionGastoItem) => void
}

export default function CotizacionGastoItemEditModal({ item, isOpen, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [precioUnitario, setPrecioUnitario] = useState(0)
  const [factorSeguridad, setFactorSeguridad] = useState(1)
  const [margen, setMargen] = useState(1.25)

  // Populate form when item changes
  useEffect(() => {
    if (item && isOpen) {
      setNombre(item.nombre)
      setDescripcion(item.descripcion || '')
      setCantidad(item.cantidad)
      setPrecioUnitario(item.precioUnitario)
      setFactorSeguridad(item.factorSeguridad)
      setMargen(item.margen)
    }
  }, [item, isOpen])

  // Real-time cost calculation
  const costos = useMemo(() => {
    const costoInterno = +(cantidad * precioUnitario * factorSeguridad).toFixed(2)
    const costoCliente = +(costoInterno * margen).toFixed(2)
    const rentabilidad = costoInterno > 0
      ? ((costoCliente - costoInterno) / costoInterno) * 100
      : 0
    return { costoInterno, costoCliente, rentabilidad }
  }, [cantidad, precioUnitario, factorSeguridad, margen])

  const handleSave = async () => {
    if (!item) return
    if (!nombre.trim()) {
      toast.warning('El nombre es obligatorio')
      return
    }

    setLoading(true)
    try {
      onSave({
        ...item,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        cantidad,
        precioUnitario,
        factorSeguridad,
        margen,
        costoInterno: costos.costoInterno,
        costoCliente: costos.costoCliente,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            Editar Gasto
          </DialogTitle>
          <DialogDescription>
            Modifica los datos del item de gasto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nombre y Descripción */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Calculator className="h-3.5 w-3.5" />
                Nombre *
              </Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Transporte, Combustible..."
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Descripción</Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalle opcional"
                disabled={loading}
              />
            </div>
          </div>

          {/* Cantidad y Precio Unitario */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Calculator className="h-3.5 w-3.5" />
                Cantidad
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <DollarSign className="h-3.5 w-3.5" />
                Precio Unitario
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                disabled={loading}
              />
            </div>
          </div>

          {/* Factor y Margen */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Shield className="h-3.5 w-3.5" />
                Factor Seguridad
              </Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={factorSeguridad}
                onChange={(e) => setFactorSeguridad(parseFloat(e.target.value) || 1)}
                onFocus={(e) => e.target.select()}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Percent className="h-3.5 w-3.5" />
                Margen
              </Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                max="10"
                value={margen}
                onChange={(e) => setMargen(parseFloat(e.target.value) || 1)}
                onFocus={(e) => e.target.select()}
                disabled={loading}
              />
            </div>
          </div>

          {/* Cost Preview */}
          <Separator />
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <div className="text-muted-foreground text-xs mb-1">Costo Interno</div>
                <div className="font-semibold font-mono">{formatUSD(costos.costoInterno)}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-xs mb-1">Costo Cliente</div>
                <div className="font-semibold text-green-600 font-mono">{formatUSD(costos.costoCliente)}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-xs mb-1">Rentabilidad</div>
                <Badge
                  variant={costos.rentabilidad > 20 ? 'default' : costos.rentabilidad > 0 ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {costos.rentabilidad.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !nombre.trim()}
            className="min-w-[120px] bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
