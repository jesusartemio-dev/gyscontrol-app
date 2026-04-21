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
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Wrench, Search, LayoutGrid, List, Pencil, PackagePlus } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

const FORM_VACIO = {
  codigo: '', nombre: '', categoria: '', descripcion: '',
  gestionPorUnidad: false, unidadMedida: 'unidad', cantidadInicial: '',
}

export default function HerramientasPage() {
  const [data, setData] = useState<Herramienta[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'tabla' | 'card'>('tabla')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Herramienta | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [ajustando, setAjustando] = useState<Herramienta | null>(null)
  const [ajusteForm, setAjusteForm] = useState<{ accion: 'sumar' | 'restar'; cantidad: string; motivo: string }>({
    accion: 'sumar', cantidad: '', motivo: '',
  })
  const [ajustando_guardando, setAjustandoGuardando] = useState(false)

  async function cargar(q = '') {
    setLoading(true)
    const r = await fetch(`/api/logistica/almacen/herramientas?q=${q}`)
    setData(await r.json())
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_VACIO)
    setDialogOpen(true)
  }

  function abrirAjustar(h: Herramienta) {
    setAjustando(h)
    setAjusteForm({ accion: 'sumar', cantidad: '', motivo: '' })
  }

  async function guardarAjuste() {
    if (!ajustando) return
    const cantidad = Number(ajusteForm.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) { toast.error('Cantidad debe ser mayor a 0'); return }
    if (!ajusteForm.motivo.trim()) { toast.error('Indica el motivo del ajuste'); return }
    const delta = ajusteForm.accion === 'sumar' ? cantidad : -cantidad
    setAjustandoGuardando(true)
    try {
      const r = await fetch(`/api/logistica/almacen/herramientas/${ajustando.id}/ajustar-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, motivo: ajusteForm.motivo.trim() }),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error'); return }
      toast.success(ajusteForm.accion === 'sumar' ? 'Stock incrementado' : 'Stock reducido')
      setAjustando(null)
      cargar(busqueda)
    } finally {
      setAjustandoGuardando(false)
    }
  }

  function abrirEditar(h: Herramienta) {
    setEditando(h)
    setForm({
      codigo: h.codigo,
      nombre: h.nombre,
      categoria: h.categoria,
      descripcion: h.descripcion || '',
      gestionPorUnidad: h.gestionPorUnidad,
      unidadMedida: h.unidadMedida,
      cantidadInicial: '',
    })
    setDialogOpen(true)
  }

  async function guardar() {
    if (!form.codigo || !form.nombre || !form.categoria) {
      toast.error('Código, nombre y categoría son obligatorios')
      return
    }
    setSaving(true)
    try {
      const url = editando
        ? `/api/logistica/almacen/herramientas/${editando.id}`
        : '/api/logistica/almacen/herramientas'
      const method = editando ? 'PATCH' : 'POST'
      const payload = editando
        ? {
            codigo: form.codigo,
            nombre: form.nombre,
            categoria: form.categoria,
            descripcion: form.descripcion,
            unidadMedida: form.unidadMedida,
          }
        : { ...form, cantidadInicial: Number(form.cantidadInicial) || 0 }
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error'); return }
      toast.success(editando ? 'Herramienta actualizada' : 'Herramienta creada')
      setDialogOpen(false)
      setEditando(null)
      setForm(FORM_VACIO)
      cargar(busqueda)
    } finally {
      setSaving(false)
    }
  }

  const counts = (h: Herramienta) => {
    const disponible = h.gestionPorUnidad
      ? h.unidades.filter(u => u.estado === 'disponible').length
      : (h.stock[0]?.cantidadDisponible ?? 0)
    const prestados = h.prestadosActivos ?? 0
    return { disponible, prestados, total: disponible + prestados }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Herramientas</h1>
          <p className="text-sm text-muted-foreground">Catálogo y gestión de herramientas del almacén</p>
        </div>
        <Button onClick={abrirNuevo}><Plus className="mr-2 h-4 w-4" /> Nueva herramienta</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nombre, código o categoría..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar(busqueda)}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={() => cargar(busqueda)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setVista('tabla')}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
              vista === 'tabla' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <List className="h-3.5 w-3.5" /> Tabla
          </button>
          <button
            type="button"
            onClick={() => setVista('card')}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
              vista === 'card' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
        </div>
      </div>

      {data.length === 0 && !loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Sin herramientas registradas. Crea la primera.
        </div>
      ) : vista === 'tabla' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-28">Categoría</TableHead>
                  <TableHead className="w-28">Tipo</TableHead>
                  <TableHead className="w-24 text-right">Disponible</TableHead>
                  <TableHead className="w-24 text-right">Prestados</TableHead>
                  <TableHead className="w-20 text-right">Total</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(h => {
                  const { disponible, prestados, total } = counts(h)
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-mono text-xs">{h.codigo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <div>
                            <div className="text-sm font-medium">{h.nombre}</div>
                            {h.descripcion && (
                              <div className="text-[11px] text-muted-foreground line-clamp-1">{h.descripcion}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{h.categoria}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {h.gestionPorUnidad ? 'Serializada' : h.unidadMedida}
                      </TableCell>
                      <TableCell className={cn(
                        'text-right font-semibold',
                        disponible > 0 ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {disponible}
                      </TableCell>
                      <TableCell className={cn(
                        'text-right text-sm',
                        prestados > 0 ? 'text-amber-700' : 'text-muted-foreground'
                      )}>
                        {prestados}
                      </TableCell>
                      <TableCell className="text-right text-sm">{total}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {!h.gestionPorUnidad && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Ajustar stock"
                              onClick={() => abrirAjustar(h)}
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => abrirEditar(h)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(h => {
            const { disponible, prestados, total } = counts(h)
            return (
              <Card key={h.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-amber-600" />
                      {h.nombre}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{h.codigo}</Badge>
                      {!h.gestionPorUnidad && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Ajustar stock" onClick={() => abrirAjustar(h)}>
                          <PackagePlus className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Editar" onClick={() => abrirEditar(h)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardTitle>
                  <p className="text-xs capitalize text-muted-foreground">{h.categoria}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {h.gestionPorUnidad ? 'Por unidad serializada' : h.unidadMedida}
                    </span>
                    <span className={cn('font-semibold', disponible > 0 ? 'text-emerald-600' : 'text-red-500')}>
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
        </div>
      )}

      <Dialog open={!!ajustando} onOpenChange={(open) => { if (!open) setAjustando(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar stock — {ajustando?.nombre}</DialogTitle>
          </DialogHeader>
          {ajustando && (() => {
            const disp = ajustando.stock[0]?.cantidadDisponible ?? 0
            const cant = Number(ajusteForm.cantidad) || 0
            const nuevoStock = ajusteForm.accion === 'sumar' ? disp + cant : disp - cant
            const invalido = ajusteForm.accion === 'restar' && cant > disp
            return (
              <div className="space-y-3">
                <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
                  Stock actual: <span className="font-semibold">{disp}</span> {ajustando.unidadMedida}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAjusteForm(f => ({ ...f, accion: 'sumar' }))}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                      ajusteForm.accion === 'sumar' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'
                    )}
                  >
                    + Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAjusteForm(f => ({ ...f, accion: 'restar' }))}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                      ajusteForm.accion === 'restar' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'
                    )}
                  >
                    − Reducir
                  </button>
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    max={ajusteForm.accion === 'restar' ? disp : undefined}
                    value={ajusteForm.cantidad}
                    onChange={e => setAjusteForm(f => ({ ...f, cantidad: e.target.value }))}
                    className={invalido ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label>Motivo *</Label>
                  <Textarea
                    rows={2}
                    value={ajusteForm.motivo}
                    onChange={e => setAjusteForm(f => ({ ...f, motivo: e.target.value }))}
                    placeholder={ajusteForm.accion === 'sumar' ? 'Compra nueva, hallazgo físico...' : 'Extravío, baja por daño, ajuste físico...'}
                  />
                </div>
                {cant > 0 && !invalido && (
                  <div className="rounded-md border bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    Nuevo stock: <span className="font-semibold">{nuevoStock}</span> {ajustando.unidadMedida}
                  </div>
                )}
                {invalido && (
                  <p className="text-xs text-red-600">No puedes reducir más de {disp} unidades (stock actual).</p>
                )}
                <Button className="w-full" onClick={guardarAjuste} disabled={ajustando_guardando || invalido}>
                  {ajustando_guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Registrar ajuste
                </Button>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditando(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? `Editar herramienta — ${editando.codigo}` : 'Nueva herramienta'}</DialogTitle>
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
            <div>
              <Label>Unidad de medida</Label>
              <Input
                value={form.unidadMedida}
                onChange={e => setForm(f => ({ ...f, unidadMedida: e.target.value }))}
                placeholder="unidad, metros, juego..."
              />
            </div>
            {!editando && (
              <>
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
              </>
            )}
            {editando && (
              <p className="text-[11px] text-muted-foreground">
                El modo de gestión y el stock se ajustan desde movimientos de inventario, no desde esta edición.
              </p>
            )}
            <Button className="w-full" onClick={guardar} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editando ? 'Guardar cambios' : 'Crear herramienta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
