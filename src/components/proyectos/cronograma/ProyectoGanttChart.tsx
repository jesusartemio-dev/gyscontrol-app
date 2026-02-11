'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ZoomIn, ZoomOut, Calendar, BarChart3, Link, Unlink, Undo, Redo, Download } from 'lucide-react'
import { toast } from 'sonner'
import { TimeGrid } from './TimeGrid'
import { GanttRow } from './GanttRow'
import { GanttDependencies } from './GanttDependencies'
import { DependencyCreator } from './DependencyCreator'
import { GanttPDFExport } from './GanttPDFExport'
import { useGanttHistory } from '@/hooks/useGanttHistory'

interface ProyectoGanttChartProps {
  proyectoId: string
  cronogramaId?: string
  height?: number
}

export function ProyectoGanttChart({ proyectoId, cronogramaId, height = 600 }: ProyectoGanttChartProps) {
  console.log('🔍 [GANTT CHART] Iniciando ProyectoGanttChart con:', { proyectoId, cronogramaId })

  const [fases, setFases] = useState<any[]>([])
  const [edts, setEdts] = useState<any[]>([])
  const [tareas, setTareas] = useState<any[]>([])
  const [subtareas, setSubtareas] = useState<any[]>([])
  const [dependencies, setDependencies] = useState<any[]>([])
  const [timelineBounds, setTimelineBounds] = useState({ start: new Date(), end: new Date() })
  const [scale, setScale] = useState<'days' | 'weeks' | 'months'>('weeks')
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showDependencies, setShowDependencies] = useState(true)
  const [draggedItem, setDraggedItem] = useState(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [baselineMap, setBaselineMap] = useState<Map<string, { start: Date; end: Date }>>(new Map())

  // Sistema de historial
  const {
    state: historyState,
    canUndo,
    canRedo,
    recordAction,
    undo,
    redo,
    clearHistory
  } = useGanttHistory({ fases: [], edts: [], tareas: [], subtareas: [], dependencies: [] })

  // Cargar datos del cronograma
  useEffect(() => {
    if (cronogramaId) {
      console.log('🔄 [GANTT CHART] Loading data for cronogramaId:', cronogramaId)
      loadCronogramaData()
    } else {
      console.log('🔄 [GANTT CHART] No cronogramaId provided, clearing data')
      setFases([])
      setEdts([])
      setTareas([])
      setSubtareas([])
      setDependencies([])
      setLoading(false)
    }
  }, [proyectoId, cronogramaId])

  const loadCronogramaData = async () => {
    try {
      setLoading(true)
      console.log('🔄 [GANTT CHART] Loading cronograma data for:', { proyectoId, cronogramaId })

      const [fasesResponse, edtsResponse, tareasResponse, subtareasResponse, dependenciesResponse] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}/fases?cronogramaId=${cronogramaId || ''}`, { credentials: 'include' }),
        fetch(`/api/proyectos/${proyectoId}/edt?cronogramaId=${cronogramaId || ''}`, { credentials: 'include' }),
        fetch(`/api/proyectos/${proyectoId}/cronograma/tareas?cronogramaId=${cronogramaId || ''}`, { credentials: 'include' }),
        fetch(`/api/proyectos/${proyectoId}/subtareas?cronogramaId=${cronogramaId || ''}`, { credentials: 'include' }),
        fetch(`/api/proyectos/${proyectoId}/cronograma/dependencias`, { credentials: 'include' })
      ])

      const fasesResponseData = fasesResponse.ok ? await fasesResponse.json() : { data: [] }
      const edtsResponseData = edtsResponse.ok ? await edtsResponse.json() : { data: [] }
      const tareasResponseData = tareasResponse.ok ? await tareasResponse.json() : { data: [] }
      const subtareasData = subtareasResponse.ok ? await subtareasResponse.json() : []
      const dependenciesResponseData = dependenciesResponse.ok ? await dependenciesResponse.json() : { data: [] }

      const fasesData = fasesResponseData.data || fasesResponseData || []
      const edtsData = edtsResponseData.data || edtsResponseData || []
      const tareasData = tareasResponseData.data || tareasResponseData || []
      const rawDepsData = dependenciesResponseData.data || dependenciesResponseData || []

      console.log('📦 [GANTT CHART] API responses:', {
        fases: Array.isArray(fasesData) ? fasesData.length : 0,
        edts: Array.isArray(edtsData) ? edtsData.length : 0,
        tareas: Array.isArray(tareasData) ? tareasData.length : 0,
        subtareas: Array.isArray(subtareasData) ? subtareasData.length : 0,
        dependencies: Array.isArray(rawDepsData) ? rawDepsData.length : 0
      })

      // Ensure all data is arrays
      const safeFasesData = Array.isArray(fasesData) ? fasesData : []
      const safeEdtsData = Array.isArray(edtsData) ? edtsData : []
      const safeTareasData = Array.isArray(tareasData) ? tareasData : []
      const safeSubtareasData = Array.isArray(subtareasData) ? subtareasData : []
      // Transform canonical dependency fields to GanttDependencies format
      const safeDependenciesData = (Array.isArray(rawDepsData) ? rawDepsData : []).map((dep: any) => ({
        id: dep.id,
        fromTaskId: dep.tareaOrigenId,
        toTaskId: dep.tareaDependienteId,
        type: dep.tipo
      }))

      const newState = {
        fases: safeFasesData,
        edts: safeEdtsData,
        tareas: safeTareasData,
        subtareas: safeSubtareasData,
        dependencies: safeDependenciesData
      }

      setFases(safeFasesData)
      setEdts(safeEdtsData)
      setTareas(safeTareasData)
      setSubtareas(safeSubtareasData)
      setDependencies(safeDependenciesData)
      clearHistory() // Reset history when loading new data

      calculateTimelineBounds(safeFasesData, safeEdtsData, safeTareasData, safeSubtareasData)

      // Load baseline overlay if this is an ejecucion cronograma
      try {
        const cronogramasRes = await fetch(`/api/proyectos/${proyectoId}/cronograma`)
        if (cronogramasRes.ok) {
          const cronogramasData = await cronogramasRes.json()
          const cronogramasList = cronogramasData.data || []
          const currentCron = cronogramasList.find((c: any) => c.id === cronogramaId)
          if (currentCron?.tipo === 'ejecucion') {
            const baselineCron = cronogramasList.find((c: any) => c.tipo === 'planificacion' && c.esBaseline)
            if (baselineCron) {
              const treeRes = await fetch(`/api/proyectos/${proyectoId}/cronograma/tree?cronogramaId=${baselineCron.id}`)
              if (treeRes.ok) {
                const treeData = await treeRes.json()
                const tree = treeData?.data?.tree || []
                const map = new Map<string, { start: Date; end: Date }>()
                for (const fase of tree) {
                  const fd = fase.data || {}
                  if (fd.fechaInicioPlan && fd.fechaFinPlan) {
                    map.set(fase.nombre, { start: new Date(fd.fechaInicioPlan), end: new Date(fd.fechaFinPlan) })
                  }
                  for (const edt of fase.children || []) {
                    const ed = edt.data || {}
                    if (ed.fechaInicioPlan && ed.fechaFinPlan) {
                      map.set(edt.nombre, { start: new Date(ed.fechaInicioPlan), end: new Date(ed.fechaFinPlan) })
                    }
                    for (const child of edt.children || []) {
                      const cd = child.data || {}
                      const cStart = cd.fechaInicio || cd.fechaInicioPlan
                      const cEnd = cd.fechaFin || cd.fechaFinPlan
                      if (cStart && cEnd) {
                        map.set(child.nombre, { start: new Date(cStart), end: new Date(cEnd) })
                      }
                      for (const sub of child.children || []) {
                        const sd = sub.data || {}
                        const sStart = sd.fechaInicio || sd.fechaInicioPlan
                        const sEnd = sd.fechaFin || sd.fechaFinPlan
                        if (sStart && sEnd) {
                          map.set(sub.nombre, { start: new Date(sStart), end: new Date(sEnd) })
                        }
                      }
                    }
                  }
                }
                setBaselineMap(map)
              }
            }
          } else {
            setBaselineMap(new Map())
          }
        }
      } catch {
        // Baseline loading is optional, don't break the chart
      }
    } catch (error) {
      console.error('Error loading cronograma data:', error)
      toast.error('Error al cargar el cronograma')
      // Set empty arrays on error
      setFases([])
      setEdts([])
      setTareas([])
      setSubtareas([])
      setDependencies([])
    } finally {
      setLoading(false)
    }
  }

  const calculateTimelineBounds = (fases: any[], edts: any[], tareas: any[], subtareas: any[]) => {
    const allDates: Date[] = []

    // Safely collect all dates
    if (Array.isArray(fases)) {
      fases.forEach(f => {
        if (f.fechaInicioPlan) allDates.push(new Date(f.fechaInicioPlan))
        if (f.fechaFinPlan) allDates.push(new Date(f.fechaFinPlan))
        if (f.fechaInicioReal) allDates.push(new Date(f.fechaInicioReal))
        if (f.fechaFinReal) allDates.push(new Date(f.fechaFinReal))
      })
    }

    if (Array.isArray(edts)) {
      edts.forEach(e => {
        if (e.fechaInicioPlan) allDates.push(new Date(e.fechaInicioPlan))
        if (e.fechaFinPlan) allDates.push(new Date(e.fechaFinPlan))
        if (e.fechaInicioReal) allDates.push(new Date(e.fechaInicioReal))
        if (e.fechaFinReal) allDates.push(new Date(e.fechaFinReal))
      })
    }

    if (Array.isArray(tareas)) {
      tareas.forEach(t => {
        if (t.fechaInicio) allDates.push(new Date(t.fechaInicio))
        if (t.fechaFin) allDates.push(new Date(t.fechaFin))
        if (t.fechaInicioReal) allDates.push(new Date(t.fechaInicioReal))
        if (t.fechaFinReal) allDates.push(new Date(t.fechaFinReal))
      })
    }

    if (Array.isArray(subtareas)) {
      subtareas.forEach(s => {
        if (s.fechaInicio) allDates.push(new Date(s.fechaInicio))
        if (s.fechaFin) allDates.push(new Date(s.fechaFin))
        if (s.fechaInicioReal) allDates.push(new Date(s.fechaInicioReal))
        if (s.fechaFinReal) allDates.push(new Date(s.fechaFinReal))
      })
    }

    if (allDates.length > 0) {
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

      minDate.setDate(minDate.getDate() - 7)
      maxDate.setDate(maxDate.getDate() + 7)

      setTimelineBounds({ start: minDate, end: maxDate })
    } else {
      // Default timeline if no dates found
      const now = new Date()
      const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const defaultEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      setTimelineBounds({ start: defaultStart, end: defaultEnd })
    }
  }

  const chartWidth = useMemo(() => {
    const days = Math.ceil((timelineBounds.end.getTime() - timelineBounds.start.getTime()) / (1000 * 60 * 60 * 24))
    const pixelsPerDay = scale === 'days' ? 40 : scale === 'weeks' ? 20 : 8
    const baseWidth = Math.max(1200, days * pixelsPerDay)
    // Limit maximum width to prevent rendering issues
    const maxWidth = 50000 // Maximum 50,000 pixels
    return Math.min(baseWidth * zoom, maxWidth)
  }, [timelineBounds, scale, zoom])

  // Función para obtener posición de tarea para dependencias
  const getTaskPosition = useCallback((taskId: string) => {
    const allTasks = [...fases, ...edts, ...tareas, ...subtareas]
    const task = allTasks.find(t => t.id === taskId)

    if (!task) return { x: 0, y: 0, width: 0, height: 0 }

    const useRealDates = task.fechaInicioReal && task.fechaFinReal
    const startDate = new Date(useRealDates ? task.fechaInicioReal : (task.fechaInicio || task.fechaInicioPlan))
    const endDate = new Date(useRealDates ? task.fechaFinReal : (task.fechaFin || task.fechaFinPlan))

    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { x: 0, y: 0, width: 0, height: 0 }

    const totalDuration = timelineBounds.end.getTime() - timelineBounds.start.getTime()
    const itemDuration = endDate.getTime() - startDate.getTime()
    const startOffset = startDate.getTime() - timelineBounds.start.getTime()

    const x = (startOffset / totalDuration) * chartWidth
    const width = Math.max(20, (itemDuration / totalDuration) * chartWidth)

    // Calcular Y basado en la jerarquía actual considerando estado expandido/colapsado
    let y = 60 // timegrid offset
    let found = false

    // Buscar en la jerarquía respetando el estado de expansión
    for (const fase of fases) {
      if (fase.id === taskId) {
        found = true
        break
      }
      y += 45 // fase height

      // Solo contar EDTs si la fase está expandida
      if (isExpanded(fase.id)) {
        const faseEdts = edts.filter(edt => edt.proyectoFaseId === fase.id)
        for (const edt of faseEdts) {
          if (edt.id === taskId) {
            found = true
            break
          }
          y += 40 // edt height

          // Solo contar tareas si el EDT está expandido
          if (isExpanded(edt.id)) {
            const edtTareas = tareas.filter(tarea => tarea.proyectoEdtId === edt.id)
            for (const tarea of edtTareas) {
              if (tarea.id === taskId) {
                found = true
                break
              }
              y += 35 // tarea height

              // Solo contar subtareas si la tarea está expandida
              if (isExpanded(tarea.id)) {
                const tareaSubtareas = subtareas.filter(subtarea => subtarea.proyectoTareaId === tarea.id)
                for (const subtarea of tareaSubtareas) {
                  if (subtarea.id === taskId) {
                    found = true
                    break
                  }
                  y += 30 // subtarea height
                }
              }
              if (found) break
            }
          }
          if (found) break
        }
      }
      if (found) break
    }

    return {
      x,
      y,
      width,
      height: 24
    }
  }, [fases, edts, tareas, subtareas, timelineBounds, chartWidth, expandedItems])

  const getTaskLevel = (task: any) => {
    if (fases.includes(task)) return 1
    if (edts.includes(task)) return 2
    if (tareas.includes(task)) return 3
    if (subtareas.includes(task)) return 4
    return 3
  }

  // Handler para drag end con historial
  const handleDragEnd = async (item: any, newStartDate: Date, newEndDate: Date) => {
    try {
      const previousData = {
        fechaInicio: item.fechaInicio || item.fechaInicioPlan,
        fechaFin: item.fechaFin || item.fechaFinPlan
      }
      const newData = { fechaInicio: newStartDate, fechaFin: newEndDate }

      // Actualizar en la base de datos
      const endpoint = getEndpointForItem(item)
      const response = await fetch(`/api/proyectos/${proyectoId}/${endpoint}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newData)
      })

      if (response.ok) {
        // Record action in history
        recordAction({
          type: 'move',
          itemId: item.id,
          itemType: getItemType(item),
          previousData,
          newData
        })

        toast.success(`"${item.nombre}" reprogramado exitosamente`)
        loadCronogramaData() // Recargar datos
      } else {
        toast.error('Error al reprogramar la tarea')
      }
    } catch (error) {
      console.error('Error updating task dates:', error)
      toast.error('Error al actualizar fechas')
    }
  }

  // Handler para resize con historial
  const handleResizeEnd = async (item: any, newStartDate: Date, newEndDate: Date) => {
    try {
      const previousData = {
        fechaInicio: item.fechaInicio || item.fechaInicioPlan,
        fechaFin: item.fechaFin || item.fechaFinPlan
      }
      const newData = { fechaInicio: newStartDate, fechaFin: newEndDate }

      const endpoint = getEndpointForItem(item)
      const response = await fetch(`/api/proyectos/${proyectoId}/${endpoint}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      })

      if (response.ok) {
        recordAction({
          type: 'resize',
          itemId: item.id,
          itemType: getItemType(item),
          previousData,
          newData
        })

        toast.success(`Duración de "${item.nombre}" actualizada`)
        loadCronogramaData()
      } else {
        toast.error('Error al actualizar duración')
      }
    } catch (error) {
      console.error('Error updating task duration:', error)
      toast.error('Error al actualizar duración')
    }
  }

  // Handlers para undo/redo
  const handleUndo = () => {
    const action = undo()
    if (action) {
      // Revertir la acción en la BD
      revertAction(action)
      toast.success('Acción deshecha')
    }
  }

  const handleRedo = () => {
    const action = redo()
    if (action) {
      // Reaplicar la acción en la BD
      applyAction(action)
      toast.success('Acción rehecha')
    }
  }

  const revertAction = async (action: any) => {
    const endpoint = getEndpointForItemType(action.itemType)
    try {
      await fetch(`/api/proyectos/${proyectoId}/${endpoint}/${action.itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(action.previousData)
      })
      loadCronogramaData()
    } catch (error) {
      console.error('Error reverting action:', error)
    }
  }

  const applyAction = async (action: any) => {
    const endpoint = getEndpointForItemType(action.itemType)
    try {
      await fetch(`/api/proyectos/${proyectoId}/${endpoint}/${action.itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(action.newData)
      })
      loadCronogramaData()
    } catch (error) {
      console.error('Error applying action:', error)
    }
  }

  const getItemType = (item: any) => {
    if (fases.includes(item)) return 'fase'
    if (edts.includes(item)) return 'edt'
    if (tareas.includes(item)) return 'tarea'
    if (subtareas.includes(item)) return 'subtarea'
    return 'tarea'
  }

  const getEndpointForItem = (item: any) => {
    if (fases.includes(item)) return 'fases'
    if (edts.includes(item)) return 'edt'
    if (tareas.includes(item)) return 'tareas'
    if (subtareas.includes(item)) return 'subtareas'
    return 'tareas'
  }

  const getEndpointForItemType = (itemType: string) => {
    switch (itemType) {
      case 'fase': return 'fases'
      case 'edt': return 'edt'
      case 'tarea': return 'tareas'
      case 'subtarea': return 'subtareas'
      default: return 'tareas'
    }
  }

  // Función para toggle expandir/colapsar
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Función para verificar si un item está expandido
  const isExpanded = (itemId: string) => {
    return expandedItems.has(itemId)
  }

  const getBaseline = (nombre: string) => baselineMap.get(nombre) || null

  const renderRows = (): React.JSX.Element[] => {
    const rows: React.JSX.Element[] = []
    let currentY = 0

    // Fases con sus EDTs, tareas y subtareas anidadas
    fases.forEach(fase => {
      const faseExpanded = isExpanded(fase.id)

      // Render fase
      const faseBaseline = getBaseline(fase.nombre)
      rows.push(
        <GanttRow
          key={`fase-${fase.id}`}
          item={fase}
          level={1}
          timelineStart={timelineBounds.start}
          timelineEnd={timelineBounds.end}
          chartWidth={chartWidth}
          y={currentY}
          onClick={() => handleItemClick(fase)}
          onDragEnd={handleDragEnd}
          onResizeEnd={handleResizeEnd}
          showDependencies={showDependencies}
          isExpanded={faseExpanded}
          hasChildren={edts.some(edt => edt.proyectoFaseId === fase.id)}
          onToggleExpand={() => toggleExpanded(fase.id)}
          showLeftColumn={false}
          baselineStart={faseBaseline?.start}
          baselineEnd={faseBaseline?.end}
        />
      )
      currentY += 45

      // EDTs de esta fase (solo si la fase está expandida)
      if (faseExpanded) {
        const faseEdts = edts.filter(edt => edt.proyectoFaseId === fase.id)
        faseEdts.forEach(edt => {
          const edtExpanded = isExpanded(edt.id)

          const edtBaseline = getBaseline(edt.nombre)
          rows.push(
            <GanttRow
              key={`edt-${edt.id}`}
              item={edt}
              level={2}
              timelineStart={timelineBounds.start}
              timelineEnd={timelineBounds.end}
              chartWidth={chartWidth}
              y={currentY}
              onClick={() => handleItemClick(edt)}
              onDragEnd={handleDragEnd}
              onResizeEnd={handleResizeEnd}
              showDependencies={showDependencies}
              isExpanded={edtExpanded}
              hasChildren={tareas.some(tarea => tarea.proyectoEdtId === edt.id)}
              onToggleExpand={() => toggleExpanded(edt.id)}
              showLeftColumn={false}
              baselineStart={edtBaseline?.start}
              baselineEnd={edtBaseline?.end}
            />
          )
          currentY += 40

          // Tareas de este EDT (solo si el EDT está expandido)
          if (edtExpanded) {
            const edtTareas = tareas.filter(tarea => tarea.proyectoEdtId === edt.id)
            edtTareas.forEach(tarea => {
              const tareaExpanded = isExpanded(tarea.id)

              const tareaBaseline = getBaseline(tarea.nombre)
              rows.push(
                <GanttRow
                  key={`tarea-${tarea.id}`}
                  item={tarea}
                  level={3}
                  timelineStart={timelineBounds.start}
                  timelineEnd={timelineBounds.end}
                  chartWidth={chartWidth}
                  y={currentY}
                  onClick={() => handleItemClick(tarea)}
                  onDragEnd={handleDragEnd}
                  onResizeEnd={handleResizeEnd}
                  showDependencies={showDependencies}
                  isExpanded={tareaExpanded}
                  hasChildren={subtareas.some(subtarea => subtarea.proyectoTareaId === tarea.id)}
                  onToggleExpand={() => toggleExpanded(tarea.id)}
                  showLeftColumn={false}
                  baselineStart={tareaBaseline?.start}
                  baselineEnd={tareaBaseline?.end}
                />
              )
              currentY += 35

              // Subtareas de esta tarea (solo si la tarea está expandida)
              if (tareaExpanded) {
                const tareaSubtareas = subtareas.filter(subtarea => subtarea.proyectoTareaId === tarea.id)
                tareaSubtareas.forEach(subtarea => {
                  const subBaseline = getBaseline(subtarea.nombre)
                  rows.push(
                    <GanttRow
                      key={`subtarea-${subtarea.id}`}
                      item={subtarea}
                      level={4}
                      timelineStart={timelineBounds.start}
                      timelineEnd={timelineBounds.end}
                      chartWidth={chartWidth}
                      y={currentY}
                      onClick={() => handleItemClick(subtarea)}
                      onDragEnd={handleDragEnd}
                      onResizeEnd={handleResizeEnd}
                      showDependencies={showDependencies}
                      showLeftColumn={false}
                      baselineStart={subBaseline?.start}
                      baselineEnd={subBaseline?.end}
                    />
                  )
                  currentY += 30
                })
              }
            })
          }
        })
      }
    })

    return rows
  }

  const renderLeftSidebar = (): React.JSX.Element[] => {
    const rows: React.JSX.Element[] = []
    let currentY = 0

    // Fases con sus EDTs, tareas y subtareas anidadas
    fases.forEach(fase => {
      const faseExpanded = isExpanded(fase.id)

      // Render fase
      rows.push(
        <GanttRow
          key={`left-fase-${fase.id}`}
          item={fase}
          level={1}
          timelineStart={timelineBounds.start}
          timelineEnd={timelineBounds.end}
          chartWidth={chartWidth}
          y={currentY}
          onClick={() => handleItemClick(fase)}
          showDependencies={showDependencies}
          isExpanded={faseExpanded}
          hasChildren={edts.some(edt => edt.proyectoFaseId === fase.id)}
          onToggleExpand={() => toggleExpanded(fase.id)}
          showLeftColumn={true}
        />
      )
      currentY += 45

      // EDTs de esta fase (solo si la fase está expandida)
      if (faseExpanded) {
        const faseEdts = edts.filter(edt => edt.proyectoFaseId === fase.id)
        faseEdts.forEach(edt => {
          const edtExpanded = isExpanded(edt.id)

          rows.push(
            <GanttRow
              key={`left-edt-${edt.id}`}
              item={edt}
              level={2}
              timelineStart={timelineBounds.start}
              timelineEnd={timelineBounds.end}
              chartWidth={chartWidth}
              y={currentY}
              onClick={() => handleItemClick(edt)}
              showDependencies={showDependencies}
              isExpanded={edtExpanded}
              hasChildren={tareas.some(tarea => tarea.proyectoEdtId === edt.id)}
              onToggleExpand={() => toggleExpanded(edt.id)}
              showLeftColumn={true}
            />
          )
          currentY += 40

          // Tareas de este EDT (solo si el EDT está expandido)
          if (edtExpanded) {
            const edtTareas = tareas.filter(tarea => tarea.proyectoEdtId === edt.id)
            edtTareas.forEach(tarea => {
              const tareaExpanded = isExpanded(tarea.id)

              rows.push(
                <GanttRow
                  key={`left-tarea-${tarea.id}`}
                  item={tarea}
                  level={3}
                  timelineStart={timelineBounds.start}
                  timelineEnd={timelineBounds.end}
                  chartWidth={chartWidth}
                  y={currentY}
                  onClick={() => handleItemClick(tarea)}
                  showDependencies={showDependencies}
                  isExpanded={tareaExpanded}
                  hasChildren={subtareas.some(subtarea => subtarea.proyectoTareaId === tarea.id)}
                  onToggleExpand={() => toggleExpanded(tarea.id)}
                  showLeftColumn={true}
                />
              )
              currentY += 35

              // Subtareas de esta tarea (solo si la tarea está expandida)
              if (tareaExpanded) {
                const tareaSubtareas = subtareas.filter(subtarea => subtarea.proyectoTareaId === tarea.id)
                tareaSubtareas.forEach(subtarea => {
                  rows.push(
                    <GanttRow
                      key={`left-subtarea-${subtarea.id}`}
                      item={subtarea}
                      level={4}
                      timelineStart={timelineBounds.start}
                      timelineEnd={timelineBounds.end}
                      chartWidth={chartWidth}
                      y={currentY}
                      onClick={() => handleItemClick(subtarea)}
                      showDependencies={showDependencies}
                      showLeftColumn={true}
                    />
                  )
                  currentY += 30
                })
              }
            })
          }
        })
      }
    })

    return rows
  }

  const handleItemClick = (item: any) => {
    console.log('Item clicked:', item)
    // Implementar modal de edición
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando cronograma...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Gantt</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Deshacer"
              className="h-8 w-8 p-0"
            >
              <Undo className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Rehacer"
              className="h-8 w-8 p-0"
            >
              <Redo className="h-3 w-3" />
            </Button>

            {/* Dependencies */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDependencies(!showDependencies)}
              title={showDependencies ? "Ocultar dependencias" : "Mostrar dependencias"}
              className="h-8 w-8 p-0"
            >
              {showDependencies ? <Unlink className="h-3 w-3" /> : <Link className="h-3 w-3" />}
            </Button>

            {/* Scale */}
            <Select value={scale} onValueChange={(value) => setScale(value as 'days' | 'weeks' | 'months')}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Días</SelectItem>
                <SelectItem value="weeks">Sem</SelectItem>
                <SelectItem value="months">Mes</SelectItem>
              </SelectContent>
            </Select>

            {/* Zoom */}
            <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="h-8 w-8 p-0">
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-xs min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="h-8 w-8 p-0">
              <ZoomIn className="h-3 w-3" />
            </Button>

            {/* Export - keep as is but smaller */}
            <div className="ml-2">
              <GanttPDFExport
                proyectoId={proyectoId}
                proyectoNombre="Proyecto"
                cronogramaId={cronogramaId}
                fases={fases}
                edts={edts}
                tareas={tareas}
                subtareas={subtareas}
                dependencies={dependencies}
                timelineStart={timelineBounds.start}
                timelineEnd={timelineBounds.end}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative overflow-auto border" style={{ height }}>
          <div style={{ width: chartWidth + 400, minHeight: height - 80 }}>
            {/* Chart area with timeline and rows */}
            <div className="relative">
              {/* Time grid positioned at top of chart area */}
              <div className="absolute left-0 top-0 bg-white border-b" style={{ left: '350px', width: chartWidth, height: '60px' }}>
                <TimeGrid
                  startDate={timelineBounds.start}
                  endDate={timelineBounds.end}
                  scale={scale}
                  width={chartWidth}
                  height={60}
                />
              </div>

              {/* Left sidebar with task names */}
              <div className="absolute left-0 top-0 w-[350px] border-r border-gray-300 bg-white">
                <div className="relative" style={{ top: '60px' }}>
                  {renderLeftSidebar()}
                </div>
              </div>

              {/* Chart content */}
              <div className="relative" style={{ width: chartWidth, left: '350px', top: '60px' }}>
                {/* Dependencies layer */}
                {showDependencies && (
                  <GanttDependencies
                    dependencies={dependencies}
                    tasks={[...fases, ...edts, ...tareas, ...subtareas]}
                    timelineStart={timelineBounds.start}
                    timelineEnd={timelineBounds.end}
                    chartWidth={chartWidth}
                    chartHeight={height - 140}
                    getTaskPosition={getTaskPosition}
                  />
                )}

                {/* Rows with bars */}
                <div className="relative">
                  {renderRows()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}