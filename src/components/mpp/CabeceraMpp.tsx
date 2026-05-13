'use client'

import { useState } from 'react'
import { Pencil, Save, X, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-300',
  revisado: 'bg-blue-100 text-blue-700 border-blue-300',
  aprobado: 'bg-green-100 text-green-700 border-green-300',
}

type Evaluador = { nombre: string; cargo: string }

interface MppCabecera {
  id: string
  codigoDocumento: string
  revision: string
  area: string
  gerencia: string
  estado: 'borrador' | 'revisado' | 'aprobado'
  evaluadores: Evaluador[]
  observaciones: string
}

interface Props {
  proyectoId: string
  mpp: MppCabecera
  onUpdated: (partial: Partial<MppCabecera>) => void
}

export function CabeceraMpp({ proyectoId, mpp, onUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [codigoDocumento, setCodigoDocumento] = useState(mpp.codigoDocumento)
  const [revision, setRevision] = useState(mpp.revision)
  const [area, setArea] = useState(mpp.area)
  const [gerencia, setGerencia] = useState(mpp.gerencia)
  const [estado, setEstado] = useState(mpp.estado)
  const [evaluadores, setEvaluadores] = useState<Evaluador[]>(mpp.evaluadores ?? [])
  const [observaciones, setObservaciones] = useState(mpp.observaciones)

  const startEdit = () => {
    setCodigoDocumento(mpp.codigoDocumento)
    setRevision(mpp.revision)
    setArea(mpp.area)
    setGerencia(mpp.gerencia)
    setEstado(mpp.estado)
    setEvaluadores(mpp.evaluadores ?? [])
    setObservaciones(mpp.observaciones)
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/mpp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoDocumento,
          revision: revision || undefined,
          area,
          gerencia: gerencia || undefined,
          estado,
          evaluadores: evaluadores.length > 0 ? evaluadores : undefined,
          observaciones: observaciones || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Error al guardar')
      }
      const { mpp: updated } = await res.json()
      onUpdated(updated)
      setEditing(false)
      toast.success('Cabecera MPP actualizada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const addEvaluador = () =>
    setEvaluadores(prev => [...prev, { nombre: '', cargo: '' }])

  const removeEvaluador = (i: number) =>
    setEvaluadores(prev => prev.filter((_, idx) => idx !== i))

  const updateEvaluador = (i: number, field: keyof Evaluador, value: string) =>
    setEvaluadores(prev =>
      prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e))
    )

  if (!editing) {
    const evs = mpp.evaluadores ?? []
    return (
      <div className="flex flex-wrap items-start gap-x-6 gap-y-1 text-sm py-2 px-1">
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{mpp.codigoDocumento}</span>
        {mpp.revision && <span className="text-muted-foreground">Rev. {mpp.revision}</span>}
        <span>{mpp.area}</span>
        {mpp.gerencia && <span className="text-muted-foreground">{mpp.gerencia}</span>}
        <Badge className={ESTADO_COLORS[mpp.estado] ?? ''} variant="outline">
          {mpp.estado}
        </Badge>
        {evs.length > 0 && (
          <span className="text-muted-foreground text-xs">
            {evs.map(e => `${e.nombre} (${e.cargo})`).join(' · ')}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={startEdit} className="h-6 px-2 ml-auto">
          <Pencil className="h-3 w-3 mr-1" />
          Editar
        </Button>
      </div>
    )
  }

  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Código documento</p>
          <Input
            value={codigoDocumento}
            onChange={e => setCodigoDocumento(e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Revisión</p>
          <Input
            value={revision}
            onChange={e => setRevision(e.target.value)}
            className="h-8 text-sm"
            placeholder="01"
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Área</p>
          <Input
            value={area}
            onChange={e => setArea(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Gerencia</p>
          <Input
            value={gerencia}
            onChange={e => setGerencia(e.target.value)}
            className="h-8 text-sm"
            placeholder="PROYECTOS"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">Estado</p>
          <Select value={estado} onValueChange={(v) => setEstado(v as 'borrador' | 'revisado' | 'aprobado')}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="revisado">Revisado</SelectItem>
              <SelectItem value="aprobado">Aprobado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
          <Input
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            className="h-8 text-sm"
            placeholder="Opcional"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted-foreground">Evaluadores</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={addEvaluador}
            disabled={evaluadores.length >= 5}
          >
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>
        <div className="space-y-1.5">
          {evaluadores.map((ev, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={ev.nombre}
                onChange={e => updateEvaluador(i, 'nombre', e.target.value)}
                className="h-7 text-xs flex-1"
                placeholder="Nombre"
              />
              <Input
                value={ev.cargo}
                onChange={e => updateEvaluador(i, 'cargo', e.target.value)}
                className="h-7 text-xs flex-1"
                placeholder="Cargo"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => removeEvaluador(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving} className="h-8">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Guardar
        </Button>
        <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving} className="h-8">
          <X className="h-3.5 w-3.5 mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}
