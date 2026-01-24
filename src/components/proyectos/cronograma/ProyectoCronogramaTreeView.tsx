'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, TreePine, Plus, Download, List, Filter, Zap, Trash2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TreeNode } from '../../cronograma/TreeNode'
import { TreeNodeForm } from '../../cronograma/TreeNodeForm'
import { ImportModal } from '../../cronograma/ImportModal'
import { ImportEdtModal } from '../../cronograma/ImportEdtModal'
import { ImportTareasModal } from '../../cronograma/ImportTareasModal'
import { CronogramaTreeViewProps, TreeNode as TreeNodeType, NodeType } from '../../cronograma/types'
import { useProyectoCronogramaTree } from './hooks/useProyectoCronogramaTree'
import '../../cronograma/CronogramaTreeView.css'

interface ProyectoCronogramaTreeViewProps {
  proyectoId: string
  onRefresh?: () => void
  fechaInicioProyecto?: string
  refreshKey?: number
  selectedCronograma?: any
}

export function ProyectoCronogramaTreeView({
  proyectoId,
  onRefresh,
  fechaInicioProyecto,
  refreshKey,
  selectedCronograma
}: ProyectoCronogramaTreeViewProps) {
  // ✅ Usar hook específico para proyectos
  const { state, actions } = useProyectoCronogramaTree(proyectoId, selectedCronograma?.id)
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
      actions.loadTree([...state.expandedNodes])
    }
  }, [refreshKey]) // Only depend on refreshKey to avoid infinite loops

  // Estados para importación (mantener compatibilidad con sistema anterior)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importItems, setImportItems] = useState<any[]>([])
  const [importConfig, setImportConfig] = useState<any>(null)
  const [importing, setImporting] = useState(false)

  // Estados para importación selectiva de items (EDTs)
  const [showImportItemsModal, setShowImportItemsModal] = useState(false)
  const [importItemsData, setImportItemsData] = useState<any[]>([])
  const [currentImportNode, setCurrentImportNode] = useState<{ id: string; type: string } | null>(null)

  // Estados para importación de tareas
  const [showImportTareasModal, setShowImportTareasModal] = useState(false)
  const [importTareasData, setImportTareasData] = useState<any[]>([])
  const [currentActividadNombre, setCurrentActividadNombre] = useState('')

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
      console.log('📝 [FORM SUBMIT] Iniciando submit del formulario')
      console.log('📝 [FORM SUBMIT] Modo:', formContext?.mode, 'NodeId:', formContext?.nodeId)

      if (formContext?.mode === 'create' && formContext.parentId && formContext.nodeType) {
        console.log('📝 [FORM SUBMIT] Creando nuevo nodo')
        await actions.createNode(formContext.parentId, formContext.nodeType, data)
      } else if (formContext?.mode === 'edit' && formContext.nodeId) {
        console.log('📝 [FORM SUBMIT] Editando nodo existente:', formContext.nodeId)
        await actions.updateNode(formContext.nodeId, data)
      }

      console.log('📝 [FORM SUBMIT] Operación completada, cerrando formulario')
      setShowForm(false)
      setFormContext(null)
      onRefresh?.()
    } catch (error) {
      console.error('❌ [FORM SUBMIT] Error guardando nodo:', error)
    }
  }

  const handleImportItems = async (nodeId: string) => {
    console.log('🔍 [FRONTEND] handleImportItems called with nodeId:', nodeId)
    try {
      const node = state.nodes.get(nodeId)
      if (!node) {
        console.log('❌ [FRONTEND] Node not found:', nodeId)
        return
      }

      console.log('✅ [FRONTEND] Node found:', { id: node.id, type: node.type, nombre: node.nombre })

      // Para actividades, importar tareas desde catálogo de servicios
      if (node.type === 'actividad') {
        console.log('🔍 [FRONTEND] Importing tasks for activity, calling API...')
        const apiUrl = `/api/proyectos/${proyectoId}/cronograma/import-tareas?actividadId=${nodeId}`
        console.log('🔍 [FRONTEND] API URL:', apiUrl)

        const response = await fetch(apiUrl)
        console.log('🔍 [FRONTEND] API Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.log('❌ [FRONTEND] API Error:', errorText)
          throw new Error('Error obteniendo servicios para importar')
        }

        const data = await response.json()
        console.log('✅ [FRONTEND] API Response data:', data)
        console.log('✅ [FRONTEND] Servicios received:', data.data?.length || 0)

        setImportTareasData(data.data || [])
        setCurrentActividadNombre(node.nombre)
        setShowImportTareasModal(true)
      }
      // Para fases, importar EDTs del catálogo
      else if (node.type === 'fase') {
        console.log('🔍 [FRONTEND] Importing EDTs for phase, calling API...')
        const apiUrl = `/api/proyectos/${proyectoId}/cronograma/import-edts?faseId=${nodeId}`
        console.log('🔍 [FRONTEND] API URL:', apiUrl)

        const response = await fetch(apiUrl)
        console.log('🔍 [FRONTEND] API Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.log('❌ [FRONTEND] API Error:', errorText)
          throw new Error('Error obteniendo EDTs para importar')
        }

        const data = await response.json()
        console.log('✅ [FRONTEND] API Response data:', data)
        console.log('✅ [FRONTEND] EDTs received:', data.data?.length || 0)

        setImportItemsData(data.data || [])
        setCurrentImportNode({ id: nodeId, type: node.type })
        setShowImportItemsModal(true)
      } else {
        // Para otros tipos de nodo, usar la lógica anterior (si existe)
        const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/import-items/${nodeId}`)
        if (!response.ok) throw new Error('Error obteniendo items para importar')

        const data = await response.json()
        console.log('🔍 [FRONTEND] Setting import data:', {
          importItemsData: data.data?.length || 0,
          currentImportNode: { id: nodeId, type: node.type },
          showImportItemsModal: true
        })

        setImportItemsData(data.data || [])
        setCurrentImportNode({ id: nodeId, type: node.type })
        setShowImportItemsModal(true)

        console.log('✅ [FRONTEND] Modal state updated, should open now')
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error abriendo modal de importación:', error)
    }
  }

  const handleExecuteImport = async (selectedIds: string[]) => {
    if (!currentImportNode) return

    try {
      setImporting(true)

      // Para actividades, importar tareas desde catálogo de servicios
      if (currentImportNode.type === 'actividad') {
        const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/import-tareas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actividadId: currentImportNode.id, selectedIds })
        })

        if (!response.ok) throw new Error('Error importando tareas')
      }
      // Para fases, importar EDTs del catálogo
      else if (currentImportNode.type === 'fase') {
        const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/import-edts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edtIds: selectedIds, faseId: currentImportNode.id })
        })

        if (!response.ok) throw new Error('Error importando EDTs')
      } else {
        // Para otros tipos de nodo, usar la lógica anterior
        const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/import-items/${currentImportNode.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedIds })
        })

        if (!response.ok) throw new Error('Error importando items')
      }

      // Recargar el árbol completo para mostrar los nuevos elementos importados, preservando estado de expansión
      await actions.loadTree([...state.expandedNodes])
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

  const handleDeleteCronograma = async () => {
    if (!selectedCronograma) return

    // No permitir eliminar el cronograma baseline
    if (selectedCronograma.esBaseline) {
      alert('No se puede eliminar el cronograma baseline')
      return
    }

    // No permitir eliminar cronogramas comerciales
    if (selectedCronograma.tipo === 'comercial') {
      alert('No se puede eliminar el cronograma comercial. Los cronogramas comerciales son de solo lectura.')
      return
    }

    // Confirmación de eliminación
    const confirmMessage = `¿Estás seguro de que quieres eliminar el cronograma "${selectedCronograma.nombre}"?\n\nEsta acción eliminará permanentemente todos los elementos del cronograma (fases, EDTs, actividades y tareas) y no se puede deshacer.`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma?cronogramaId=${selectedCronograma.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error eliminando cronograma')
      }

      // Recargar la página o redirigir
      window.location.reload()
    } catch (error) {
      console.error('Error eliminando cronograma:', error)
      alert('Error eliminando cronograma: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  const renderTree = (nodeIds: string[], level = 0): React.ReactNode => {
    return nodeIds.map(nodeId => {
      const node = state.nodes.get(nodeId)
      if (!node) return null

      const isSelected = state.selectedNodeId === nodeId
      const childNodeIds = node.children?.map(child => child.id) || []

      // Determinar permisos según el tipo de cronograma
      const isReadOnly = selectedCronograma?.tipo === 'comercial'
      const isExecutionLimited = selectedCronograma?.tipo === 'ejecucion'

      return (
        <React.Fragment key={nodeId}>
          <div className="flex items-center gap-1">
            <TreeNode
              node={node}
              onToggle={() => actions.toggleNode(nodeId)}
              onAddChild={isReadOnly ? undefined : (type) => handleAddChild(nodeId, type)}
              onEdit={isReadOnly ? undefined : () => handleEditNode(nodeId)}
              onDelete={isReadOnly ? undefined : () => actions.deleteNode(nodeId)}
              onImport={isReadOnly ? undefined : () => handleImportItems(nodeId)}
              onSelect={() => actions.selectNode(nodeId)}
              isSelected={isSelected}
              readOnly={isReadOnly}
            />
            
          </div>
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
          <div className="text-red-500 mb-4">Error cargando cronograma del proyecto</div>
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
            <div>
              <CardTitle>Cronograma Jerárquico del Proyecto</CardTitle>
              {selectedCronograma && (
                <p className="text-sm text-muted-foreground mt-1">
                  Trabajando en: <span className="font-medium text-blue-600">{selectedCronograma.nombre}</span>
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {selectedCronograma.tipo}
                  </span>
                  {selectedCronograma.esBaseline && selectedCronograma.tipo === 'planificacion' && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Línea Base
                    </span>
                  )}
                </p>
              )}
            </div>
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
{/* Botón de eliminar cronograma movido al header de ProyectoCronogramaTab */}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Toolbar de acciones globales */}
        <div className="mb-4 flex flex-wrap gap-2">
          {/* Generación automática - Solo para cronograma comercial (planificación y ejecución tienen el botón en el header) */}
          {selectedCronograma?.tipo === 'comercial' && (
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
          )}

          {/* Creación manual */}
          <Button
            size="sm"
            onClick={() => handleAddChild('root', 'fase')}
            disabled={selectedCronograma?.tipo === 'comercial'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Fase
          </Button>
          {selectedCronograma?.tipo !== 'comercial' && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  // Importar fases desde configuración global
                  const response = await fetch('/api/configuracion/fases')
                  if (!response.ok) throw new Error('Error obteniendo fases por defecto')

                  const data = await response.json()
                  if (!data.success || !data.data || data.data.length === 0) {
                    alert('No hay fases por defecto configuradas. Ve a Configuración > Fases por Defecto para crearlas.')
                    return
                  }

                  // Crear fases en el proyecto
                  let successCount = 0
                  let errorCount = 0

                  for (const faseDefault of data.data) {
                    try {
                      const createResponse = await fetch(`/api/proyectos/${proyectoId}/cronograma/fases`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          proyectoCronogramaId: selectedCronograma?.id,
                          nombre: faseDefault.nombre,
                          descripcion: faseDefault.descripcion,
                          orden: faseDefault.orden
                        })
                      })

                      if (createResponse.ok) {
                        successCount++
                      } else {
                        errorCount++
                      }
                    } catch (createError) {
                      console.error(`Error creando fase ${faseDefault.nombre}:`, createError)
                      errorCount++
                    }
                  }

                  if (successCount > 0) {
                    await actions.loadTree([...state.expandedNodes])
                    onRefresh?.()
                    alert(`Se crearon ${successCount} fases${errorCount > 0 ? ` (${errorCount} errores)` : ''}.`)
                  } else {
                    alert('No se pudieron crear las fases. Verifica la configuración.')
                  }
                } catch (error) {
                  console.error('Error importando fases:', error)
                  alert('Error importando fases desde configuración.')
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Importar Fases
            </Button>
          )}
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
              {selectedCronograma?.tipo === 'comercial' ? (
                <>
                  El cronograma comercial se genera automáticamente desde la cotización.
                  <br />
                  Si no ves elementos, verifica que el proyecto tenga servicios cotizados.
                </>
              ) : (
                <>
                  No hay elementos en el cronograma de planificación.
                  <br />
                  <div className="flex gap-2 justify-center mt-4">
                    <Button
                      onClick={() => handleAddChild('root', 'fase')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Fase Manual
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          // Importar fases desde configuración global
                          const response = await fetch('/api/configuracion/fases')
                          if (!response.ok) throw new Error('Error obteniendo fases por defecto')

                          const data = await response.json()
                          if (!data.success || !data.data || data.data.length === 0) {
                            alert('No hay fases por defecto configuradas. Ve a Configuración > Fases por Defecto para crearlas.')
                            return
                          }

                          // Crear fases en el proyecto
                          let successCount = 0
                          let errorCount = 0

                          for (const faseDefault of data.data) {
                            try {
                              const createResponse = await fetch(`/api/proyectos/${proyectoId}/cronograma/fases`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  proyectoCronogramaId: selectedCronograma?.id,
                                  nombre: faseDefault.nombre,
                                  descripcion: faseDefault.descripcion,
                                  orden: faseDefault.orden
                                })
                              })

                              if (createResponse.ok) {
                                successCount++
                              } else {
                                errorCount++
                              }
                            } catch (createError) {
                              console.error(`Error creando fase ${faseDefault.nombre}:`, createError)
                              errorCount++
                            }
                          }

                          if (successCount > 0) {
                            await actions.loadTree()
                            onRefresh?.()
                            alert(`Se crearon ${successCount} fases${errorCount > 0 ? ` (${errorCount} errores)` : ''}.`)
                          } else {
                            alert('No se pudieron crear las fases. Verifica la configuración.')
                          }
                        } catch (error) {
                          console.error('Error importando fases:', error)
                          alert('Error importando fases desde configuración.')
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Importar Fases
                    </Button>
                  </div>
                </>
              )}
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


        {/* Modal de importación de EDTs (solo para fases) */}
        <ImportEdtModal
          isOpen={showImportItemsModal}
          onClose={() => {
            setShowImportItemsModal(false)
            setImportItemsData([])
            setCurrentImportNode(null)
          }}
          title="Importar EDTs del Catálogo"
          description={`Selecciona los EDTs del catálogo que deseas importar a la fase "${state.nodes.get(currentImportNode?.id || '')?.nombre || 'actual'}". Los EDTs se importarán con sus servicios asociados como actividades.`}
          edts={importItemsData}
          onImport={handleExecuteImport}
          loading={importing}
        />

        {/* Modal de importación de tareas (solo para actividades) */}
        <ImportTareasModal
          isOpen={showImportTareasModal}
          onClose={() => {
            setShowImportTareasModal(false)
            setImportTareasData([])
            setCurrentActividadNombre('')
          }}
          actividadNombre={currentActividadNombre}
          servicios={importTareasData}
          onImport={async (selectedIds) => {
            // Para actividades, importar tareas desde catálogo de servicios
            const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/import-tareas`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ actividadId: state.nodes.get(state.selectedNodeId || '')?.id, selectedIds })
            })

            if (!response.ok) throw new Error('Error importando tareas')

            // Recargar el árbol completo para mostrar las nuevas tareas importadas, preservando estado de expansión
            await actions.loadTree([...state.expandedNodes])
            setShowImportTareasModal(false)
            setImportTareasData([])
            setCurrentActividadNombre('')
            onRefresh?.()
          }}
          loading={importing}
        />

      </CardContent>
    </Card>
  )
}