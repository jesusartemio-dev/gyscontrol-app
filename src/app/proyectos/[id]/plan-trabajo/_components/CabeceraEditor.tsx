'use client'

import { useState } from 'react'
import { Pencil, Save, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { PlanTrabajo } from '@prisma/client'

interface Props {
  proyectoId: string
  plan: PlanTrabajo
  onUpdated: () => Promise<void>
}

const TIPOS_EMISION = [
  'A - Emitido para Información',
  'B - Para Revisión',
  'C - Emitido para Aprobación',
  'D - Aprobado para Construcción',
]

export function CabeceraEditor({ proyectoId, plan, onUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [codigo, setCodigo] = useState(plan.codigoDocumento ?? '')
  const [revision, setRevision] = useState(plan.numeroRevision ?? 'A')
  const [tipo, setTipo] = useState(plan.tipoEmision ?? 'B - Para Revisión')

  const startEdit = () => {
    setCodigo(plan.codigoDocumento ?? '')
    setRevision(plan.numeroRevision ?? 'A')
    setTipo(plan.tipoEmision ?? 'B - Para Revisión')
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoDocumento: codigo, numeroRevision: revision, tipoEmision: tipo }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al guardar')
      }
      await onUpdated()
      setEditing(false)
      toast.success('Cabecera actualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Identificación del Documento</span>
        {!editing ? (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-green-700" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing(false)} disabled={saving}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Código documento</Label>
            <Input value={codigo} onChange={e => setCodigo(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Revisión</Label>
              <Input value={revision} onChange={e => setRevision(e.target.value)} className="h-8 text-sm" maxLength={4} />
            </div>
            <div>
              <Label className="text-xs">Tipo de emisión</Label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full h-8 text-xs border rounded-md px-2 bg-white"
              >
                {TIPOS_EMISION.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Código:</span>
            <span className="font-mono text-xs">{plan.codigoDocumento ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Revisión:</span>
            <span className="font-mono text-xs">{plan.numeroRevision ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Tipo emisión:</span>
            <span className="text-xs">{plan.tipoEmision ?? '—'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
