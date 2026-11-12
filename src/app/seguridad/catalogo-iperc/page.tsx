'use client'

// Catálogo del IPERC: peligros, controles y matriz de riesgo.
//
// Antes vivían como constantes del código y corregir un dato exigía commit,
// deploy y un script sobre lo ya generado. Aquí los edita el especialista
// SSOMA y la siguiente generación los toma.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ArrowLeft, Loader2, Pencil, Plus, Search, Trash2, ShieldAlert } from 'lucide-react'

type Tipo = 'peligros' | 'controles' | 'matriz'

interface Peligro {
  id: string; categoria: string; peligro: string; riesgo: string
  consecuencia: string; activo: boolean; orden: number
}
interface Control {
  id: string; tipoPeligro: string; jerarquia: string; texto: string
  activo: boolean; orden: number
}
interface Matriz {
  id: string; severidad: number; probabilidad: string; valor: number; nivel: string
}

const CATEGORIAS = ['MECÁNICO', 'LOCATIVO', 'ELÉCTRICO', 'FÍSICO', 'QUÍMICO', 'ERGONÓMICO', 'PSICOSOCIAL', 'BIOLÓGICO', 'FISICOQUÍMICO']
const TIPOS_CONTROL = ['BIOLÓGICO', 'FÍSICO', 'QUÍMICO', 'BIOMECÁNICO', 'CONDICIONES DE SEGURIDAD', 'PSICOSOCIAL', 'FENOMENOS NATURALES']
const JERARQUIAS = ['eliminar', 'sustituir', 'ingenieria', 'administrativo', 'epp']
const NIVELES = ['ALTO', 'MEDIO', 'BAJO']

const colorNivel: Record<string, string> = {
  ALTO: 'bg-red-600 text-white',
  MEDIO: 'bg-amber-300 text-amber-950',
  BAJO: 'bg-emerald-600 text-white',
}

export default function CatalogoIpercPage() {
  const [tipo, setTipo] = useState<Tipo>('peligros')
  const [items, setItems] = useState<Array<Peligro | Control | Matriz>>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Record<string, unknown> | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async (t: Tipo) => {
    setCargando(true)
    try {
      const r = await fetch(`/api/seguridad/catalogo-iperc?tipo=${t}`)
      const d = await r.json()
      setItems(r.ok ? (d.items ?? []) : [])
      if (!r.ok) toast.error(d.error ?? 'No se pudo cargar el catálogo')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar(tipo) }, [tipo, cargar])

  const guardar = async () => {
    if (!editando) return
    setGuardando(true)
    try {
      const esNuevo = !editando.id
      const r = await fetch(`/api/seguridad/catalogo-iperc?tipo=${tipo}`, {
        method: esNuevo ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo guardar'); return }
      toast.success(esNuevo ? 'Agregado al catálogo' : 'Actualizado')
      setEditando(null)
      await cargar(tipo)
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (id: string) => {
    if (!confirm('¿Quitar esta entrada del catálogo? Los IPERC ya generados no cambian.')) return
    const r = await fetch(`/api/seguridad/catalogo-iperc?tipo=${tipo}&id=${id}`, { method: 'DELETE' })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { toast.error(d.error ?? 'No se pudo borrar'); return }
    toast.success('Quitado del catálogo')
    await cargar(tipo)
  }

  const q = busqueda.trim().toLowerCase()
  const filtrados = q
    ? items.filter(i => JSON.stringify(i).toLowerCase().includes(q))
    : items

  return (
    <div className="container mx-auto space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/seguridad">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Seguridad</Button>
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldAlert className="h-5 w-5 text-amber-600" /> Catálogo IPERC
          </h1>
        </div>
        {tipo !== 'matriz' && (
          <Button size="sm" onClick={() => setEditando({})}>
            <Plus className="mr-1 h-4 w-4" /> Agregar
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Lo que hay aquí es lo que la IA usa como base al generar un IPERC, y lo que el Excel
        consulta para el nivel de riesgo. Un cambio aplica a las próximas generaciones; los IPERC
        ya emitidos no se tocan.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border text-xs">
          {([
            ['peligros', 'Peligros'],
            ['controles', 'Controles'],
            ['matriz', 'Matriz de riesgo'],
          ] as Array<[Tipo, string]>).map(([t, label]) => (
            <button
              key={t}
              onClick={() => { setTipo(t); setBusqueda('') }}
              className={`px-3 py-1.5 transition-colors ${
                tipo === t ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="h-8 w-64 pl-7 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtrados.length} de {items.length}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {tipo === 'peligros' && <>
                    <TableHead className="w-32">Categoría</TableHead>
                    <TableHead>Peligro</TableHead>
                    <TableHead>Riesgo</TableHead>
                    <TableHead>Consecuencia</TableHead>
                  </>}
                  {tipo === 'controles' && <>
                    <TableHead className="w-44">Tipo de peligro</TableHead>
                    <TableHead className="w-28">Jerarquía</TableHead>
                    <TableHead>Control</TableHead>
                  </>}
                  {tipo === 'matriz' && <>
                    <TableHead className="w-24 text-center">Severidad</TableHead>
                    <TableHead className="w-28 text-center">Probabilidad</TableHead>
                    <TableHead className="w-20 text-center">Índice</TableHead>
                    <TableHead className="w-28">Nivel</TableHead>
                  </>}
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(i => {
                  const inactivo = 'activo' in i && !i.activo
                  return (
                    <TableRow key={i.id} className={inactivo ? 'opacity-50' : ''}>
                      {tipo === 'peligros' && (() => {
                        const p = i as Peligro
                        return <>
                          <TableCell><Badge variant="outline" className="text-[10px]">{p.categoria}</Badge></TableCell>
                          <TableCell className="text-xs font-medium">{p.peligro}</TableCell>
                          <TableCell className="text-xs">{p.riesgo}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.consecuencia}</TableCell>
                        </>
                      })()}
                      {tipo === 'controles' && (() => {
                        const c = i as Control
                        return <>
                          <TableCell><Badge variant="outline" className="text-[10px]">{c.tipoPeligro}</Badge></TableCell>
                          <TableCell className="text-xs font-medium">{c.jerarquia}</TableCell>
                          <TableCell className="text-xs">{c.texto}</TableCell>
                        </>
                      })()}
                      {tipo === 'matriz' && (() => {
                        const m = i as Matriz
                        return <>
                          <TableCell className="text-center font-mono text-xs">{m.severidad}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{m.probabilidad}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{m.valor}</TableCell>
                          <TableCell>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${colorNivel[m.nivel] ?? ''}`}>
                              {m.nivel}
                            </span>
                          </TableCell>
                        </>
                      })()}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => setEditando({ ...i })}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {tipo !== 'matriz' && (
                            <Button
                              size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                              onClick={() => borrar(i.id)}
                              title="Quitar del catálogo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={v => { if (!v) setEditando(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editando?.id ? 'Editar' : 'Agregar'} — {tipo}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Aplica a las próximas generaciones. Los IPERC ya emitidos conservan su texto.
            </DialogDescription>
          </DialogHeader>

          {editando && (
            <div className="space-y-2.5">
              {tipo === 'peligros' && <>
                <Campo label="Categoría">
                  <Select
                    value={String(editando.categoria ?? '')}
                    onValueChange={v => setEditando({ ...editando, categoria: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Elegir…" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo label="Peligro"><Texto v={editando} k="peligro" set={setEditando} /></Campo>
                <Campo label="Riesgo"><Texto v={editando} k="riesgo" set={setEditando} /></Campo>
                <Campo label="Consecuencia"><Texto v={editando} k="consecuencia" set={setEditando} /></Campo>
              </>}

              {tipo === 'controles' && <>
                <Campo label="Tipo de peligro">
                  <Select
                    value={String(editando.tipoPeligro ?? '')}
                    onValueChange={v => setEditando({ ...editando, tipoPeligro: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Elegir…" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_CONTROL.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo label="Jerarquía">
                  <Select
                    value={String(editando.jerarquia ?? '')}
                    onValueChange={v => setEditando({ ...editando, jerarquia: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Elegir…" /></SelectTrigger>
                    <SelectContent>
                      {JERARQUIAS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo label="Control"><Texto v={editando} k="texto" set={setEditando} /></Campo>
              </>}

              {tipo === 'matriz' && <>
                <p className="rounded bg-slate-50 p-2 text-[11px] text-muted-foreground">
                  Severidad {String(editando.severidad)} × probabilidad {String(editando.probabilidad)}.
                  La combinación no se cambia; sí su índice y su nivel.
                </p>
                <Campo label="Índice (1-25)">
                  <Input
                    type="number" min={1} max={25} className="h-8 text-xs"
                    value={String(editando.valor ?? '')}
                    onChange={e => setEditando({ ...editando, valor: Number(e.target.value) })}
                  />
                </Campo>
                <Campo label="Nivel">
                  <Select
                    value={String(editando.nivel ?? '')}
                    onValueChange={v => setEditando({ ...editando, nivel: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NIVELES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Campo>
              </>}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</Button>
                <Button onClick={guardar} disabled={guardando}>
                  {guardando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}

function Texto({
  v, k, set,
}: {
  v: Record<string, unknown>
  k: string
  set: (x: Record<string, unknown>) => void
}) {
  return (
    <Input
      className="h-8 text-xs"
      value={String(v[k] ?? '')}
      onChange={e => set({ ...v, [k]: e.target.value })}
    />
  )
}
