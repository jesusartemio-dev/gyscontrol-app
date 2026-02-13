// ===================================================
// 📁 Archivo: types.ts
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Tipos TypeScript para componentes del cronograma jerárquico
// ✅ Interfaces compartidas, tipos de datos, enums
// ===================================================

export interface TreeNode {
  id: string
  type: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea'
  nombre: string
  parentId?: string
  children?: TreeNode[]
  level: number
  expanded?: boolean
  loading?: boolean
  data: {
    // Campos específicos por tipo
    [key: string]: any
  }
  metadata: {
    hasChildren: boolean
    totalChildren: number
    progressPercentage: number
    status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled'
  }
}

// Alias para compatibilidad
export interface TreeNodeData extends TreeNode {}

export interface TreeNodeProps {
  node: TreeNodeData
  onToggle: (nodeId: string) => void
  onAddChild: (parentId: string, type: string) => void
  onEdit: (node: TreeNodeData) => void
  onDelete: (nodeId: string) => void
  onImport: (nodeId: string, importType: string) => void
  isExpanded: boolean
}

export interface TreeNodeFormProps {
  node: TreeNodeData | null
  isOpen: boolean
  onClose: () => void
  onSave: (nodeId: string, data: any) => void
  availableParents?: Array<{ id: string; nombre: string; type: string }>
}

export interface CronogramaTreeViewProps {
  cotizacionId: string
  refreshKey?: number
  onRefresh?: () => void
  fechaInicioProyecto?: string
}

export interface TreeApiResponse {
  success: boolean
  data: {
    tree: TreeNodeData[]
    metadata: {
      totalNodes: number
      maxDepth: number
      lastUpdated: string
    }
  }
}

export type NodeType = 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea'

export type PositioningMode = 'inicio_padre' | 'despues_ultima'

export interface NodeCreationData {
  type: NodeType
  parentId?: string
  data: {
    nombre: string
    descripcion?: string
    fechaInicioComercial?: string
    fechaFinComercial?: string
    horasEstimadas?: number
    prioridad?: 'baja' | 'media' | 'alta' | 'critica'
    estado?: 'pendiente' | 'en_progreso' | 'completada' | 'pausada' | 'cancelada'
    // Campos específicos por tipo
    cotizacionServicioId?: string
    cotizacionEdtId?: string
    posicionamiento?: PositioningMode
  }
}

export interface ContextualPlacementResult {
  cotizacionEdtId: string
  reasoning: string
}

export interface TreeExpansionState {
  [nodeId: string]: boolean
}

export interface TreeFilterState {
  searchTerm: string
  nodeTypes: NodeType[]
  statusFilter: string[]
  dateRange?: {
    start: string
    end: string
  }
}

// Estado global del árbol
export interface CronogramaTreeState {
  nodes: Map<string, TreeNode>
  rootNodes: string[]
  expandedNodes: Set<string>
  selectedNodeId?: string
  loadingNodes: Set<string>
  error?: string
}

// Hook principal del árbol
export interface UseCronogramaTreeReturn {
  state: CronogramaTreeState
  actions: {
    loadTree: (expandedNodes?: string[]) => Promise<void>
    toggleNode: (nodeId: string) => Promise<void>
    createNode: (parentId: string, type: NodeType, data: any) => Promise<TreeNode>
    updateNode: (nodeId: string, formData: any) => Promise<void>
    deleteNode: (nodeId: string) => Promise<void>
    generateFromServices: (options?: GenerateOptions) => Promise<any>
    selectNode: (nodeId: string) => void
  }
}

// Opciones para generación automática
export interface GenerateOptions {
  generarFases?: boolean
  generarEdts?: boolean
  generarActividades?: boolean
  generarTareas?: boolean
  fechaInicioProyecto?: string
}

// Configuración de posicionamiento
export interface PositioningConfig {
  mode: PositioningMode
  targetNodeId?: string // Para ubicación específica
}

// Resultado de ubicación contextual
export interface ContextualPlacementResult {
  parentId: string
  parentType: NodeType
  reasoning: string
  suggestedPosition: PositioningConfig
}