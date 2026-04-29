'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Save, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface AlmacenOpt {
  id: string
  nombre: string
}

interface CatalogoEppResult {
  id: string
  codigo: string
  descripcion: string
  marca: string | null
  modelo: string | null
  subcategoria: string
  precioReferencial: number | null
  monedaReferencial: string
  unidad: { nombre: string }
}

interface ItemDraft {
  catalogoEppId: string
  codigo: string
  descripcion: string
  marca: string | null
  unidadNombre: string
  cantidad: number
  costoUnitario: number
  costoMoneda: string
}

export default function IngresoStockEppPage() {
  const router = useRouter()

  const [almacenes, setAlmacenes] = useState<AlmacenOpt[]>([])
  const [almacenId, setAlmacenId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [catalogoQuery, setCatalogoQuery] = useState('')
  const [catalogoResults, setCatalogoResults] = useState<CatalogoEppResult[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(false)
  const catalogoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/almacen')
      .then(r => r.ok ? r.json() : [])
      .then((data: AlmacenOpt[]) => {
        setAlmacenes(data)
        if (data.length === 1) setAlmacenId(data[0].id)
      })
      .catch(() => toast.error('Error al cargar almacenes'))
      .finally(() => setLoading(false))
  }, [])

  const buscarCatalogo = async (q: string) => {
    if (q.trim().length < 2) {
      setCatalogoResults([])
      return
    }
    setCatalogoLoading(true)
    try {
      const res = await fetch(`/api/catalogo-epp/search?q=${encodeURIComponent(q.trim())}&limit=15`)
      if (res.ok) setCatalogoResults(await res.json())
    } catch {
      setCatalogoResults([])
    } finally {
      setCatalogoLoading(false)
    }
  }

  const handleCatalogoQuery = (val: string) => {
    setCatalogoQuery(val)
    if (catalogoTimerRef.current) clearTimeout(catalogoTimerRef.current)
    catalogoTimerRef.current = setTimeout(() => buscarCatalogo(val), 300)
  }

  const agregar = (cat: CatalogoEppResult) => {
    if (items.find(i => i.catalogoEppId === cat.id)) {
      toast.warning('Este EPP ya está en la lista')
      return
    }
    setItems(prev => [
      ...prev,
      {
        catalogoEppId: cat.id,
        codigo: cat.codigo,
        descripcion: cat.descripcion,
        marca: cat.marca,
        unidadNombre: cat.unidad?.nombre ?? 'und',
        cantidad: 1,
        costoUnitario: cat.precioReferencial ?? 0,
        costoMoneda: cat.monedaReferencial || 'PEN',
      },
    ])
    setCatalogoQuery('')
    setCatalogoResults([])
  }

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const guardar = async () => {
    if (!almacenId) return toast.error('Selecciona un almacén')
    if (items.length === 0) return toast.error('Agrega al menos un EPP')
    for (const it of items) {
      if (it.cantidad <= 0) return toast.error(`Cantidad inválida en ${it.codigo}`)
      if (it.costoUnitario < 0) return toast.error(`Costo inválido en ${it.codigo}`)
    }

    setSaving(true)
    try {
      const payload = {
        almacenId,
        observaciones: observaciones.trim() || null,
        items: items.map(i => ({
          catalogoEppId: i.catalogoEppId,
          cantidad: i.cantidad,
          costoUnitario: i.costoUnitario || null,
          costoMoneda: i.costoMoneda,
        })),
      }
      const res = await fetch('/api/stock-epp/ingreso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al guardar')
      }
      const data = await res.json()
      toast.success(data.mensaje || 'Ingreso registrado')
      router.push('/seguridad/stock')
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const totalGeneral = items.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0)
  const monedaTotal = items[0]?.costoMoneda ?? 'PEN'

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad/stock">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Ingreso manual de stock EPP</h1>
          <p className="text-sm text-muted-foreground">Sumar EPPs al almacén sin OC formal</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Datos generales</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Almacén <span className="text-red-500">*</span></Label>
            <Select value={almacenId} onValueChange={setAlmacenId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar almacén..." /></SelectTrigger>
              <SelectContent>{almacenes.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observaciones (opcional)</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
              placeholder="Ej: Compra menor en efectivo, dotación cliente, ajuste inventario..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">EPPs a ingresar</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Buscar en catálogo</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={catalogoQuery} onChange={e => handleCatalogoQuery(e.target.value)}
                placeholder="Código o descripción (mín. 2 caracteres)" className="pl-8" />
              {catalogoLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            {catalogoQuery.trim().length >= 2 && !catalogoLoading && (
              <div className="border rounded-md max-h-44 overflow-auto bg-background shadow-sm">
                {catalogoResults.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
                ) : (
                  catalogoResults.map(c => (
                    <button key={c.id} type="button" onClick={() => agregar(c)}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted/60 border-b last:border-b-0 text-xs">
                      <div className="font-medium">{c.descripcion}</div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                        <span>{c.codigo}</span>
                        {c.marca && <span>· {c.marca}</span>}
                        <span>· {c.unidad?.nombre}</span>
                        <Badge variant="secondary" className="text-[9px] py-0 h-3.5">{c.subcategoria}</Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center border rounded-md border-dashed">Sin items agregados</p>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{it.descripcion}</div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <span>{it.codigo}</span>
                        {it.marca && <span>· {it.marca}</span>}
                        <span>· {it.unidadNombre}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Cantidad *</Label>
                      <Input type="number" min={0.01} step={0.01} value={it.cantidad}
                        onChange={e => updateItem(idx, { cantidad: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Moneda</Label>
                      <Select value={it.costoMoneda} onValueChange={v => updateItem(idx, { costoMoneda: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PEN">S/</SelectItem>
                          <SelectItem value="USD">US$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Costo unit.</Label>
                      <Input type="number" min={0} step={0.01} value={it.costoUnitario || ''}
                        onChange={e => updateItem(idx, { costoUnitario: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00" className="h-8 text-sm" />
                    </div>
                  </div>
                  {it.cantidad > 0 && it.costoUnitario > 0 && (
                    <p className="text-[10px] text-right text-muted-foreground">
                      Subtotal: <span className="font-semibold text-foreground">
                        {it.costoMoneda === 'USD' ? 'US$' : 'S/'} {(it.cantidad * it.costoUnitario).toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>
              ))}
              {totalGeneral > 0 && (
                <div className="flex justify-end px-3 py-2 border-t pt-3 text-sm">
                  <span className="font-semibold">
                    Total: <span className="text-blue-700">
                      {monedaTotal === 'USD' ? 'US$' : 'S/'} {totalGeneral.toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/seguridad/stock"><Button variant="outline" disabled={saving}>Cancelar</Button></Link>
        <Button onClick={guardar} disabled={saving || items.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Registrar ingreso
        </Button>
      </div>

      <p className="text-[10px] text-center text-muted-foreground">
        El stock se sumará al almacén seleccionado y el costo unitario actualizará el promedio ponderado.
      </p>
    </div>
  )
}
