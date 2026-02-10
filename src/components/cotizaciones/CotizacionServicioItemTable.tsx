'use client'

import { useEffect, useState } from 'react'
import { CotizacionServicioItem, Recurso } from '@/types'
import { Trash2, Edit, Save, X, Loader2 } from 'lucide-react'
import { getRecursos } from '@/lib/services/recurso'
import { updateCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { calcularHoras } from '@/lib/utils/formulas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { cn } from '@/lib/utils'

interface Props {
  items: CotizacionServicioItem[]
  onUpdated: (item: CotizacionServicioItem) => void
  onDeleted: (id: string) => void
  isLocked?: boolean
  moneda?: string
}

import { formatMoneda } from '@/lib/utils/currency'

const dificultadLabels: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Crítica' }
const dificultadColors: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-orange-100 text-orange-700',
  4: 'bg-red-100 text-red-700'
}

export default function CotizacionServicioItemTable({ items, onUpdated, onDeleted, isLocked = false, moneda }: Props) {
  const formatCurrency = (amount: number) => formatMoneda(amount, moneda)
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editableItem, setEditableItem] = useState<Partial<CotizacionServicioItem>>({})
  const [saving, setSaving] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<CotizacionServicioItem | null>(null)

  const sortedItems = [...items].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  useEffect(() => {
    getRecursos().then(setRecursos)
  }, [])

  const startEditing = (item: CotizacionServicioItem) => {
    setEditandoId(item.id)
    setEditableItem({ ...item })
  }

  const cancelEditing = () => {
    setEditandoId(null)
    setEditableItem({})
  }

  const handleChange = (field: keyof CotizacionServicioItem, value: any) => {
    setEditableItem(prev => {
      const updated = { ...prev, [field]: value }

      if (['cantidad', 'factorSeguridad', 'margen', 'recursoId', 'nivelDificultad'].includes(field)) {
        const original = items.find(i => i.id === editandoId)
        if (original) {
          const merged = { ...original, ...updated }
          const horas = calcularHoras({
            formula: merged.formula,
            cantidad: merged.cantidad ?? 0,
            horaBase: merged.horaBase ?? 0,
            horaRepetido: merged.horaRepetido ?? 0,
            horaUnidad: merged.horaUnidad ?? 0,
            horaFijo: merged.horaFijo ?? 0
          })

          const recurso = recursos.find(r => r.id === merged.recursoId)
          const costoHora = recurso?.costoHora ?? 0
          const dificultadMultiplier = (() => {
            const dificultad = merged.nivelDificultad ?? 1
            switch (dificultad) {
              case 1: return 1.0
              case 2: return 1.2
              case 3: return 1.5
              case 4: return 2.0
              default: return 1.0
            }
          })()

          // Nueva fórmula: costoCliente es el cálculo directo, costoInterno se deriva del margen
          const costoCliente = horas * costoHora * (merged.factorSeguridad ?? 1) * dificultadMultiplier
          const costoInterno = costoCliente / (merged.margen ?? 1.35)

          // Redondear a 2 decimales para evitar errores de precisión
          updated.horaTotal = isNaN(horas) ? 0 : Math.round(horas * 100) / 100
          updated.costoInterno = isNaN(costoInterno) ? 0 : Math.round(costoInterno * 100) / 100
          updated.costoCliente = isNaN(costoCliente) ? 0 : Math.round(costoCliente * 100) / 100
          updated.costoHora = isNaN(costoHora) ? 0 : Math.round(costoHora * 100) / 100
          if (recurso) updated.recursoNombre = recurso.nombre
        }
      }
      return updated
    })
  }

  const handleSave = async () => {
    if (!editandoId) return
    const original = items.find(i => i.id === editandoId)
    if (!original) return

    setSaving(true)
    const updated: CotizacionServicioItem = { ...original, ...editableItem }
    const horas = calcularHoras({
      formula: updated.formula,
      cantidad: updated.cantidad ?? 0,
      horaBase: updated.horaBase ?? 0,
      horaRepetido: updated.horaRepetido ?? 0,
      horaUnidad: updated.horaUnidad ?? 0,
      horaFijo: updated.horaFijo ?? 0
    })

    const recurso = recursos.find(r => r.id === updated.recursoId)
    const costoHora = recurso?.costoHora ?? 0
    const dificultadMultiplier = (() => {
      const dificultad = updated.nivelDificultad ?? 1
      switch (dificultad) {
        case 1: return 1.0
        case 2: return 1.2
        case 3: return 1.5
        case 4: return 2.0
        default: return 1.0
      }
    })()

    // Nueva fórmula: costoCliente es el cálculo directo, costoInterno se deriva del margen
    const costoCliente = horas * costoHora * (updated.factorSeguridad ?? 1) * dificultadMultiplier
    const costoInterno = costoCliente / (updated.margen ?? 1.35)

    // Redondear a 2 decimales para evitar errores de precisión
    const finalUpdated = {
      ...updated,
      horaTotal: isNaN(horas) ? 0 : Math.round(horas * 100) / 100,
      costoInterno: isNaN(costoInterno) ? 0 : Math.round(costoInterno * 100) / 100,
      costoCliente: isNaN(costoCliente) ? 0 : Math.round(costoCliente * 100) / 100,
      recursoNombre: recurso?.nombre ?? '',
      costoHora: isNaN(costoHora) ? 0 : Math.round(costoHora * 100) / 100
    }

    try {
      await updateCotizacionServicioItem(editandoId, {
        recursoId: finalUpdated.recursoId,
        cantidad: finalUpdated.cantidad,
        factorSeguridad: finalUpdated.factorSeguridad,
        margen: finalUpdated.margen,
        horaTotal: finalUpdated.horaTotal,
        costoInterno: finalUpdated.costoInterno,
        costoCliente: finalUpdated.costoCliente,
        costoHora: finalUpdated.costoHora,
        orden: finalUpdated.orden
      })
      onUpdated(finalUpdated)
      cancelEditing()
    } catch (error) {
      console.error('Error saving item:', error)
    } finally {
      setSaving(false)
    }
  }

  const calculateTotals = () => {
    const allItems = items.map(item => {
      if (editandoId === item.id && editableItem) {
        return {
          ...item,
          horaTotal: editableItem.horaTotal ?? item.horaTotal ?? 0,
          costoInterno: editableItem.costoInterno ?? item.costoInterno ?? 0,
          costoCliente: editableItem.costoCliente ?? item.costoCliente ?? 0
        }
      }
      return item
    })
    return {
      totalHH: allItems.reduce((sum, i) => sum + (i.horaTotal ?? 0), 0),
      totalCostoInterno: allItems.reduce((sum, i) => sum + (i.costoInterno ?? 0), 0),
      totalCostoCliente: allItems.reduce((sum, i) => sum + (i.costoCliente ?? 0), 0)
    }
  }

  const totals = calculateTotals()

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
            {sortedItems.map((item, idx) => {
              const editando = editandoId === item.id
              const currentItem = editando ? { ...item, ...editableItem } : item

              return (
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
                    {editando ? (
                      <select
                        className="w-full h-5 text-[10px] border rounded px-1"
                        value={editableItem.recursoId ?? item.recursoId}
                        onChange={(e) => handleChange('recursoId', e.target.value)}
                        disabled={saving}
                      >
                        {recursos.map(r => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        <div className="text-gray-700">{item.recursoNombre}</div>
                        <div className="text-[10px] text-gray-400">${(item.costoHora ?? 0).toFixed(2)}/h</div>
                      </div>
                    )}
                  </td>

                  {/* Cantidad */}
                  <td className="px-2 py-1.5 text-center">
                    {editando ? (
                      <input
                        type="number"
                        min={1}
                        value={editableItem.cantidad ?? item.cantidad}
                        onChange={(e) => handleChange('cantidad', parseInt(e.target.value) || 0)}
                        className="w-10 h-5 text-xs text-center border rounded"
                        disabled={saving}
                      />
                    ) : (
                      <span className="font-medium">{item.cantidad}</span>
                    )}
                  </td>

                  {/* Horas */}
                  <td className="px-2 py-1.5 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-medium text-purple-600 cursor-help">
                            {(currentItem.horaTotal ?? 0).toFixed(2)}h
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>Base: {item.horaBase || 0}h + ({item.cantidad - 1} × {item.horaRepetido || 0}h)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>

                  {/* Factor */}
                  <td className="px-2 py-1.5 text-center">
                    {editando ? (
                      <input
                        type="number"
                        step="0.1"
                        min={1}
                        value={editableItem.factorSeguridad ?? item.factorSeguridad}
                        onChange={(e) => handleChange('factorSeguridad', parseFloat(e.target.value) || 1)}
                        className="w-10 h-5 text-xs text-center border rounded"
                        disabled={saving}
                      />
                    ) : (
                      <span>{(item.factorSeguridad ?? 1).toFixed(1)}x</span>
                    )}
                  </td>

                  {/* Dificultad */}
                  <td className="px-2 py-1.5 text-center">
                    {editando ? (
                      <select
                        className="h-5 text-[10px] border rounded px-0.5"
                        value={editableItem.nivelDificultad ?? item.nivelDificultad ?? 1}
                        onChange={(e) => handleChange('nivelDificultad', parseInt(e.target.value))}
                        disabled={saving}
                      >
                        <option value={1}>Baja</option>
                        <option value={2}>Media</option>
                        <option value={3}>Alta</option>
                        <option value={4}>Crítica</option>
                      </select>
                    ) : (
                      <Badge variant="outline" className={cn('text-[10px] px-1 py-0', dificultadColors[item.nivelDificultad || 1])}>
                        {dificultadLabels[item.nivelDificultad || 1]}
                      </Badge>
                    )}
                  </td>

                  {/* Margen */}
                  <td className="px-2 py-1.5 text-center">
                    {editando ? (
                      <input
                        type="number"
                        step="0.1"
                        min={1}
                        value={editableItem.margen ?? item.margen}
                        onChange={(e) => handleChange('margen', parseFloat(e.target.value) || 1)}
                        className="w-10 h-5 text-xs text-center border rounded"
                        disabled={saving}
                      />
                    ) : (
                      <span>{(item.margen ?? 1).toFixed(2)}x</span>
                    )}
                  </td>

                  {/* Interno */}
                  <td className="px-2 py-1.5 text-right font-mono text-gray-700">
                    {formatCurrency(currentItem.costoInterno ?? 0)}
                  </td>

                  {/* Cliente */}
                  <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                    {formatCurrency(currentItem.costoCliente ?? 0)}
                  </td>

                  {/* Acciones */}
                  {!isLocked && (
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {editando ? (
                          <>
                            <Button size="sm" onClick={handleSave} disabled={saving} className="h-5 w-5 p-0">
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={saving} className="h-5 w-5 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(item)}
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
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100/80 border-t-2">
              <td colSpan={3} className="px-2 py-1.5 text-right font-medium text-gray-700">
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
