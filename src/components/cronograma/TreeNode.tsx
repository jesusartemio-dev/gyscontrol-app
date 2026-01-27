// ===================================================
// 📁 Archivo: TreeNode.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Componente individual para nodos del árbol jerárquico
// ✅ Expansión/colapso, acciones contextuales, indicadores visuales
// ===================================================

import React from 'react'
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, MoreHorizontal, Download } from 'lucide-react'
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
      className={`tree-node group ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'} border-l-2 border-transparent pl-4 py-2 cursor-pointer transition-colors`}
      style={{ paddingLeft: `${node.level * 20 + 16}px` }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {/* Toggle button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            disabled={!hasChildren && !isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4" />
            )}
          </Button>

          {/* Node icon and name */}
          <span className="text-lg">{config.icon}</span>
          <span className="font-medium text-gray-900">{node.nombre}</span>

          {/* Orden indicator */}
          {node.data.orden !== undefined && node.data.orden !== null && (
            <Badge variant="outline" className="text-xs ml-2 bg-gray-50 text-gray-600 border-gray-300">
              #{node.data.orden}
            </Badge>
          )}

          {/* Indicador de hito */}
          {node.data?.esHito && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Hito
            </Badge>
          )}

          {/* Progress indicator */}
          <TreeNodeProgress
            percentage={node.metadata.progressPercentage}
            status={mapStatusForProgress(node.metadata.status)}
            size="sm"
          />

          {/* Status badge */}
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>

          {/* Children count */}
          {hasChildren && (
            <Badge variant="secondary" className="text-xs">
              {node.metadata.totalChildren}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* More actions menu */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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

      {/* Additional info */}
      <div className="ml-8 mt-1 text-sm text-gray-600">
        {(() => {
          // Extraer fechas según el tipo de nodo
          let fechaInicio: string | null = null
          let fechaFin: string | null = null

          if (node.type === 'fase') {
            fechaInicio = node.data.fechaInicioComercial || node.data.fechaInicioPlan
            fechaFin = node.data.fechaFinComercial || node.data.fechaFinPlan
          } else if (node.type === 'edt') {
            fechaInicio = node.data.fechaInicioComercial || node.data.fechaInicioPlan
            fechaFin = node.data.fechaFinComercial || node.data.fechaFinPlan
          } else if (node.type === 'actividad') {
            fechaInicio = node.data.fechaInicioComercial || node.data.fechaInicioPlan
            fechaFin = node.data.fechaFinComercial || node.data.fechaFinPlan
          } else if (node.type === 'tarea') {
            // Para tareas, las fechas están directamente en data.fechaInicio y data.fechaFin
            fechaInicio = node.data.fechaInicio
            fechaFin = node.data.fechaFin
          }

          // Función para formatear fecha local correctamente
          const formatDate = (dateString: string | Date) => {
            if (!dateString) return ''
            try {
              // Si es un string ISO, convertir a Date
              const date = typeof dateString === 'string' ? new Date(dateString) : dateString
              if (isNaN(date.getTime())) return 'Fecha inválida'
              return date.toLocaleDateString('es-ES')
            } catch (error) {
              console.error('Error formateando fecha:', dateString, error)
              return 'Fecha inválida'
            }
          }

          return fechaInicio && fechaFin ? (
            <span>
              {formatDate(fechaInicio)} - {formatDate(fechaFin)}
            </span>
          ) : null
        })()}
        <span className="ml-2">({totalHours}h)</span>
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