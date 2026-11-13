'use client'

// ===================================================
// 📁 AvanceRevisionIperc
// 📌 Cuánto del IPERC ya revisó el ingeniero de seguridad.
//
// Revisar 168 filas de a una sin dejar rastro de dónde se quedó uno es la
// forma segura de revisar dos veces lo mismo y ninguna vez lo otro. La marca
// vive solo en la app: el Excel no la lleva.
// ===================================================

import type { IpercFila } from '@/types/iperc'
import { ShieldCheck } from 'lucide-react'

export function AvanceRevisionIperc({ filas }: { filas: IpercFila[] }) {
  if (filas.length === 0) return null

  const hechas = filas.filter(f => !!f.revisadaEn).length
  if (hechas === 0) return null

  const pct = Math.round((hechas / filas.length) * 100)
  const completo = hechas === filas.length

  return (
    <div
      className={`mb-3 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 ${
        completo ? 'border-emerald-300 bg-emerald-50' : 'bg-muted/30'
      }`}
    >
      <ShieldCheck className={`h-4 w-4 shrink-0 ${completo ? 'text-emerald-700' : 'text-muted-foreground'}`} />
      <p className={`text-xs font-medium ${completo ? 'text-emerald-900' : ''}`}>
        {completo
          ? `Las ${filas.length} filas están revisadas`
          : `${hechas} de ${filas.length} filas revisadas`}
      </p>
      <div className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${completo ? 'bg-emerald-500' : 'bg-slate-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}
