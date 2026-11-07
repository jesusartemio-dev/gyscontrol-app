'use client'

// Separar ítems de una lista en una lista nueva (parte): CJM50-LST-004 → 004B.
// Se usa con listas en Borrador o Por Revisar: los ítems ya validados se quedan
// y avanzan; los pendientes pasan a la parte, que arranca en Borrador.
// Ver /api/lista-equipo/[id]/dividir.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Scissors, GitBranch, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ItemLista {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  verificado?: boolean
}

interface InfoDivision {
  origen: { id: string; codigo: string; nombre: string } | null
  partes: { id: string; codigo: string; nombre: string; estado: string }[]
  puedeDividir: boolean
  siguienteCodigo: string | null
  nombreSugerido: string | null
  items: { id: string; bloqueo: string | null }[]
}

async function cargarInfo(listaId: string): Promise<InfoDivision | null> {
  const r = await fetch(`/api/lista-equipo/${listaId}/dividir`, { cache: 'no-store' })
  return r.ok ? r.json() : null
}

/** "Parte de: CJM50-LST-004" / "Dividida en: 004B, 004C", con enlaces. */
export function ListaDivisionInfo({ listaId, proyectoId, version = 0 }: { listaId: string; proyectoId: string; version?: number }) {
  const [info, setInfo] = useState<InfoDivision | null>(null)
  useEffect(() => { cargarInfo(listaId).then(setInfo).catch(() => setInfo(null)) }, [listaId, version])
  if (!info || (!info.origen && info.partes.length === 0)) return null
  const enlace = (l: { id: string; codigo: string; nombre: string }) => (
    <Link key={l.id} href={`/proyectos/${proyectoId}/listas/${l.id}`} className="font-mono text-blue-600 hover:underline" title={l.nombre}>
      {l.codigo}
    </Link>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
      <GitBranch className="h-3 w-3" />
      {info.origen && <span>Parte de {enlace(info.origen)}</span>}
      {info.partes.length > 0 && (
        <span className="flex flex-wrap items-center gap-1">
          {info.origen ? 'Otras partes:' : 'Dividida en:'}
          {info.partes.map((p, i) => <span key={p.id}>{i > 0 && ', '}{enlace(p)}</span>)}
        </span>
      )}
    </div>
  )
}

export default function SepararListaModal({
  listaId, proyectoId, listaCodigo, items, onSeparada,
}: {
  listaId: string
  proyectoId: string
  listaCodigo: string
  items: ItemLista[]
  onSeparada?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<InfoDivision | null>(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [nombre, setNombre] = useState('')

  const bloqueos = useMemo(() => new Map((info?.items ?? []).map((i) => [i.id, i.bloqueo])), [info])

  // Al abrir: datos frescos; por defecto se marcan los no verificados que se pueden mover.
  useEffect(() => {
    if (!open) return
    setCargando(true)
    cargarInfo(listaId)
      .then((d) => {
        setInfo(d)
        setNombre(d?.nombreSugerido ?? '')
        const libres = new Map((d?.items ?? []).map((i) => [i.id, i.bloqueo]))
        setSeleccion(new Set(items.filter((i) => !i.verificado && !libres.get(i.id)).map((i) => i.id)))
      })
      .catch(() => toast.error('No se pudo cargar la información de la lista'))
      .finally(() => setCargando(false))
  }, [open, listaId, items])

  const alternar = (id: string, marcado: boolean) => {
    setSeleccion((s) => {
      const n = new Set(s)
      if (marcado) n.add(id)
      else n.delete(id)
      return n
    })
  }

  const quedan = items.length - seleccion.size
  const separar = async () => {
    setGuardando(true)
    try {
      const r = await fetch(`/api/lista-equipo/${listaId}/dividir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [...seleccion], nombre }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'No se pudo separar la lista')
      toast.success(`${seleccion.size} ítem(s) separados a ${j.codigo}`, {
        action: { label: 'Abrir', onClick: () => router.push(`/proyectos/${proyectoId}/listas/${j.id}`) },
        duration: 10000,
      })
      setOpen(false)
      onSeparada?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo separar la lista')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="h-7 text-xs" title="Pasar ítems (p. ej. los pendientes de validar) a una lista nueva">
        <Scissors className="h-3 w-3 mr-1" />
        Separar ítems
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Separar ítems de {listaCodigo}</DialogTitle>
            <DialogDescription>
              Los ítems marcados pasan a una lista nueva en Borrador. El resto se queda en {listaCodigo} y puede avanzar.
              Por defecto se marcan los no verificados.
            </DialogDescription>
          </DialogHeader>

          {cargando || !info ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !info.puedeDividir ? (
            <p className="py-4 text-sm text-muted-foreground">
              Solo se puede separar una lista en Borrador o Por Revisar, con permiso para moverla en ese estado.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
                <Label className="text-xs">Código</Label>
                <span className="font-mono text-sm">{info.siguienteCodigo ?? '—'}</span>
                <Label htmlFor="nombre-parte" className="text-xs">Nombre</Label>
                <Input id="nombre-parte" value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="max-h-[50dvh] overflow-auto rounded border">
                {items.map((i) => {
                  const bloqueo = bloqueos.get(i.id)
                  return (
                    <label
                      key={i.id}
                      className={`flex items-start gap-2 border-b px-2 py-1.5 last:border-0 ${bloqueo ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted/50'}`}
                    >
                      <Checkbox
                        checked={seleccion.has(i.id)}
                        disabled={!!bloqueo}
                        onCheckedChange={(v) => alternar(i.id, v === true)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug line-clamp-2">{i.descripcion}</p>
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-mono">{i.codigo}</span> · {i.cantidad} {i.unidad}
                          {i.verificado ? <span className="text-green-600"> · verificado</span> : <span className="text-amber-600"> · sin verificar</span>}
                          {bloqueo && <span className="text-red-600"> · {bloqueo}: no se puede mover</span>}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Se mueven <strong>{seleccion.size}</strong> · quedan <strong>{quedan}</strong> en {listaCodigo}
                {quedan === 0 && <span className="text-red-600"> (debe quedar al menos uno)</span>}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={guardando}>Cancelar</Button>
            <Button
              size="sm"
              onClick={separar}
              disabled={guardando || cargando || !info?.puedeDividir || seleccion.size === 0 || quedan === 0 || !nombre.trim()}
            >
              {guardando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Separar {seleccion.size} a {info?.siguienteCodigo ?? '…'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
