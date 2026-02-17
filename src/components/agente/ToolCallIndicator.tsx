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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCallInfo } from '@/lib/agente/types'

const TOOL_LABELS: Record<string, { label: string; completedLabel?: string; icon: typeof Search }> = {
  buscar_equipos_catalogo: { label: 'Buscando equipos en catálogo', icon: Search },
  buscar_servicios_catalogo: { label: 'Buscando servicios en catálogo', icon: Search },
  buscar_gastos_catalogo: { label: 'Buscando gastos en catálogo', icon: Search },
  buscar_clientes: { label: 'Buscando clientes', icon: Search },
  buscar_recursos: { label: 'Buscando recursos', icon: Search },
  buscar_cotizaciones_similares: { label: 'Buscando cotizaciones similares', icon: Search },
  obtener_edts: { label: 'Consultando EDTs', icon: Database },
  obtener_unidades: { label: 'Consultando unidades', icon: Database },
  crear_cotizacion: { label: 'Creando cotización', completedLabel: 'Cotización creada', icon: Plus },
  agregar_equipos: { label: 'Agregando equipos', completedLabel: 'Equipos agregados', icon: Plus },
  agregar_servicios: { label: 'Agregando servicios', completedLabel: 'Servicios agregados', icon: Plus },
  agregar_gastos: { label: 'Agregando gastos', completedLabel: 'Gastos agregados', icon: Plus },
  agregar_condiciones: { label: 'Agregando condiciones', completedLabel: 'Condiciones agregadas', icon: ClipboardList },
  agregar_exclusiones: { label: 'Agregando exclusiones', completedLabel: 'Exclusiones agregadas', icon: ClipboardList },
  recalcular_cotizacion: { label: 'Recalculando totales', completedLabel: 'Totales recalculados', icon: Calculator },
  obtener_resumen_cotizacion: { label: 'Obteniendo resumen', icon: FileText },
  generar_consultas_tdr: { label: 'Generando consultas del TDR', completedLabel: 'Consultas generadas', icon: FileText },
}

function getResultSummary(toolCall: ToolCallInfo): string | null {
  if (toolCall.status !== 'completed' || !toolCall.result) return null
  const r = toolCall.result as Record<string, unknown>

  if (Array.isArray(r)) return `${r.length} resultado(s)`
  if (r.itemsCreados) return `${r.itemsCreados} item(s) creados`
  if (r.codigo) return String(r.codigo)
  if (r.totalConsultas) return `${r.totalConsultas} consulta(s)`
  if (r.condicionesAgregadas) return `${r.condicionesAgregadas} agregada(s)`
  if (r.exclusionesAgregadas) return `${r.exclusionesAgregadas} agregada(s)`
  return null
}

interface Props {
  toolCall: ToolCallInfo
}

export function ToolCallIndicator({ toolCall }: Props) {
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

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border-l-[3px] px-3 py-2 text-xs transition-all duration-300',
        isRunning && 'border-l-blue-500 bg-blue-50/80 text-blue-700',
        isCompleted && 'border-l-green-500 bg-green-50/60 text-green-700',
        isError && 'border-l-red-400 bg-red-50/60 text-red-600'
      )}
    >
      {isRunning ? (
        <div className="flex gap-0.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:300ms]" />
        </div>
      ) : (
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
      )}

      <span className="truncate">{displayLabel}</span>

      {isRunning && (
        <span className="text-blue-400 ml-auto">...</span>
      )}
      {isCompleted && (
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {summary && <span className="text-green-600/70">{summary}</span>}
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        </div>
      )}
      {isError && (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 ml-auto" />
      )}
    </div>
  )
}
