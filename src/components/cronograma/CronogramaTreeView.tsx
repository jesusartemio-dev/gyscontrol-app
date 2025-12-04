'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, TreePine, Plus, Download, List, Filter, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TreeNode } from './TreeNode'
import { TreeNodeForm } from './TreeNodeForm'
import { ImportModal } from './ImportModal'

import { CronogramaTreeViewProps, TreeNode as TreeNodeType, NodeType } from './types'
import { useCronogramaTree } from './hooks/useCronogramaTree'
import './CronogramaTreeView.css'

export function CronogramaTreeView({ cotizacionId, onRefresh, fechaInicioProyecto, refreshKey, isProyecto }: CronogramaTreeViewProps & { refreshKey?: number; isProyecto?: boolean }) {
  const { state, actions } = useCronogramaTree(cotizacionId, isProyecto)
  const [showForm, setShowForm] = useState(false)
  const [formContext, setFormContext] = useState<{
    mode: 'create' | 'edit'
    nodeType?: NodeType
    parentId?: string
    nodeId?: string
  } | null>(null)

  // Refresh tree when refreshKey changes
  React.useEffect(() => {
    if (refreshKey !== undefined) {
      actions.loadTree()
    }
  }, [refreshKey]) // Remove actions from dependencies to prevent infinite loop

  // Estados para importación (mantener compatibilidad con sistema anterior)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importItems, setImportItems] = useState<any[]>([])
  const [importConfig, setImportConfig] = useState<any>(null)
  const [importing, setImporting] = useState(false)

  // Estados para importación selectiva de items
  const [showImportItemsModal, setShowImportItemsModal] = useState(false)
  const [importItemsData, setImportItemsData] = useState<any[]>([])
  const [currentImportNode, setCurrentImportNode] = useState<{ id: string; type: string } | null>(null)

  const handleAddChild = (parentId: string, childType: NodeType) => {
    setFormContext({
      mode: 'create',
      nodeType: childType,
      parentId
    })
    setShowForm(true)
  }

  const handleEditNode = (nodeId: string) => {
    setFormContext({
      mode: 'edit',
      nodeId
    })
    setShowForm(true)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (formContext?.mode === 'create' && formContext.parentId && formContext.nodeType) {
        await actions.createNode(formContext.parentId, formContext.nodeType, data)
      } else if (formContext?.mode === 'edit' && formContext.nodeId) {
        await actions.updateNode(formContext.nodeId, data)
      }

      setShowForm(false)
      setFormContext(null)
      onRefresh?.()
    } catch (error) {
      console.error('Error guardando nodo:', error)
    }
  }

  const handleImportItems = async (nodeId: string) => {
    try {
      const node = state.nodes.get(nodeId)
      if (!node) return

      // Obtener items disponibles para importar según el tipo de nodo
      const apiPath = isProyecto ? 'proyectos' : 'cotizaciones'
      const response = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/import-items/${nodeId}`)
      if (!response.ok) throw new Error('Error obteniendo items para importar')

      const data = await response.json()
      setImportItemsData(data.data || [])
      setCurrentImportNode({ id: nodeId, type: node.type })
      setShowImportItemsModal(true)
    } catch (error) {
      console.error('Error abriendo modal de importación:', error)
    }
  }

  const handleExecuteImport = async (selectedIds: string[]) => {
    if (!currentImportNode) return

    try {
      setImporting(true)
      const apiPath = isProyecto ? 'proyectos' : 'cotizaciones'
      const response = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/import-items/${currentImportNode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedIds })
      })

      if (!response.ok) throw new Error('Error importando items')

      // Recargar el árbol completo para mostrar los nuevos elementos importados
      await actions.loadTree()

      setShowImportItemsModal(false)
      setCurrentImportNode(null)
      onRefresh?.()
    } catch (error) {
      console.error('Error ejecutando importación:', error)
      throw error
    } finally {
      setImporting(false)
    }
  }

  const renderTree = (nodeIds: string[], level = 0): React.ReactNode => {
    return nodeIds.map(nodeId => {
      const node = state.nodes.get(nodeId)
      if (!node) return null

      const isSelected = state.selectedNodeId === nodeId
      const childNodeIds = node.children?.map(child => child.id) || []

      return (
        <React.Fragment key={nodeId}>
          <TreeNode
            node={node}
            onToggle={() => actions.toggleNode(nodeId)}
            onAddChild={(type) => handleAddChild(nodeId, type)}
            onEdit={() => handleEditNode(nodeId)}
            onDelete={() => actions.deleteNode(nodeId)}
            onImport={() => handleImportItems(nodeId)}
            onSelect={() => actions.selectNode(nodeId)}
            isSelected={isSelected}
          />
          {state.expandedNodes.has(nodeId) && childNodeIds.length > 0 && (
            <div className="tree-children">
              {renderTree(childNodeIds, level + 1)}
            </div>
          )}
        </React.Fragment>
      )
    })
  }

  if (state.error) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500 mb-4">Error cargando cronograma</div>
          <p className="text-gray-600 text-center mb-4">{state.error}</p>
          <div className="text-xs text-gray-500 mb-4">
            Verifica tu conexión a internet y que el servidor esté funcionando.
          </div>
          <Button onClick={() => actions.loadTree()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-green-600" />
            <CardTitle>Cronograma Jerárquico</CardTitle>
            <Badge variant="secondary">
              {state.nodes.size} elementos
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.loadTree([...state.expandedNodes])}
              disabled={state.loadingNodes.has('root')}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${state.loadingNodes.has('root') ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" size="sm">
              <List className="h-4 w-4 mr-2" />
              Vista Lista
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Toolbar de acciones globales */}
        <div className="mb-4 flex flex-wrap gap-2">
          {/* Generación automática */}
          <div className="flex gap-2 border-r pr-4 mr-4">
            <Button
              size="sm"
              variant="default"
              onClick={async () => {
                try {
                  await actions.generateFromServices(fechaInicioProyecto ? { fechaInicioProyecto } : undefined)
                  onRefresh?.()
                } catch (error) {
                  console.error('Error generating cronograma:', error)
                }
              }}
              disabled={state.loadingNodes.has('root')}
            >
              <Zap className="h-4 w-4 mr-2" />
              {state.loadingNodes.has('root') ? 'Generando...' : 'Generar Cronograma'}
            </Button>
          </div>

          {/* Creación manual */}
          <Button
            size="sm"
            onClick={() => handleAddChild('root', 'fase')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Fase
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddChild('root', 'edt')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar EDT Global
          </Button>
        </div>

        {/* Árbol jerárquico */}
        <div className="tree-container border rounded-lg">
          {state.rootNodes.length === 0 && !state.loadingNodes.has('root') ? (
            <div className="text-center py-12 text-gray-500">
              No hay elementos en el cronograma.
              <br />
              <Button
                className="mt-4"
                onClick={() => handleAddChild('root', 'fase')}
              >
                Crear primera fase
              </Button>
            </div>
          ) : (
            <div className="p-4">
              {renderTree(state.rootNodes)}
            </div>
          )}
        </div>

        {/* Formulario modal */}
        {showForm && formContext && (
          <TreeNodeForm
            mode={formContext.mode}
            nodeType={formContext.nodeType}
            nodeId={formContext.nodeId}
            parentId={formContext.parentId}
            isOpen={showForm}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false)
              setFormContext(null)
            }}
            nodes={state.nodes}
          />
        )}

        {/* Modal de importación (mantener compatibilidad) */}
        {importConfig && (
          <ImportModal
            isOpen={showImportModal}
            onClose={() => {
              setShowImportModal(false)
              setImportItems([])
              setImportConfig(null)
            }}
            title={importConfig.title}
            description={importConfig.description}
            items={importItems}
            onImport={async (selectedIds) => {
              // TODO: Implementar importación en nuevo sistema
              console.log('Import selected:', selectedIds)
            }}
            loading={importing}
            itemType={importConfig.itemType}
            showCategories={importConfig.itemType === 'edts'}
            showHours={importConfig.itemType === 'actividades' || importConfig.itemType === 'tareas'}
            showItems={importConfig.itemType === 'actividades'}
          />
        )}

        {/* Modal de importación selectiva de items */}
        <ImportModal
          isOpen={showImportItemsModal}
          onClose={() => {
            setShowImportItemsModal(false)
            setImportItemsData([])
            setCurrentImportNode(null)
          }}
          title={`Importar ${currentImportNode?.type === 'fase' ? 'EDTs' : currentImportNode?.type === 'edt' ? 'Actividades' : 'Tareas'}`}
          description={`Selecciona los elementos que deseas importar a ${currentImportNode?.type === 'fase' ? 'esta fase' : currentImportNode?.type === 'edt' ? 'este EDT' : 'esta actividad'}.`}
          items={importItemsData}
          onImport={handleExecuteImport}
          loading={importing}
          itemType={currentImportNode?.type === 'fase' ? 'edts' : currentImportNode?.type === 'edt' ? 'actividades' : 'tareas'}
          showCategories={currentImportNode?.type === 'fase'}
          showHours={currentImportNode?.type === 'edt' || currentImportNode?.type === 'actividad'}
          showItems={currentImportNode?.type === 'edt'}
        />
      </CardContent>
    </Card>
  )
}