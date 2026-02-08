'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Loader2,
  Trophy,
  ArrowRight,
  AlertCircle,
  UserCheck,
} from 'lucide-react'
import type { CotizacionProveedorItem } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  items: CotizacionProveedorItem[]
  cotizacionCodigo: string
  proveedorNombre: string
  onCompleted?: () => void
}

interface ItemComparison {
  item: CotizacionProveedorItem
  listaItemId: string
  thisPrecio: number
  thisTotal: number
  thisEntrega: string
  bestOtherPrecio: number | null
  bestOtherTotal: number | null
  bestOtherProveedor: string | null
  bestOtherEntrega: string | null
  isBestPrice: boolean
  isAlreadySelected: boolean
  selectedByThis: boolean
  selectedByOther: string | null
  cantidad: number
}

export default function ModalSeleccionarCotizacionCompleta({
  open,
  onClose,
  items,
  cotizacionCodigo,
  proveedorNombre,
  onCompleted,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Build comparison data
  const comparisons: ItemComparison[] = useMemo(() => {
    const result = items
      .filter(item => item.listaEquipoItemId)
      .map(item => {
        const listaItem = item.listaEquipoItem as any
        const otherCots = (listaItem?.cotizacionProveedorItems || [])
          .filter((c: any) => c.id !== item.id && c.precioUnitario && c.precioUnitario > 0)
        const cantidad = item.cantidad ?? item.cantidadOriginal ?? 0
        const thisPrecio = item.precioUnitario || 0
        const thisTotal = thisPrecio * cantidad

        // Find best other price
        let bestOther: any = null
        for (const c of otherCots) {
          if (!bestOther || c.precioUnitario < bestOther.precioUnitario) {
            bestOther = c
          }
        }

        const bestOtherPrecio = bestOther?.precioUnitario || null
        const bestOtherTotal = bestOtherPrecio ? bestOtherPrecio * cantidad : null
        const bestOtherProveedor = bestOther?.cotizacionProveedor?.proveedor?.nombre || null

        const seleccionada = listaItem?.cotizacionSeleccionada
        const selectedByThis = seleccionada?.id === item.id
        const selectedByOther = seleccionada && seleccionada.id !== item.id
          ? seleccionada.cotizacionProveedor?.proveedor?.nombre || 'Otro proveedor'
          : null

        return {
          item,
          listaItemId: item.listaEquipoItemId!,
          thisPrecio,
          thisTotal,
          thisEntrega: item.tiempoEntrega || 'Stock',
          bestOtherPrecio,
          bestOtherTotal,
          bestOtherProveedor,
          bestOtherEntrega: bestOther?.tiempoEntrega || null,
          isBestPrice: thisPrecio > 0 && (!bestOtherPrecio || thisPrecio <= bestOtherPrecio),
          isAlreadySelected: !!listaItem?.cotizacionSeleccionadaId,
          selectedByThis,
          selectedByOther,
          cantidad,
        }
      })

    return result
  }, [items])

  // Auto-select on first open: items where this is best price or no competition
  if (open && !initialized && comparisons.length > 0) {
    const autoSelected = new Set<string>()
    for (const comp of comparisons) {
      if (comp.thisPrecio > 0 && !comp.selectedByThis) {
        if (comp.isBestPrice || !comp.bestOtherPrecio) {
          autoSelected.add(comp.listaItemId)
        }
      }
    }
    setSelected(autoSelected)
    setInitialized(true)
  }

  // Reset on close
  if (!open && initialized) {
    setInitialized(false)
  }

  const toggleItem = (listaItemId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(listaItemId)) next.delete(listaItemId)
      else next.add(listaItemId)
      return next
    })
  }

  const toggleAll = () => {
    const selectable = comparisons.filter(c => c.thisPrecio > 0 && !c.selectedByThis)
    if (selected.size === selectable.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectable.map(c => c.listaItemId)))
    }
  }

  // Summary stats
  const summary = useMemo(() => {
    const toSelect = comparisons.filter(c => selected.has(c.listaItemId))
    const totalCost = toSelect.reduce((sum, c) => sum + c.thisTotal, 0)
    const bestPriceCount = toSelect.filter(c => c.isBestPrice).length
    const overridingOther = toSelect.filter(c => c.selectedByOther).length
    return { count: toSelect.length, totalCost, bestPriceCount, overridingOther }
  }, [comparisons, selected])

  const handleConfirm = async () => {
    if (selected.size === 0) return

    setIsSubmitting(true)
    let successCount = 0
    let errorCount = 0

    for (const comp of comparisons) {
      if (!selected.has(comp.listaItemId)) continue

      try {
        const res = await fetch(
          `/api/lista-equipo-item/${comp.listaItemId}/seleccionar-cotizacion`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cotizacionProveedorItemId: comp.item.id }),
          }
        )
        if (res.ok) successCount++
        else errorCount++
      } catch {
        errorCount++
      }
    }

    setIsSubmitting(false)

    if (successCount > 0) {
      toast.success(`${successCount} items seleccionados para ${proveedorNombre}`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} items con error`)
    }

    onCompleted?.()
    onClose()
  }

  const formatCurrency = (v: number) =>
    `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  if (!open) return null

  const selectableItems = comparisons.filter(c => c.thisPrecio > 0 && !c.selectedByThis)

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 pr-10 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <DialogTitle className="text-sm font-semibold">
              Seleccionar cotización completa
            </DialogTitle>
            <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
              {cotizacionCodigo} · {proveedorNombre}
            </Badge>
          </div>
        </DialogHeader>

        {/* Info bar */}
        <div className="px-4 py-2 border-b bg-blue-50/50 flex-shrink-0">
          <p className="text-[10px] text-blue-700">
            Selecciona los items que deseas asignar a este proveedor. Se pre-seleccionan los items donde este proveedor tiene el mejor precio.
          </p>
        </div>

        {/* Items comparison table */}
        <div className="flex-1 min-h-0 max-h-[50vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b">
                <th className="py-2 px-2 w-8">
                  <Checkbox
                    checked={selectableItems.length > 0 && selected.size === selectableItems.length}
                    onCheckedChange={toggleAll}
                    className="h-3.5 w-3.5"
                  />
                </th>
                <th className="py-2 px-2 text-left font-medium text-muted-foreground">Item</th>
                <th className="py-2 px-2 text-center font-medium text-muted-foreground w-14">Cant.</th>
                <th className="py-2 px-2 text-right font-medium text-muted-foreground w-24">
                  Este Prov.
                </th>
                <th className="py-2 px-2 text-center font-medium text-muted-foreground w-8"></th>
                <th className="py-2 px-2 text-right font-medium text-muted-foreground w-24">
                  Mejor Otro
                </th>
                <th className="py-2 px-2 text-center font-medium text-muted-foreground w-20">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((comp) => {
                const isChecked = selected.has(comp.listaItemId)
                const canSelect = comp.thisPrecio > 0 && !comp.selectedByThis
                const priceDiff = comp.bestOtherPrecio && comp.thisPrecio > 0
                  ? ((comp.thisPrecio - comp.bestOtherPrecio) / comp.bestOtherPrecio * 100)
                  : null

                return (
                  <tr
                    key={comp.item.id}
                    className={`border-b transition-colors ${
                      isChecked ? 'bg-blue-50' : comp.selectedByThis ? 'bg-green-50/50' : 'hover:bg-gray-50'
                    } ${canSelect ? 'cursor-pointer' : ''}`}
                    onClick={() => canSelect && toggleItem(comp.listaItemId)}
                  >
                    <td className="py-1.5 px-2">
                      <Checkbox
                        checked={isChecked}
                        disabled={!canSelect}
                        onCheckedChange={() => canSelect && toggleItem(comp.listaItemId)}
                        className="h-3.5 w-3.5"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="truncate max-w-[200px]" title={comp.item.descripcion}>
                        <span className="font-medium">{comp.item.descripcion}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{comp.item.codigo}</span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono">
                      {comp.cantidad}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {comp.thisPrecio > 0 ? (
                        <div>
                          <div className={`font-medium ${comp.isBestPrice ? 'text-green-600' : ''}`}>
                            {formatCurrency(comp.thisPrecio)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {comp.thisEntrega}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin precio</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {comp.bestOtherPrecio && comp.thisPrecio > 0 && (
                        <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {comp.bestOtherPrecio ? (
                        <div>
                          <div className={`font-medium ${!comp.isBestPrice ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {formatCurrency(comp.bestOtherPrecio)}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[90px]" title={comp.bestOtherProveedor || ''}>
                            {comp.bestOtherProveedor}
                          </div>
                          {priceDiff !== null && priceDiff !== 0 && (
                            <div className={`text-[9px] ${priceDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                              {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Sin competencia</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {comp.selectedByThis ? (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 text-green-600 border-green-300">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                          Actual
                        </Badge>
                      ) : comp.selectedByOther ? (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 text-orange-600 border-orange-300">
                          <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                          Otro
                        </Badge>
                      ) : comp.thisPrecio === 0 ? (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 text-gray-400">
                          <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                          S/P
                        </Badge>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground space-y-0.5">
              {summary.count > 0 ? (
                <>
                  <div className="text-blue-600 font-medium">
                    {summary.count} items a seleccionar · {formatCurrency(summary.totalCost)}
                  </div>
                  {summary.overridingOther > 0 && (
                    <div className="text-orange-600">
                      {summary.overridingOther} reemplazarán selección de otro proveedor
                    </div>
                  )}
                </>
              ) : (
                <span>Selecciona items para asignar</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-7 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isSubmitting || selected.size === 0}
                className="h-7 text-xs min-w-[140px] bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Seleccionando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Seleccionar ({summary.count})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
