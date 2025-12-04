// ===================================================
// 📁 Archivo: useCronogramaTree.ts
// 📌 Ubicación: src/components/cronograma/hooks/
// 🔧 Descripción: Hook principal para gestión del árbol jerárquico del cronograma
// ✅ Estado global, operaciones CRUD, generación automática
// ===================================================

import { useState, useEffect, useCallback } from 'react'
import { TreeNode, CronogramaTreeState, UseCronogramaTreeReturn, GenerateOptions, NodeType } from '../types'

export function useCronogramaTree(cotizacionId: string, isProyecto: boolean = false): UseCronogramaTreeReturn {
  const [state, setState] = useState<CronogramaTreeState>({
    nodes: new Map(),
    rootNodes: [],
    expandedNodes: new Set(),
    loadingNodes: new Set()
  })

  // Cargar árbol inicial
  const loadTree = useCallback(async (expandedNodes: string[] = []) => {
    setState(prev => ({ ...prev, loadingNodes: new Set(['root']) }))

    try {
      const params = new URLSearchParams({
        expandedNodes: expandedNodes.join(','),
        includeProgress: 'true',
        maxDepth: '6',
        _t: Date.now().toString() // Cache busting parameter
      })

      const apiPath = isProyecto ? 'proyectos' : 'cotizaciones'
      const response = await fetch(
        `/api/${apiPath}/${cotizacionId}/cronograma/tree?${params}`
      )

      if (!response.ok) throw new Error('Error cargando árbol')

      const data = await response.json()

      // Convertir array a Map para acceso O(1)
      const nodesMap = new Map<string, TreeNode>()
      const rootNodes: string[] = []

      const processNodes = (nodes: any[], parentId?: string) => {
        nodes.forEach(node => {
          // Asegurar que el nodo tenga la estructura correcta
          const processedNode: TreeNode = {
            id: node.id,
            type: node.type,
            nombre: node.nombre,
            parentId,
            level: node.level || 0,
            expanded: node.expanded || false,
            loading: node.loading || false,
            data: node.data || {},
            metadata: node.metadata || {
              hasChildren: node.hasChildren || (node.children?.length > 0) || false,
              totalChildren: node.totalChildren || (node.children?.length || 0),
              progressPercentage: node.progressPercentage || 0,
              status: node.status || 'pendiente'
            },
            children: node.children || []
          }

          nodesMap.set(node.id, processedNode)

          if (!parentId) {
            rootNodes.push(node.id)
          }

          if (node.children?.length > 0) {
            processNodes(node.children, node.id)
          }
        })
      }

      processNodes(data.data.tree)

      setState(prev => ({
        ...prev,
        nodes: nodesMap,
        rootNodes,
        expandedNodes: new Set(expandedNodes),
        loadingNodes: new Set()
      }))

    } catch (error) {
      console.error('❌ Error cargando árbol del cronograma:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desconocido',
        loadingNodes: new Set()
      }))
    }
  }, [cotizacionId, isProyecto])

  // Generar cronograma automáticamente desde servicios
  const generateFromServices = useCallback(async (options: GenerateOptions = {}) => {
    setState(prev => ({ ...prev, loadingNodes: new Set(['root']) }))

    try {
      const requestBody = {
        generarFases: true,
        generarEdts: true,
        generarActividades: true,
        generarTareas: true,
        ...options
      }

      const apiPath = isProyecto ? 'proyectos' : 'cotizaciones'
      const response = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error generando cronograma')
      }

      const data = await response.json()

      // Recargar árbol con nueva estructura
      await loadTree()

      return data.data

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error generando cronograma',
        loadingNodes: new Set()
      }))
      throw error
    }
  }, [cotizacionId, loadTree, isProyecto])

  // Toggle expansión de nodo
  const toggleNode = useCallback(async (nodeId: string) => {
    const node = state.nodes.get(nodeId)
    if (!node) return

    const newExpanded = !state.expandedNodes.has(nodeId)

    setState(prev => ({
      ...prev,
      expandedNodes: new Set(
        newExpanded
          ? [...prev.expandedNodes, nodeId]
          : [...prev.expandedNodes].filter(id => id !== nodeId)
      )
    }))

    // Si se expande y no tiene hijos cargados, cargar hijos
    if (newExpanded && (!node.children || node.children.length === 0) && node.metadata.hasChildren) {
      await loadNodeChildren(nodeId)
    }
  }, [state.nodes, state.expandedNodes])

  // Cargar hijos de un nodo específico
  const loadNodeChildren = useCallback(async (nodeId: string) => {
    setState(prev => ({
      ...prev,
      loadingNodes: new Set([...prev.loadingNodes, nodeId])
    }))

    try {
      const apiPath = isProyecto ? 'proyectos' : 'cotizaciones'
      const response = await fetch(
        `/api/${apiPath}/${cotizacionId}/cronograma/tree/${nodeId}/children`
      )

      if (!response.ok) throw new Error('Error cargando hijos')

      const data = await response.json()

      setState(prev => {
        const newNodes = new Map(prev.nodes)
        const parentNode = newNodes.get(nodeId)

        if (parentNode) {
          parentNode.children = data.data.children
          parentNode.loading = false

          // Agregar hijos al mapa
          data.data.children.forEach((child: any) => {
            const processedChild: TreeNode = {
              id: child.id,
              type: child.type,
              nombre: child.nombre,
              parentId: nodeId,
              level: child.level || 0,
              expanded: child.expanded || false,
              loading: child.loading || false,
              data: child.data || {},
              metadata: child.metadata || {
                hasChildren: child.hasChildren || (child.children?.length > 0) || false,
                totalChildren: child.totalChildren || (child.children?.length || 0),
                progressPercentage: child.progressPercentage || 0,
                status: child.status || 'pendiente'
              },
              children: child.children || []
            }
            newNodes.set(child.id, processedChild)
          })
        }

        return {
          ...prev,
          nodes: newNodes,
          loadingNodes: new Set([...prev.loadingNodes].filter(id => id !== nodeId))
        }
      })

    } catch (error) {
      setState(prev => ({
        ...prev,
        loadingNodes: new Set([...prev.loadingNodes].filter(id => id !== nodeId))
      }))
    }
  }, [cotizacionId, isProyecto])

  // Crear nuevo nodo
  const createNode = useCallback(async (parentId: string, type: NodeType, data: any) => {
    try {
      const apiPath = isProyecto ? 'proyectos' : 'cotizaciones'
      const response = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/tree/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, type, data })
      })

      if (!response.ok) throw new Error('Error creando nodo')

      const result = await response.json()
      const newNode = result.data

      // Calcular el nivel correcto basado en el padre
      let calculatedLevel = 1 // Nivel por defecto para fases
      if (parentId && parentId !== 'root') {
        const parentNode = state.nodes.get(parentId)
        if (parentNode) {
          calculatedLevel = parentNode.level + 1
        }
      } else if (parentId === 'root') {
        // Para nodos raíz, determinar nivel basado en tipo
        switch (type) {
          case 'fase':
            calculatedLevel = 1
            break
          case 'edt':
            calculatedLevel = 1 // EDTs sin fase padre son raíz
            break
          default:
            calculatedLevel = 1
        }
      }

      // Convertir el resultado de la API al formato TreeNode
      const treeNode: TreeNode = {
        id: `${type}-${newNode.id}`,
        type,
        nombre: newNode.nombre,
        parentId,
        level: calculatedLevel,
        expanded: false,
        loading: false,
        data: {
          descripcion: newNode.descripcion,
          fechaInicioComercial: newNode.fechaInicioComercial,
          fechaFinComercial: newNode.fechaFinComercial,
          horasEstimadas: newNode.horasEstimadas,
          prioridad: newNode.prioridad,
          estado: newNode.estado
        },
        metadata: {
          hasChildren: false,
          totalChildren: 0,
          progressPercentage: 0,
          status: newNode.estado || 'pendiente'
        },
        children: []
      }

      setState(prev => {
        const newNodes = new Map(prev.nodes)

        // Agregar nuevo nodo
        newNodes.set(treeNode.id, treeNode)

        // Actualizar padre si existe
        if (parentId && parentId !== 'root') {
          const parent = newNodes.get(parentId)
          if (parent) {
            parent.children = [...(parent.children || []), treeNode]
            parent.metadata.totalChildren++
            parent.metadata.hasChildren = true
          }
        } else if (parentId === 'root') {
          // Agregar a nodos raíz
          const newRootNodes = [...prev.rootNodes, treeNode.id]
          return {
            ...prev,
            nodes: newNodes,
            rootNodes: newRootNodes
          }
        }

        return {
          ...prev,
          nodes: newNodes
        }
      })

      return treeNode

    } catch (error) {
      throw error
    }
  }, [cotizacionId, state.nodes, state.rootNodes, isProyecto])

  // Actualizar nodo
  const updateNode = useCallback(async (nodeId: string, formData: any) => {
    try {
      const apiPath = isProyecto ? 'proyectos' : 'cotizaciones'
      const response = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/tree/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Error actualizando nodo')

      // After successful API update, refresh the tree data to get updated values
      await loadTree([...state.expandedNodes])

    } catch (error) {
      throw error
    }
  }, [cotizacionId, loadTree, state.expandedNodes, isProyecto])

  // Eliminar nodo
  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      const apiPath = isProyecto ? 'proyectos' : 'cotizaciones'
      const response = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/tree/${nodeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error eliminando nodo')

      setState(prev => {
        const newNodes = new Map(prev.nodes)
        const nodeToDelete = newNodes.get(nodeId)

        if (nodeToDelete) {
          // Remover de hijos del padre
          const parent = nodeToDelete.parentId ? newNodes.get(nodeToDelete.parentId) : null
          if (parent && parent.children) {
            parent.children = parent.children.filter(child => child.id !== nodeId)
            parent.metadata.totalChildren--
          }

          // Remover nodo
          newNodes.delete(nodeId)
        }

        return { ...prev, nodes: newNodes }
      })

    } catch (error) {
      throw error
    }
  }, [cotizacionId, state.nodes, isProyecto])

  // Seleccionar nodo
  const selectNode = useCallback((nodeId: string) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId }))
  }, [])

  // Cargar datos iniciales
  useEffect(() => {
    loadTree()
  }, [loadTree])

  return {
    state,
    actions: {
      loadTree,
      toggleNode,
      createNode,
      updateNode,
      deleteNode,
      generateFromServices,
      selectNode
    }
  }
}