'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Search, Package } from 'lucide-react'
import { toast } from 'sonner'

interface CatalogoItem {
  id: string
  codigo: string
  descripcion: string
  marca: string
  precioInterno?: number | null
  precioReal?: number | null
  precioLogistica?: number | null
  unidad?: { nombre: string } | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function IngresoManualModal({ open, onOpenChange, onSuccess }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<CatalogoItem[]>([])
  const [buscando, setBuscando] = useState(false)
  const [seleccionado, setSeleccionado] = useState<CatalogoItem | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [costo, setCosto] = useState('')
  const [moneda, setMoneda] = useState('PEN')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) {
      // Reset al cerrar
      setBusqueda('')
      setResultados([])
      setSeleccionado(null)
      setCantidad('')
      setCosto('')
      setMoneda('PEN')
      setObservaciones('')
    }
  }, [open])

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        const r = await fetch(`/api/catalogo-equipo/search?q=${encodeURIComponent(busqueda)}&limit=15`)
        if (r.ok) {
          const data = await r.json()
          setResultados(data)
        }
      } finally {
        setBuscando(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [busqueda])

  async function guardar() {
    if (!seleccionado) {
      toast.error('Selecciona un ítem del catálogo')
      return
    }
    const cantNum = Number(cantidad)
    const costoNum = Number(costo)
    if (!(cantNum > 0)) {
      toast.error('Cantidad debe ser mayor a 0')
      return
    }
    if (!(costoNum > 0)) {
      toast.error('Costo unitario debe ser mayor a 0')
      return
    }

    setGuardando(true)
    try {
      const r = await fetch('/api/logistica/almacen/ingreso-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogoEquipoId: seleccionado.id,
          cantidad: cantNum,
          costoUnitario: costoNum,
          costoMoneda: moneda,
          observaciones: observaciones || null,
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error || 'Error al registrar')
        return
      }
      toast.success(`${cantNum} x ${seleccionado.codigo} cargadas al almacén`)
      onSuccess()
      onOpenChange(false)
    } finally {
      setGuardando(false)
    }
  }

  const valorTotal = (Number(cantidad) || 0) * (Number(costo) || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Ingreso manual al almacén
          </DialogTitle>
          <DialogDescription className="text-xs">
            Carga stock físico existente que no pasó por una OC (regularización de inventario).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Buscador de catálogo */}
          <div>
            <Label className="text-xs">Ítem del catálogo *</Label>
            {seleccionado ? (
              <div className="flex items-center justify-between rounded border bg-muted px-3 py-2 text-sm">
                <div className="flex-1">
                  <p className="font-mono text-xs font-semibold">{seleccionado.codigo}</p>
                  <p className="text-xs text-muted-foreground">{seleccionado.descripcion}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                    {seleccionado.unidad && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                        Unidad: {seleccionado.unidad.nombre}
                      </span>
                    )}
                    {seleccionado.precioInterno && seleccionado.precioInterno > 0 && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">
                        Precio catálogo: {seleccionado.precioInterno.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSeleccionado(null)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar por código o descripción (mín. 2 caracteres)..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    autoFocus
                  />
                </div>
                {buscando && (
                  <p className="mt-1 text-xs text-muted-foreground">Buscando...</p>
                )}
                {!buscando && resultados.length > 0 && (
                  <div className="mt-1 max-h-56 overflow-y-auto rounded border">
                    {resultados.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted"
                        onClick={() => {
                          setSeleccionado(item)
                          setResultados([])
                          setBusqueda('')
                          // Pre-llenar costo con precio del catálogo (prioridad: interno → real → logística)
                          const precio = item.precioInterno || item.precioReal || item.precioLogistica
                          if (precio && precio > 0) {
                            setCosto(String(precio))
                          }
                        }}
                      >
                        <span className="font-mono font-semibold">{item.codigo}</span>
                        <span className="text-muted-foreground">{item.descripcion}</span>
                        {item.unidad && (
                          <span className="text-[10px] text-blue-600">Unidad: {item.unidad.nombre}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {!buscando && busqueda.length >= 2 && resultados.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sin resultados. Si el ítem no existe, regístralo primero en /catalogo/equipos.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Cantidad */}
          <div>
            <Label className="text-xs">
              Cantidad *
              {seleccionado?.unidad && (
                <span className="ml-1 font-normal text-muted-foreground">
                  (en {seleccionado.unidad.nombre})
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="Ej. 50"
                className={seleccionado?.unidad ? 'pr-14' : ''}
              />
              {seleccionado?.unidad && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {seleccionado.unidad.nombre}
                </span>
              )}
            </div>
          </div>

          {/* Costo + moneda */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">
                Costo unitario *
                {seleccionado && costo && seleccionado.precioInterno && Math.abs(Number(costo) - seleccionado.precioInterno) < 0.001 && (
                  <span className="ml-1 font-normal text-muted-foreground">(del catálogo — ajústalo si es distinto)</span>
                )}
              </Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={costo}
                onChange={e => setCosto(e.target.value)}
                placeholder="Ej. 8.50"
              />
            </div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PEN">PEN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {valorTotal > 0 && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
              <p className="font-semibold">
                Valor a ingresar: {moneda} {valorTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs">Observaciones</Label>
            <Textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej. regularización inventario físico — oficina"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando || !seleccionado}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar ingreso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
