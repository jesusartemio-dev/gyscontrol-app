'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Wrench, LayoutList, LayoutGrid } from 'lucide-react'

const CATEGORIAS = [
  { value: 'maquinaria', label: 'Maquinaria Pesada' },
  { value: 'andamios', label: 'Andamios' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'otros', label: 'Otros' },
]

const CATEGORIA_COLOR: Record<string, string> = {
  maquinaria: 'bg-orange-100 text-orange-700 border-orange-200',
  andamios:   'bg-blue-100 text-blue-700 border-blue-200',
  herramientas: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  vehiculos:  'bg-purple-100 text-purple-700 border-purple-200',
  otros:      'bg-gray-100 text-gray-600 border-gray-200',
}

const UNIDADES = ['día', 'semana', 'mes', 'hora', 'global']

type Recurso = {
  id: string
  nombre: string
  categoria: string
  unidad: string
  descripcion: string | null
  precioCompra: number | null
  vidaUtilAnios: number | null
  costoMantAnual: number | null
  activo: boolean
}

const emptyForm = {
  nombre: '',
  categoria: 'maquinaria',
  unidad: 'día',
  descripcion: '',
  precioCompra: '',
  vidaUtilAnios: '',
  costoMantAnual: '',
}

export default function CatalogoRecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editando, setEditando] = useState<Recurso | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'tabla' | 'card'>('tabla')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')

  useEffect(() => { fetchRecursos() }, [])

  async function fetchRecursos() {
    setLoading(true)
    try {
      const res = await fetch('/api/catalogo-recurso')
      setRecursos(await res.json())
    } catch {
      toast.error('Error al cargar catálogo')
    } finally {
      setLoading(false)
    }
  }

  function abrirCrear() {
    setEditando(null)
    setForm(emptyForm)
    setShowDialog(true)
  }

  function abrirEditar(r: Recurso) {
    setEditando(r)
    setForm({
      nombre: r.nombre,
      categoria: r.categoria,
      unidad: r.unidad,
      descripcion: r.descripcion ?? '',
      precioCompra: r.precioCompra !== null ? String(r.precioCompra) : '',
      vidaUtilAnios: r.vidaUtilAnios !== null ? String(r.vidaUtilAnios) : '',
      costoMantAnual: r.costoMantAnual !== null ? String(r.costoMantAnual) : '',
    })
    setShowDialog(true)
  }

  async function handleGuardar() {
    if (!form.nombre.trim() || !form.categoria || !form.unidad) {
      toast.error('Nombre, categoría y unidad son requeridos')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        unidad: form.unidad,
        descripcion: form.descripcion || null,
        precioCompra: form.precioCompra ? Number(form.precioCompra) : null,
        vidaUtilAnios: form.vidaUtilAnios ? Number(form.vidaUtilAnios) : null,
        costoMantAnual: form.costoMantAnual ? Number(form.costoMantAnual) : null,
      }
      const url = editando ? `/api/catalogo-recurso/${editando.id}` : '/api/catalogo-recurso'
      const res = await fetch(url, {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      toast.success(editando ? 'Recurso actualizado' : 'Recurso creado')
      setShowDialog(false)
      fetchRecursos()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(r: Recurso) {
    if (!confirm(`¿Eliminar "${r.nombre}"?`)) return
    try {
      const res = await fetch(`/api/catalogo-recurso/${r.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      toast.success('Recurso eliminado')
      fetchRecursos()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filtrados = recursos.filter(r => {
    const matchBusqueda =
      r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.descripcion ?? '').toLowerCase().includes(busqueda.toLowerCase())
    const matchCategoria = filtroCategoria === 'todos' || r.categoria === filtroCategoria
    return matchBusqueda && matchCategoria
  })

  const categoriaLabel = (cat: string) =>
    CATEGORIAS.find(c => c.value === cat)?.label ?? cat

  const categoriaClass = (cat: string) =>
    CATEGORIA_COLOR[cat] ?? CATEGORIA_COLOR.otros

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Catálogo Recursos</h1>
            <p className="text-sm text-muted-foreground">
              Recursos de ejecución interna · {recursos.length} registros
            </p>
          </div>
        </div>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuevo Recurso
        </Button>
      </div>

      {/* Filtros + toggle vista */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Input
          placeholder="Buscar..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-52"
        />
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las categorías</SelectItem>
            {CATEGORIAS.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex border rounded-md overflow-hidden">
          <Button
            size="sm"
            variant={vista === 'tabla' ? 'default' : 'ghost'}
            className="rounded-none h-9 px-3"
            onClick={() => setVista('tabla')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={vista === 'card' ? 'default' : 'ghost'}
            className="rounded-none h-9 px-3 border-l"
            onClick={() => setVista('card')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            {busqueda || filtroCategoria !== 'todos' ? 'Sin resultados para los filtros aplicados.' : 'No hay recursos registrados. Crea el primero.'}
          </CardContent>
        </Card>
      ) : vista === 'tabla' ? (

        /* ── VISTA TABLA ── */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Precio Compra</TableHead>
                  <TableHead>Vida Útil</TableHead>
                  <TableHead>Mant. Anual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{r.nombre}</p>
                      {r.descripcion && (
                        <p className="text-xs text-muted-foreground">{r.descripcion}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${categoriaClass(r.categoria)}`}>
                        {categoriaLabel(r.categoria)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{r.unidad}</TableCell>
                    <TableCell className="text-sm">
                      {r.precioCompra ? `S/ ${Number(r.precioCompra).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.vidaUtilAnios ? `${r.vidaUtilAnios} años` : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.costoMantAnual ? `S/ ${Number(r.costoMantAnual).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.activo ? 'default' : 'secondary'}>
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEditar(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleEliminar(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      ) : (

        /* ── VISTA CARD ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtrados.map(r => (
            <Card key={r.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-tight">{r.nombre}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${categoriaClass(r.categoria)}`}>
                    {categoriaLabel(r.categoria)}
                  </span>
                </div>
                {r.descripcion && (
                  <p className="text-xs text-muted-foreground leading-snug">{r.descripcion}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1 border-t">
                  <span>Unidad: <strong className="text-foreground">{r.unidad}</strong></span>
                  {r.precioCompra && (
                    <span>Compra: <strong className="text-foreground">S/ {Number(r.precioCompra).toLocaleString()}</strong></span>
                  )}
                  {r.vidaUtilAnios && (
                    <span>Vida: <strong className="text-foreground">{r.vidaUtilAnios}a</strong></span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Badge variant={r.activo ? 'default' : 'secondary'} className="text-xs">
                    {r.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEditar(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleEliminar(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Recurso' : 'Nuevo Recurso'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Manlift 12m, Andamio tipo Marco"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unidad *</Label>
                <Select value={form.unidad} onValueChange={v => setForm(f => ({ ...f, unidad: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                placeholder="Descripción opcional"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-3">
                Datos opcionales para análisis comprar vs. alquilar
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Precio Compra (S/)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.precioCompra}
                    onChange={e => setForm(f => ({ ...f, precioCompra: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vida Útil (años)</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={form.vidaUtilAnios}
                    onChange={e => setForm(f => ({ ...f, vidaUtilAnios: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mant. Anual (S/)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.costoMantAnual}
                    onChange={e => setForm(f => ({ ...f, costoMantAnual: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
