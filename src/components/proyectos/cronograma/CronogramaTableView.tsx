'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule,
  type ColDef,
  type GridReadyEvent,
  type CellValueChangedEvent,
  type ValueFormatterParams,
  type ICellRendererParams,
} from 'ag-grid-community'
import { useToast } from '@/hooks/use-toast'

// Register all community modules
import { ModuleRegistry } from 'ag-grid-community'
ModuleRegistry.registerModules([AllCommunityModule])

interface CronogramaTableViewProps {
  proyectoId: string
  cronogramaId?: string
  refreshKey?: number
  horasPorDia?: number
}

interface FlatRow {
  id: string
  tipo: string         // proyecto | fase | edt | actividad | tarea
  level: number        // 0=proyecto, 1=fase, 2=edt, 3=actividad, 4=tarea
  nombre: string
  descripcion: string
  horasEstimadas: number // raw hours for duration formatting
  fechaInicio: string
  fechaFin: string
  estado: string
  avance: number
  horasPlan: number
  horasReales: number
  responsable: string
  prioridad: string
}

const ESTADO_OPTIONS = ['pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada']
const PRIORIDAD_OPTIONS = ['baja', 'media', 'alta', 'critica']

const TIPO_LABEL: Record<string, string> = {
  proyecto: 'Proyecto',
  fase: 'Fase',
  edt: 'EDT',
  actividad: 'Actividad',
  tarea: 'Tarea',
}

const LEVEL_INDENT = 20 // pixels per level

function flattenTree(node: any): FlatRow[] {
  const rows: FlatRow[] = []
  const data = node.data || {}
  const nodeId = node.id?.replace(/^(proyecto|fase|edt|actividad|tarea)-/, '') || node.id
  const tipo = node.type || 'tarea'
  const level = node.level ?? 0

  const fechaInicio = data.fechaInicio || data.fechaInicioComercial || ''
  const fechaFin = data.fechaFin || data.fechaFinComercial || ''
  const horas = Number(data.horasEstimadas || 0)

  rows.push({
    id: nodeId,
    tipo,
    level,
    nombre: node.nombre || '',
    descripcion: data.descripcion || '',
    horasEstimadas: horas,
    fechaInicio: fechaInicio ? formatDate(fechaInicio) : '',
    fechaFin: fechaFin ? formatDate(fechaFin) : '',
    estado: data.estado || 'pendiente',
    avance: data.progreso || 0,
    horasPlan: horas,
    horasReales: Number(data.horasReales || 0),
    responsable: data.responsable?.name || '',
    prioridad: data.prioridad || 'media',
  })

  if (node.children) {
    for (const child of node.children) {
      rows.push(...flattenTree(child))
    }
  }

  return rows
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

function formatDuration(horas: number, horasPorDia: number): string {
  if (!horas || horas === 0) return '\u2014'
  const dias = Math.floor(horas / horasPorDia)
  const hsRestantes = Math.round(horas % horasPorDia)
  if (dias === 0) return `${hsRestantes}h`
  if (hsRestantes === 0) return `${dias}d`
  return `${dias}d ${hsRestantes}h`
}

function formatHoras(value: number): string {
  if (!value || value === 0) return '\u2014'
  return `${value}h`
}

// Row style config per tipo
const ROW_STYLES: Record<string, { background: string; color: string; fontWeight: string }> = {
  proyecto:  { background: '#0f2744', color: '#ffffff', fontWeight: '700' },
  fase:      { background: '#1e3a5f', color: '#ffffff', fontWeight: '700' },
  edt:       { background: '#e8f0f7', color: '#1e3a5f', fontWeight: '600' },
  actividad: { background: '#f8fafc', color: '#374151', fontWeight: '500' },
  tarea:     { background: '#ffffff', color: '#4b5563', fontWeight: '400' },
}

// Custom cell renderer for the nombre column with indentation
function NombreCellRenderer(params: ICellRendererParams<FlatRow>) {
  const row = params.data
  if (!row) return null
  const indent = row.level * LEVEL_INDENT

  return (
    <div style={{ paddingLeft: `${indent}px`, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {row.nombre}
    </div>
  )
}

export function CronogramaTableView({ proyectoId, cronogramaId, refreshKey, horasPorDia = 8 }: CronogramaTableViewProps) {
  const [rowData, setRowData] = useState<FlatRow[]>([])
  const [loading, setLoading] = useState(true)
  const gridRef = useRef<AgGridReact>(null)
  const { toast } = useToast()

  const toastRef = useRef(toast)
  toastRef.current = toast
  const propsRef = useRef({ proyectoId, cronogramaId })
  propsRef.current = { proyectoId, cronogramaId }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { proyectoId: pid, cronogramaId: cid } = propsRef.current
      const url = cid
        ? `/api/proyectos/${pid}/cronograma/tree?cronogramaId=${cid}`
        : `/api/proyectos/${pid}/cronograma/tree`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Error al obtener datos')
      const json = await response.json()
      const treeArray = json?.data?.tree || json?.tree || []

      const rows: FlatRow[] = []
      for (const root of treeArray) {
        rows.push(...flattenTree(root))
      }
      setRowData(rows)
    } catch (error) {
      console.error('Error loading cronograma table:', error)
      toastRef.current({ title: 'Error', description: 'No se pudo cargar el cronograma', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData, proyectoId, cronogramaId, refreshKey])

  const columnDefs = useMemo<ColDef<FlatRow>[]>(() => [
    {
      field: 'tipo',
      headerName: 'Tipo',
      width: 95,
      minWidth: 90,
      editable: false,
      valueFormatter: (params: ValueFormatterParams) => TIPO_LABEL[params.value] || params.value,
    },
    {
      field: 'nombre',
      headerName: 'Nombre',
      flex: 2,
      minWidth: 300,
      editable: true,
      cellRenderer: NombreCellRenderer,
    },
    {
      field: 'horasEstimadas',
      headerName: 'Duración',
      width: 100,
      editable: false,
      valueFormatter: (params: ValueFormatterParams) => formatDuration(params.value, horasPorDia),
    },
    {
      field: 'fechaInicio',
      headerName: 'Inicio',
      width: 110,
      editable: (params) => params.data?.tipo === 'tarea',
    },
    {
      field: 'fechaFin',
      headerName: 'Fin',
      width: 110,
      editable: (params) => params.data?.tipo === 'tarea',
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ESTADO_OPTIONS },
    },
    {
      field: 'avance',
      headerName: 'Avance %',
      width: 90,
      editable: (params) => !['proyecto', 'fase'].includes(params.data?.tipo || ''),
      valueFormatter: (params: ValueFormatterParams) => `${params.value}%`,
    },
    {
      field: 'horasPlan',
      headerName: 'Hrs Plan',
      width: 85,
      minWidth: 80,
      editable: (params) => params.data?.tipo === 'tarea',
      valueFormatter: (params: ValueFormatterParams) => formatHoras(params.value),
    },
    {
      field: 'horasReales',
      headerName: 'Hrs Real',
      width: 85,
      minWidth: 80,
      editable: false,
      valueFormatter: (params: ValueFormatterParams) => formatHoras(params.value),
    },
    {
      field: 'responsable',
      headerName: 'Responsable',
      width: 130,
      editable: false,
    },
    {
      field: 'prioridad',
      headerName: 'Prioridad',
      width: 100,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: PRIORIDAD_OPTIONS },
      hide: true,
    },
    {
      field: 'descripcion',
      headerName: 'Notas',
      width: 200,
      editable: true,
      hide: true,
    },
  ], [horasPorDia])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: false,
    cellStyle: { fontSize: '12px' },
  }), [])

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<FlatRow>) => {
    const row = event.data
    if (!row) return

    const field = event.colDef.field as string
    const newValue = event.newValue
    const tipo = row.tipo

    // Build update payload based on field
    const payload: Record<string, any> = {}
    if (field === 'nombre') payload.nombre = newValue
    else if (field === 'descripcion') payload.descripcion = newValue
    else if (field === 'estado') payload.estado = newValue
    else if (field === 'prioridad') payload.prioridad = newValue
    else if (field === 'avance') {
      if (tipo === 'tarea') payload.porcentajeCompletado = Number(newValue)
      else payload.porcentajeAvance = Number(newValue)
    }
    else if (field === 'horasPlan') {
      if (tipo === 'tarea') payload.horasEstimadas = Number(newValue)
      else payload.horasPlan = Number(newValue)
    }
    else return // Field not updatable

    // Determine API endpoint
    const pid = propsRef.current.proyectoId
    let url = ''
    if (tipo === 'fase') url = `/api/proyectos/${pid}/cronograma/tree/fase-${row.id}`
    else if (tipo === 'edt') url = `/api/proyectos/${pid}/cronograma/tree/edt-${row.id}`
    else if (tipo === 'actividad') url = `/api/proyectos/${pid}/cronograma/tree/actividad-${row.id}`
    else if (tipo === 'tarea') url = `/api/proyectos/${pid}/cronograma/tree/tarea-${row.id}`
    else return

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Error al actualizar')
      }

      toastRef.current({ title: 'Actualizado', description: `${TIPO_LABEL[tipo]} "${row.nombre}" actualizado` })
    } catch (error) {
      toastRef.current({
        title: 'Error al guardar',
        description: error instanceof Error ? error.message : 'No se pudo actualizar',
        variant: 'destructive',
      })
      // Revert the change
      event.api.undoCellEditing()
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData])

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit()
  }, [])

  const getRowStyle = useCallback((params: any) => {
    const tipo = params.data?.tipo
    const style = ROW_STYLES[tipo]
    if (!style) return undefined
    return { background: style.background, color: style.color, fontWeight: style.fontWeight }
  }, [])

  const getRowClass = useCallback((params: any) => {
    const tipo = params.data?.tipo
    if (tipo === 'proyecto') return 'cronograma-row-proyecto'
    if (tipo === 'fase') return 'cronograma-row-fase'
    if (tipo === 'edt') return 'cronograma-row-edt'
    return ''
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Cargando tabla del cronograma...
      </div>
    )
  }

  return (
    <div className="ag-theme-alpine cronograma-table-wrapper" style={{ height: 'calc(100vh - 340px)', width: '100%' }}>
      <style>{`
        .cronograma-table-wrapper.ag-theme-alpine {
          --ag-font-size: 12px;
          --ag-row-height: 32px;
          --ag-header-height: 34px;
          --ag-border-color: #e5e7eb;
          --ag-header-background-color: #f9fafb;
          --ag-odd-row-background-color: #ffffff;
          --ag-row-hover-color: #f3f4f6;
          --ag-selected-row-background-color: #eff6ff;
        }
        .cronograma-table-wrapper .ag-header-cell-label {
          font-size: 11px;
          font-weight: 600;
        }
        .cronograma-table-wrapper .ag-cell {
          line-height: 32px;
        }
        /* Hover for dark rows (Proyecto / Fase) */
        .cronograma-table-wrapper .ag-row.cronograma-row-proyecto:hover {
          background-color: #1a3558 !important;
        }
        .cronograma-table-wrapper .ag-row.cronograma-row-fase:hover {
          background-color: #274b73 !important;
        }
        /* EDT hover */
        .cronograma-table-wrapper .ag-row.cronograma-row-edt:hover {
          background-color: #d6e6f2 !important;
        }
        /* Cell focus border on dark rows */
        .cronograma-table-wrapper .ag-row.cronograma-row-proyecto .ag-cell-focus,
        .cronograma-table-wrapper .ag-row.cronograma-row-fase .ag-cell-focus {
          border-color: rgba(255, 255, 255, 0.5) !important;
        }
        /* Range selection on dark rows */
        .cronograma-table-wrapper .ag-row.cronograma-row-proyecto .ag-cell-range-selected,
        .cronograma-table-wrapper .ag-row.cronograma-row-fase .ag-cell-range-selected {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
      <AgGridReact<FlatRow>
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        animateRows={true}
        enableCellTextSelection={true}
        onCellValueChanged={onCellValueChanged}
        onGridReady={onGridReady}
        getRowStyle={getRowStyle}
        getRowClass={getRowClass}
        undoRedoCellEditing={true}
        undoRedoCellEditingLimit={20}
        stopEditingWhenCellsLoseFocus={true}
        suppressClickEdit={false}
      />
    </div>
  )
}
