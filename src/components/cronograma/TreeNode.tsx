// ===================================================
// 📁 Archivo: TreeNode.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Componente individual para nodos del árbol jerárquico
// ✅ Expansión/colapso, acciones contextuales, indicadores visuales
// ===================================================

import React from 'react'
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, Settings2, Download, Users, UserCheck, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { TreeNode as TreeNodeType, NodeType } from './types'
import { TreeNodeProgress } from './TreeNodeProgress'

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
  onAssignResponsable?: () => void
  onAssignRecurso?: () => void
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
  onAssignResponsable,
  onAssignRecurso
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

  // Calcular Duration (días calendario entre fechaInicio y fechaFin)
  const calcDurationDays = (): number => {
    let fechaInicio: string | null = null
    let fechaFin: string | null = null
    if (node.type === 'tarea') {
      fechaInicio = node.data.fechaInicio
      fechaFin = node.data.fechaFin
    } else {
      fechaInicio = node.data.fechaInicioComercial || node.data.fechaInicioPlan
      fechaFin = node.data.fechaFinComercial || node.data.fechaFinPlan
    }
    if (!fechaInicio || !fechaFin) return 0
    try {
      const start = new Date(fechaInicio)
      const end = new Date(fechaFin)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
      // Count business days (Mon-Fri)
      let days = 0
      const current = new Date(start)
      while (current <= end) {
        const dow = current.getDay()
        if (dow !== 0 && dow !== 6) days++
        current.setDate(current.getDate() + 1)
      }
      return days
    } catch { return 0 }
  }
  const durationDays = calcDurationDays()

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
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      } catch { return '' }
    }
    if (fechaInicio && fechaFin) return `${fmt(fechaInicio)}–${fmt(fechaFin)}`
    return ''
  }

  return (
    <div
      className={`tree-node group ${isSelected ? 'bg-blue-100 border-l-2 border-l-blue-500' : 'hover:bg-gray-100'} py-0.5 cursor-pointer transition-colors`}
      onClick={onSelect}
    >
      <div className={`grid items-center gap-1 ${
        showRecursoColumn && showResponsableColumn
          ? 'grid-cols-[1fr_80px_65px_120px_55px_55px_100px_100px_28px]'
          : (showRecursoColumn || showResponsableColumn)
            ? 'grid-cols-[1fr_80px_65px_120px_55px_55px_100px_28px]'
            : 'grid-cols-[1fr_80px_65px_120px_55px_55px_28px]'
      }`}>
        {/* Columna 1: Nombre con indentación */}
        <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${node.level * 16 + 8}px` }}>
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
          <span className="text-xs shrink-0">{config.icon}</span>
          <span className="text-xs font-medium text-gray-900 truncate">{node.nombre}</span>

          {/* Children count inline */}
          {hasChildren && (
            <span className="text-[10px] text-gray-400 shrink-0">({node.metadata.totalChildren})</span>
          )}

          {/* Indicador de hito */}
          {node.data?.esHito && (
            <Badge variant="outline" className="text-[10px] leading-none px-1 py-0 h-4 bg-green-50 text-green-700 border-green-200 shrink-0">
              Hito
            </Badge>
          )}

          {/* Personas estimadas badge */}
          {node.type === 'tarea' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0 shrink-0">
              <Users className="h-2.5 w-2.5" />
              {node.data.personasEstimadas || 1}
            </span>
          )}

          {/* Recursos asignados badge para nodos padre */}
          {node.type !== 'tarea' && (node.metadata.recursosTotales ?? 0) > 0 && (() => {
            const assigned = node.metadata.recursosAsignados ?? 0
            const total = node.metadata.recursosTotales ?? 0
            const ratio = total > 0 ? assigned / total : 0
            const colorClasses = ratio >= 1
              ? 'text-green-700 bg-green-50 border-green-200'
              : ratio > 0
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-red-600 bg-red-50 border-red-200'
            return (
              <span className={`inline-flex items-center gap-0.5 text-[10px] border rounded px-1 py-0 shrink-0 ${colorClasses}`}>
                <Users className="h-2.5 w-2.5" />
                {assigned}/{total}
              </span>
            )
          })()}
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
          <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 shrink-0 ${config.color}`}>
            {config.label}
          </Badge>
        </div>

        {/* Columna 4: Fechas */}
        <div className="text-center text-[11px] text-gray-500 truncate">
          {formatDates()}
        </div>

        {/* Columna 5: Duration (días hábiles desde fechas) */}
        <div className="text-right text-[11px] text-gray-500 font-mono pr-1">
          {durationDays > 0 ? `${durationDays}d` : ''}
        </div>

        {/* Columna 6: Work (horasEstimadas) */}
        <div className="text-right text-[11px] text-gray-600 font-mono pr-1">
          {totalHours > 0 ? `${totalHours}h` : ''}
        </div>

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
                <span className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium ${
                  (() => {
                    const assigned = node.metadata.recursosAsignados ?? 0
                    const total = node.metadata.recursosTotales ?? 0
                    const ratio = total > 0 ? assigned / total : 0
                    if (ratio >= 1) return 'bg-green-50 text-green-700 border-green-200'
                    if (ratio > 0) return 'bg-amber-50 text-amber-700 border-amber-200'
                    return 'bg-red-50 text-red-600 border-red-200'
                  })()
                }`}>
                  <Users className="h-2.5 w-2.5" />
                  {node.metadata.recursosAsignados}/{node.metadata.recursosTotales}
                </span>
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
                <span className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium ${
                  (() => {
                    const assigned = node.metadata.responsablesAsignados ?? 0
                    const total = node.metadata.responsablesTotales ?? 0
                    const ratio = total > 0 ? assigned / total : 0
                    if (ratio >= 1) return 'bg-blue-50 text-blue-700 border-blue-200'
                    if (ratio > 0) return 'bg-amber-50 text-amber-700 border-amber-200'
                    return 'bg-red-50 text-red-600 border-red-200'
                  })()
                }`}>
                  <Users className="h-2.5 w-2.5" />
                  {node.metadata.responsablesAsignados}/{node.metadata.responsablesTotales}
                </span>
              ) : null
            )}
          </div>
        )}

        {/* Columna 8: Acciones */}
        <div className="flex justify-center">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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