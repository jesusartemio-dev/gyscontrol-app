'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Proyecto { id: string; nombre: string; codigo: string }

export default function NuevaDevolucionPage() {
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    proyectoId: '',
    observaciones: '',
  })

  const [items, setItems] = useState<{
    key: number
    catalogoEquipoId: string
    codigo: string
    descripcion: string
    cantidad: number
    estadoItem: string
    observacionesItem: string
  }[]>([])

  useEffect(() => {
    fetch('/api/proyectos?estado=activo&limit=200')
      .then(r => r.json())
      .then((d: any) => setProyectos(d.proyectos || d || []))
      .catch(() => {})
  }, [])

  function agregarItem() {
    setItems(prev => [...prev, {
      key: Date.now(), catalogoEquipoId: '', codigo: '', descripcion: '',
      cantidad: 1, estadoItem: 'bueno', observacionesItem: '',
    }])
  }

  async function guardar() {
    if (!form.proyectoId) { toast.error('Selecciona un proyecto'); return }
    if (!items.length) { toast.error('Agrega al menos un ítem'); return }
    if (items.some(i => !i.catalogoEquipoId)) { toast.error('Completa el código de todos los ítems'); return }

    setSaving(true)
    try {
      const r = await fetch('/api/logistica/almacen/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId: form.proyectoId,
          observaciones: form.observaciones || null,
          items: items.map(i => ({
            catalogoEquipoId: i.catalogoEquipoId,
            cantidad: i.cantidad,
            estadoItem: i.estadoItem,
            observacionesItem: i.observacionesItem || null,
          })),
        }),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error'); return }
      toast.success('Devolución registrada. Stock actualizado.')
      router.push('/logistica/almacen/devoluciones')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Nueva Devolución de Material</h1>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Datos generales</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Proyecto *</Label>
            <Select value={form.proyectoId} onValueChange={v => setForm(f => ({ ...f, proyectoId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
              <SelectContent>
                {proyectos.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observaciones generales</Label>
            <Input value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Ítems devueltos</CardTitle>
          <Button size="sm" variant="outline" onClick={agregarItem}><Plus className="mr-1 h-3 w-3" /> Agregar</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.key} className="space-y-2 rounded border p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">ID Catálogo Equipo *</Label>
                  <Input className="h-8 text-xs" placeholder="ID del item" value={item.catalogoEquipoId}
                    onChange={e => setItems(prev => prev.map((i, ii) => ii === idx ? { ...i, catalogoEquipoId: e.target.value } : i))} />
                </div>
                <div>
                  <Label className="text-xs">Cantidad</Label>
                  <Input type="number" min="0.01" step="0.01" className="h-8 text-xs" value={item.cantidad}
                    onChange={e => setItems(prev => prev.map((i, ii) => ii === idx ? { ...i, cantidad: Number(e.target.value) } : i))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Estado físico</Label>
                  <Select value={item.estadoItem} onValueChange={v =>
                    setItems(prev => prev.map((i, ii) => ii === idx ? { ...i, estadoItem: v } : i))
                  }>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="observado">Observado</SelectItem>
                      <SelectItem value="inutilizable">Inutilizable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Observaciones</Label>
                  <Input className="h-8 text-xs" value={item.observacionesItem}
                    onChange={e => setItems(prev => prev.map((i, ii) => ii === idx ? { ...i, observacionesItem: e.target.value } : i))} />
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setItems(prev => prev.filter((_, ii) => ii !== idx))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Agrega ítems a devolver</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={guardar} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Registrar devolución
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </div>
  )
}
