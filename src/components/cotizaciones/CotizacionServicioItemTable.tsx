'use client'

import { useState } from 'react'
import { CotizacionServicioItem } from '@/types'
import { Trash2, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import CotizacionServicioItemModal from './CotizacionServicioItemModal'
import { cn } from '@/lib/utils'

interface Props {
  items: CotizacionServicioItem[]
  onUpdated: (item: CotizacionServicioItem) => void
  onDeleted: (id: string) => void
  isLocked?: boolean
}

import { formatCurrency as formatUSD } from '@/lib/utils/currency'

const dificultadLabels: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Crítica' }
const dificultadColors: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-orange-100 text-orange-700',
  4: 'bg-red-100 text-red-700'
}

const modoLabels: Record<string, string> = {
  'normal': 'HH→$',
  'inverso': '$→HH',
}
const modoColors: Record<string, string> = {
  'normal': 'bg-gray-100 text-gray-600',
  'inverso': 'bg-blue-100 text-blue-600',
}

export default function CotizacionServicioItemTable({ items, onUpdated, onDeleted, isLocked = false }: Props) {
  const formatCurrency = (amount: number) => formatUSD(amount)
  const [editItem, setEditItem] = useState<CotizacionServicioItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<CotizacionServicioItem | null>(null)

  const sortedItems = [...items].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  const totals = {
    totalHH: items.reduce((sum, i) => sum + (i.horaTotal ?? 0), 0),
    totalCostoInterno: items.reduce((sum, i) => sum + (i.costoInterno ?? 0), 0),
    totalCostoCliente: items.reduce((sum, i) => sum + (i.costoCliente ?? 0), 0)
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onDeleted(itemToDelete.id)
      setItemToDelete(null)
    }
  }

  return (
    <>
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b">
              <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Servicio</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-20">Recurso</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16">Modo</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14">Cant.</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14">Horas</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14">Factor</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16">Dific.</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14">Marg.</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-20">Interno</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-20">Cliente</th>
              {!isLocked && <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14"></th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedItems.map((item, idx) => (
              <tr
                key={item.id}
                className={cn(
                  'hover:bg-blue-50/50 transition-colors',
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                )}
              >
                {/* Servicio */}
                <td className="px-2 py-1.5 min-w-[180px] max-w-[280px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <span className="font-medium text-gray-900 block leading-tight">
                            {item.nombre}
                          </span>
                        </div>
                      </TooltipTrigger>
                      {item.descripcion && (
                        <TooltipContent side="right" className="max-w-xs text-xs">
                          {item.descripcion}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </td>

                {/* Recurso */}
                <td className="px-2 py-1.5">
                  <div>
                    <div className="text-gray-700">{item.recursoNombre}</div>
                    <div className="text-[10px] text-gray-400">${(item.costoHora ?? 0).toFixed(2)}/h</div>
                  </div>
                </td>

                {/* Modo de cálculo */}
                <td className="px-2 py-1.5 text-center">
                  <Badge variant="outline" className={cn('text-[10px] px-1 py-0', modoColors[item.modoCalculo || 'normal'])}>
                    {modoLabels[item.modoCalculo || 'normal']}
                  </Badge>
                </td>

                {/* Cantidad */}
                <td className="px-2 py-1.5 text-center">
                  <span className="font-medium">{item.cantidad}</span>
                </td>

                {/* Horas */}
                <td className="px-2 py-1.5 text-center">
                  <span className="font-medium text-purple-600">
                    {(item.horaTotal ?? 0).toFixed(2)}h
                  </span>
                </td>

                {/* Factor */}
                <td className="px-2 py-1.5 text-center">
                  <span>{(item.factorSeguridad ?? 1).toFixed(1)}x</span>
                </td>

                {/* Dificultad */}
                <td className="px-2 py-1.5 text-center">
                  <Badge variant="outline" className={cn('text-[10px] px-1 py-0', dificultadColors[item.nivelDificultad || 1])}>
                    {dificultadLabels[item.nivelDificultad || 1]}
                  </Badge>
                </td>

                {/* Margen */}
                <td className="px-2 py-1.5 text-center">
                  <span>{(item.margen ?? 1).toFixed(2)}x</span>
                </td>

                {/* Interno */}
                <td className="px-2 py-1.5 text-right font-mono text-gray-700">
                  {formatCurrency(item.costoInterno ?? 0)}
                </td>

                {/* Cliente */}
                <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                  {formatCurrency(item.costoCliente ?? 0)}
                </td>

                {/* Acciones */}
                {!isLocked && (
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditItem(item)}
                        className="h-5 w-5 p-0"
                      >
                        <Edit className="h-3 w-3 text-gray-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setItemToDelete(item)}
                        className="h-5 w-5 p-0 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3 text-gray-500" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100/80 border-t-2">
              <td colSpan={4} className="px-2 py-1.5 text-right font-medium text-gray-700">
                Total ({sortedItems.length} servicios):
              </td>
              <td className="px-2 py-1.5 text-center font-medium text-purple-700">
                {totals.totalHH.toFixed(2)}h
              </td>
              <td colSpan={3}></td>
              <td className="px-2 py-1.5 text-right font-mono font-medium text-gray-700">
                {formatCurrency(totals.totalCostoInterno)}
              </td>
              <td className="px-2 py-1.5 text-right font-mono font-bold text-green-700">
                {formatCurrency(totals.totalCostoCliente)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    {/* Modal de edición */}
    <CotizacionServicioItemModal
      item={editItem}
      isOpen={!!editItem}
      onClose={() => setEditItem(null)}
      onSave={(updatedItem) => {
        onUpdated(updatedItem)
        setEditItem(null)
      }}
    />

    {/* Modal de confirmación para eliminar */}
    <DeleteAlertDialog
      open={!!itemToDelete}
      onOpenChange={(open) => !open && setItemToDelete(null)}
      onConfirm={handleConfirmDelete}
      title="¿Eliminar servicio?"
      description={itemToDelete ? `Se eliminará "${itemToDelete.nombre}" de la cotización. Esta acción no se puede deshacer.` : ''}
    />
    </>
  )
}
