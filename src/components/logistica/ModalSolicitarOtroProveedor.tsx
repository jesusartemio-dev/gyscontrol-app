'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { toast } from 'sonner'
import { UserPlus, Loader2, Building2, ChevronsUpDown, Check } from 'lucide-react'
import type { CotizacionProveedor, Proveedor } from '@/types'
import { getProveedores } from '@/lib/services/proveedor'
import { createCotizacionProveedor } from '@/lib/services/cotizacionProveedor'

interface Props {
  open: boolean
  onClose: () => void
  cotizacion: CotizacionProveedor
}

export default function ModalSolicitarOtroProveedor({ open, onClose, cotizacion }: Props) {
  const router = useRouter()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedorId, setProveedorId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [loadingProveedores, setLoadingProveedores] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)

  const items = cotizacion.items || []
  const itemsValidos = items.filter(i => i.listaEquipoItemId)

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(itemsValidos.map(i => i.id)))
      setProveedorId('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    setLoadingProveedores(true)
    getProveedores()
      .then(data => setProveedores((data || []).filter(p => p.id !== cotizacion.proveedorId)))
      .finally(() => setLoadingProveedores(false))
  }, [open, cotizacion.proveedorId])

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = itemsValidos.length > 0 && itemsValidos.every(i => selectedIds.has(i.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(itemsValidos.map(i => i.id)))
    }
  }

  const handleCreate = async () => {
    if (!proveedorId || selectedIds.size === 0) return

    const selectedItems = itemsValidos.filter(i => selectedIds.has(i.id))
    setCreating(true)

    try {
      // 1. Create new cotización
      const newCot = await createCotizacionProveedor({
        proveedorId,
        proyectoId: cotizacion.proyectoId,
      })
      if (!newCot) throw new Error('No se pudo crear la cotización')

      // 2. Bulk create items (clean slate — no prices)
      const res = await fetch('/api/cotizacion-proveedor-item/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map(item => ({
            cotizacionId: newCot.id,
            listaEquipoItemId: item.listaEquipoItemId,
            listaId: item.listaId,
            codigo: item.codigo,
            descripcion: item.descripcion,
            unidad: item.unidad,
            cantidadOriginal: item.cantidadOriginal,
            cantidad: item.cantidad ?? item.cantidadOriginal,
            estado: 'pendiente',
            esSeleccionada: false,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear ítems')
      }

      const provNombre = proveedores.find(p => p.id === proveedorId)?.nombre || 'proveedor'
      toast.success(`Cotización para ${provNombre} creada con ${selectedItems.length} ítem(s)`)
      onClose()
      router.push(`/logistica/cotizaciones/${newCot.id}`)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Error al crear cotización')
    } finally {
      setCreating(false)
    }
  }

  const selectedProveedor = proveedores.find(p => p.id === proveedorId)

  return (
    <Dialog open={open} onOpenChange={val => !val && onClose()}>
      <DialogContent className="max-w-xl w-full max-h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 pr-10 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
            <DialogTitle className="text-sm font-semibold">Solicitar a otro proveedor</DialogTitle>
            <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
              {cotizacion.codigo}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* Provider combobox */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Proveedor destino</label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={loadingProveedores}
                  className="w-full h-8 text-xs justify-between font-normal"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {loadingProveedores
                      ? 'Cargando…'
                      : selectedProveedor
                      ? selectedProveedor.nombre
                      : 'Buscar proveedor…'
                    }
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nombre…" className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty className="py-4 text-xs text-center text-muted-foreground">
                      No se encontraron proveedores.
                    </CommandEmpty>
                    <CommandGroup>
                      {proveedores.map(p => (
                        <CommandItem
                          key={p.id}
                          value={p.nombre}
                          onSelect={() => {
                            setProveedorId(p.id)
                            setComboOpen(false)
                          }}
                          className="text-xs"
                        >
                          <Check className={`h-3.5 w-3.5 mr-2 shrink-0 ${proveedorId === p.id ? 'opacity-100' : 'opacity-0'}`} />
                          {p.nombre}
                          {p.ruc && <span className="ml-auto text-[10px] text-muted-foreground">{p.ruc}</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {proveedores.length === 0 && !loadingProveedores && (
              <p className="text-[10px] text-amber-600">No hay otros proveedores registrados.</p>
            )}
          </div>

          {/* Items table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Ítems a incluir</label>
              <span className="text-[10px] text-muted-foreground">
                {selectedIds.size} de {itemsValidos.length} seleccionados
              </span>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="py-1.5 px-2 w-8">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        className="h-3.5 w-3.5"
                        disabled={itemsValidos.length === 0}
                      />
                    </th>
                    <th className="py-1.5 px-2 text-left font-medium text-muted-foreground w-24">Código</th>
                    <th className="py-1.5 px-2 text-left font-medium text-muted-foreground">Descripción</th>
                    <th className="py-1.5 px-2 text-center font-medium text-muted-foreground w-14">Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isHuerfano = !item.listaEquipoItemId
                    const isSelected = selectedIds.has(item.id)
                    return (
                      <tr
                        key={item.id}
                        className={`border-b last:border-0 transition-colors ${
                          isHuerfano
                            ? 'opacity-40'
                            : isSelected
                            ? 'bg-blue-50 cursor-pointer hover:bg-blue-100'
                            : 'cursor-pointer hover:bg-gray-50'
                        } ${idx % 2 === 0 ? '' : 'bg-gray-50/20'}`}
                        onClick={() => !isHuerfano && toggleItem(item.id)}
                      >
                        <td className="py-1.5 px-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => !isHuerfano && toggleItem(item.id)}
                            disabled={isHuerfano}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[11px]">{item.codigo}</td>
                        <td className="py-1.5 px-2">
                          <span className="line-clamp-1 text-[11px]" title={item.descripcion}>
                            {item.descripcion}
                          </span>
                          {isHuerfano && (
                            <span className="text-red-500 text-[10px]"> — huérfano, no se puede copiar</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono">
                          {item.cantidad ?? item.cantidadOriginal}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50/50 flex-shrink-0 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {proveedorId && selectedIds.size > 0 && (
              <span>
                Nueva cotización para <strong>{selectedProveedor?.nombre}</strong>{' '}
                con <strong>{selectedIds.size}</strong> ítem(s)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={creating} className="h-7 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!proveedorId || selectedIds.size === 0 || creating}
              className="h-7 text-xs min-w-[140px] bg-blue-600 hover:bg-blue-700"
            >
              {creating ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Creando…</>
              ) : (
                <><UserPlus className="h-3 w-3 mr-1" />Crear cotización</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
