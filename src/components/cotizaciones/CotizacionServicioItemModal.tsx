'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { CotizacionServicioItem, Recurso, TipoFormula, UnidadServicio } from '@/types'

interface Props {
  item: CotizacionServicioItem | null
  recursos: Recurso[]
  unidades: UnidadServicio[]
  onClose: () => void
  onSave: (item: Partial<CotizacionServicioItem>) => void
}

export default function CotizacionServicioItemModal({
  item,
  recursos,
  unidades,
  onClose,
  onSave
}: Props) {
  const [form, setForm] = useState<Partial<CotizacionServicioItem>>({})
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const dragAreaRef = useRef<HTMLDivElement>(null)
  const offset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (item) {
      setForm(item)
      setPosition({ x: 0, y: 0 })
    }
  }, [item])

  useEffect(() => {
    const handle = dragAreaRef.current
    if (!handle) return

    const handleMouseDown = (e: MouseEvent) => {
      offset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      }

      const handleMouseMove = (e: MouseEvent) => {
        setPosition({
          x: e.clientX - offset.current.x,
          y: e.clientY - offset.current.y
        })
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    handle.addEventListener('mousedown', handleMouseDown)
    return () => handle.removeEventListener('mousedown', handleMouseDown)
  }, [position])

  const handleChange = (field: keyof CotizacionServicioItem, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleNumericChange = (field: keyof CotizacionServicioItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setForm(prev => ({ ...prev, [field]: isNaN(value) ? 0 : value }))
  }

  const handleSubmit = () => {
    if (!form.id) return
    onSave({ ...form })
    onClose()
  }

  if (!item) return null

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <DialogHeader
          ref={dragAreaRef}
          className="cursor-move active:cursor-grabbing"
        >
          <DialogTitle>✏️ Editar Servicio</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Unidad</label>
            <Select
              value={form.unidadServicioId}
              onValueChange={(v) => handleChange('unidadServicioId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Recurso</label>
            <Select
              value={form.recursoId}
              onValueChange={(v) => handleChange('recursoId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {recursos.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">Fórmula</label>
            <Select
              value={form.formula}
              onValueChange={(v) => handleChange('formula', v as TipoFormula)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fijo">Fijo</SelectItem>
                <SelectItem value="Proporcional">Proporcional</SelectItem>
                <SelectItem value="Escalonada">Escalonada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {(['horaBase', 'horaRepetido', 'horaUnidad', 'horaFijo'] as const).map(field => (
            <div key={field}>
              <label className="text-sm font-medium">{field.replace('hora', 'Hora ')}</label>
              <Input
                type="number"
                value={form[field] ?? ''}
                onChange={handleNumericChange(field)}
                onFocus={(e) => e.target.select()}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
