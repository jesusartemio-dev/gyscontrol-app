'use client'

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { PlanPrerrequisitos } from '@/types/planTrabajo'

interface CheckItem {
  label: string
  ok: boolean
  tipo: 'bloqueante' | 'opcional'
}

function CheckRow({ item }: { item: CheckItem }) {
  if (item.ok) {
    return (
      <li className="flex items-center gap-2 text-xs text-gray-600">
        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        {item.label}
      </li>
    )
  }
  if (item.tipo === 'bloqueante') {
    return (
      <li className="flex items-center gap-2 text-xs text-red-700 font-medium">
        <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
        {item.label}
      </li>
    )
  }
  return (
    <li className="flex items-center gap-2 text-xs text-amber-700">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      {item.label}
    </li>
  )
}

interface Props {
  prerrequisitos: PlanPrerrequisitos
  compact?: boolean
}

export function PreRequisitosPanel({ prerrequisitos }: Props) {
  const requeridos: CheckItem[] = [
    { label: 'Cliente asignado al proyecto', ok: prerrequisitos.clienteCargado, tipo: 'bloqueante' },
    { label: 'Cotización aprobada', ok: prerrequisitos.cotizacionAprobada, tipo: 'bloqueante' },
    { label: 'Organigrama del proyecto', ok: prerrequisitos.organigramaCreado, tipo: 'bloqueante' },
    { label: 'Cronograma de planificación', ok: prerrequisitos.cronogramaPlanificacionExiste, tipo: 'bloqueante' },
  ]

  const opcionales: CheckItem[] = [
    { label: 'Matriz de comunicaciones', ok: prerrequisitos.matrizComunicacionCreada, tipo: 'opcional' },
    { label: 'Servicios cotizados', ok: prerrequisitos.serviciosCotizados, tipo: 'opcional' },
    { label: 'Equipos cotizados', ok: prerrequisitos.equiposCotizados, tipo: 'opcional' },
    { label: 'TDR analizado', ok: prerrequisitos.tdrAnalizado, tipo: 'opcional' },
  ]

  const hayBloqueantes = requeridos.some(r => !r.ok)

  return (
    <div className={`rounded-lg border bg-white p-3 w-full max-w-lg ${hayBloqueantes ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Requeridos
          </p>
          <ul className="space-y-1.5">
            {requeridos.map((item, i) => <CheckRow key={i} item={item} />)}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Opcionales
          </p>
          <ul className="space-y-1.5">
            {opcionales.map((item, i) => <CheckRow key={i} item={item} />)}
          </ul>
        </div>
      </div>
    </div>
  )
}
