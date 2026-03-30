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
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'

const CATEGORIAS = [
  { value: 'maquinaria', label: 'Maquinaria Pesada' },
  { value: 'andamios', label: 'Andamios' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'otros', label: 'Otros' },
]

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

  useEffect(() => {
    fetchRecursos()
  }, [])

  async function fetchRecursos() {
    setLoading(true)
    try {
      const res = await fetch('/api/catalogo-recurso')
      const data = await res.json()
      setRecursos(data)
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
      const method = editando ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
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
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Recurso eliminado')
      fetchRecursos()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filtrados = recursos.filter(r =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.categoria.toLowerCase().includes(busqueda.toLowerCase())
  )

  const categoriaLabel = (cat: string) =>
    CATEGORIAS.find(c => c.value === cat)?.label ?? cat

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Catálogo Recursos</h1>
            <p className="text-sm text-muted-foreground">
              Recursos de ejecución interna (Manlift, Andamios, Herramientas, etc.)
            </p>
          </div>
        </div>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuevo Recurso
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre o categoría..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {busqueda ? 'Sin resultados' : 'No hay recursos registrados. Crea el primero.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Precio Compra</TableHead>
                  <TableHead>Vida Útil</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.nombre}
                      {r.descripcion && (
                        <p className="text-xs text-muted-foreground">{r.descripcion}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoriaLabel(r.categoria)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.unidad}</TableCell>
                    <TableCell className="text-sm">
                      {r.precioCompra ? `S/ ${Number(r.precioCompra).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.vidaUtilAnios ? `${r.vidaUtilAnios} años` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.activo ? 'default' : 'secondary'}>
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => abrirEditar(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleEliminar(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
