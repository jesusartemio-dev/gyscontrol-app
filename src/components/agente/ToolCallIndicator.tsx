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
  buscar_equipos_catalogo: { label: 'Buscando equipos en catálogo', completedLabel: 'Equipos encontrados', icon: Search },
  buscar_servicios_catalogo: { label: 'Buscando servicios en catálogo', completedLabel: 'Servicios encontrados', icon: Search },
  buscar_gastos_catalogo: { label: 'Buscando gastos en catálogo', completedLabel: 'Gastos encontrados', icon: Search },
  buscar_clientes: { label: 'Buscando clientes', completedLabel: 'Clientes encontrados', icon: Search },
  buscar_recursos: { label: 'Buscando recursos', completedLabel: 'Recursos encontrados', icon: Search },
  buscar_cotizaciones_similares: { label: 'Buscando cotizaciones similares', completedLabel: 'Cotizaciones encontradas', icon: Search },
  obtener_edts: { label: 'Consultando EDTs', icon: Database },
  obtener_unidades: { label: 'Consultando unidades', icon: Database },
  buscar_proyectos: { label: 'Buscando proyectos', completedLabel: 'Proyectos encontrados', icon: Search },
  obtener_detalle_proyecto: { label: 'Cargando detalle del proyecto', completedLabel: 'Detalle obtenido', icon: Database },
  buscar_listas_equipo: { label: 'Buscando listas de equipo', completedLabel: 'Listas encontradas', icon: Search },
  obtener_cronograma_proyecto: { label: 'Consultando cronograma', completedLabel: 'Cronograma obtenido', icon: Database },
  buscar_ordenes_compra: { label: 'Buscando órdenes de compra', completedLabel: 'Órdenes encontradas', icon: Search },
  crear_cotizacion: { label: 'Creando cotización', completedLabel: 'Cotización creada', icon: Plus },
  agregar_equipos: { label: 'Agregando equipos', completedLabel: 'Equipos agregados', icon: Plus },
  agregar_servicios: { label: 'Agregando servicios', completedLabel: 'Servicios agregados', icon: Plus },
  agregar_gastos: { label: 'Agregando gastos', completedLabel: 'Gastos agregados', icon: Plus },
  agregar_condiciones: { label: 'Agregando condiciones', completedLabel: 'Condiciones agregadas', icon: ClipboardList },
  agregar_exclusiones: { label: 'Agregando exclusiones', completedLabel: 'Exclusiones agregadas', icon: ClipboardList },
  recalcular_cotizacion: { label: 'Recalculando totales', completedLabel: 'Totales recalculados', icon: Calculator },
  obtener_resumen_cotizacion: { label: 'Obteniendo resumen', completedLabel: 'Resumen obtenido', icon: FileText },
  generar_consultas_tdr: { label: 'Analizando documento TDR', completedLabel: 'Análisis completado', icon: FileText },
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
        'flex items-center gap-2 rounded-md border-l-[3px] px-3 py-1.5 text-[11px] transition-all duration-300',
        isRunning && 'border-l-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8]',
        isCompleted && 'border-l-[#16a34a] bg-emerald-50/60 text-emerald-700',
        isError && 'border-l-[#dc2626] bg-red-50/60 text-red-600'
      )}
    >
      {isRunning ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-3 w-3 shrink-0 opacity-60" />
      )}

      <span className="truncate">{displayLabel}</span>

      {isCompleted && (
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {summary && <span className="opacity-70">{summary}</span>}
          <CheckCircle2 className="h-3 w-3 text-[#16a34a]" />
        </div>
      )}
      {isError && (
        <AlertCircle className="h-3 w-3 shrink-0 ml-auto" />
      )}
    </div>
  )
}
