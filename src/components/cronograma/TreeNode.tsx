// ===================================================
// 📁 Archivo: TreeNode.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Componente individual para nodos del árbol jerárquico
// ✅ Expansión/colapso, acciones contextuales, indicadores visuales
// ===================================================

import React from 'react'
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, Settings2, Download, Users, UserCheck, Wrench, Copy, GripVertical, ArrowUpToLine, ArrowDownToLine, ArrowRightLeft, ArrowRightToLine, Columns2, ArrowDown, ArrowRight, ArrowLeft, Layers, Diamond, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { TreeNode as TreeNodeType, NodeType } from './types'
import { TreeNodeProgress } from './TreeNodeProgress'

interface RelacionAnterior {
  tipo: 'secuencia' | 'paralelo' | 'solape' | 'hueco' | 'antes'
  /** Tiempo laborable libre (solo hueco): horas, y días si es ≥ 1 jornada. */
  horas?: number
  dias?: number
  anteriorNombre: string
}

/**
 * Cómo se ubica el elemento respecto al que está justo arriba en su nivel
 * (lo calcula la API del árbol con el calendario del proyecto). Es solo
 * informativo: no hay dependencia guardada entre ambos.
 */
function RelacionAnteriorIcono({ relacion }: { relacion?: RelacionAnterior }) {
  if (!relacion) return <span className="w-3 shrink-0" />
  const nombre = `"${relacion.anteriorNombre}"`
  const clase = 'h-3 w-3 shrink-0'
  switch (relacion.tipo) {
    case 'secuencia':
      return <span title={`Empieza en cuanto termina ${nombre}`}><ArrowRight className={`${clase} text-blue-500`} /></span>
    case 'paralelo':
      return <span title={`Empieza junto con ${nombre} (en paralelo)`}><Columns2 className={`${clase} text-emerald-600`} /></span>
    case 'solape':
      return <span title={`Empieza antes de que termine ${nombre} (se solapan)`}><Layers className={`${clase} text-amber-500`} /></span>
    case 'hueco': {
      const texto = relacion.dias ? `${relacion.dias}d` : `${relacion.horas ?? 0}h`
      const detalle = relacion.dias ? `${relacion.dias} día(s) laborable(s)` : `${relacion.horas ?? 0} hora(s) laborable(s)`
      return (
        <span className="shrink-0 text-[9px] font-medium text-gray-400" title={`${detalle} libre(s) después de ${nombre}`}>
          +{texto}
        </span>
      )
    }
    case 'antes':
      return <span title={`Empieza antes que ${nombre}, que está arriba en la lista (no están en orden de fecha)`}><ArrowLeft className={`${clase} text-rose-400`} /></span>
    default:
      return <span className="w-3 shrink-0" />
  }
}

interface DependenciaNodo {
  nombre: string
  ruta?: string
  tipoTexto?: string
  horasIncumplidas?: number
}

/** Texto del tooltip: predecesoras (←) y sucesoras (→) con su ubicación. */
function textoDependencias(data: { predecesoras?: DependenciaNodo[]; sucesoras?: DependenciaNodo[] }): string {
  const linea = (flecha: string, d: DependenciaNodo) =>
    `${flecha} ${d.nombre} (${d.tipoTexto ?? 'FC'})${d.ruta ? ` · ${d.ruta}` : ''}${
      d.horasIncumplidas ? '  ⚠ no se cumple' : ''}`
  const partes: string[] = []
  if (data.predecesoras?.length) partes.push('Predecesoras:', ...data.predecesoras.map((d) => linea('←', d)))
  if (data.sucesoras?.length) partes.push(`${partes.length ? '\n' : ''}Sucesoras:`, ...data.sucesoras.map((d) => linea('→', d)))
  return partes.join('\n') + '\n\nSe editan en Editar tarea › Predecesoras.'
}

interface TreeNodeProps {
  node: TreeNodeType
  onToggle: () => void
  onAddChild?: (type: NodeType) => void
  onEdit?: () => void
  onDelete?: () => void
  onImport?: () => void
  onSelect: () => void
  isSelected: boolean
  readOnly?: boolean
  executionMode?: boolean
  showRecursoColumn?: boolean
  showResponsableColumn?: boolean
  showPesoColumn?: boolean
  pesoGlobalHH?: number
  pesoParcial?: number
  onAssignResponsable?: () => void
  onAssignRecurso?: () => void
  onDuplicate?: () => void
  onDuplicarActividad?: () => void
  onMoverEdt?: () => void
  onAjustarPosicion?: (posicion: 'inicio_padre' | 'despues_anterior' | 'despues_ultimo') => void
  onProgramarRespecto?: (modo: 'despues_de' | 'en_paralelo') => void
  /** Hay un hermano del mismo tipo justo arriba (habilita "Después del anterior"). */
  tieneAnterior?: boolean
  /** Solo tareas: marcar o quitar como hito ◆. */
  onToggleHito?: () => void
  dragListeners?: Record<string, Function>
  dragAttributes?: Record<string, any>
  isDragging?: boolean
  rowIndex?: number
}

// Redondea a 1 decimal y quita el ".0" sobrante — evita mostrar artefactos de
// punto flotante como "26.599999999999998h" cuando se suman muchas horas con
// decimales (0.1 + 0.2 style). El valor ya debería venir redondeado desde la
// API del árbol, esto es una segunda capa de defensa en el render.
const formatHoras = (n: number): string => {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const NODE_CONFIG: Record<string, { icon: string; color: string; canAdd: NodeType[]; label: string }> = {
  proyecto: {
    icon: '📁',
    color: 'bg-indigo-100 text-indigo-800',
    canAdd: ['fase', 'edt'] as NodeType[],
    label: 'Proyecto'
  },
  fase: {
    icon: '📊',
    color: 'bg-blue-100 text-blue-800',
    canAdd: ['edt'] as NodeType[],
    label: 'Fase'
  },
  edt: {
    icon: '🏗️',
    color: 'bg-green-100 text-green-800',
    canAdd: ['actividad'] as NodeType[],
    label: 'EDT'
  },
  actividad: {
    icon: '⚡',
    color: 'bg-purple-100 text-purple-800',
    canAdd: ['tarea'] as NodeType[],
    label: 'Actividad'
  },
  tarea: {
    icon: '🔧',
    color: 'bg-gray-100 text-gray-800',
    canAdd: [] as NodeType[],
    label: 'Tarea'
  }
}

export function TreeNode({
  node,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
  onImport,
  onSelect,
  isSelected,
  readOnly = false,
  executionMode = false,
  showRecursoColumn,
  showResponsableColumn,
  showPesoColumn,
  pesoGlobalHH,
  pesoParcial,
  onAssignResponsable,
  onAssignRecurso,
  onDuplicate,
  onDuplicarActividad,
  onMoverEdt,
  onAjustarPosicion,
  onProgramarRespecto,
  tieneAnterior,
  onToggleHito,
  dragListeners,
  dragAttributes,
  isDragging,
  rowIndex
}: TreeNodeProps) {
  const config = NODE_CONFIG[node.type]
  const hasChildren = node.metadata.hasChildren
  const isExpanded = node.expanded
  const isLoading = node.loading
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  // Para nodos summary (fases, EDTs, actividades), mostrar horasEstimadas directamente
  // Para nodos hoja (tareas), mostrar horasEstimadas directamente
  // El roll-up GYS-GEN-16 asegura que los nodos summary tengan la suma correcta
  const totalHours = Number(node.data.horasEstimadas) || 0

  // HH real = Work × personas del recurso asignado (nunca personasEstimadas,
  // que es un snapshot manual casi siempre en 1) — calculado server-side en
  // la API del árbol con la misma fórmula que usa Plan de Trabajo
  // (calcularHHRealDeTarea). 0 si la tarea/rama no tiene recurso asignado.
  const totalHorasHombre = Number(node.data.horasHombre) || 0

  // Duración real (días laborables según el calendario del proyecto/empresa,
  // no Lun-Vie a secas) — calculada server-side en la API del árbol, ver
  // `contarDiasLaborables` en `src/lib/utils/calendarioLaboral.ts`.
  const durationDays = Number(node.data.duracionDiasReal) || 0

  // Función para calcular el resumen de eliminación
  const getDeleteSummary = () => {
    const summary = {
      title: `¿Eliminar ${config.label.toLowerCase()} "${node.nombre}"?`,
      description: '',
      details: [] as string[]
    }

    switch (node.type) {
      case 'fase':
        summary.description = 'Esta acción eliminará la fase y todos sus elementos dependientes.'
        if (node.metadata.totalChildren > 0) {
          summary.details.push(`• ${node.metadata.totalChildren} elementos hijos`)
        }
        break
      case 'edt':
        summary.description = 'Esta acción eliminará el EDT y todos sus elementos dependientes.'
        if (node.metadata.totalChildren > 0) {
          summary.details.push(`• ${node.metadata.totalChildren} elementos hijos`)
        }
        break
      case 'actividad':
        summary.description = 'Esta acción eliminará la actividad y todas sus tareas.'
        if (node.metadata.totalChildren > 0) {
          summary.details.push(`• ${node.metadata.totalChildren} tareas`)
        }
        break
      case 'tarea':
        summary.description = 'Esta acción eliminará la tarea permanentemente.'
        break
    }

    return summary
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'completada': return 'bg-green-500'
      case 'in_progress':
      case 'en_progreso':
      case 'en_progreso': return 'bg-yellow-500'
      case 'pending':
      case 'pendiente': return 'bg-gray-500'
      case 'paused':
      case 'pausada': return 'bg-orange-500'
      case 'cancelled':
      case 'cancelada': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Mapear estado para TreeNodeProgress
  const mapStatusForProgress = (status: string): 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled' => {
    switch (status) {
      case 'completada':
      case 'completed': return 'completed'
      case 'en_progreso':
      case 'en_progreso':
      case 'in_progress': return 'in_progress'
      case 'pendiente':
      case 'pending': return 'pending'
      case 'pausada':
      case 'paused': return 'paused'
      case 'cancelada':
      case 'cancelled': return 'cancelled'
      default: return 'pending'
    }
  }

  // Formatear fechas
  const formatDates = () => {
    let fechaInicio: string | null = null
    let fechaFin: string | null = null
    if (node.type === 'tarea') {
      fechaInicio = node.data.fechaInicio
      fechaFin = node.data.fechaFin
    } else {
      fechaInicio = node.data.fechaInicioComercial || node.data.fechaInicioPlan
      fechaFin = node.data.fechaFinComercial || node.data.fechaFinPlan
    }
    const fmt = (d: string | Date) => {
      try {
        const date = typeof d === 'string' ? new Date(d) : d
        if (isNaN(date.getTime())) return ''
        // UTC methods evitan el desfase de zona horaria (UTC-5 Perú)
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
        const day = String(date.getUTCDate()).padStart(2, '0')
        const month = months[date.getUTCMonth()]
        return `${day} ${month}`
      } catch { return '' }
    }
    if (node.type === 'tarea' && node.data?.esHito && fechaInicio) return fmt(fechaInicio)
    if (fechaInicio && fechaFin) return `${fmt(fechaInicio)}–${fmt(fechaFin)}`
    return ''
  }

  // Fecha corta "30 nov" (día UTC, igual que las fechas de la fila).
  const fmtCorta = (d: string | Date) => {
    const date = new Date(d)
    if (isNaN(date.getTime())) return ''
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${String(date.getUTCDate()).padStart(2, '0')} ${months[date.getUTCMonth()]}`
  }
  const esHitoTarea = node.type === 'tarea' && node.data?.esHito === true
  const diasPasadoLimite = Number(node.data?.diasPasadoLimite) || 0

  return (
    <div
      // Seleccionada o con su menú abierto: marca fuerte (fondo + barra azul a
      // la izquierda) para que se vea qué fila se está editando. El hover es
      // más suave para no confundirse con la selección. La barra es un
      // box-shadow para no correr el contenido.
      className={`tree-node group ${isDragging ? 'opacity-40' : ''} ${isSelected || dropdownOpen ? 'bg-blue-200/80 shadow-[inset_4px_0_0_0_#2563eb]' : `${rowIndex != null && rowIndex % 2 === 0 ? 'bg-gray-100' : ''} hover:bg-blue-50`} py-0.5 cursor-pointer transition-colors`}
      onClick={onSelect}
    >
      <div
        className="grid items-center gap-1"
        style={{
          gridTemplateColumns: [
            '1fr', '80px', '65px', '120px', '55px', '55px', '55px',
            ...(showPesoColumn ? ['60px', '60px'] : []),
            ...(showRecursoColumn ? ['100px'] : []),
            ...(showResponsableColumn ? ['100px'] : []),
            '28px',
          ].join(' '),
        }}
      >
        {/* Columna 1: Nombre con indentación */}
        <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${node.level * 16 + 8}px` }}>
          {/* Drag handle — visible on hover when draggable */}
          {dragListeners && (
            <div
              className="opacity-0 group-hover:opacity-40 hover:!opacity-70 cursor-grab active:cursor-grabbing shrink-0 text-gray-400 touch-none"
              {...dragListeners}
              {...dragAttributes}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}
          {/* Toggle button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            disabled={!hasChildren && !isLoading}
          >
            {isLoading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : hasChildren ? (
              isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
            ) : (
              <div className="h-3 w-3" />
            )}
          </Button>

          {/* Node icon and name */}
          <span className="text-xs shrink-0">
            {node.data?.isExtrasGroup ? '✨' : node.data?.esExtra ? '➕' : node.data?.esPropuestaIA ? '🤖' : config.icon}
          </span>
          <span className={`text-xs font-medium truncate ${node.data?.isExtrasGroup ? 'text-amber-700 italic' : 'text-gray-900'}`}>
            {node.nombre}
          </span>

          {/* Código del EDT de catálogo al que está enlazado este EDT */}
          {node.type === 'edt' && node.data?.catalogoEdtCodigo && (
            <Badge
              variant="outline"
              className="text-[10px] leading-none px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 shrink-0"
              title={node.data.catalogoEdtDescripcion || undefined}
            >
              {node.data.catalogoEdtCodigo}
            </Badge>
          )}

          {/* Children count inline */}
          {hasChildren && (
            <span className="text-[10px] text-gray-400 shrink-0">({node.metadata.totalChildren})</span>
          )}

          {/* Indicador de hito (◆) y su fecha límite: dorado si es contractual, rojo si la pasa */}
          {node.data?.esHito && (
            <Badge
              variant="outline"
              className={`text-[10px] leading-none px-1 py-0 h-4 shrink-0 ${
                node.data?.fechaLimite ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-gray-50 text-gray-600 border-gray-300'
              }`}
              title={node.data?.fechaLimite ? 'Hito contractual (tiene fecha límite)' : 'Hito'}
            >
              ◆ Hito
            </Badge>
          )}
          {esHitoTarea && node.data?.fechaLimite && (
            <Badge
              variant="outline"
              className={`text-[10px] leading-none px-1 py-0 h-4 shrink-0 ${
                diasPasadoLimite > 0 ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-gray-600 border-gray-300'
              }`}
              title={diasPasadoLimite > 0
                ? `Pasa la fecha límite por ${diasPasadoLimite} día(s) laborable(s)`
                : 'Fecha límite (comprometida)'}
            >
              Límite {fmtCorta(node.data.fechaLimite)}{diasPasadoLimite > 0 ? ` · +${diasPasadoLimite}d` : ''}
            </Badge>
          )}

          {/* Dependencias guardadas (como la columna Predecesoras de MS Project).
              Rojo si alguna no se cumple: la tarea va antes de lo que exige. */}
          {node.type === 'tarea' && (node.data?.predecesoras?.length || node.data?.sucesoras?.length) ? (
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] leading-none px-1 h-4 rounded border shrink-0 cursor-default ${
                node.data.dependenciaIncumplida ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-gray-500 border-gray-300'
              }`}
              title={textoDependencias(node.data)}
            >
              <Link2 className="h-2.5 w-2.5" />
              {node.data?.predecesoras?.length ?? 0}
              {node.data?.sucesoras?.length ? <span className="text-gray-400">/{node.data.sucesoras.length}</span> : null}
            </span>
          ) : null}

          {/* Badge "Extra" para tareas fuera del cronograma planificado */}
          {node.type === 'tarea' && node.data?.esExtra && (
            <Badge variant="outline" className="text-[10px] leading-none px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-300 shrink-0">
              Extra
            </Badge>
          )}

          {/* Badge "IA" para tareas propuestas por IA sin respaldo de catálogo (nunca se confunde con "Extra") */}
          {node.type === 'tarea' && node.data?.esPropuestaIA && (
            <Badge
              variant="outline"
              className="text-[10px] leading-none px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-300 shrink-0"
              title={node.data?.justificacionIA || 'Tarea propuesta por IA, sin respaldo de catálogo.'}
            >
              IA
            </Badge>
          )}

          {/* Badge para el grupo "Tareas Extras" */}
          {node.data?.isExtrasGroup && (
            <Badge variant="outline" className="text-[10px] leading-none px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-300 shrink-0">
              Fuera del plan
            </Badge>
          )}

        </div>

        {/* Columna 2: Progreso */}
        <div className="flex justify-center">
          <TreeNodeProgress
            percentage={node.metadata.progressPercentage}
            status={mapStatusForProgress(node.metadata.status)}
            size="xs"
          />
        </div>

        {/* Columna 3: Tipo */}
        <div className="flex justify-center">
          {node.data?.isExtrasGroup ? (
            <Badge variant="outline" className="text-[9px] leading-none px-1 py-0 h-4 shrink-0 bg-amber-50 text-amber-700 border-amber-300">
              Extras
            </Badge>
          ) : (
            <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 shrink-0 ${config.color}`}>
              {config.label}
            </Badge>
          )}
        </div>

        {/* Columna 4: Fechas (+ relación con el elemento de arriba) */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-gray-500 min-w-0">
          <RelacionAnteriorIcono relacion={node.data.relacionAnterior} />
          <span className="truncate">{formatDates()}</span>
        </div>

        {/* Columna 5: Duración por horas laborables, como MS Project ("4h", "1.5d", "0d") */}
        <div className="text-right text-[11px] text-gray-500 font-mono pr-1">
          {esHitoTarea ? '0d' : node.data.duracionTexto && node.data.duracionHoras > 0 ? node.data.duracionTexto : node.type === 'tarea' && node.data.duracionTexto ? (
            // Inicio = Fin y no es hito: la duración real es 0 (antes se mostraba
            // "1d" contando días de calendario, y el formulario decía 0d).
            <span className="text-amber-600" title="Inicio y Fin son el mismo instante: duración 0. Si dura un día, pon el Fin al final de la jornada; si es un hito, márcalo como hito.">0d</span>
          ) : durationDays > 0 ? `${durationDays}d` : node.data.duracionDiasReal === 0 ? (
            // Tiene fechas pero no cae en ningún día laborable del calendario
            <span className="text-amber-600" title="Cae solo en días no laborables del calendario del proyecto">0d</span>
          ) : ''}
        </div>

        {/* Columna 6: Work (horasEstimadas) */}
        <div className="text-right text-[11px] text-gray-600 font-mono pr-1">
          {totalHours > 0 ? `${formatHoras(totalHours)}h` : ''}
        </div>

        {/* Columna 7: HH real (horasEstimadas × personas del recurso — nunca personasEstimadas) */}
        <div className="text-right text-[11px] text-gray-700 font-mono pr-1" title="Horas-hombre real: Work × personas del recurso asignado">
          {totalHorasHombre > 0 ? `${formatHoras(totalHorasHombre)}h` : ''}
        </div>

        {/* Columna: Peso Global (hh-hombre, normalizado al proyecto) */}
        {showPesoColumn && (
          <div className="text-right text-[11px] text-indigo-500 font-mono pr-1">
            {pesoGlobalHH != null && pesoGlobalHH > 0 ? `${pesoGlobalHH.toFixed(1)}%` : ''}
          </div>
        )}

        {/* Columna: Peso Parcial (hh dentro del padre inmediato) */}
        {showPesoColumn && (
          <div className="text-right text-[11px] text-violet-600 font-mono pr-1">
            {pesoParcial != null && pesoParcial > 0 ? `${pesoParcial.toFixed(1)}%` : ''}
          </div>
        )}

        {/* Columna: Recurso */}
        {showRecursoColumn && (
          <div className="text-center text-[11px] truncate">
            {node.type === 'tarea' ? (
              node.data.recursoNombre ? (
                <span className="text-green-700 bg-green-50 border border-green-200 rounded px-1 py-0 text-[10px] truncate inline-block max-w-full">
                  {node.data.recursoNombre}
                </span>
              ) : (
                <span className="text-red-400 text-[10px]">Sin asignar</span>
              )
            ) : (
              (node.metadata.recursosTotales ?? 0) > 0 ? (
                (() => {
                  const extrasTotal = node.metadata.recursosExtrasTotales ?? 0
                  const extrasAssigned = node.metadata.recursosExtrasAsignados ?? 0
                  const planTotal = (node.metadata.recursosTotales ?? 0) - extrasTotal
                  const planAssigned = (node.metadata.recursosAsignados ?? 0) - extrasAssigned
                  const badgeColor = (ass: number, tot: number) => {
                    const ratio = tot > 0 ? ass / tot : 0
                    if (ratio >= 1) return 'bg-green-50 text-green-700 border-green-200'
                    if (ratio > 0) return 'bg-amber-50 text-amber-700 border-amber-200'
                    return 'bg-red-50 text-red-600 border-red-200'
                  }
                  return (
                    <span className="inline-flex items-center gap-1">
                      {planTotal > 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium ${badgeColor(planAssigned, planTotal)}`}
                          title={`Plan: ${planAssigned} de ${planTotal} con recurso`}
                        >
                          <Users className="h-2.5 w-2.5" />
                          {planAssigned}/{planTotal}
                        </span>
                      )}
                      {extrasTotal > 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium border-dashed ${badgeColor(extrasAssigned, extrasTotal)}`}
                          title={`Extras: ${extrasAssigned} de ${extrasTotal} con recurso`}
                        >
                          ✨{extrasAssigned}/{extrasTotal}
                        </span>
                      )}
                    </span>
                  )
                })()
              ) : null
            )}
          </div>
        )}

        {/* Columna: Responsable */}
        {showResponsableColumn && (
          <div className="text-center text-[11px] truncate">
            {(node.type === 'tarea' || node.type === 'edt' || node.type === 'actividad') && node.data.responsableNombre ? (
              <span className="text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 py-0 text-[10px] truncate inline-block max-w-full">
                {node.data.responsableNombre}
              </span>
            ) : node.type === 'tarea' ? (
              <span className="text-red-400 text-[10px]">Sin asignar</span>
            ) : (
              (node.metadata.responsablesTotales ?? 0) > 0 ? (
                (() => {
                  const extrasTotal = node.metadata.responsablesExtrasTotales ?? 0
                  const extrasAssigned = node.metadata.responsablesExtrasAsignados ?? 0
                  const planTotal = (node.metadata.responsablesTotales ?? 0) - extrasTotal
                  const planAssigned = (node.metadata.responsablesAsignados ?? 0) - extrasAssigned
                  const badgeColor = (ass: number, tot: number) => {
                    const ratio = tot > 0 ? ass / tot : 0
                    if (ratio >= 1) return 'bg-blue-50 text-blue-700 border-blue-200'
                    if (ratio > 0) return 'bg-amber-50 text-amber-700 border-amber-200'
                    return 'bg-red-50 text-red-600 border-red-200'
                  }
                  return (
                    <span className="inline-flex items-center gap-1">
                      {planTotal > 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium ${badgeColor(planAssigned, planTotal)}`}
                          title={`Plan: ${planAssigned} de ${planTotal} con responsable`}
                        >
                          <Users className="h-2.5 w-2.5" />
                          {planAssigned}/{planTotal}
                        </span>
                      )}
                      {extrasTotal > 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium border-dashed ${badgeColor(extrasAssigned, extrasTotal)}`}
                          title={`Extras: ${extrasAssigned} de ${extrasTotal} con responsable`}
                        >
                          ✨{extrasAssigned}/{extrasTotal}
                        </span>
                      )}
                    </span>
                  )
                })()
              ) : null
            )}
          </div>
        )}

        {/* Columna 8: Acciones */}
        <div className="flex justify-center">
          {node.data?.isExtrasGroup ? (
            // Pseudo-nodo: no se edita ni se borra, solo muestra sus hijos
            <span className="w-5 h-5" />
          ) : (
          <DropdownMenu
            open={dropdownOpen}
            onOpenChange={(open) => {
              setDropdownOpen(open)
              // Abrir el menú también selecciona la fila, así queda marcada
              // mientras se edita en el modal que se abra desde el menú.
              if (open) onSelect()
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700 transition-colors">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Create child options - only if not read-only */}
              {!readOnly && config.canAdd.map(childType => {
                const childLabel = childType === 'fase' ? 'Fase' : childType === 'edt' ? 'EDT' : childType === 'actividad' ? 'Actividad' : childType === 'tarea' ? 'Tarea' : childType
                return (
                  <DropdownMenuItem
                    key={`create-${childType}`}
                    onClick={() => {
                      setDropdownOpen(false)
                      onAddChild?.(childType)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear {childLabel}
                  </DropdownMenuItem>
                )
              })}

              {/* Import option - only if not read-only and for applicable node types */}
              {!readOnly && (node.type === 'proyecto' || node.type === 'fase' || node.type === 'actividad') && (
                <DropdownMenuItem onClick={() => {
                  setDropdownOpen(false)
                  onImport?.()
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  {node.type === 'proyecto' ? 'Importar Fases' : node.type === 'fase' ? 'Importar EDT' : 'Importar Tareas'}
                </DropdownMenuItem>
              )}

              {/* Separator if there are create/import options and more options below */}
              {!readOnly && (config.canAdd.length > 0 || node.type === 'proyecto' || node.type === 'fase' || node.type === 'actividad') && (
                <div className="h-px bg-gray-200 my-1" />
              )}

              {/* Assign Recurso option - for edt/tarea */}
              {!readOnly && onAssignRecurso && (node.type === 'edt' || node.type === 'tarea') && (
                <DropdownMenuItem
                  onClick={() => {
                    setDropdownOpen(false)
                    onAssignRecurso()
                  }}
                  className="text-green-600"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Asignar Recurso
                </DropdownMenuItem>
              )}

              {/* Assign Responsable option - for edt/tarea in execution mode */}
              {!readOnly && onAssignResponsable && (node.type === 'edt' || node.type === 'tarea') && (
                <DropdownMenuItem
                  onClick={() => {
                    setDropdownOpen(false)
                    onAssignResponsable()
                  }}
                  className="text-blue-600"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Asignar Responsable
                </DropdownMenuItem>
              )}

              {/* Separator after assignment options */}
              {!readOnly && (onAssignRecurso || onAssignResponsable) && (node.type === 'edt' || node.type === 'tarea') && (
                <div className="h-px bg-gray-200 my-1" />
              )}

              {/* Edit option - only if not read-only and not proyecto */}
              {!readOnly && node.type !== 'proyecto' && (
                <DropdownMenuItem onClick={() => {
                  setDropdownOpen(false)
                  onEdit?.()
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}

              {/* Duplicate option - only for tareas */}
              {!readOnly && node.type === 'tarea' && onDuplicate && (
                <DropdownMenuItem
                  onClick={() => { setDropdownOpen(false); onDuplicate() }}
                  className="text-blue-600"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Tarea
                </DropdownMenuItem>
              )}

              {/* Duplicate actividad with its tasks */}
              {!readOnly && node.type === 'actividad' && onDuplicarActividad && (
                <DropdownMenuItem
                  onClick={() => { setDropdownOpen(false); onDuplicarActividad() }}
                  className="text-blue-600"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Actividad (con tareas)
                </DropdownMenuItem>
              )}

              {/* Mover a otro EDT - solo actividades */}
              {!readOnly && node.type === 'actividad' && onMoverEdt && (
                <DropdownMenuItem
                  onClick={() => { setDropdownOpen(false); onMoverEdt() }}
                  className="text-blue-600"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Mover a otro EDT
                </DropdownMenuItem>
              )}

              {/* Marcar o quitar hito (Milestone de MS Project): un solo día, sin horas */}
              {!readOnly && node.type === 'tarea' && onToggleHito && (
                <DropdownMenuItem
                  onClick={() => { setDropdownOpen(false); onToggleHito() }}
                  className="text-amber-700"
                >
                  <Diamond className="h-4 w-4 mr-2" />
                  {node.data?.esHito ? 'Quitar hito' : 'Marcar como hito'}
                </DropdownMenuItem>
              )}

              {/* Posición en el tiempo - EDTs, actividades y tareas (se mueven con todo lo que contienen) */}
              {!readOnly && (node.type === 'tarea' || node.type === 'actividad' || node.type === 'edt') && onAjustarPosicion && (
                <>
                  <div className="h-px bg-gray-200 my-1" />
                  <DropdownMenuItem
                    onClick={() => { setDropdownOpen(false); onAjustarPosicion('inicio_padre') }}
                    className="text-gray-600"
                  >
                    <ArrowUpToLine className="h-4 w-4 mr-2" />
                    Al inicio del padre
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setDropdownOpen(false); onAjustarPosicion('despues_anterior') }}
                    disabled={!tieneAnterior}
                    className="text-gray-600"
                  >
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Después del anterior
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setDropdownOpen(false); onAjustarPosicion('despues_ultimo') }}
                    className="text-gray-600"
                  >
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                    Tras último hermano
                  </DropdownMenuItem>
                </>
              )}

              {/* Programar respecto a un hermano elegido */}
              {!readOnly && (node.type === 'tarea' || node.type === 'actividad' || node.type === 'edt') && onProgramarRespecto && (
                <>
                  <DropdownMenuItem
                    onClick={() => { setDropdownOpen(false); onProgramarRespecto('despues_de') }}
                    className="text-gray-600"
                  >
                    <ArrowRightToLine className="h-4 w-4 mr-2" />
                    Programar después de…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setDropdownOpen(false); onProgramarRespecto('en_paralelo') }}
                    className="text-gray-600"
                  >
                    <Columns2 className="h-4 w-4 mr-2" />
                    En paralelo con…
                  </DropdownMenuItem>
                </>
              )}

              {/* Delete option - only if not read-only and not proyecto */}
              {!readOnly && node.type !== 'proyecto' && (
                <DropdownMenuItem
                  onClick={() => {
                    setDropdownOpen(false)
                    setShowDeleteDialog(true)
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>


      {/* Delete confirmation dialog */}
      <DeleteAlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={getDeleteSummary().title}
        description={
          <div className="text-sm text-muted-foreground space-y-2">
            <p>{getDeleteSummary().description}</p>
            {getDeleteSummary().details.length > 0 && (
              <div>
                <p className="font-medium">Se eliminarán:</p>
                <ul className="list-disc list-inside mt-1">
                  {getDeleteSummary().details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-red-600 font-medium">Esta acción no se puede deshacer.</p>
          </div>
        }
        onConfirm={() => {
          onDelete?.()
          setShowDeleteDialog(false)
        }}
      />
    </div>
  )
}