'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
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

type FormState = {
  codigoDocumento: string
  numeroRevision: string
  tipoEmision: string
  preparadoPor: string
  preparadoCargo: string
  revisadoPor: string
  revisadoCargo: string
  aprobadoPor: string
  aprobadoCargo: string
}

export function CabeceraEditor({ proyectoId, plan, onUpdated }: Props) {
  const { data: session } = useSession()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)

  const p = plan as unknown as Record<string, string>

  const startEdit = async () => {
    const userName = session?.user?.name ?? session?.user?.email ?? ''
    const defaultForm: FormState = {
      codigoDocumento: plan.codigoDocumento ?? '',
      numeroRevision: plan.numeroRevision ?? 'A',
      tipoEmision: plan.tipoEmision ?? 'B - Para Revisión',
      preparadoPor:    p.preparadoPor    || userName,
      preparadoCargo:  p.preparadoCargo  || 'Ing. de Proyectos',
      revisadoPor:     p.revisadoPor     || 'Heber Conza',
      revisadoCargo:   p.revisadoCargo   || 'Coordinador Ingeniería',
      aprobadoPor:     p.aprobadoPor     || 'Jesus Mamani',
      aprobadoCargo:   p.aprobadoCargo   || 'Gerente de Proyecto',
    }
    setForm(defaultForm)
    setEditing(true)

    // Si algún firmante estaba vacío en la DB, guardar los defaults automáticamente
    const firmantesFaltantes = !p.preparadoPor || !p.revisadoPor || !p.aprobadoPor
    if (firmantesFaltantes) {
      try {
        const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultForm),
        })
        if (res.ok) {
          await onUpdated()
          toast.success('Firmantes guardados por defecto — podés editarlos')
        }
      } catch {
        // silencioso: el usuario puede guardar manualmente
      }
    }
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => f ? { ...f, [key]: e.target.value } : f)

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
        <span className="text-sm font-semibold text-gray-700">Cabecera del Documento</span>
        {!editing ? (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEdit} title="Editar cabecera">
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

      {editing && form ? (
        <div className="space-y-4">
          {/* Identificación */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Identificación</p>
            <div>
              <Label className="text-xs">Código documento</Label>
              <Input value={form.codigoDocumento} onChange={set('codigoDocumento')} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Revisión</Label>
                <Input value={form.numeroRevision} onChange={set('numeroRevision')} className="h-8 text-sm" maxLength={4} />
              </div>
              <div>
                <Label className="text-xs">Tipo de emisión</Label>
                <select
                  value={form.tipoEmision}
                  onChange={set('tipoEmision')}
                  className="w-full h-8 text-xs border rounded-md px-2 bg-white"
                >
                  {TIPOS_EMISION.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Firmantes */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Firmantes</p>
            {([
              ['preparadoPor', 'preparadoCargo', 'Preparado por'],
              ['revisadoPor',  'revisadoCargo',  'Revisado por'],
              ['aprobadoPor',  'aprobadoCargo',  'Aprobado por'],
            ] as [keyof FormState, keyof FormState, string][]).map(([nombreKey, cargoKey, label]) => (
              <div key={nombreKey} className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{label}</Label>
                  <Input value={form[nombreKey]} onChange={set(nombreKey)} className="h-8 text-sm" placeholder="Nombre" />
                </div>
                <div>
                  <Label className="text-xs">Cargo</Label>
                  <Input value={form[cargoKey]} onChange={set(cargoKey)} className="h-8 text-sm" placeholder="Cargo" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Identificación — vista */}
          <div className="grid grid-cols-1 gap-1.5">
            <Row label="Código" value={plan.codigoDocumento} />
            <Row label="Revisión" value={plan.numeroRevision} mono />
            <Row label="Tipo emisión" value={plan.tipoEmision} />
          </div>

          {/* Firmantes — vista */}
          {(p.preparadoPor || p.revisadoPor || p.aprobadoPor) ? (
            <div className="border-t pt-2 grid grid-cols-1 gap-1.5">
              {p.preparadoPor && <Row label="Preparado por" value={`${p.preparadoPor}${p.preparadoCargo ? ` · ${p.preparadoCargo}` : ''}`} />}
              {p.revisadoPor  && <Row label="Revisado por"  value={`${p.revisadoPor}${p.revisadoCargo   ? ` · ${p.revisadoCargo}`   : ''}`} />}
              {p.aprobadoPor  && <Row label="Aprobado por"  value={`${p.aprobadoPor}${p.aprobadoCargo   ? ` · ${p.aprobadoCargo}`   : ''}`} />}
            </div>
          ) : (
            <p className="text-xs text-amber-600 italic border-t pt-2">
              Completá los firmantes antes de exportar — hacé click en el lápiz ✏️.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}:</span>
      <span className={`text-xs ${mono ? 'font-mono' : ''} ${!value ? 'text-muted-foreground italic' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}
