// ===================================================
// 📁 Archivo: TreeNode.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Componente individual para nodos del árbol jerárquico
// ✅ Expansión/colapso, acciones contextuales, indicadores visuales
// ===================================================

import React from 'react'
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, MoreHorizontal, Download, Users } from 'lucide-react'
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
}

const NODE_CONFIG = {
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
  executionMode = false
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

  return (
    <div
      className={`tree-node group ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'} border-l-2 border-transparent pl-2 py-0.5 cursor-pointer transition-colors`}
      style={{ paddingLeft: `${node.level * 16 + 8}px` }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 flex-1 min-w-0">
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

          {/* Indicador de hito */}
          {node.data?.esHito && (
            <Badge variant="outline" className="text-[10px] leading-none px-1 py-0 h-4 bg-green-50 text-green-700 border-green-200 shrink-0">
              Hito
            </Badge>
          )}

          {/* Progress indicator */}
          <TreeNodeProgress
            percentage={node.metadata.progressPercentage}
            status={mapStatusForProgress(node.metadata.status)}
            size="xs"
          />

          {/* Type badge */}
          <Badge variant="outline" className={`text-[10px] leading-none px-1 py-0 h-4 shrink-0 ${config.color}`}>
            {config.label}
          </Badge>

          {/* Children count */}
          {hasChildren && (
            <Badge variant="secondary" className="text-[10px] leading-none px-1 py-0 h-4 shrink-0">
              {node.metadata.totalChildren}
            </Badge>
          )}

          {/* Dates and hours inline */}
          <span className="text-[11px] text-gray-400 shrink-0 ml-1">
            {(() => {
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
              const parts: string[] = []
              if (fechaInicio && fechaFin) parts.push(`${fmt(fechaInicio)}–${fmt(fechaFin)}`)
              if (totalHours > 0) parts.push(`${totalHours}h`)
              return parts.join(' · ')
            })()}
          </span>

          {/* Personas estimadas badge (solo tareas con > 1 persona) */}
          {node.type === 'tarea' && (node.data.personasEstimadas || 1) > 1 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0 shrink-0">
              <Users className="h-2.5 w-2.5" />
              {node.data.personasEstimadas}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {/* More actions menu */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Create child options - only if not read-only */}
              {!readOnly && config.canAdd.map(childType => (
                <DropdownMenuItem
                  key={`create-${childType}`}
                  onClick={() => {
                    setDropdownOpen(false)
                    onAddChild?.(childType)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear {childType === 'edt' ? 'EDT' : childType === 'actividad' ? 'Actividad' : childType === 'tarea' ? 'Tarea' : childType}
                </DropdownMenuItem>
              ))}

              {/* Separator if there are both create and other options */}
              {!readOnly && config.canAdd.length > 0 && (
                <div className="h-px bg-gray-200 my-1" />
              )}

              {/* Edit option - only if not read-only */}
              {!readOnly && (
                <DropdownMenuItem onClick={() => {
                  setDropdownOpen(false)
                  onEdit?.()
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}

              {/* Import option - only if not read-only and for specific node types */}
              {!readOnly && (node.type === 'fase' || node.type === 'actividad') && (
                <DropdownMenuItem onClick={() => {
                  setDropdownOpen(false)
                  onImport?.()
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  {node.type === 'actividad' ? 'Importar Tarea' : node.type === 'fase' ? 'Importar EDT' : 'Importar'}
                </DropdownMenuItem>
              )}

              {/* Delete option - only if not read-only */}
              {!readOnly && (
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