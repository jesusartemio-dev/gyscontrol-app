'use client'

import {
  CheckCircle2,
  AlertCircle,
  Search,
  Database,
  Plus,
  Calculator,
  FileText,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCallInfo } from '@/lib/agente/types'

const TOOL_LABELS: Record<string, { label: string; completedLabel?: string; icon: typeof Search }> = {
  buscar_equipos_catalogo: { label: 'Buscando equipos en catalogo', completedLabel: 'Equipos encontrados', icon: Search },
  buscar_servicios_catalogo: { label: 'Buscando servicios en catalogo', completedLabel: 'Servicios encontrados', icon: Search },
  buscar_gastos_catalogo: { label: 'Buscando gastos en catalogo', completedLabel: 'Gastos encontrados', icon: Search },
  buscar_clientes: { label: 'Buscando clientes', completedLabel: 'Clientes encontrados', icon: Search },
  buscar_recursos: { label: 'Buscando recursos', completedLabel: 'Recursos encontrados', icon: Search },
  buscar_cotizaciones_similares: { label: 'Buscando cotizaciones similares', completedLabel: 'Cotizaciones encontradas', icon: Search },
  obtener_edts: { label: 'Consultando EDTs', icon: Database },
  obtener_unidades: { label: 'Consultando unidades', icon: Database },
  buscar_proyectos: { label: 'Buscando proyectos', completedLabel: 'Proyectos encontrados', icon: Search },
  obtener_detalle_proyecto: { label: 'Cargando detalle del proyecto', completedLabel: 'Detalle obtenido', icon: Database },
  buscar_listas_equipo: { label: 'Buscando listas de equipo', completedLabel: 'Listas encontradas', icon: Search },
  obtener_cronograma_proyecto: { label: 'Consultando cronograma', completedLabel: 'Cronograma obtenido', icon: Database },
  buscar_ordenes_compra: { label: 'Buscando ordenes de compra', completedLabel: 'Ordenes encontradas', icon: Search },
  crear_cotizacion: { label: 'Creando cotizacion', completedLabel: 'Cotizacion creada', icon: Plus },
  agregar_equipos: { label: 'Agregando equipos', completedLabel: 'Equipos agregados', icon: Plus },
  agregar_servicios: { label: 'Agregando servicios', completedLabel: 'Servicios agregados', icon: Plus },
  agregar_gastos: { label: 'Agregando gastos', completedLabel: 'Gastos agregados', icon: Plus },
  agregar_condiciones: { label: 'Agregando condiciones', completedLabel: 'Condiciones agregadas', icon: ClipboardList },
  agregar_exclusiones: { label: 'Agregando exclusiones', completedLabel: 'Exclusiones agregadas', icon: ClipboardList },
  recalcular_cotizacion: { label: 'Recalculando totales', completedLabel: 'Totales recalculados', icon: Calculator },
  obtener_resumen_cotizacion: { label: 'Obteniendo resumen', completedLabel: 'Resumen obtenido', icon: FileText },
  generar_consultas_tdr: { label: 'Analizando documento TDR', completedLabel: 'Analisis completado', icon: FileText },
}

function getResultSummary(toolCall: ToolCallInfo): string | null {
  if (toolCall.status !== 'completed' || !toolCall.result) return null
  const r = toolCall.result as Record<string, unknown>

  if (Array.isArray(r)) return `${r.length} resultado(s)`
  if (r.itemsCreados) return `${r.itemsCreados} item(s)`
  if (r.codigo) return String(r.codigo)
  if (r.totalConsultas) return `${r.totalConsultas} consulta(s)`
  if (r.condicionesAgregadas) return `${r.condicionesAgregadas} agregada(s)`
  if (r.exclusionesAgregadas) return `${r.exclusionesAgregadas} agregada(s)`
  return null
}

interface Props {
  toolCall: ToolCallInfo
  stepNumber?: number
  totalSteps?: number
}

export function ToolCallIndicator({ toolCall, stepNumber, totalSteps }: Props) {
  const toolInfo = TOOL_LABELS[toolCall.name] || {
    label: toolCall.name,
    icon: Database,
  }
  const Icon = toolInfo.icon
  const isRunning = toolCall.status === 'running'
  const isCompleted = toolCall.status === 'completed'
  const isError = toolCall.status === 'error'
  const summary = getResultSummary(toolCall)

  const displayLabel = isCompleted && toolInfo.completedLabel
    ? toolInfo.completedLabel
    : toolInfo.label

  const stepLabel = stepNumber && totalSteps && totalSteps > 1
    ? `${stepNumber}/${totalSteps}`
    : null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] transition-all duration-300',
        isRunning && 'bg-[#eff6ff] text-[#1d4ed8] border border-blue-200',
        isCompleted && 'bg-emerald-50/60 text-emerald-700 border border-emerald-200/60',
        isError && 'bg-red-50/60 text-red-600 border border-red-200/60'
      )}
    >
      {/* Step badge */}
      {stepLabel && (
        <span className={cn(
          'flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold shrink-0',
          isRunning && 'bg-[#2563eb] text-white',
          isCompleted && 'bg-emerald-600 text-white',
          isError && 'bg-red-500 text-white'
        )}>
          {stepLabel}
        </span>
      )}

      {/* Status icon */}
      {isRunning ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : isCompleted ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      )}

      {/* Tool icon + label */}
      <Icon className="h-3 w-3 shrink-0 opacity-50" />
      <span className="truncate font-medium">{displayLabel}</span>

      {/* Result summary */}
      {isCompleted && summary && (
        <span className="ml-auto shrink-0 rounded-full bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
          {summary}
        </span>
      )}
    </div>
  )
}
