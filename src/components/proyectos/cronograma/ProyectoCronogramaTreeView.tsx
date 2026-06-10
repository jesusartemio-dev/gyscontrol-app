'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, TreePine, Plus, Download, List, Filter, Zap, Trash2, Clock, Calculator } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { TreeNode } from '../../cronograma/TreeNode'
import { TreeHeader } from '../../cronograma/TreeHeader'
import { TreeNodeForm } from '../../cronograma/TreeNodeForm'
import { ImportModal } from '../../cronograma/ImportModal'
import { ImportEdtModal } from '../../cronograma/ImportEdtModal'
import { ImportTareasModal } from '../../cronograma/ImportTareasModal'
import { AsignarResponsable } from './AsignarResponsable'
import { AsignarRecurso } from './AsignarRecurso'
import { CronogramaTreeViewProps, TreeNode as TreeNodeType, NodeType } from '../../cronograma/types'
import type { EdtImportSelection } from '../../cronograma/ImportEdtModal'
import { useProyectoCronogramaTree } from './hooks/useProyectoCronogramaTree'
import '../../cronograma/CronogramaTreeView.css'

// ── Wrapper sortable para cada fila del árbol ──────────────────────────────
function SortableNodeWrapper({
  nodeId,
  isReadOnly,
  children,
}: {
  nodeId: string
  isReadOnly: boolean
  children: (listeners: Record<string, Function> | undefined, attributes: Record<string, any> | undefined, isDragging: boolean) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: nodeId,
    disabled: isReadOnly,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children(
        isReadOnly ? undefined : (listeners as Record<string, Function>),
        isReadOnly ? undefined : attributes,
        isDragging,
      )}
    </div>
  )
}

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

  // Columnas de asignación: Recurso y Responsable visibles en planificación y ejecución
  const showRecursoColumn = !!selectedCronograma
  const showResponsableColumn = selectedCronograma?.tipo === 'ejecucion' || selectedCronograma?.tipo === 'planificacion'
  // Columna Peso: solo en ejecución (el peso por fase aplica al cronograma vivo)
  const showPesoColumn = selectedCronograma?.tipo === 'ejecucion'

  // ── Pesos por fase (para la columna Peso del árbol) ───────────────────────
  // Map normNombreFase → { pesoEfectivo (%), horasFase }. peso(nodo) = pesoEfectivo × horasNodo/horasFase.
  const [pesoFaseMap, setPesoFaseMap] = useState<Map<string, { pesoEfectivo: number; horasFase: number }>>(new Map())
  const normFase = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
  useEffect(() => {
    if (!showPesoColumn) { setPesoFaseMap(new Map()); return }
    let cancel = false
    fetch(`/api/proyectos/${proyectoId}/pesos-fase`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancel || !d?.fases) return
        setPesoFaseMap(new Map(d.fases.map((f: { nombre: string; pesoEfectivo: number; horasFase: number }) =>
          [normFase(f.nombre), { pesoEfectivo: f.pesoEfectivo, horasFase: f.horasFase }])))
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [proyectoId, showPesoColumn, selectedCronograma?.id, refreshKey])

  // peso por nodo: recorre el árbol cargado llevando la info de su fase.
  const pesoPorNodo = useMemo(() => {
    const acc = new Map<string, number>()
    if (!showPesoColumn || pesoFaseMap.size === 0) return acc
    const walk = (nodeIds: string[], faseInfo: { pesoEfectivo: number; horasFase: number } | null) => {
      for (const id of nodeIds) {
        const node = state.nodes.get(id)
        if (!node) continue
        let info = faseInfo
        if (node.type === 'fase') info = pesoFaseMap.get(normFase(node.nombre)) ?? null
        if (info && info.horasFase > 0) {
          const h = Number(node.data?.horasEstimadas) || 0
          acc.set(id, (info.pesoEfectivo * h) / info.horasFase)
        }
        walk(node.children?.map((c) => c.id) || [], info)
      }
    }
    walk(state.rootNodes, null)
    return acc
  }, [showPesoColumn, pesoFaseMap, state.nodes, state.rootNodes])

  // Recalcular el avance almacenado del cronograma (rollup desde el % de las tareas).
  const [recalculando, setRecalculando] = useState(false)
  const handleRecalcularAvance = async () => {
    if (!selectedCronograma) return
    setRecalculando(true)
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/cronograma/recalcular-avance?cronogramaId=${selectedCronograma.id}`,
        { method: 'POST', credentials: 'include' },
      )
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error al recalcular')
      await actions.loadTree([...state.expandedNodes])
      onRefresh?.()
      toast.success('Avance recalculado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al recalcular')
    } finally {
      setRecalculando(false)
    }
  }

  // ── DnD state ─────────────────────────────────────────────────────────────
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveNodeId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveNodeId(null)
    if (!over || active.id === over.id) return

    const activeNode = state.nodes.get(active.id as string)
    const overNode   = state.nodes.get(over.id   as string)
    if (!activeNode || !overNode) return
    if (activeNode.parentId !== overNode.parentId) return  // solo entre hermanos

    const parentNode  = activeNode.parentId ? state.nodes.get(activeNode.parentId) : null
    const siblingIds: string[] = parentNode
      ? (parentNode.children?.map(c => c.id) || [])
      : [...state.rootNodes]

    const oldIndex = siblingIds.indexOf(active.id as string)
    const newIndex = siblingIds.indexOf(over.id   as string)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const newOrder = arrayMove(siblingIds, oldIndex, newIndex)
    try {
      await Promise.all(
        newOrder.map((nodeId, index) =>
          fetch(`/api/proyectos/${proyectoId}/cronograma/tree/${nodeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orden: index }),
          })
        )
      )
      await actions.loadTree([...state.expandedNodes])
    } catch {
      toast.error('Error al reordenar')
    }
  }

  // ── Ajustar posición (snap) ────────────────────────────────────────────────
  const handleAjustarPosicion = async (nodeId: string, posicion: 'inicio_padre' | 'despues_ultimo') => {
    const node = state.nodes.get(nodeId)
    if (!node) return

    const isTarea = node.type === 'tarea'
    const fi = isTarea ? node.data.fechaInicio : (node.data.fechaInicioComercial || node.data.fechaInicioPlan)
    const ff = isTarea ? node.data.fechaFin    : (node.data.fechaFinComercial    || node.data.fechaFinPlan)
    const duracionMs = fi && ff ? new Date(ff).getTime() - new Date(fi).getTime() : 7 * 86400000

    const parent = node.parentId ? state.nodes.get(node.parentId) : null
    const parentFi = parent?.data.fechaInicioComercial || parent?.data.fechaInicioPlan || parent?.data.fechaInicio

    let newFechaInicio: Date

    if (posicion === 'inicio_padre') {
      if (!parentFi) { toast.error('El padre no tiene fecha de inicio'); return }
      newFechaInicio = new Date(parentFi)
    } else {
      const siblings = (parent?.children || []).filter(c => c.id !== nodeId)
      const maxFin = siblings.reduce((max, s) => {
        const f = s.data.fechaFin || s.data.fechaFinComercial || s.data.fechaFinPlan
        return f ? Math.max(max, new Date(f).getTime()) : max
      }, 0)
      newFechaInicio = maxFin > 0 ? new Date(maxFin + 86400000) : (parentFi ? new Date(parentFi) : new Date())
    }

    const newFechaFin = new Date(newFechaInicio.getTime() + duracionMs)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    try {
      await fetch(`/api/proyectos/${proyectoId}/cronograma/tree/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaInicioComercial: fmt(newFechaInicio),
          fechaFinComercial:    fmt(newFechaFin),
        }),
      })
      await actions.loadTree([...state.expandedNodes])
      toast.success('Posición ajustada')
    } catch {
      toast.error('Error al ajustar posición')
    }
  }

  // Estado para modal de asignar responsable
  const [responsableModal, setResponsableModal] = useState<{
    open: boolean
    tipo: 'edt' | 'tarea'
    elementoId: string
    elementoNombre: string
    responsableActual?: { id: string; name: string; email: string; role: string } | null
  }>({
    open: false,
    tipo: 'edt',
    elementoId: '',
    elementoNombre: ''
  })

  // Estado para modal de asignar recurso
  const [recursoModal, setRecursoModal] = useState<{
    open: boolean
    tipo: 'edt' | 'tarea'
    elementoId: string
    elementoNombre: string
    recursoActual?: { id: string; nombre: string; tipo: string } | null
  }>({
    open: false,
    tipo: 'edt',
    elementoId: '',
    elementoNombre: ''
  })

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

      // Para nodo proyecto, importar fases desde configuración global
      if (node.type === 'proyecto') {
        try {
          const response = await fetch('/api/configuracion/fases')
          if (!response.ok) throw new Error('Error obteniendo fases por defecto')

          const data = await response.json()
          if (!data.success || !data.data || data.data.length === 0) {
            alert('No hay fases por defecto configuradas. Ve a Configuración > Fases por Defecto para crearlas.')
            return
          }

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
        return
      }

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

  const handleAssignResponsable = (nodeId: string) => {
    const node = state.nodes.get(nodeId)
    if (!node) return

    const realId = nodeId.replace(/^(edt|tarea)-/, '')
    const tipo = node.type as 'edt' | 'tarea'

    const responsableActual = node.data.responsableId
      ? {
          id: node.data.responsableId,
          name: node.data.responsableNombre || node.data.responsable?.name || '',
          email: node.data.responsable?.email || '',
          role: node.data.responsable?.role || ''
        }
      : null

    setResponsableModal({
      open: true,
      tipo,
      elementoId: realId,
      elementoNombre: node.nombre,
      responsableActual
    })
  }

  const handleAssignRecurso = (nodeId: string) => {
    const node = state.nodes.get(nodeId)
    if (!node) return

    const realId = nodeId.replace(/^(edt|tarea)-/, '')
    const tipo = node.type as 'edt' | 'tarea'

    const recursoActual = node.data.recursoId
      ? {
          id: node.data.recursoId,
          nombre: node.data.recursoNombre || '',
          tipo: node.data.recursoTipo || 'individual'
        }
      : null

    setRecursoModal({
      open: true,
      tipo,
      elementoId: realId,
      elementoNombre: node.nombre,
      recursoActual
    })
  }

  const handleExecuteImport = async (selections: EdtImportSelection[]) => {
    if (!currentImportNode) return

    const selectedIds = selections.map(s => s.edtId)

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
      // Para fases, importar EDTs del catálogo (con nombres personalizados)
      else if (currentImportNode.type === 'fase') {
        const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/import-edts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edts: selections, faseId: currentImportNode.id })
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

  const handleDuplicateTarea = async (nodeId: string) => {
    const node = state.nodes.get(nodeId)
    if (!node || node.type !== 'tarea') return

    const proyectoActividadId = node.parentId?.replace('actividad-', '')
    if (!proyectoActividadId) return

    const fechaFinOriginal = new Date(node.data.fechaFin)
    const fechaInicioNueva = new Date(fechaFinOriginal)
    fechaInicioNueva.setDate(fechaInicioNueva.getDate() + 1)
    const fechaFinNueva = new Date(fechaInicioNueva)
    fechaFinNueva.setDate(fechaFinNueva.getDate() + 1)

    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: node.nombre,
          proyectoActividadId,
          fechaInicio: fechaInicioNueva.toISOString(),
          fechaFin: fechaFinNueva.toISOString(),
          horasEstimadas: Number(node.data.horasEstimadas) || 0,
          personasEstimadas: node.data.personasEstimadas || 1,
          prioridad: node.data.prioridad || 'media',
          recursoId: node.data.recursoId || undefined,
          responsableId: node.data.responsableId || undefined,
          esExtra: false,
        }),
      })
      if (!res.ok) throw new Error('Error al duplicar')
      await actions.loadTree([...state.expandedNodes])
      toast.success(`Tarea "${node.nombre}" duplicada`)
    } catch {
      toast.error('No se pudo duplicar la tarea')
    }
  }

  const handleDuplicarActividad = async (nodeId: string) => {
    const node = state.nodes.get(nodeId)
    if (!node || node.type !== 'actividad') return

    const actividadId = nodeId.replace('actividad-', '')
    const proyectoEdtId = node.parentId?.replace('edt-', '')
    if (!proyectoEdtId) return

    const fi = node.data.fechaInicioComercial || node.data.fechaInicioPlan
    const ff = node.data.fechaFinComercial    || node.data.fechaFinPlan
    if (!fi || !ff) { toast.error('La actividad no tiene fechas definidas'); return }

    const duracionMs = new Date(ff).getTime() - new Date(fi).getTime()
    const nuevaFechaInicio = new Date(new Date(ff).getTime() + 86400000) // día siguiente al fin
    const nuevaFechaFin    = new Date(nuevaFechaInicio.getTime() + duracionMs)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    try {
      // 1. Crear nueva actividad
      const resAct = await fetch(`/api/proyectos/${proyectoId}/cronograma/actividades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: node.nombre,
          proyectoEdtId,
          fechaInicioPlan: fmt(nuevaFechaInicio),
          fechaFinPlan: fmt(nuevaFechaFin),
          horasPlan: Number(node.data.horasPlan) || 0,
          prioridad: node.data.prioridad || 'media',
        }),
      })
      if (!resAct.ok) throw new Error('Error al crear actividad')
      const { data: nuevaActividad } = await resAct.json()

      // 2. Tareas de la actividad original — usar node.children del árbol
      //    (ya cargados, evita llamada al API que no filtra por actividad)
      const tareasHijas = (node.children || []).filter(
        c => c.type === 'tarea' && !c.data?.esExtra && !c.data?.isExtrasGroup
      )
      const fiOriginalMs = new Date(fi).getTime()

      // 3. Crear cada tarea manteniendo offset relativo al inicio de la actividad
      for (const tareaNode of tareasHijas) {
        const tFi = tareaNode.data.fechaInicio
        const tFf = tareaNode.data.fechaFin
        if (!tFi || !tFf) continue

        const offsetInicio = new Date(tFi).getTime() - fiOriginalMs
        const durTarea     = new Date(tFf).getTime() - new Date(tFi).getTime()
        const tareaInicio  = new Date(nuevaFechaInicio.getTime() + offsetInicio)
        const tareaFin     = new Date(tareaInicio.getTime() + durTarea)

        await fetch(`/api/proyectos/${proyectoId}/cronograma/tareas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: tareaNode.nombre,
            proyectoActividadId: nuevaActividad.id,
            fechaInicio: fmt(tareaInicio),
            fechaFin: fmt(tareaFin),
            horasEstimadas: Number(tareaNode.data.horasEstimadas) || 0,
            personasEstimadas: tareaNode.data.personasEstimadas || 1,
            prioridad: tareaNode.data.prioridad || 'media',
            recursoId: tareaNode.data.recursoId || undefined,
            responsableId: tareaNode.data.responsableId || undefined,
            esExtra: false,
          }),
        })
      }

      await actions.loadTree([...state.expandedNodes])
      toast.success(`Actividad "${node.nombre}" duplicada con sus tareas`)
    } catch {
      toast.error('No se pudo duplicar la actividad')
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

  const rowCounterRef = useRef(0)

  const renderTree = (nodeIds: string[], level = 0): React.ReactNode => {
    return (
      <SortableContext items={nodeIds} strategy={verticalListSortingStrategy}>
        {nodeIds.map(nodeId => {
          const node = state.nodes.get(nodeId)
          if (!node) return null

          const isSelected = state.selectedNodeId === nodeId
          const childNodeIds = node.children?.map(child => child.id) || []
          const isReadOnly = selectedCronograma?.tipo === 'comercial' || selectedCronograma?.bloqueado === true
          const currentRowIndex = rowCounterRef.current++

          return (
            <React.Fragment key={nodeId}>
              <SortableNodeWrapper nodeId={nodeId} isReadOnly={isReadOnly || node.type === 'proyecto'}>
                {(dragListeners, dragAttributes, isDragging) => (
                  <TreeNode
                    node={node}
                    onToggle={() => actions.toggleNode(nodeId)}
                    onAddChild={isReadOnly ? undefined : (type) => handleAddChild(nodeId, type)}
                    onEdit={isReadOnly || node.type === 'proyecto' ? undefined : () => handleEditNode(nodeId)}
                    onDelete={isReadOnly || node.type === 'proyecto' ? undefined : () => actions.deleteNode(nodeId)}
                    onDuplicate={!isReadOnly && node.type === 'tarea' ? () => handleDuplicateTarea(nodeId) : undefined}
                    onDuplicarActividad={!isReadOnly && node.type === 'actividad' ? () => handleDuplicarActividad(nodeId) : undefined}
                    onAjustarPosicion={
                      !isReadOnly && (node.type === 'tarea' || node.type === 'actividad')
                        ? (pos) => handleAjustarPosicion(nodeId, pos)
                        : undefined
                    }
                    onImport={isReadOnly ? undefined : () => handleImportItems(nodeId)}
                    onSelect={() => actions.selectNode(nodeId)}
                    isSelected={isSelected}
                    readOnly={isReadOnly}
                    showRecursoColumn={showRecursoColumn}
                    showResponsableColumn={showResponsableColumn}
                    showPesoColumn={showPesoColumn}
                    pesoGlobal={pesoPorNodo.get(nodeId)}
                    rowIndex={currentRowIndex}
                    dragListeners={dragListeners}
                    dragAttributes={dragAttributes}
                    isDragging={isDragging}
                    onAssignRecurso={
                      !isReadOnly && showRecursoColumn && (node.type === 'edt' || node.type === 'tarea')
                        ? () => handleAssignRecurso(nodeId)
                        : undefined
                    }
                    onAssignResponsable={
                      !isReadOnly && showResponsableColumn && (node.type === 'edt' || node.type === 'tarea')
                        ? () => handleAssignResponsable(nodeId)
                        : undefined
                    }
                  />
                )}
              </SortableNodeWrapper>
              {state.expandedNodes.has(nodeId) && childNodeIds.length > 0 && (
                <div className="tree-children">
                  {renderTree(childNodeIds, level + 1)}
                </div>
              )}
            </React.Fragment>
          )
        })}
      </SortableContext>
    )
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
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                    selectedCronograma.tipo === 'comercial' ? 'bg-blue-100 text-blue-800' :
                    selectedCronograma.tipo === 'planificacion' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedCronograma.tipo === 'comercial' ? 'Comercial' :
                     selectedCronograma.tipo === 'planificacion' ? 'Línea Base' :
                     'Ejecución'}
                  </span>
                  {selectedCronograma.tipo === 'comercial' && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                      Solo lectura
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
            {(selectedCronograma?.tipo === 'ejecucion' || selectedCronograma?.tipo === 'planificacion') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalcularAvance}
                disabled={recalculando || state.loadingNodes.has('root')}
                title="Recalcula el % de avance de fases/EDTs/actividades desde el % de las tareas"
              >
                <Calculator className={`h-4 w-4 mr-2 ${recalculando ? 'animate-spin' : ''}`} />
                {recalculando ? 'Recalculando…' : 'Recalcular avance'}
              </Button>
            )}
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
        {/* Generación automática - Solo para cronograma de planificación (Línea Base) */}
        {selectedCronograma?.tipo !== 'comercial' && selectedCronograma?.tipo === 'planificacion' && (
          <div className="mb-4">
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
            <>
              <TreeHeader showRecursoColumn={showRecursoColumn} showResponsableColumn={showResponsableColumn} showPesoColumn={showPesoColumn} />
              <div className="p-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  {(() => { rowCounterRef.current = 0; return renderTree(state.rootNodes) })()}
                  <DragOverlay>
                    {activeNodeId ? (
                      <div className="bg-white border border-blue-300 rounded shadow-lg px-3 py-1.5 text-sm font-medium text-gray-800 opacity-90">
                        {state.nodes.get(activeNodeId)?.nombre ?? ''}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </>
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
            proyectoId={proyectoId}
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

        {/* Modal de asignación de responsable */}
        <AsignarResponsable
          open={responsableModal.open}
          onOpenChange={(open) => setResponsableModal(prev => ({ ...prev, open }))}
          tipo={responsableModal.tipo}
          elementoId={responsableModal.elementoId}
          elementoNombre={responsableModal.elementoNombre}
          responsableActual={responsableModal.responsableActual}
          onAsignacionExitosa={async () => {
            setResponsableModal(prev => ({ ...prev, open: false }))
            await actions.loadTree([...state.expandedNodes])
            onRefresh?.()
          }}
        />

        {/* Modal de asignación de recurso */}
        <AsignarRecurso
          open={recursoModal.open}
          onOpenChange={(open) => setRecursoModal(prev => ({ ...prev, open }))}
          tipo={recursoModal.tipo}
          elementoId={recursoModal.elementoId}
          elementoNombre={recursoModal.elementoNombre}
          recursoActual={recursoModal.recursoActual}
          onAsignacionExitosa={async () => {
            setRecursoModal(prev => ({ ...prev, open: false }))
            await actions.loadTree([...state.expandedNodes])
            onRefresh?.()
          }}
        />

      </CardContent>
    </Card>
  )
}