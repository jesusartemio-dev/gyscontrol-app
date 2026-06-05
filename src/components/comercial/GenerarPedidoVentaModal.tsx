'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface ItemVenta {
  id: string
  codigo?: string | null
  descripcion: string
  unidad?: string | null
  marca?: string | null
  cantidad: number
  precioUnitarioCliente: number
  catalogoEquipoId?: string | null
  catalogoEquipo?: { codigo: string } | null
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  ventaId: string
  items: ItemVenta[]
}

export default function GenerarPedidoVentaModal({ open, onClose, onCreated, ventaId, items }: Props) {
  const { data: session } = useSession()
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [cant, setCant] = useState<Record<string, number>>({})
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (!open) return
    // Por defecto: todos los ítems seleccionados con su cantidad completa.
    const s: Record<string, boolean> = {}
    const c: Record<string, number> = {}
    for (const it of items) {
      s[it.id] = true
      c[it.id] = it.cantidad
    }
    setSel(s)
    setCant(c)
    // Fecha necesaria por defecto: hoy + 7 días.
    const f = new Date()
    f.setDate(f.getDate() + 7)
    setFechaNecesaria(f.toISOString().slice(0, 10))
  }, [open, items])

  const seleccionados = useMemo(
    () => items.filter((it) => sel[it.id] && (cant[it.id] ?? 0) > 0),
    [items, sel, cant],
  )

  const crear = async () => {
    if (seleccionados.length === 0) {
      toast.error('Selecciona al menos un equipo')
      return
    }
    if (!fechaNecesaria) {
      toast.error('Indica la fecha necesaria')
      return
    }
    const responsableId = (session?.user as { id?: string } | undefined)?.id
    if (!responsableId) {
      toast.error('No se pudo identificar al responsable')
      return
    }
    setCreando(true)
    try {
      const itemsLibres = seleccionados.map((it) => ({
        codigo: it.codigo || it.catalogoEquipo?.codigo || 'SIN-CODIGO',
        descripcion: it.descripcion,
        unidad: it.unidad || 'UND',
        cantidadPedida: cant[it.id],
        precioUnitario: it.precioUnitarioCliente,
        marca: it.marca ?? null,
        catalogoEquipoId: it.catalogoEquipoId ?? null,
      }))
      const res = await fetch('/api/pedido-equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ventaEquipoId: ventaId,
          responsableId,
          fechaNecesaria,
          itemsLibres,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo generar el pedido')
        return
      }
      toast.success('Pedido generado (borrador). Revísalo y envíalo a logística.')
      onCreated()
      onClose()
    } catch {
      toast.error('No se pudo generar el pedido')
    } finally {
      setCreando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar pedido de equipos</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Se creará un pedido (en <span className="font-medium">borrador</span>) con los equipos
            seleccionados de esta venta. Luego podrás enviarlo a logística.
          </p>

          <div>
            <Label className="text-xs">Fecha necesaria</Label>
            <Input
              type="date"
              value={fechaNecesaria}
              onChange={(e) => setFechaNecesaria(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-md border p-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-border"
                  checked={!!sel[it.id]}
                  onChange={(e) => setSel((p) => ({ ...p, [it.id]: e.target.checked }))}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.codigo && <span className="mr-1">{it.codigo}</span>}
                    {it.unidad || 'und'} · ${it.precioUnitarioCliente.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={cant[it.id] ?? 0}
                  onChange={(e) => setCant((p) => ({ ...p, [it.id]: Number(e.target.value) }))}
                  disabled={!sel[it.id]}
                  className="h-8 w-20 text-right text-sm"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {seleccionados.length} equipo(s) seleccionado(s)
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creando}>
            Cancelar
          </Button>
          <Button onClick={crear} disabled={creando || seleccionados.length === 0}>
            {creando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
