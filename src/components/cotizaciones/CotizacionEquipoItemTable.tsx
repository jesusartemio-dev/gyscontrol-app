'use client'

import { useState } from 'react'
import { Edit, Trash2, Search, Eye, EyeOff, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'

import { reordenarCotizacionEquipoItems } from '@/lib/services/cotizacionEquipoItem'
import type { CotizacionEquipoItem } from '@/types'
import { cn } from '@/lib/utils'

function monthsAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (30.44 * 24 * 60 * 60 * 1000))
}

function priceFreshness(updatedAt?: string): { text: string; color: string } | null {
  if (!updatedAt) return null
  const m = monthsAgo(updatedAt)
  const d = new Date(updatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  if (m < 3) return { text: `Act. ${d}`, color: 'text-green-600' }
  if (m <= 6) return { text: `Act. ${d}`, color: 'text-gray-400' }
  return { text: `Desact. (${m}m)`, color: 'text-amber-600' }
}

interface RowProps {
  item: CotizacionEquipoItem
  idx: number
  isLocked: boolean
  showReferencia: boolean
  isGerenciaRole: boolean
  onEdit?: (item: CotizacionEquipoItem) => void
  onDeleted?: (id: string) => void
  onVincular?: (item: CotizacionEquipoItem) => void
  formatCompact: (n: number) => string
}

function SortableRow({
  item,
  idx,
  isLocked,
  showReferencia,
  isGerenciaRole,
  onEdit,
  onDeleted,
  onVincular,
  formatCompact,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isLocked,
  })

  const margenPct = item.factorVenta
    ? (item.factorVenta - 1) * 100
    : item.costoInterno > 0
      ? ((item.costoCliente - item.costoInterno) / item.costoInterno) * 100
      : 0

  // Badge gerencia: visible cuando el precio especial es menor que precioInterno (ventaja real)
  // o cuando el gerente lo editó manualmente (precioGerenciaEditado = true)
  const precioGerenciaEfectivo = item.precioGerencia ?? item.precioInterno
  const fueEditadoManualmente = item.precioGerenciaEditado === true
  const tieneVentajaGerencia = isGerenciaRole && (
    fueEditadoManualmente || precioGerenciaEfectivo < item.precioInterno
  )
  const margenGerenciaPct = tieneVentajaGerencia && precioGerenciaEfectivo > 0
    ? ((item.precioCliente - precioGerenciaEfectivo) / precioGerenciaEfectivo) * 100
    : 0

  const freshness = item.catalogoEquipoId
    ? priceFreshness(item.catalogoEquipo?.updatedAt)
    : null

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        'hover:bg-orange-50/50 transition-colors group',
        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
        isDragging && 'shadow-md'
      )}
    >
      {/* Drag handle */}
      <td className="px-0.5 py-1 text-center w-5">
        {!isLocked && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Arrastrar para reordenar"
          >
            <GripVertical className="h-3 w-3 text-gray-400" />
          </div>
        )}
      </td>
      {/* # */}
      <td className="px-1 py-1 text-center">
        <span className="font-mono text-[10px] text-gray-400">{idx + 1}</span>
      </td>
      {/* Código */}
      <td className="px-1.5 py-1">
        <div className="flex items-center gap-1">
          <span className={cn(
            "font-mono text-[10px]",
            item.catalogoEquipoId ? "text-green-700" : "text-amber-700"
          )}>
            {item.codigo}
          </span>
          {!item.catalogoEquipoId ? (
            <span
              className={cn(
                "px-1 py-0.5 text-[8px] font-medium bg-amber-100 text-amber-700 rounded",
                onVincular && !isLocked && "cursor-pointer hover:bg-amber-200"
              )}
              title={onVincular && !isLocked ? "Clic para vincular al catálogo" : "Item temporal: solo existe en esta cotización"}
              onClick={onVincular && !isLocked ? () => onVincular(item) : undefined}
            >
              Temp
            </span>
          ) : freshness && monthsAgo(item.catalogoEquipo!.updatedAt) > 6 ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="px-1 py-0.5 text-[8px] font-medium bg-amber-100 text-amber-700 rounded">
                    Desact.
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Precio desactualizado ({monthsAgo(item.catalogoEquipo!.updatedAt)} meses)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </td>
      {/* Descripción */}
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
      {/* Marca */}
      <td className="px-1.5 py-1">
        <span className="line-clamp-1 text-[10px] text-gray-600" title={item.marca}>{item.marca || '-'}</span>
      </td>
      {/* Ud */}
      <td className="px-1 py-1 text-center text-[10px] text-gray-500">{item.unidad}</td>
      {/* Qty */}
      <td className="px-1 py-1 text-center">
        <span className="font-medium text-[10px]">{item.cantidad}</span>
      </td>
      {/* CLIENTE P.U. */}
      <td className="px-1 py-1 text-right font-mono text-[10px] text-green-600 bg-green-50/30">
        {formatCompact(item.precioCliente)}
      </td>
      {/* CLIENTE P.T. */}
      <td className="px-1 py-1 text-right font-mono text-[10px] font-medium text-green-700 bg-green-50/30">
        {formatCompact(item.costoCliente)}
      </td>
      {/* GYS P.U. */}
      <td className="px-1 py-1 text-right bg-blue-50/30">
        <div className="font-mono text-[10px] text-blue-600">
          {formatCompact(item.precioInterno)}
        </div>
        {item.catalogoEquipoId && freshness ? (
          <div className={cn("text-[8px] leading-tight", freshness.color)}>
            {freshness.text}
          </div>
        ) : !item.catalogoEquipoId ? (
          <div className="text-[8px] leading-tight text-amber-600">
            Precio estimado
          </div>
        ) : null}
      </td>
      {/* GYS P.T. */}
      <td className="px-1 py-1 text-right font-mono text-[10px] font-medium text-blue-700 bg-blue-50/30">
        {formatCompact(item.costoInterno)}
      </td>
      {/* GERENCIA P.U. y P.T. — solo gerente/admin */}
      {isGerenciaRole && (
        <>
          <td className="px-1 py-1 text-right bg-purple-50/30">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "font-mono text-[10px] cursor-default",
                    precioGerenciaEfectivo < item.precioInterno ? "text-purple-700 font-medium" : "text-purple-400"
                  )}>
                    {formatCompact(precioGerenciaEfectivo)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {fueEditadoManualmente
                    ? `Editado manualmente — margen real: ${margenGerenciaPct.toFixed(1)}%`
                    : precioGerenciaEfectivo < item.precioInterno
                      ? `Precio especial del catálogo — margen real: ${margenGerenciaPct.toFixed(1)}%`
                      : 'Sin precio especial — igual al costo interno'
                  }
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {fueEditadoManualmente && (
              <div className="text-[8px] text-purple-600 leading-tight">editado</div>
            )}
          </td>
          <td className="px-1 py-1 text-right font-mono text-[10px] font-medium bg-purple-50/30 border-r">
            <span className={cn(
              precioGerenciaEfectivo < item.precioInterno ? "text-purple-700" : "text-purple-400"
            )}>
              {formatCompact(precioGerenciaEfectivo * item.cantidad)}
            </span>
          </td>
        </>
      )}
      {/* % */}
      <td className="px-1 py-1 text-center">
        <span className={cn(
          'font-medium text-[10px]',
          margenPct >= 20 ? 'text-emerald-600' : margenPct >= 10 ? 'text-amber-600' : 'text-red-500'
        )}>
          {margenPct.toFixed(0)}%
        </span>
      </td>
      {/* REFERENCIA condicional */}
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
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item) }}
                className="h-5 w-5 p-0 hover:bg-blue-100 opacity-0 group-hover:opacity-100"
                title="Editar"
              >
                <Edit className="h-2.5 w-2.5 text-blue-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleted?.(item.id) }}
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
}

interface Props {
  items: CotizacionEquipoItem[]
  onUpdated?: (item: CotizacionEquipoItem) => void
  onDeleted?: (id: string) => void
  onEdit?: (item: CotizacionEquipoItem) => void
  onVincular?: (item: CotizacionEquipoItem) => void
  onItemsReordered?: (items: CotizacionEquipoItem[]) => void
  isLocked?: boolean
  isGerenciaRole?: boolean
}

export default function CotizacionEquipoItemTable({
  items,
  onDeleted,
  onEdit,
  onVincular,
  onItemsReordered,
  isLocked = false,
  isGerenciaRole = false,
}: Props) {
  const formatCompact = (amount: number) =>
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const [filter, setFilter] = useState('')
  const [showReferencia, setShowReferencia] = useState(false)
  const [localItems, setLocalItems] = useState<CotizacionEquipoItem[]>(items)

  // Sync when parent changes items (e.g. after add/delete)
  if (items !== localItems && items.length !== localItems.length) {
    setLocalItems(items)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const totalInterno = Math.round(
    localItems.reduce((sum, i) => sum + i.precioInterno * i.cantidad, 0) * 100
  ) / 100
  const totalCliente = Math.round(
    localItems.reduce((sum, i) => sum + i.precioInterno * (i.factorVenta ?? 1.15) * i.cantidad, 0) * 100
  ) / 100
  const totalGerencia = Math.round(
    localItems.reduce((sum, i) => sum + (i.precioGerencia ?? i.precioInterno) * i.cantidad, 0) * 100
  ) / 100

  const filteredItems = localItems.filter(i =>
    i.descripcion.toLowerCase().includes(filter.toLowerCase()) ||
    i.codigo.toLowerCase().includes(filter.toLowerCase()) ||
    i.marca?.toLowerCase().includes(filter.toLowerCase())
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localItems.findIndex(i => i.id === active.id)
    const newIndex = localItems.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordenados = arrayMove(localItems, oldIndex, newIndex).map(
      (item, idx) => ({ ...item, orden: idx })
    )
    setLocalItems(reordenados)
    onItemsReordered?.(reordenados)

    try {
      await reordenarCotizacionEquipoItems(
        reordenados.map(i => ({ id: i.id, orden: i.orden }))
      )
    } catch {
      toast.error('Error al guardar el orden')
      setLocalItems(items) // revert
    }
  }

  const isFiltering = filter.trim() !== ''

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {localItems.length > 3 ? (
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
              <tr className="bg-gray-100 border-b">
                {/* Drag handle col */}
                {!isLocked && <th rowSpan={2} className="w-5 px-0.5" />}
                <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 border-r w-8">#</th>
                <th rowSpan={2} className="px-1.5 py-0.5 text-left font-semibold text-gray-700 border-r">Cód.</th>
                <th rowSpan={2} className="px-1.5 py-0.5 text-left font-semibold text-gray-700 border-r">Descripción</th>
                <th rowSpan={2} className="px-1.5 py-0.5 text-left font-semibold text-gray-700 border-r">Marca</th>
                <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 border-r">Ud</th>
                <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 border-r">Qty</th>
                <th colSpan={2} className="px-1 py-0.5 text-center font-semibold text-green-700 bg-green-50 border-r">CLIENTE</th>
                <th colSpan={2} className="px-1 py-0.5 text-center font-semibold text-blue-700 bg-blue-50 border-r">GYS</th>
                {isGerenciaRole && (
                  <th colSpan={2} className="px-1 py-0.5 text-center font-semibold text-purple-700 bg-purple-50 border-r">GERENCIA</th>
                )}
                <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 border-r">%</th>
                {showReferencia && (
                  <th colSpan={3} className="px-1 py-0.5 text-center font-semibold text-gray-500 bg-gray-50 border-r">REF.</th>
                )}
                {!isLocked && <th rowSpan={2} className="px-1 py-0.5 text-center font-semibold text-gray-700 w-10"></th>}
              </tr>
              <tr className="bg-gray-50/80 border-b text-[10px]">
                <th className="px-1 py-0.5 text-right font-medium text-green-600 bg-green-50/50">P.U.</th>
                <th className="px-1 py-0.5 text-right font-medium text-green-600 bg-green-50/50 border-r">P.T.</th>
                <th className="px-1 py-0.5 text-right font-medium text-blue-600 bg-blue-50/50">P.U.</th>
                <th className="px-1 py-0.5 text-right font-medium text-blue-600 bg-blue-50/50 border-r">P.T.</th>
                {isGerenciaRole && (
                  <>
                    <th className="px-1 py-0.5 text-right font-medium text-purple-600 bg-purple-50/50">P.U.</th>
                    <th className="px-1 py-0.5 text-right font-medium text-purple-600 bg-purple-50/50 border-r">P.T.</th>
                  </>
                )}
                {showReferencia && (
                  <>
                    <th className="px-1 py-0.5 text-right font-medium text-gray-500">P.Lista</th>
                    <th className="px-1 py-0.5 text-right font-medium text-gray-500">F.Costo</th>
                    <th className="px-1 py-0.5 text-right font-medium text-gray-500 border-r">F.Venta</th>
                  </>
                )}
              </tr>
            </thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={(isFiltering ? filteredItems : localItems).map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y">
                  {(isFiltering ? filteredItems : localItems).map((item, idx) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      idx={idx}
                      isLocked={isLocked}
                      showReferencia={showReferencia}
                      isGerenciaRole={isGerenciaRole}
                      onEdit={onEdit}
                      onDeleted={onDeleted}
                      onVincular={onVincular}
                      formatCompact={formatCompact}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
            <tfoot>
              <tr className="bg-gray-100/80 border-t-2 text-[10px]">
                <td colSpan={!isLocked ? 7 : 6} className="px-1.5 py-1 text-right font-medium text-gray-700">
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
                {isGerenciaRole && (
                  <>
                    <td className="px-1 py-1 text-right font-mono text-purple-600 bg-purple-50/50"></td>
                    <td className="px-1 py-1 text-right font-mono font-bold text-purple-700 bg-purple-50/50">
                      {formatCompact(totalGerencia)}
                    </td>
                  </>
                )}
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
