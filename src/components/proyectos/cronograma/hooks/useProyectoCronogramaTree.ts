// ===================================================
// 📁 Archivo: useProyectoCronogramaTree.ts
// 📌 Ubicación: src/components/proyectos/cronograma/hooks/
// 🔧 Descripción: Hook específico para gestión del árbol jerárquico del cronograma de PROYECTOS
// ✅ Estado global, operaciones CRUD, generación automática para proyectos
// ===================================================

import { useState, useEffect, useCallback } from 'react'
import { TreeNode, CronogramaTreeState, UseCronogramaTreeReturn, GenerateOptions, NodeType } from '../../../cronograma/types'

export function useProyectoCronogramaTree(proyectoId: string, cronogramaId?: string): UseCronogramaTreeReturn {
  const [state, setState] = useState<CronogramaTreeState>({
    nodes: new Map(),
    rootNodes: [],
    expandedNodes: new Set(),
    loadingNodes: new Set()
  })

  // Cargar árbol inicial del proyecto
  const loadTree = useCallback(async (expandedNodes: string[] = []) => {
    setState(prev => ({ ...prev, loadingNodes: new Set(['root']) }))

    try {
      const params = new URLSearchParams({
        expandedNodes: expandedNodes.join(','),
        includeProgress: 'true',
        maxDepth: '6',
        _t: Date.now().toString() // Cache busting parameter
      })

      if (cronogramaId) {
        params.append('cronogramaId', cronogramaId)
      }

      const apiUrl = `/api/proyectos/${proyectoId}/cronograma/tree?${params}`

      // ✅ Usar API específica de proyectos
      const response = await fetch(apiUrl)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error cargando árbol del proyecto: ${response.status} ${response.statusText}`)
      }

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

      // Auto-expand project-level nodes (always visible)
      const autoExpandedNodes = new Set(expandedNodes)
      rootNodes.forEach(nodeId => {
        const node = nodesMap.get(nodeId)
        if (node?.type === 'proyecto') {
          autoExpandedNodes.add(nodeId)
        }
      })

      setState(prev => {
        return {
          ...prev,
          nodes: nodesMap,
          rootNodes,
          expandedNodes: autoExpandedNodes,
          loadingNodes: new Set()
        }
      })

    } catch (error) {
      console.error('Error cargando árbol del cronograma del proyecto:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desconocido',
        loadingNodes: new Set()
      }))
    }
  }, [proyectoId, cronogramaId])

  // Generar cronograma automáticamente desde servicios del proyecto
  const generateFromServices = useCallback(async (options: GenerateOptions = {}) => {
    setState(prev => ({ ...prev, loadingNodes: new Set(['root']) }))

    try {
      const requestBody = {
        generarFases: true,
        generarEdts: true,
        generarActividades: true,
        generarTareas: true,
        cronogramaId, // ✅ Pasar el cronograma actual
        ...options
      }

      console.log('🚀 [HOOK] Generando cronograma con ID:', cronogramaId)

      // ✅ Usar API específica de proyectos
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error generando cronograma del proyecto')
      }

      const data = await response.json()

      // Recargar árbol con nueva estructura, preservando estado de expansión
      await loadTree([...state.expandedNodes])

      return data.data

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error generando cronograma del proyecto',
        loadingNodes: new Set()
      }))
      throw error
    }
  }, [proyectoId, cronogramaId, loadTree])

  // Toggle expansión de nodo
  const toggleNode = useCallback(async (nodeId: string) => {
    const node = state.nodes.get(nodeId)
    if (!node) return

    const newExpanded = !state.expandedNodes.has(nodeId)

    console.log(`🌳 [TREE EXPANSION] ${newExpanded ? 'EXPANDIENDO' : 'CONTRAÍENDO'} nodo: ${nodeId} (${node.nombre})`)

    setState(prev => {
      const newExpandedNodes = new Set(
        newExpanded
          ? [...prev.expandedNodes, nodeId]
          : [...prev.expandedNodes].filter(id => id !== nodeId)
      )

      console.log(`🌳 [TREE EXPANSION] Estado anterior: ${prev.expandedNodes.size} nodos expandidos`)
      console.log(`🌳 [TREE EXPANSION] Estado nuevo: ${newExpandedNodes.size} nodos expandidos`)
      console.log(`🌳 [TREE EXPANSION] Nodos expandidos:`, [...newExpandedNodes])

      return {
        ...prev,
        expandedNodes: newExpandedNodes
      }
    })

    // Si se expande y no tiene hijos cargados, cargar hijos
    if (newExpanded && (!node.children || node.children.length === 0) && node.metadata.hasChildren) {
      console.log(`🌳 [TREE EXPANSION] Cargando hijos para nodo expandido: ${nodeId}`)
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
      // ✅ Usar API específica de proyectos
      const response = await fetch(
        `/api/proyectos/${proyectoId}/cronograma/tree/${nodeId}/children`
      )

      if (!response.ok) throw new Error('Error cargando hijos del proyecto')

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
  }, [proyectoId, cronogramaId])

  // Crear nuevo nodo en proyecto
  const createNode = useCallback(async (parentId: string, type: NodeType, data: any) => {
    try {
      let apiEndpoint = ''
      let requestBody = {}

      // ✅ Determinar endpoint y datos según el tipo de nodo
      switch (type) {
        case 'fase':
          apiEndpoint = `/api/proyectos/${proyectoId}/cronograma/fases`
          // Usar el cronogramaId actual si está disponible, sino obtener el de planificación baseline
          let cronogramaActualId = cronogramaId

          if (!cronogramaActualId) {
            const cronogramaResponse = await fetch(`/api/proyectos/${proyectoId}/cronogramas`)
            if (!cronogramaResponse.ok) throw new Error('Error obteniendo cronogramas del proyecto')
            const cronogramas = await cronogramaResponse.json()
            const cronogramaActual = cronogramas.data?.find((c: any) => c.tipo === 'planificacion' && c.esBaseline) || cronogramas.data?.[0]
            if (!cronogramaActual) throw new Error('No se encontró un cronograma válido para el proyecto')
            cronogramaActualId = cronogramaActual.id
          }

          requestBody = {
            proyectoCronogramaId: cronogramaActualId,
            nombre: data.nombre,
            descripcion: data.descripcion,
            orden: data.orden || 0,
            fechaInicioPlan: data.fechaInicioComercial,
            fechaFinPlan: data.fechaFinComercial
          }
          break

        case 'edt':
          // Obtener una categoría de servicio por defecto desde el catálogo
          const catalogoResponse = await fetch('/api/catalogo-servicio')
          if (!catalogoResponse.ok) throw new Error('Error obteniendo catálogo de servicios')
          const catalogoData = await catalogoResponse.json()
          const servicioDefault = catalogoData?.find((s: any) => s.nombre && s.categoriaId) // Tomar el primer servicio que tenga categoriaId

          if (!servicioDefault) throw new Error('No hay servicios disponibles en el catálogo con categoría válida')

          apiEndpoint = `/api/proyectos/${proyectoId}/cronograma/edts`
          requestBody = {
            nombre: data.nombre,
            edtId: servicioDefault.categoriaId,
            proyectoFaseId: parentId !== 'root' ? parentId.replace('fase-', '') : undefined,
            fechaInicioPlan: data.fechaInicioComercial,
            fechaFinPlan: data.fechaFinComercial,
            horasPlan: data.horasEstimadas || 0,
            descripcion: data.descripcion,
            prioridad: data.prioridad || 'media'
          }
          break

        case 'actividad':
          apiEndpoint = `/api/proyectos/${proyectoId}/cronograma/actividades`
          requestBody = {
            nombre: data.nombre,
            proyectoEdtId: parentId.replace('edt-', ''),
            proyectoCronogramaId: 'current', // Will be determined by the API
            fechaInicioPlan: data.fechaInicioComercial || data.fechaInicio,
            fechaFinPlan: data.fechaFinComercial || data.fechaFin,
            horasPlan: data.horasEstimadas || 0,
            descripcion: data.descripcion,
            prioridad: data.prioridad || 'media',
            posicionamiento: data.posicionamiento || 'despues_ultima'
          }
          break

        case 'tarea':
          apiEndpoint = `/api/proyectos/${proyectoId}/cronograma/tareas`
          requestBody = {
            nombre: data.nombre,
            proyectoActividadId: parentId.replace('actividad-', ''),
            fechaInicio: data.fechaInicio,
            fechaFin: data.fechaFin,
            horasEstimadas: data.horasEstimadas || 0,
            personasEstimadas: data.personasEstimadas || 1,
            descripcion: data.descripcion,
            prioridad: data.prioridad || 'media',
            posicionamiento: data.posicionamiento || 'despues_ultima'
          }
          break

        default:
          throw new Error(`Tipo de nodo no soportado: ${type}`)
      }

      console.log('🔍 [HOOK PROYECTO TREE] Enviando request:', { apiEndpoint, requestBody })

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('🔍 [HOOK PROYECTO TREE] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ [HOOK PROYECTO TREE] Error response:', errorText)
        throw new Error(`Error creando ${type}: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ [HOOK PROYECTO TREE] Result:', result)
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
          fechaInicioComercial: newNode.fechaInicioPlan,
          fechaFinComercial: newNode.fechaFinPlan,
          horasEstimadas: newNode.horasPlan,
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
          // Si hay un nodo proyecto raíz, agregar como hijo del proyecto
          const projectNodeId = prev.rootNodes.find(id => {
            const node = newNodes.get(id)
            return node?.type === 'proyecto'
          })
          if (projectNodeId) {
            const projectNode = newNodes.get(projectNodeId)
            if (projectNode) {
              projectNode.children = [...(projectNode.children || []), treeNode]
              projectNode.metadata.totalChildren++
              projectNode.metadata.hasChildren = true
              treeNode.parentId = projectNodeId
            }
          } else {
            // Fallback: agregar a nodos raíz
            const newRootNodes = [...prev.rootNodes, treeNode.id]
            return {
              ...prev,
              nodes: newNodes,
              rootNodes: newRootNodes
            }
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
  }, [proyectoId, cronogramaId, state.nodes, state.rootNodes])

  // Actualizar nodo en proyecto
  const updateNode = useCallback(async (nodeId: string, formData: any) => {
    try {
      // ✅ Usar API específica de proyectos
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/tree/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error actualizando nodo en proyecto: ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ [HOOK UPDATE] API response:', result)

      // After successful API update, refresh the tree data to get updated values
      // Preserve expanded state by passing current expanded nodes
      console.log('🔄 [HOOK UPDATE] Preserving expanded nodes:', [...state.expandedNodes])
      console.log('🌳 [TREE STATE] Recargando árbol después de edición, preservando expansión')
      await loadTree([...state.expandedNodes])

    } catch (error) {
      console.error('❌ [HOOK UPDATE] Error:', error)
      throw error
    }
  }, [proyectoId, cronogramaId, loadTree, state.expandedNodes])

  // Eliminar nodo en proyecto
  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      // ✅ Usar API específica de proyectos
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/tree/${nodeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error eliminando nodo en proyecto')

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
  }, [proyectoId, cronogramaId, state.nodes])

  // Seleccionar nodo
  const selectNode = useCallback((nodeId: string) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId }))
  }, [])

  // Cargar datos iniciales
  useEffect(() => {
    loadTree()
  }, [loadTree, cronogramaId])

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