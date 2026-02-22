'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Package, Wrench } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createListaEquipoItem } from '@/lib/services/listaEquipoItem'
import { getUnidades } from '@/lib/services/unidad'
import type { Unidad } from '@/types'

interface Props {
  isOpen: boolean
  tipoItem: 'consumible' | 'servicio'
  listaId: string
  onClose: () => void
  onCreated?: () => Promise<void>
}

const UNIDADES_RAPIDAS = ['unidad', 'metro', 'kg', 'rollo', 'caja', 'bolsa', 'juego', 'global']

export default function ModalAgregarItemLibre({ isOpen, tipoItem, listaId, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    unidad: tipoItem === 'servicio' ? 'global' : '',
    cantidad: tipoItem === 'servicio' ? 1 : 0,
    precioEstimado: '',
  })

  useEffect(() => {
    if (isOpen) {
      getUnidades().then(setUnidades).catch(() => {})
      setForm({
        codigo: '',
        descripcion: '',
        unidad: tipoItem === 'servicio' ? 'global' : '',
        cantidad: tipoItem === 'servicio' ? 1 : 0,
        precioEstimado: '',
      })
    }
  }, [isOpen, tipoItem])

  const esServicio = tipoItem === 'servicio'
  const titulo = esServicio ? 'Agregar servicio / trabajo' : 'Agregar consumible / material'
  const IconTipo = esServicio ? Wrench : Package

  const handleSubmit = async () => {
    if (!form.codigo.trim() || !form.descripcion.trim() || !form.unidad || !form.cantidad) {
      toast.error('Completa los campos obligatorios')
      return
    }

    setLoading(true)
    try {
      await createListaEquipoItem({
        listaId,
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        unidad: form.unidad,
        cantidad: form.cantidad,
        presupuesto: form.precioEstimado ? parseFloat(form.precioEstimado) : undefined,
        tipoItem,
        categoria: 'SIN-CATEGORIA',
        marca: 'SIN-MARCA',
        estado: 'borrador' as any,
        origen: 'nuevo' as any,
      } as any)

      toast.success(`${esServicio ? 'Servicio' : 'Consumible'} agregado`)
      onClose()
      await onCreated?.()
    } catch {
      toast.error('Error al agregar item')
    } finally {
      setLoading(false)
    }
  }

  // Build unit options: DB units + quick options
  const unidadOptions = Array.from(
    new Set([
      ...UNIDADES_RAPIDAS,
      ...unidades.map(u => u.nombre),
    ])
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <IconTipo className={`h-4 w-4 ${esServicio ? 'text-purple-600' : 'text-orange-600'}`} />
            <DialogTitle className="text-sm font-semibold">{titulo}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {esServicio ? 'Formulario para agregar un servicio o trabajo' : 'Formulario para agregar un consumible o material'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium mb-1 block">Descripcion *</label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder={esServicio ? 'Ej: Flete Lima-Arequipa' : 'Ej: Terminal pin 10mm'}
              className="text-xs min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Codigo *</label>
              <Input
                value={form.codigo}
                onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))}
                placeholder={esServicio ? 'SERV-001' : 'CONS-001'}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Unidad *</label>
              <Select value={form.unidad} onValueChange={(v) => setForm(prev => ({ ...prev, unidad: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {unidadOptions.map(u => (
                    <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Cantidad *</label>
              <Input
                type="number"
                min={0}
                value={form.cantidad || ''}
                onChange={(e) => setForm(prev => ({ ...prev, cantidad: parseFloat(e.target.value) || 0 }))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Precio estimado</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.precioEstimado}
                onChange={(e) => setForm(prev => ({ ...prev, precioEstimado: e.target.value }))}
                placeholder="Opcional"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className={`text-[10px] rounded-md px-2.5 py-1.5 ${esServicio ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
            Tipo: <strong>{esServicio ? 'Servicio' : 'Consumible'}</strong> — sin ficha de catalogo
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="h-7 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !form.codigo.trim() || !form.descripcion.trim() || !form.unidad || !form.cantidad}
            className={`h-7 text-xs ${esServicio ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <IconTipo className="h-3 w-3 mr-1" />}
            Agregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
