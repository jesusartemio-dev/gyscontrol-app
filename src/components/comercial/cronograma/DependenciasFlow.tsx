'use client'

/**
 * 🎯 DependenciasFlow - Editor Visual de Dependencias con React Flow
 *
 * Componente que permite gestionar dependencias entre tareas de forma visual
 * usando drag & drop, similar a MS Project pero más intuitivo.
 *
 * @author Kilo Code - Arquitectura GYS
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel
} from 'reactflow'
import 'reactflow/dist/style.css'

interface Tarea {
  id: string
  nombre: string
  descripcion?: string
  estado: string
  horasEstimadas?: number
  cotizacionActividadId: string
  cotizacionActividad?: {
    nombre: string
    cotizacionEdt?: {
      nombre: string
    }
  }
  actividadNombre?: string
  edtNombre?: string
  fechaInicio?: string | null
  fechaFin?: string | null
  esHito?: boolean
  duracionHoras?: any
}

interface Dependencia {
  id?: string
  tareaOrigenId: string
  tareaDependienteId: string
  tipo: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lagMinutos?: number
}

interface DependenciasFlowProps {
  tareas: Tarea[]
  dependencias: Dependencia[]
  onChange: (dependencias: Dependencia[]) => void
  readOnly?: boolean
}

const DependenciasFlow: React.FC<DependenciasFlowProps> = ({
  tareas,
  dependencias,
  onChange,
  readOnly = false
}) => {
  // Convertir tareas a nodos de React Flow
  const initialNodes: Node[] = useMemo(() => {
    return tareas.map((tarea, index) => {
      // Calcular posición en layout jerárquico
      const actividadNombre = tarea.cotizacionActividad?.nombre || tarea.actividadNombre || 'Sin Actividad'
      const edtNombre = tarea.cotizacionActividad?.cotizacionEdt?.nombre || tarea.edtNombre || 'Sin EDT'

      // Layout: agrupar por EDT, luego por actividad
      const edtIndex = [...new Set(tareas.map(t => t.cotizacionActividad?.cotizacionEdt?.nombre || t.edtNombre))].indexOf(edtNombre)
      const actividadIndex = [...new Set(tareas.filter(t => (t.cotizacionActividad?.cotizacionEdt?.nombre || t.edtNombre) === edtNombre).map(t => t.cotizacionActividad?.nombre || t.actividadNombre))].indexOf(actividadNombre)

      // Calcular tareas por actividad para mejor espaciado vertical
      const tareasEnActividad = tareas.filter(t =>
        (t.cotizacionActividad?.cotizacionEdt?.nombre || t.edtNombre) === edtNombre &&
        (t.cotizacionActividad?.nombre || t.actividadNombre) === actividadNombre
      )
      const tareaIndexEnActividad = tareasEnActividad.findIndex(t => t.id === tarea.id)

      return {
        id: tarea.id,
        type: 'default',
        position: {
          x: edtIndex * 350 + actividadIndex * 200,
          y: tareaIndexEnActividad * 100
        },
        data: {
          label: (
            <div className="p-2 bg-white border rounded shadow-sm min-w-[200px]">
              <div className="font-medium text-sm text-gray-900">{tarea.nombre}</div>
              <div className="text-xs text-gray-500 mt-1">
                {edtNombre} → {actividadNombre}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {tarea.horasEstimadas || 0}h • {tarea.estado}
              </div>
            </div>
          )
        },
        draggable: !readOnly
      }
    })
  }, [tareas, readOnly])

  // Función para obtener color según tipo de dependencia
  const getTipoColor = (tipo: string): string => {
    switch (tipo) {
      case 'finish_to_start': return '#10b981' // verde
      case 'start_to_start': return '#3b82f6' // azul
      case 'finish_to_finish': return '#f59e0b' // amarillo
      case 'start_to_finish': return '#ef4444' // rojo
      default: return '#6b7280' // gris
    }
  }

  // Función para obtener etiqueta según tipo
  const getTipoLabel = (tipo: string): string => {
    switch (tipo) {
      case 'finish_to_start': return 'FS'
      case 'start_to_start': return 'SS'
      case 'finish_to_finish': return 'FF'
      case 'start_to_finish': return 'SF'
      default: return 'DEP'
    }
  }

  // Convertir dependencias a edges de React Flow
  const initialEdges: Edge[] = useMemo(() => {
    return dependencias.map((dep, index) => ({
      id: dep.id || `edge-${index}`,
      source: dep.tareaOrigenId,
      target: dep.tareaDependienteId,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: getTipoColor(dep.tipo),
        strokeWidth: 2
      },
      label: getTipoLabel(dep.tipo),
      labelStyle: { fontSize: 10, fontWeight: 500 }
    }))
  }, [dependencias])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Manejar conexiones (crear nuevas dependencias)
  const onConnect = useCallback((params: Connection) => {
    if (readOnly) return

    const { source, target } = params
    if (!source || !target) return

    // Evitar dependencias a sí mismo
    if (source === target) {
      console.warn('No se puede crear dependencia de una tarea a sí misma')
      return
    }

    // Verificar si ya existe la dependencia (en cualquier dirección)
    const existe = dependencias.some(dep =>
      (dep.tareaOrigenId === source && dep.tareaDependienteId === target) ||
      (dep.tareaOrigenId === target && dep.tareaDependienteId === source)
    )

    if (existe) {
      console.warn('Ya existe una dependencia entre estas tareas')
      return
    }

    // Crear nueva dependencia
    const nuevaDependencia: Dependencia = {
      tareaOrigenId: source,
      tareaDependienteId: target,
      tipo: 'finish_to_start', // default
      lagMinutos: 0
    }

    // Agregar edge visual
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source,
      target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: getTipoColor('finish_to_start'), strokeWidth: 2 },
      label: 'FS',
      labelStyle: { fontSize: 10, fontWeight: 500 }
    }

    setEdges((eds) => addEdge(newEdge, eds))
    onChange([...dependencias, nuevaDependencia])
  }, [dependencias, onChange, readOnly])

  // Manejar eliminación de dependencias
  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    if (readOnly) return

    const nuevasDependencias = dependencias.filter(dep => {
      return !edgesToDelete.some(edge =>
        edge.source === dep.tareaOrigenId && edge.target === dep.tareaDependienteId
      )
    })

    onChange(nuevasDependencias)
  }, [dependencias, onChange, readOnly])

  // Manejar eliminación con click derecho
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    if (readOnly) return

    // Eliminar la dependencia
    const nuevasDependencias = dependencias.filter(dep =>
      !(dep.tareaOrigenId === edge.source && dep.tareaDependienteId === edge.target)
    )

    setEdges((eds) => eds.filter(e => e.id !== edge.id))
    onChange(nuevasDependencias)
  }, [dependencias, onChange, readOnly])

  // Cambiar tipo de dependencia al hacer click en edge
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (readOnly) return

    // Tipos disponibles en orden cíclico
    const tipos = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']
    const currentIndex = tipos.findIndex(t => getTipoLabel(t) === edge.label)
    const nextTipo = tipos[(currentIndex + 1) % tipos.length]

    // Actualizar dependencia
    const nuevasDependencias = dependencias.map(dep => {
      if (dep.tareaOrigenId === edge.source && dep.tareaDependienteId === edge.target) {
        return { ...dep, tipo: nextTipo as any }
      }
      return dep
    })

    // Actualizar edge visual
    setEdges((eds) =>
      eds.map(e =>
        e.id === edge.id
          ? {
              ...e,
              style: { stroke: getTipoColor(nextTipo), strokeWidth: 2 },
              label: getTipoLabel(nextTipo)
            }
          : e
      )
    )

    onChange(nuevasDependencias)
  }, [dependencias, onChange, readOnly])

  return (
    <div className="w-full h-[600px] border rounded-lg bg-gray-50 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onEdgeClick={onEdgeClick}
        onEdgeContextMenu={onEdgeContextMenu}
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Controls showZoom={true} showFitView={true} showInteractive={!readOnly} />
        <Background color="#aaa" gap={16} />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'default': return '#10b981'
              default: return '#6b7280'
            }
          }}
        />

        {/* Panel de información - Compacto y abajo */}
        <Panel position="bottom-left">
          <div className="bg-white p-2 rounded shadow-sm border text-xs">
            <div className="font-medium mb-1">💡 Cómo usar:</div>
            <div className="space-y-0.5 text-gray-600 text-xs mb-2">
              <div>• Arrastrar desde un nodo a otro</div>
              <div>• Click en línea: cambiar tipo</div>
              <div>• Click derecho en línea: eliminar</div>
            </div>
            <div className="border-t pt-1">
              <div className="grid grid-cols-4 gap-1 text-xs">
                <div className="text-center">
                  <div className="w-3 h-0.5 bg-green-500 mx-auto mb-0.5"></div>
                  <span>FS</span>
                </div>
                <div className="text-center">
                  <div className="w-3 h-0.5 bg-blue-500 mx-auto mb-0.5"></div>
                  <span>SS</span>
                </div>
                <div className="text-center">
                  <div className="w-3 h-0.5 bg-yellow-500 mx-auto mb-0.5"></div>
                  <span>FF</span>
                </div>
                <div className="text-center">
                  <div className="w-3 h-0.5 bg-red-500 mx-auto mb-0.5"></div>
                  <span>SF</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default DependenciasFlow