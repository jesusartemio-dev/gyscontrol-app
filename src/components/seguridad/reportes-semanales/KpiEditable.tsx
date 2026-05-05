'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  calculado: number | null
  override: number | null | undefined
  onChange: (value: number | null) => void
  disabled?: boolean
  decimals?: boolean
  unit?: string
}

export function KpiEditable({ label, calculado, override, onChange, disabled, decimals, unit }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const displayed = override ?? calculado
  const hasOverride = override != null

  const startEdit = () => {
    setDraft(displayed != null ? String(displayed) : '')
    setEditing(true)
  }

  const commit = () => {
    const n = decimals ? parseFloat(draft) : parseInt(draft, 10)
    if (draft.trim() === '' || isNaN(n)) {
      onChange(null)
    } else {
      onChange(n)
    }
    setEditing(false)
  }

  const reset = () => {
    onChange(null)
    setEditing(false)
  }

  return (
    <div className={cn('rounded-lg border p-3 space-y-1', hasOverride && 'border-orange-300 bg-orange-50/40')}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="h-8 text-lg font-bold w-28"
            step={decimals ? '0.1' : '1'}
            min="0"
          />
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">
            {displayed != null ? (decimals ? displayed.toFixed(1) : displayed) : '—'}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          {!disabled && (
            <div className="ml-auto flex gap-1">
              {hasOverride && (
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={reset} title="Restablecer valor calculado">
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={startEdit} title="Editar">
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
      {hasOverride && calculado != null && (
        <p className="text-[10px] text-orange-600">Auto: {decimals ? calculado.toFixed(1) : calculado}{unit ? ` ${unit}` : ''}</p>
      )}
    </div>
  )
}
