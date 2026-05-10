'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PlanTrabajo } from '@prisma/client'

interface Props {
  proyectoId: string
  plan: PlanTrabajo
  onUpdated: () => Promise<void>
}

const TOGGLES: { key: keyof PlanTrabajo; label: string }[] = [
  { key: 'incluirOrganigrama', label: 'Organigrama' },
  { key: 'incluirMatriz', label: 'Matriz de Com.' },
  { key: 'incluirCronograma', label: 'Cronograma' },
  { key: 'incluirHistogramas', label: 'Histogramas' },
  { key: 'incluirTDR', label: 'Análisis TDR' },
]

export function TogglesPanel({ proyectoId, plan, onUpdated }: Props) {
  const [saving, setSaving] = useState<string | null>(null)

  const handleToggle = async (key: string, value: boolean) => {
    setSaving(key)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error()
      await onUpdated()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <span className="text-sm font-semibold text-gray-700">Secciones incluidas</span>
      <div className="space-y-2">
        {TOGGLES.map(({ key, label }) => {
          const isOn = Boolean(plan[key])
          const isSaving = saving === key
          return (
            <label key={key} className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
              <div className="flex items-center gap-2">
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                <button
                  role="switch"
                  aria-checked={isOn}
                  disabled={isSaving}
                  onClick={() => handleToggle(key as string, !isOn)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    isOn ? 'bg-rose-500' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    isOn ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
