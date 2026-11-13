'use client'

// Catálogo de EPP de la matriz (MPP), con su foto.
//
// Hasta ahora esto solo se podía tocar editando
// src/lib/mpp/catalogos/eppCatalogo.ts y desplegando, y las fotos vivían
// incrustadas en plantilla-mpp.xlsx ancladas a filas fijas.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft, HardHat, Loader2, Pencil, Plus, Search, ImageOff, LayoutGrid, Table2,
} from 'lucide-react'

interface Epp {
  id: string
  orden: number
  nombre: string
  riesgo: string
  parteCuerpo: string
  durabilidad: string | null
  activo: boolean
  asignacionesDefault: string[]
  puestoIdsDefault: string[]
  catalogoImagen: { id: string; driveFileId: string; nombre: string } | null
  _count: { mppItems: number }
}

interface Puesto {
  id: string
  nombre: string
  categoria: string | null
}

export default function CatalogoEppMatrizPage() {
  const [items, setItems] = useState<Epp[]>([])
  const [puestos, setPuestos] = useState<Puesto[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Partial<Epp> | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [vista, setVista] = useState<'tarjetas' | 'matriz'>('matriz')
  const [marcando, setMarcando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch('/api/seguridad/catalogo-epp-matriz')
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo cargar'); setItems([]); return }
      setItems(d.items ?? [])
      setPuestos(d.puestos ?? [])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!editando) return
    setGuardando(true)
    try {
      const esNuevo = !editando.id
      const r = await fetch('/api/seguridad/catalogo-epp-matriz', {
        method: esNuevo ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo guardar'); return }
      toast.success(esNuevo ? 'EPP agregado' : 'Actualizado')
      setEditando(null)
      await cargar()
    } finally {
      setGuardando(false)
    }
  }

  const q = busqueda.trim().toLowerCase()
  const filtrados = q
    ? items.filter(i =>
        `${i.nombre} ${i.parteCuerpo} ${i.riesgo}`.toLowerCase().includes(q))
    : items

  const partes = [...new Set(items.map(i => i.parteCuerpo))]
  const sinPuestos = items.filter(i => i.puestoIdsDefault.length === 0).length

  return (
    <div className="container mx-auto space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/seguridad">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Seguridad</Button>
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <HardHat className="h-5 w-5 text-amber-600" /> Catálogo EPP — Matriz
          </h1>
        </div>
        <Button size="sm" onClick={() => setEditando({ parteCuerpo: 'OTRO', asignacionesDefault: [], puestoIdsDefault: [] })}>
          <Plus className="mr-1 h-4 w-4" /> Agregar EPP
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Es la base de la matriz de EPP de cada proyecto: los puestos marcados aquí entran
        marcados, y la IA solo agrega encima lo propio del proyecto. Un cambio entra en las
        próximas matrices que se generen; las ya emitidas no se tocan. Los puestos son los del
        organigrama que van a campo, y las fotos salen de la biblioteca de imágenes en Drive.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, parte del cuerpo o riesgo…"
            className="h-8 w-80 pl-7 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtrados.length} de {items.length} · {partes.length} partes del cuerpo
        </span>
        {sinPuestos > 0 && (
          <span className="text-xs text-amber-700">
            {sinPuestos} sin puestos asignados
          </span>
        )}
        <div className="ml-auto flex rounded border">
          <Button
            size="sm" variant={vista === 'matriz' ? 'secondary' : 'ghost'}
            className="h-8 rounded-r-none text-xs"
            onClick={() => setVista('matriz')}
          >
            <Table2 className="mr-1 h-3.5 w-3.5" /> Matriz
          </Button>
          <Button
            size="sm" variant={vista === 'tarjetas' ? 'secondary' : 'ghost'}
            className="h-8 rounded-l-none text-xs"
            onClick={() => setVista('tarjetas')}
          >
            <LayoutGrid className="mr-1 h-3.5 w-3.5" /> Tarjetas
          </Button>
        </div>
      </div>

      {cargando ? (
        <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : vista === 'matriz' ? (
        <MatrizPuestos
          items={filtrados}
          puestos={puestos}
          marcandoId={marcando}
          onEditar={e => setEditando({ ...e })}
          onAlternar={async (epp, puestoId) => {
            const tiene = epp.puestoIdsDefault.includes(puestoId)
            const ids = tiene
              ? epp.puestoIdsDefault.filter(x => x !== puestoId)
              : [...epp.puestoIdsDefault, puestoId]

            // Optimista: la matriz se usa marcando muchas casillas seguidas y
            // esperar la respuesta de cada una la vuelve inusable.
            setItems(prev => prev.map(x => x.id === epp.id ? { ...x, puestoIdsDefault: ids } : x))
            setMarcando(epp.id)
            try {
              const r = await fetch('/api/seguridad/catalogo-epp-matriz', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: epp.id, puestoIdsDefault: ids }),
              })
              if (!r.ok) {
                const d = await r.json().catch(() => ({}))
                toast.error(d.error ?? 'No se pudo guardar')
                setItems(prev => prev.map(x => x.id === epp.id ? epp : x))
              }
            } finally {
              setMarcando(null)
            }
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(e => (
            <Card key={e.id} className={e.activo ? '' : 'opacity-50'}>
              <CardContent className="flex gap-3 py-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-white">
                  {e.catalogoImagen ? (
                    <Image
                      src={`/api/drive/files/${e.catalogoImagen.driveFileId}/content`}
                      alt={e.nombre}
                      width={80}
                      height={80}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <ImageOff className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">
                      <span className="mr-1 font-mono text-[10px] text-muted-foreground">
                        {String(e.orden).padStart(2, '0')}
                      </span>
                      {e.nombre}
                    </p>
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 shrink-0 p-0"
                      onClick={() => setEditando({ ...e })}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">{e.parteCuerpo}</Badge>
                    {e.durabilidad && (
                      <span className="text-[10px] text-muted-foreground">{e.durabilidad}</span>
                    )}
                    {!e.activo && <Badge variant="outline" className="text-[10px]">inactivo</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground" title={e.riesgo}>
                    {e.riesgo}
                  </p>
                  <PuestosDeEpp ids={e.puestoIdsDefault} puestos={puestos} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={v => { if (!v) setEditando(null) }}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editando?.id ? 'Editar EPP' : 'Agregar EPP'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Entra en las próximas matrices que se generen. Las ya emitidas conservan lo suyo.
            </DialogDescription>
          </DialogHeader>

          {editando && (
            <>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                {editando.catalogoImagen && (
                  <div className="flex items-center gap-3 rounded border p-2">
                    <Image
                      src={`/api/drive/files/${editando.catalogoImagen.driveFileId}/content`}
                      alt={editando.nombre ?? ''}
                      width={64}
                      height={64}
                      className="h-16 w-16 object-contain"
                      unoptimized
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Foto en la biblioteca de imágenes. Para cambiarla, súbela en{' '}
                      <Link href="/catalogo/imagenes" className="underline">Biblioteca de Imágenes</Link>.
                    </p>
                  </div>
                )}

                <Campo label="Nombre">
                  <Input
                    className="h-8 text-xs"
                    value={editando.nombre ?? ''}
                    onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                  />
                </Campo>
                <Campo label="Parte del cuerpo">
                  <Input
                    className="h-8 text-xs"
                    list="partes-cuerpo"
                    value={editando.parteCuerpo ?? ''}
                    onChange={e => setEditando({ ...editando, parteCuerpo: e.target.value.toUpperCase() })}
                  />
                  <datalist id="partes-cuerpo">
                    {partes.map(p => <option key={p} value={p} />)}
                  </datalist>
                </Campo>
                <Campo label="Riesgo contra el que protege">
                  <Input
                    className="h-8 text-xs"
                    value={editando.riesgo ?? ''}
                    onChange={e => setEditando({ ...editando, riesgo: e.target.value })}
                  />
                </Campo>
                <Campo label="Durabilidad media">
                  <Input
                    className="h-8 text-xs"
                    placeholder="1 año, 6 meses…"
                    value={editando.durabilidad ?? ''}
                    onChange={e => setEditando({ ...editando, durabilidad: e.target.value })}
                  />
                </Campo>
                <div className="rounded border p-2">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">Puestos que lo usan por defecto</p>
                      <p className="text-[11px] text-muted-foreground">
                        Es la base de la matriz. La IA solo agrega encima lo propio de cada proyecto.
                      </p>
                    </div>
                    <CopiarDe
                      puestos={puestos}
                      items={items}
                      excluir={editando.id}
                      onCopiar={ids => setEditando({ ...editando, puestoIdsDefault: ids })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {puestos.map(p => {
                      const marcado = (editando.puestoIdsDefault ?? []).includes(p.id)
                      return (
                        <label key={p.id} className="flex cursor-pointer items-center gap-1.5 text-[11px]">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={marcado}
                            onChange={() => {
                              const actuales = editando.puestoIdsDefault ?? []
                              setEditando({
                                ...editando,
                                puestoIdsDefault: marcado
                                  ? actuales.filter(x => x !== p.id)
                                  : [...actuales, p.id],
                              })
                            }}
                          />
                          <span className={marcado ? '' : 'text-muted-foreground'}>{p.nombre}</span>
                        </label>
                      )
                    })}
                  </div>

                  {(editando.puestoIdsDefault ?? []).length === 0 && (
                    <p className="mt-2 text-[11px] text-amber-700">
                      Sin ningún puesto, este EPP queda a criterio de la IA en cada proyecto.
                    </p>
                  )}
                </div>

                {editando.id && (
                  <div className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="text-xs font-medium">Activo</p>
                      <p className="text-[11px] text-muted-foreground">
                        Si se desactiva, deja de ofrecerse en las nuevas matrices.
                      </p>
                    </div>
                    <Switch
                      checked={editando.activo ?? true}
                      onCheckedChange={v => setEditando({ ...editando, activo: v })}
                    />
                  </div>
                )}
                {!!editando._count?.mppItems && (
                  <p className="rounded bg-slate-50 p-2 text-[11px] text-muted-foreground">
                    Usado en {editando._count.mppItems} matriz(ces) ya generada(s). Editarlo aquí no
                    las modifica.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>
                  Cancelar
                </Button>
                <Button onClick={guardar} disabled={guardando || !editando.nombre}>
                  {guardando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Los puestos a los que le toca este EPP. Sin ninguno, la celda queda a
 * criterio de la IA en cada proyecto, y eso conviene que se vea.
 */

/**
 * EPP contra puestos, como se lee la matriz del proyecto.
 *
 * En tarjetas los puestos salían en letra chica y cortados en "+3", que
 * alcanza para mirar pero no para trabajar: no se veía qué puesto quedaba sin
 * nada, que es justo lo que hay que llenar.
 */
function MatrizPuestos({
  items, puestos, marcandoId, onAlternar, onEditar,
}: {
  items: Epp[]
  puestos: Puesto[]
  marcandoId: string | null
  onAlternar: (epp: Epp, puestoId: string) => void
  onEditar: (epp: Epp) => void
}) {
  if (puestos.length === 0) {
    return (
      <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
        No hay puestos de campo en el catálogo de puestos.
      </p>
    )
  }

  const porPuesto = new Map(
    puestos.map(p => [p.id, items.filter(i => i.puestoIdsDefault.includes(p.id)).length]),
  )

  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 w-[280px] min-w-[280px] border-b border-r bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">
              EPP
            </th>
            {puestos.map(p => (
              <th
                key={p.id}
                className="border-b border-r bg-gray-50 align-bottom"
                style={{ height: 150, width: 42, minWidth: 42, padding: 0 }}
              >
                <div className="flex h-full flex-col items-center justify-end pb-1.5">
                  <span
                    className="whitespace-nowrap text-[11px] font-medium text-gray-700"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {p.nombre}
                  </span>
                  <span
                    className={`mt-1 text-[9px] tabular-nums ${
                      (porPuesto.get(p.id) ?? 0) === 0 ? 'font-semibold text-amber-700' : 'text-muted-foreground'
                    }`}
                  >
                    {porPuesto.get(p.id) ?? 0}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((e, i) => {
            const sinNada = e.puestoIdsDefault.length === 0
            return (
              <tr key={e.id} className={i % 2 ? 'bg-slate-50/60' : ''}>
                <td
                  className={`sticky left-0 z-10 border-b border-r px-2 py-1 ${
                    i % 2 ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {String(e.orden).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-gray-800" title={e.nombre}>
                      {e.nombre}
                    </span>
                    {sinNada && (
                      <span className="shrink-0 rounded bg-amber-100 px-1 text-[9px] font-semibold text-amber-800">
                        sin puestos
                      </span>
                    )}
                    {marcandoId === e.id && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />}
                    <Button
                      size="sm" variant="ghost" className="h-5 w-5 shrink-0 p-0"
                      onClick={() => onEditar(e)}
                      title="Editar este EPP"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </td>

                {puestos.map(p => {
                  const marcado = e.puestoIdsDefault.includes(p.id)
                  return (
                    <td key={p.id} className="border-b border-r p-0 text-center">
                      <button
                        type="button"
                        onClick={() => onAlternar(e, p.id)}
                        title={`${e.nombre} · ${p.nombre}`}
                        className="flex h-7 w-full items-center justify-center hover:bg-emerald-50"
                      >
                        <span
                          className={`h-3.5 w-3.5 rounded-sm border ${
                            marcado
                              ? 'border-emerald-600 bg-emerald-600'
                              : 'border-gray-300 bg-white'
                          }`}
                        />
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PuestosDeEpp({ ids, puestos }: { ids: string[]; puestos: Puesto[] }) {
  if (ids.length === 0) {
    return (
      <p className="mt-1 text-[10px] text-amber-700">Sin puestos · lo decide la IA</p>
    )
  }

  const nombres = puestos.filter(p => ids.includes(p.id)).map(p => p.nombre)
  const visibles = nombres.slice(0, 3)

  return (
    <p className="mt-1 text-[10px] text-muted-foreground" title={nombres.join(', ')}>
      {visibles.join(' · ')}
      {nombres.length > visibles.length && ` +${nombres.length - visibles.length}`}
    </p>
  )
}

/**
 * Copia los puestos de otro EPP. Llenar los cinco puestos que el catálogo
 * viejo no traía son 52 EPP × varias casillas: casi siempre el de al lado ya
 * tiene la respuesta.
 */
function CopiarDe({
  puestos, items, excluir, onCopiar,
}: {
  puestos: Puesto[]
  items: Epp[]
  excluir?: string
  onCopiar: (ids: string[]) => void
}) {
  const candidatos = items.filter(i => i.id !== excluir && i.puestoIdsDefault.length > 0)
  if (candidatos.length === 0 || puestos.length === 0) return null

  return (
    <select
      className="h-7 max-w-[13rem] rounded border bg-background px-1 text-[11px]"
      value=""
      onChange={e => {
        const origen = candidatos.find(i => i.id === e.target.value)
        if (origen) onCopiar([...origen.puestoIdsDefault])
      }}
    >
      <option value="">Copiar puestos de…</option>
      {candidatos.map(i => (
        <option key={i.id} value={i.id}>
          {i.nombre.slice(0, 40)} ({i.puestoIdsDefault.length})
        </option>
      ))}
    </select>
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
