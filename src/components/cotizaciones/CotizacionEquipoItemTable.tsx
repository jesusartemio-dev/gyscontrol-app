'use client'

import { useState } from 'react'
import { Edit, Trash2, Search, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CotizacionEquipoItem } from '@/types'
import { cn } from '@/lib/utils'
interface Props {
  items: CotizacionEquipoItem[]
  onUpdated?: (item: CotizacionEquipoItem) => void
  onDeleted?: (id: string) => void
  onEdit?: (item: CotizacionEquipoItem) => void
  isLocked?: boolean
}

export default function CotizacionEquipoItemTable({ items, onDeleted, onEdit, isLocked = false }: Props) {
  const formatCompact = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [filter, setFilter] = useState('')
  const [showReferencia, setShowReferencia] = useState(false)

  // Calcular totales sin redondeo intermedio (como Excel)
  const totalInterno = Math.round(
    items.reduce((sum, i) => sum + i.precioInterno * i.cantidad, 0) * 100
  ) / 100
  const totalCliente = Math.round(
    items.reduce((sum, i) => sum + i.precioInterno * (i.factorVenta ?? 1.15) * i.cantidad, 0) * 100
  ) / 100

  const filteredItems = items.filter(i =>
    i.descripcion.toLowerCase().includes(filter.toLowerCase()) ||
    i.codigo.toLowerCase().includes(filter.toLowerCase()) ||
    i.marca?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-2">
      {/* Toolbar: Search + Toggle REFERENCIA */}
      <div className="flex items-center justify-between gap-2">
        {items.length > 3 ? (
          <div className="relative max-w-[180px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
            <Input
              type="text"
              placeholder="Buscar..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-7 h-6 text-[10px]"
            />
          </div>
        ) : <div />}

        <button
          type="button"
          onClick={() => setShowReferencia(!showReferencia)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors",
            showReferencia
              ? "bg-gray-100 border-gray-300 text-gray-700"
              : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
          )}
        >
          {showReferencia ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showReferencia ? 'Ocultar Ref.' : 'Ver Ref.'}
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              {/* Fila 1: Grupos */}
              <tr className="bg-gray-100 border-b">
                <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 border-r w-8">#</th>
                <th rowSpan={2} className="px-1.5 py-0.5 text-left font-semibold text-gray-700 border-r">Cód.</th>
                <th rowSpan={2} className="px-1.5 py-0.5 text-left font-semibold text-gray-700 border-r">Descripción</th>
                <th rowSpan={2} className="px-1.5 py-0.5 text-left font-semibold text-gray-700 border-r">Marca</th>
                <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 border-r">Ud</th>
                <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 border-r">Qty</th>
                <th colSpan={2} className="px-1 py-0.5 text-center font-semibold text-green-700 bg-green-50 border-r">CLIENTE</th>
                <th colSpan={2} className="px-1 py-0.5 text-center font-semibold text-blue-700 bg-blue-50 border-r">GYS</th>
                <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 border-r">%</th>
                {showReferencia && (
                  <th colSpan={3} className="px-1 py-0.5 text-center font-semibold text-gray-500 bg-gray-50 border-r">REF.</th>
                )}
                {!isLocked && <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 w-10"></th>}
              </tr>
              {/* Fila 2: Columnas */}
              <tr className="bg-gray-50/80 border-b text-[10px]">
                <th className="px-1 py-0.5 text-right font-medium text-green-600 bg-green-50/50">P.U.</th>
                <th className="px-1 py-0.5 text-right font-medium text-green-600 bg-green-50/50 border-r">P.T.</th>
                <th className="px-1 py-0.5 text-right font-medium text-blue-600 bg-blue-50/50">P.U.</th>
                <th className="px-1 py-0.5 text-right font-medium text-blue-600 bg-blue-50/50 border-r">P.T.</th>
                {showReferencia && (
                  <>
                    <th className="px-1 py-0.5 text-right font-medium text-gray-500">P.Lista</th>
                    <th className="px-1 py-0.5 text-right font-medium text-gray-500">F.Costo</th>
                    <th className="px-1 py-0.5 text-right font-medium text-gray-500 border-r">F.Venta</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item, idx) => {
                // Usar el campo factorVenta si existe, sino calcular
                const margenPct = item.factorVenta
                  ? ((item.factorVenta - 1) * 100)
                  : (item.costoInterno > 0
                    ? ((item.costoCliente - item.costoInterno) / item.costoInterno) * 100
                    : 0)

                return (
                  <tr
                    key={`equipo-item-${item.id}-${item.codigo}-${idx}`}
                    className={cn(
                      'hover:bg-orange-50/50 transition-colors group',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-1 py-1 text-center">
                      <span className="font-mono text-[10px] text-gray-400">{idx + 1}</span>
                    </td>
                    <td className="px-1.5 py-1">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] text-gray-600">{item.codigo}</span>
                        {!item.catalogoEquipoId && (
                          <span className="px-1 py-0.5 text-[8px] font-medium bg-amber-100 text-amber-700 rounded" title="Item temporal: solo existe en esta cotización, no está en el catálogo">
                            Temp
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-1.5 py-1 max-w-[250px]">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="line-clamp-2 text-[10px] cursor-help leading-tight">{item.descripcion}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[300px] text-xs">
                            <p>{item.descripcion}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-1.5 py-1">
                      <span className="line-clamp-1 text-[10px] text-gray-600" title={item.marca}>{item.marca || '-'}</span>
                    </td>
                    <td className="px-1 py-1 text-center text-[10px] text-gray-500">{item.unidad}</td>
                    <td className="px-1 py-1 text-center">
                      <span className="font-medium text-[10px]">{item.cantidad}</span>
                    </td>
                    {/* CLIENTE */}
                    <td className="px-1 py-1 text-right font-mono text-[10px] text-green-600 bg-green-50/30">
                      {formatCompact(item.precioCliente)}
                    </td>
                    <td className="px-1 py-1 text-right font-mono text-[10px] font-medium text-green-700 bg-green-50/30">
                      {formatCompact(item.costoCliente)}
                    </td>
                    {/* GYS CONTROL */}
                    <td className="px-1 py-1 text-right font-mono text-[10px] text-blue-600 bg-blue-50/30">
                      {formatCompact(item.precioInterno)}
                    </td>
                    <td className="px-1 py-1 text-right font-mono text-[10px] font-medium text-blue-700 bg-blue-50/30">
                      {formatCompact(item.costoInterno)}
                    </td>
                    {/* Renta % */}
                    <td className="px-1 py-1 text-center">
                      <span className={cn(
                        'font-medium text-[10px]',
                        margenPct >= 20 ? 'text-emerald-600' : margenPct >= 10 ? 'text-amber-600' : 'text-red-500'
                      )}>
                        {margenPct.toFixed(0)}%
                      </span>
                    </td>
                    {/* REFERENCIA - Condicional */}
                    {showReferencia && (
                      <>
                        <td className="px-1 py-1 text-right font-mono text-[10px] text-gray-400">
                          {item.precioLista ? formatCompact(item.precioLista) : '-'}
                        </td>
                        <td className="px-1 py-1 text-right font-mono text-[10px] text-gray-400">
                          {(item.factorCosto ?? 1.00).toFixed(2)}
                        </td>
                        <td className="px-1 py-1 text-right font-mono text-[10px] text-gray-400">
                          {(item.factorVenta ?? 1.15).toFixed(2)}
                        </td>
                      </>
                    )}
                    {/* Acciones */}
                    {!isLocked && (
                      <td className="px-1 py-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onEdit(item)
                              }}
                              className="h-5 w-5 p-0 hover:bg-blue-100 opacity-0 group-hover:opacity-100"
                              title="Editar"
                            >
                              <Edit className="h-2.5 w-2.5 text-blue-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onDeleted?.(item.id)
                            }}
                            className="h-5 w-5 p-0 hover:bg-red-100 opacity-0 group-hover:opacity-100"
                            title="Eliminar"
                          >
                            <Trash2 className="h-2.5 w-2.5 text-gray-500" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100/80 border-t-2 text-[10px]">
                <td colSpan={6} className="px-1.5 py-1 text-right font-medium text-gray-700">
                  Total ({filteredItems.length}):
                </td>
                <td className="px-1 py-1 text-right font-mono text-green-600 bg-green-50/50"></td>
                <td className="px-1 py-1 text-right font-mono font-bold text-green-700 bg-green-50/50">
                  {formatCompact(totalCliente)}
                </td>
                <td className="px-1 py-1 text-right font-mono text-blue-600 bg-blue-50/50"></td>
                <td className="px-1 py-1 text-right font-mono font-bold text-blue-700 bg-blue-50/50">
                  {formatCompact(totalInterno)}
                </td>
                <td></td>
                {showReferencia && <td colSpan={3}></td>}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
