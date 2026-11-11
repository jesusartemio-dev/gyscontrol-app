'use client'

// "Copiar para IA": copia el texto con todo su contexto (proyecto, fase, EDT,
// actividades y tareas del cronograma, texto actual del plan) y un pedido
// concreto. La respuesta de la IA se pega de vuelta con "Pegar".

import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { copiarTexto } from './CopiarPegarTexto'
import {
  buscarEdtEnCronograma, fechaCorta, horasTxt, mapaNombres, nombreCorto, resumenEdt,
} from '@/lib/planTrabajo/contextoIaAlcance'
import type { PlanTrabajoContexto } from '@/types/planTrabajo'

export function BotonCopiarParaIA({
  obtenerTexto, conEtiqueta = false, className = '',
}: {
  /** Se arma al hacer clic, con lo que haya escrito en ese momento. */
  obtenerTexto: () => string
  conEtiqueta?: boolean
  className?: string
}) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    if (await copiarTexto(obtenerTexto())) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
      toast.success('Copiado con todo el contexto — pégalo en la IA y trae la respuesta con "Pegar"')
    } else {
      toast.error('No se pudo copiar en este navegador')
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-7 gap-1 px-2 text-[11px] ${copiado ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-violet-200 text-violet-700 hover:bg-violet-50'} ${className}`}
      title="Copiar con el contexto del cronograma (fase, EDT, actividades, tareas) para trabajarlo en una IA"
      aria-label="Copiar para IA"
      onClick={copiar}
    >
      {copiado ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      <span className={conEtiqueta ? '' : 'hidden sm:inline'}>{copiado ? 'Copiado' : 'Copiar para IA'}</span>
    </Button>
  )
}

/**
 * "Del cronograma": las actividades y tareas reales del EDT (solo lectura),
 * con fechas, horas y responsable. Cerrado por defecto con un resumen.
 */
export function DelCronogramaPanel({
  contexto, edtRefId,
}: {
  contexto: PlanTrabajoContexto | null | undefined
  edtRefId: string | undefined
}) {
  const [abierto, setAbierto] = useState(false)
  const enCron = buscarEdtEnCronograma(contexto, edtRefId)
  if (!edtRefId) return null
  if (!enCron) {
    return (
      <p className="rounded-md border border-dashed px-3 py-1.5 text-[11px] text-muted-foreground">
        Del cronograma: este EDT ya no está en el cronograma.
      </p>
    )
  }
  const { fase, edt } = enCron
  const r = resumenEdt(edt)
  const nombres = mapaNombres(contexto)
  const actividades = [...edt.actividades].sort((a, b) => a.orden - b.orden)

  return (
    <div className="rounded-md border border-slate-200 bg-white text-xs">
      <button
        type="button"
        className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-1.5 text-left hover:bg-slate-50"
        onClick={() => setAbierto(a => !a)}
      >
        {abierto ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="font-medium text-slate-700">Del cronograma</span>
        <span className="text-muted-foreground">
          {r.actividades} actividad{r.actividades === 1 ? '' : 'es'} · {r.tareas} tarea{r.tareas === 1 ? '' : 's'}
          {' · '}{fechaCorta(r.inicio)} → {fechaCorta(r.fin)}
          {r.horas ? ` · ${horasTxt(r.horas)}` : ''}
        </span>
      </button>
      {abierto && (
        <div className="space-y-2 border-t px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-700">
            {fase.nombre} › {edt.nombre}{edt.codigoEdt ? ` (${edt.codigoEdt})` : ''}
          </p>
          {actividades.length === 0 && <p className="text-muted-foreground">Sin actividades en el cronograma.</p>}
          {actividades.map(a => (
            <div key={a.id} className="space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-slate-800">{a.nombre}</span>
                <span className="text-[11px] text-muted-foreground">
                  {fechaCorta(a.fechaInicioPlan)} → {fechaCorta(a.fechaFinPlan)}{a.horasPlan ? ` · ${horasTxt(a.horasPlan)}` : ''}
                </span>
              </div>
              <ul className="space-y-0.5 pl-3">
                {[...a.tareas].sort((x, y) => x.orden - y.orden).map(t => {
                  const resp = t.responsableId ? nombres.get(t.responsableId) : undefined
                  return (
                    <li key={t.id} className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
                      <span className="text-slate-700">• {t.nombre}</span>
                      <span className="text-muted-foreground">
                        {fechaCorta(t.fechaInicio)}{fechaCorta(t.fechaFin) !== fechaCorta(t.fechaInicio) ? ` → ${fechaCorta(t.fechaFin)}` : ''}
                        {t.horasEstimadas ? ` · ${horasTxt(t.horasEstimadas)}` : ''}
                        {resp ? ` · ${nombreCorto(resp)}` : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
