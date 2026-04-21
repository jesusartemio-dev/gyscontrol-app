'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Wrench, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Herramienta {
  id: string
  codigo: string
  nombre: string
  categoria: string
  descripcion: string | null
  gestionPorUnidad: boolean
  unidadMedida: string
  activo: boolean
  stock: { cantidadDisponible: number }[]
  unidades: { id: string; estado: string; serie: string }[]
  _count: { unidades: number }
  prestadosActivos: number
}

const CATEGORIAS = ['electricas', 'manuales', 'medicion', 'proteccion', 'computo', 'otro']

export default function HerramientasPage() {
  const [data, setData] = useState<Herramienta[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    codigo: '', nombre: '', categoria: '', descripcion: '',
    gestionPorUnidad: false, unidadMedida: 'unidad', cantidadInicial: '',
  })

  async function cargar(q = '') {
    setLoading(true)
    const r = await fetch(`/api/logistica/almacen/herramientas?q=${q}`)
    setData(await r.json())
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function guardar() {
    if (!form.codigo || !form.nombre || !form.categoria) {
      toast.error('Código, nombre y categoría son obligatorios')
      return
    }
    setSaving(true)
    try {
      const r = await fetch('/api/logistica/almacen/herramientas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cantidadInicial: Number(form.cantidadInicial) || 0 }),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error'); return }
      toast.success('Herramienta creada')
      setOpen(false)
      setForm({ codigo: '', nombre: '', categoria: '', descripcion: '', gestionPorUnidad: false, unidadMedida: 'unidad', cantidadInicial: '' })
      cargar(busqueda)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Herramientas</h1>
          <p className="text-sm text-muted-foreground">Catálogo y gestión de herramientas del almacén</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nueva herramienta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva herramienta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Código *</Label>
                  <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="HERR-001" />
                </div>
                <div>
                  <Label>Categoría *</Label>
                  <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="gestionPorUnidad" checked={form.gestionPorUnidad}
                  onChange={e => setForm(f => ({ ...f, gestionPorUnidad: e.target.checked }))} />
                <Label htmlFor="gestionPorUnidad">Gestión por unidad (serie/QR individual)</Label>
              </div>
              {!form.gestionPorUnidad && (
                <div>
                  <Label>Cantidad inicial</Label>
                  <Input type="number" min="0" value={form.cantidadInicial}
                    onChange={e => setForm(f => ({ ...f, cantidadInicial: e.target.value }))} />
                </div>
              )}
              <Button className="w-full" onClick={guardar} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Crear herramienta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 flex gap-2">
        <Input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar(busqueda)} className="max-w-xs" />
        <Button variant="outline" onClick={() => cargar(busqueda)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map(h => {
          const disponible = h.gestionPorUnidad
            ? h.unidades.filter(u => u.estado === 'disponible').length
            : (h.stock[0]?.cantidadDisponible ?? 0)
          const prestados = h.prestadosActivos ?? 0
          const total = disponible + prestados
          return (
            <Card key={h.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    {h.nombre}
                  </span>
                  <Badge variant="outline" className="text-xs">{h.codigo}</Badge>
                </CardTitle>
                <p className="text-xs capitalize text-muted-foreground">{h.categoria}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {h.gestionPorUnidad ? 'Por unidad serializada' : h.unidadMedida}
                  </span>
                  <span className={`font-semibold ${disponible > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {disponible}/{total} disp.
                  </span>
                </div>
                {prestados > 0 && (
                  <div className="mt-1 flex items-center justify-end text-xs text-amber-700">
                    {prestados} prestad{prestados !== 1 ? 'os' : 'o'}
                  </div>
                )}
                {h.descripcion && <p className="mt-1 text-xs text-muted-foreground">{h.descripcion}</p>}
              </CardContent>
            </Card>
          )
        })}
        {data.length === 0 && !loading && (
          <div className="col-span-3 py-12 text-center text-muted-foreground">
            Sin herramientas registradas. Crea la primera.
          </div>
        )}
      </div>
    </div>
  )
}
