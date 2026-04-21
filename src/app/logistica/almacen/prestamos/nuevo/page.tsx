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

interface Usuario { id: string; name: string | null; email: string }
interface Herramienta {
  id: string
  codigo: string
  nombre: string
  gestionPorUnidad: boolean
  unidadMedida: string
  stock: { cantidadDisponible: number }[]
  unidades: { id: string; estado: string; serie: string }[]
  prestadosActivos: number
}
interface Unidad { id: string; serie: string; estado: string }

export default function NuevoPrestamoPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [herramientas, setHerramientas] = useState<Herramienta[]>([])
  const [unidades, setUnidades] = useState<Record<string, Unidad[]>>({})
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    usuarioId: '',
    proyectoId: '',
    fechaDevolucionEstimada: '',
    observaciones: '',
  })

  const [items, setItems] = useState<{
    key: number
    tipo: 'unidad' | 'cantidad'
    catalogoHerramientaId: string
    herramientaUnidadId: string
    cantidadPrestada: number
  }[]>([])

  useEffect(() => {
    fetch('/api/admin/usuarios').then(r => r.json()).then((d: any) => setUsuarios(d.usuarios || d || [])).catch(() => {})
    fetch('/api/logistica/almacen/herramientas').then(r => r.json()).then(setHerramientas).catch(() => {})
  }, [])

  async function cargarUnidades(herramientaId: string) {
    if (unidades[herramientaId]) return
    const r = await fetch(`/api/logistica/almacen/herramientas/${herramientaId}/unidades`)
    const data = await r.json()
    setUnidades(prev => ({ ...prev, [herramientaId]: data.filter((u: Unidad) => u.estado === 'disponible') }))
  }

  function agregarItem() {
    setItems(prev => [...prev, { key: Date.now(), tipo: 'cantidad', catalogoHerramientaId: '', herramientaUnidadId: '', cantidadPrestada: 1 }])
  }

  function removeItem(key: number) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  async function guardar() {
    if (!form.usuarioId) { toast.error('Selecciona un destinatario'); return }
    if (!items.length) { toast.error('Agrega al menos una herramienta'); return }
    if (items.some(i => !i.catalogoHerramientaId)) { toast.error('Completa todas las herramientas'); return }
    for (const i of items) {
      const h = herramientas.find(x => x.id === i.catalogoHerramientaId)
      if (!h) continue
      if (i.tipo === 'unidad' && !i.herramientaUnidadId) {
        toast.error(`Selecciona la serie para "${h.nombre}"`); return
      }
      if (i.tipo === 'cantidad') {
        const stock = h.stock[0]?.cantidadDisponible ?? 0
        if (i.cantidadPrestada > stock) {
          toast.error(`"${h.nombre}": stock disponible ${stock}, pides ${i.cantidadPrestada}`); return
        }
      }
    }

    setSaving(true)
    try {
      const r = await fetch('/api/logistica/almacen/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          proyectoId: form.proyectoId || null,
          fechaDevolucionEstimada: form.fechaDevolucionEstimada || null,
          items: items.map(i => ({
            catalogoHerramientaId: i.tipo === 'cantidad' ? i.catalogoHerramientaId : null,
            herramientaUnidadId: i.tipo === 'unidad' ? i.herramientaUnidadId : null,
            cantidadPrestada: i.cantidadPrestada,
          })),
        }),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error'); return }
      toast.success('Préstamo registrado')
      router.push('/logistica/almacen/prestamos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Nuevo Préstamo</h1>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Destinatario</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Persona *</Label>
            <Select value={form.usuarioId} onValueChange={v => setForm(f => ({ ...f, usuarioId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
              <SelectContent>
                {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha devolución estimada</Label>
            <Input type="date" value={form.fechaDevolucionEstimada}
              onChange={e => setForm(f => ({ ...f, fechaDevolucionEstimada: e.target.value }))} />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Input value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Herramientas</CardTitle>
          <Button size="sm" variant="outline" onClick={agregarItem}><Plus className="mr-1 h-3 w-3" /> Agregar</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, idx) => {
            const herr = herramientas.find(h => h.id === item.catalogoHerramientaId)
            const stockBulk = herr && !herr.gestionPorUnidad ? (herr.stock[0]?.cantidadDisponible ?? 0) : 0
            const unidadesDisp = herr?.gestionPorUnidad ? herr.unidades.filter(u => u.estado === 'disponible').length : 0
            const excedeStock = !herr?.gestionPorUnidad && item.cantidadPrestada > stockBulk
            return (
              <div key={item.key} className="rounded border p-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Herramienta</Label>
                    <Select value={item.catalogoHerramientaId} onValueChange={v => {
                      const h = herramientas.find(x => x.id === v)
                      const tipo = h?.gestionPorUnidad ? 'unidad' : 'cantidad'
                      if (h?.gestionPorUnidad) cargarUnidades(v)
                      setItems(prev => prev.map((i, ii) => ii === idx ? { ...i, catalogoHerramientaId: v, tipo, herramientaUnidadId: '', cantidadPrestada: 1 } : i))
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {herramientas.map(h => {
                          const disp = h.gestionPorUnidad
                            ? h.unidades.filter(u => u.estado === 'disponible').length
                            : (h.stock[0]?.cantidadDisponible ?? 0)
                          return (
                            <SelectItem key={h.id} value={h.id} disabled={disp === 0}>
                              {h.codigo} — {h.nombre} <span className="text-muted-foreground">({disp} disp.)</span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  {herr?.gestionPorUnidad ? (
                    <div className="w-40">
                      <Label className="text-xs">Serie</Label>
                      <Select value={item.herramientaUnidadId} onValueChange={v =>
                        setItems(prev => prev.map((i, ii) => ii === idx ? { ...i, herramientaUnidadId: v } : i))
                      }>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Serie" /></SelectTrigger>
                        <SelectContent>
                          {(unidades[item.catalogoHerramientaId] || []).map(u =>
                            <SelectItem key={u.id} value={u.id}>{u.serie}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="w-24">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        max={stockBulk || undefined}
                        className={`h-8 text-xs ${excedeStock ? 'border-red-500' : ''}`}
                        value={item.cantidadPrestada}
                        onChange={e => setItems(prev => prev.map((i, ii) => ii === idx ? { ...i, cantidadPrestada: Number(e.target.value) } : i))}
                      />
                    </div>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => removeItem(item.key)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {herr && (
                  <p className={`mt-1 text-[11px] ${excedeStock ? 'text-red-600' : 'text-muted-foreground'}`}>
                    Stock disponible: {herr.gestionPorUnidad ? unidadesDisp : stockBulk}
                    {excedeStock && ' — la cantidad excede el stock'}
                  </p>
                )}
              </div>
            )
          })}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Agrega herramientas al préstamo</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={guardar} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Registrar préstamo
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </div>
  )
}
