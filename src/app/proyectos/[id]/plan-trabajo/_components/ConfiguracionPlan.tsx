'use client'

// Configuración del documento (prerrequisitos, cabecera y secciones incluidas).
// Abierta mientras se prepara el plan; después se resume en una línea y se
// abre a voluntad. Se abre sola si algo falla (prerrequisito o cabecera
// incompleta).

import { ChevronDown, ChevronRight, Settings2, AlertTriangle } from 'lucide-react'
import type { PlanTrabajo } from '@prisma/client'
import type { PlanPrerrequisitos } from '@/types/planTrabajo'
import { PreRequisitosPanel } from './PreRequisitosPanel'
import { CabeceraEditor } from './CabeceraEditor'
import { TogglesPanel } from './TogglesPanel'

const PRERREQUISITOS: (keyof PlanPrerrequisitos)[] = [
  'clienteCargado', 'cotizacionAprobada', 'organigramaCreado', 'cronogramaPlanificacionExiste',
  'matrizComunicacionCreada', 'serviciosCotizados', 'equiposCotizados', 'tdrAnalizado',
]
const TOGGLES: (keyof PlanTrabajo)[] = ['incluirOrganigrama', 'incluirMatriz', 'incluirCronograma', 'incluirHistogramas', 'incluirTDR']

/** Por qué hay que abrir la configuración (null = todo en orden). */
export function problemaConfiguracion(plan: PlanTrabajo, prerrequisitos: PlanPrerrequisitos): string | null {
  if (!prerrequisitos.puedeGenerar) return 'Faltan prerrequisitos'
  if (!plan.codigoDocumento) return 'Falta el código del documento'
  if (!plan.preparadoPor || !plan.revisadoPor || !plan.aprobadoPor) return 'Faltan firmantes en la cabecera'
  return null
}

interface Props {
  proyectoId: string
  plan: PlanTrabajo
  prerrequisitos: PlanPrerrequisitos
  abierta: boolean
  onToggle: () => void
  onUpdated: () => Promise<void>
}

export function ConfiguracionPlan({ proyectoId, plan, prerrequisitos, abierta, onToggle, onUpdated }: Props) {
  const okPrerreq = PRERREQUISITOS.filter((k) => prerrequisitos[k] === true).length
  const incluidas = TOGGLES.filter((k) => plan[k] === true).length
  const problema = problemaConfiguracion(plan, prerrequisitos)

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-white px-3 py-2 text-left text-xs text-muted-foreground hover:bg-gray-50"
        aria-expanded={abierta}
      >
        {abierta ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <Settings2 className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-gray-700">Configuración del documento</span>
        <span className="text-gray-300">·</span>
        <span className="font-mono">{plan.codigoDocumento || 'sin código'}</span>
        <span className="text-gray-300">·</span>
        <span>Rev {plan.numeroRevision}</span>
        <span className="text-gray-300">·</span>
        <span>{incluidas}/{TOGGLES.length} secciones incluidas</span>
        <span className="text-gray-300">·</span>
        <span className={prerrequisitos.puedeGenerar ? 'text-emerald-600' : 'text-red-600'}>
          Prerrequisitos {okPrerreq}/{PRERREQUISITOS.length}{prerrequisitos.puedeGenerar ? ' ✓' : ''}
        </span>
        {problema && (
          <span className="inline-flex items-center gap-1 font-medium text-red-600">
            <AlertTriangle className="h-3 w-3" />{problema}
          </span>
        )}
        <span className="ml-auto text-blue-600">{abierta ? 'Ocultar' : 'Ver / editar'}</span>
      </button>

      {abierta && (
        <>
          <PreRequisitosPanel prerrequisitos={prerrequisitos} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CabeceraEditor proyectoId={proyectoId} plan={plan} onUpdated={onUpdated} />
            <TogglesPanel proyectoId={proyectoId} plan={plan} onUpdated={onUpdated} />
          </div>
        </>
      )}
    </div>
  )
}
