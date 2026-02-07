'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle,
  ChevronRight, ChevronDown, Layers, ListTree, ClipboardList,
  Target, AlertTriangle, Calendar, ArrowRight, Info, Plus, Pencil, Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  parseMSProjectExcel, buildHierarchy, serializeTree,
  type MSProjectTree, type MSProjectFase
} from '@/lib/utils/msProjectExcelParser'

type Step = 'upload' | 'preview' | 'mapping' | 'importing' | 'success' | 'error'

interface CatalogEdt {
  id: string
  nombre: string
}

interface ImportExcelCronogramaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  onImportSuccess: () => void
}

const CREATE_NEW = '__create_new__'
const SKIP_EDT = '__skip__'

/**
 * Fuzzy match: checks if any catalog EDT name is contained within the Excel EDT name (case-insensitive).
 * Returns the catalog EDT id if exactly one match found, otherwise null.
 */
function autoMatchEdt(excelName: string, catalog: CatalogEdt[]): string | null {
  const normalized = excelName.toLowerCase().trim()

  // 1. Exact match first
  const exact = catalog.find(c => c.nombre.toLowerCase().trim() === normalized)
  if (exact) return exact.id

  // 2. Catalog name contained in Excel name (e.g. "PLC" in "2.2. PLC")
  const containedMatches = catalog.filter(c =>
    normalized.includes(c.nombre.toLowerCase().trim())
  )
  if (containedMatches.length === 1) return containedMatches[0].id

  return null
}

export default function ImportExcelCronogramaModal({
  open, onOpenChange, proyectoId, onImportSuccess
}: ImportExcelCronogramaModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [tree, setTree] = useState<MSProjectTree | null>(null)
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [importStats, setImportStats] = useState<Record<string, number>>({})
  const [expandedFases, setExpandedFases] = useState<Set<number>>(new Set())

  // EDT mapping state
  const [catalogEdts, setCatalogEdts] = useState<CatalogEdt[]>([])
  const [edtMappings, setEdtMappings] = useState<Record<string, string>>({})
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  // Inline editing state: "faseIdx-edtIdx-actIdx" or "faseIdx-edtIdx-actIdx-tareaIdx"
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setTree(null)
    setFileName('')
    setProgress(0)
    setErrorMessage('')
    setImportStats({})
    setExpandedFases(new Set())
    setCatalogEdts([])
    setEdtMappings({})
    setLoadingCatalog(false)
    setEditingKey(null)
    setEditingValue('')
  }, [])

  const handleClose = () => {
    if (step !== 'importing') {
      reset()
      onOpenChange(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Solo se aceptan archivos Excel (.xlsx, .xls)')
      return
    }

    setFileName(file.name)

    try {
      const rows = await parseMSProjectExcel(file)
      const hierarchy = buildHierarchy(rows)

      if (hierarchy.fases.length === 0) {
        toast.error('No se encontraron fases (Outline Level 2) en el archivo')
        return
      }

      setTree(hierarchy)
      setExpandedFases(new Set([0, 1]))
      setStep('preview')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al parsear el archivo')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // Transition from preview → mapping: fetch catalog and auto-match
  const handleGoToMapping = async () => {
    if (!tree) return

    setLoadingCatalog(true)
    try {
      const res = await fetch('/api/edt')
      if (!res.ok) throw new Error('Error al cargar catálogo de EDTs')
      const catalog: CatalogEdt[] = await res.json()
      setCatalogEdts(catalog)

      // Extract unique EDT names from tree
      const excelEdtNames = [...new Set(
        tree.fases.flatMap(f => f.edts.map(e => e.row.name))
      )]

      // Auto-match
      const mappings: Record<string, string> = {}
      for (const name of excelEdtNames) {
        const matchId = autoMatchEdt(name, catalog)
        mappings[name] = matchId || CREATE_NEW
      }

      setEdtMappings(mappings)
      setStep('mapping')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar catálogo')
    } finally {
      setLoadingCatalog(false)
    }
  }

  const handleMappingChange = (excelName: string, edtId: string) => {
    setEdtMappings(prev => ({ ...prev, [excelName]: edtId }))
  }

  const allMapped = Object.values(edtMappings).every(v => v && v.length > 0)
  const skippedCount = Object.values(edtMappings).filter(v => v === SKIP_EDT).length

  const handleImport = async () => {
    if (!tree) return

    setStep('importing')
    setProgress(10)

    try {
      setProgress(30)

      // Build final mappings: only include entries mapped to existing catalog EDTs (not CREATE_NEW or SKIP)
      const finalMappings: Record<string, string> = {}
      const skippedEdtNames = new Set<string>()
      for (const [name, edtId] of Object.entries(edtMappings)) {
        if (edtId === SKIP_EDT) {
          skippedEdtNames.add(name)
        } else if (edtId !== CREATE_NEW) {
          finalMappings[name] = edtId
        }
      }

      // Filter out skipped EDTs from the tree before serializing
      const filteredTree: MSProjectTree = {
        ...tree,
        fases: tree.fases.map(fase => ({
          ...fase,
          edts: fase.edts.filter(edt => !skippedEdtNames.has(edt.row.name)),
        })).filter(fase => fase.edts.length > 0), // Remove fases left empty
      }

      const body = {
        ...serializeTree(filteredTree) as Record<string, unknown>,
        edtMappings: finalMappings,
      }

      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/importar-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      setProgress(90)

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.message || 'Error al importar')
        setStep('error')
        return
      }

      setProgress(100)
      setImportStats({ ...data.stats, horasPorDia: data.horasPorDia })
      setStep('success')
      toast.success('Cronograma importado exitosamente')
      onImportSuccess()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error de conexión')
      setStep('error')
    }
  }

  const toggleFase = (idx: number) => {
    setExpandedFases(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const startEditing = (key: string, currentName: string) => {
    setEditingKey(key)
    setEditingValue(currentName)
  }

  const saveEditing = () => {
    if (!tree || !editingKey || !editingValue.trim()) {
      setEditingKey(null)
      return
    }

    const parts = editingKey.split('-').map(Number)
    const newTree = { ...tree, fases: [...tree.fases] }

    if (parts.length === 3) {
      // Editing activity: faseIdx-edtIdx-actIdx
      const [fIdx, eIdx, aIdx] = parts
      const fase = { ...newTree.fases[fIdx] }
      fase.edts = [...fase.edts]
      const edt = { ...fase.edts[eIdx] }
      edt.actividades = [...edt.actividades]
      const act = { ...edt.actividades[aIdx] }
      act.row = { ...act.row, name: editingValue.trim() }
      edt.actividades[aIdx] = act
      fase.edts[eIdx] = edt
      newTree.fases[fIdx] = fase
    } else if (parts.length === 4) {
      // Editing task: faseIdx-edtIdx-actIdx-tareaIdx
      const [fIdx, eIdx, aIdx, tIdx] = parts
      const fase = { ...newTree.fases[fIdx] }
      fase.edts = [...fase.edts]
      const edt = { ...fase.edts[eIdx] }
      edt.actividades = [...edt.actividades]
      const act = { ...edt.actividades[aIdx] }
      act.tareas = [...act.tareas]
      const tarea = { ...act.tareas[tIdx] }
      tarea.row = { ...tarea.row, name: editingValue.trim() }
      act.tareas[tIdx] = tarea
      edt.actividades[aIdx] = act
      fase.edts[eIdx] = edt
      newTree.fases[fIdx] = fase
    }

    setTree(newTree)
    setEditingKey(null)
    setEditingValue('')
  }

  const formatDate = (d: Date | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // Count how many were auto-matched
  const autoMatchCount = Object.values(edtMappings).filter(v => v !== CREATE_NEW && v !== SKIP_EDT).length
  const totalEdts = Object.keys(edtMappings).length
  const allSkipped = skippedCount === totalEdts

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar Cronograma desde MS Project
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel exportado de MS Project para crear la línea base del cronograma.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Arrastra tu archivo Excel o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Archivos .xlsx o .xls exportados de MS Project
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Columnas requeridas: ID, Name, Duration, Start, Finish, Predecessors, Outline Level
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Columna opcional: <strong>Work</strong> (horas persona-esfuerzo para cuadrillas)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-xs space-y-1">
                <p className="font-medium text-blue-700">Mapeo de niveles:</p>
                <div className="grid grid-cols-2 gap-1 text-blue-600">
                  <span>Outline Level 1 → Proyecto (skip)</span>
                  <span>Outline Level 2 → Fases</span>
                  <span>Outline Level 3 → EDTs</span>
                  <span>Outline Level 4 → Actividades</span>
                  <span>Outline Level 5 → Tareas</span>
                  <span>Nivel {'>'} 5 → Se ignora</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3 text-xs space-y-1.5">
                <p className="font-medium text-amber-700 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Columna &quot;Work&quot; para tareas con cuadrillas
                </p>
                <p className="text-amber-600">
                  Si tu Excel incluye la columna <strong>Work</strong>, el sistema la usa como horas
                  totales de esfuerzo (persona-horas) y calcula autom&aacute;ticamente el n&uacute;mero de personas estimadas.
                </p>
                <p className="text-amber-600">
                  <strong>Sin Work:</strong> las horas se calculan como Duration &times; horas/d&iacute;a (1 persona).
                </p>
                <p className="text-amber-600">
                  <strong>En MS Project:</strong> asegura que las tareas de cuadrilla tengan recursos asignados
                  para que el campo Work refleje el esfuerzo total del equipo.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP: Preview */}
        {step === 'preview' && tree && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Fases', value: tree.stats.fases, icon: Layers, color: 'text-purple-600' },
                { label: 'EDTs', value: tree.stats.edts, icon: ListTree, color: 'text-blue-600' },
                { label: 'Actividades', value: tree.stats.actividades, icon: ClipboardList, color: 'text-green-600' },
                { label: 'Tareas', value: tree.stats.tareas, icon: Target, color: 'text-orange-600' },
                { label: 'Ignoradas', value: tree.stats.ignored, icon: AlertTriangle, color: 'text-gray-400' },
              ].map(stat => (
                <Card key={stat.label} className="text-center">
                  <CardContent className="p-2">
                    <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
                    <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                    <div className="text-[10px] text-gray-500">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Rango de fechas */}
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(tree.dateRange.start)}</span>
              <span>→</span>
              <span>{formatDate(tree.dateRange.finish)}</span>
              <Badge variant="outline" className="ml-auto text-[10px]">{fileName}</Badge>
            </div>

            {tree.stats.hasWork && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  <strong>Columna Work detectada.</strong> Las horas reflejar&aacute;n el esfuerzo total del equipo y se calcular&aacute; el n&uacute;mero de personas estimadas por tarea.
                </span>
              </div>
            )}

            {!tree.stats.hasWork && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Sin columna Work. Las horas se calcular&aacute;n como Duration &times; horas/d&iacute;a (1 persona por tarea).
                </span>
              </div>
            )}

            {tree.stats.ignored > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                {tree.stats.ignored} filas con nivel {'>'} 5 fueron ignoradas.
              </div>
            )}

            {/* Tree Preview */}
            <Card>
              <CardContent className="p-3 max-h-[300px] overflow-y-auto">
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-gray-900 mb-2">{tree.project}</div>
                  {tree.fases.map((fase: MSProjectFase, fIdx: number) => (
                    <div key={fIdx}>
                      <button
                        className="flex items-center gap-1 w-full text-left hover:bg-gray-50 rounded px-1 py-0.5"
                        onClick={() => toggleFase(fIdx)}
                      >
                        {expandedFases.has(fIdx)
                          ? <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          : <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        }
                        <Layers className="h-3 w-3 text-purple-500 flex-shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{fase.row.name}</span>
                        <Badge variant="secondary" className="text-[9px] ml-auto flex-shrink-0">{fase.edts.length} EDTs</Badge>
                      </button>

                      {expandedFases.has(fIdx) && (
                        <div className="ml-5 space-y-0.5">
                          {fase.edts.map((edt, eIdx) => (
                            <div key={eIdx}>
                              <div className="flex items-center gap-1 px-1 py-0.5 text-gray-600">
                                <ListTree className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                <span className="truncate">{edt.row.name}</span>
                                <span className="text-[9px] text-gray-400 ml-auto flex-shrink-0">
                                  {edt.actividades.length} act, {edt.actividades.reduce((s, a) => s + a.tareas.length, 0)} tar
                                </span>
                              </div>
                              <div className="ml-5">
                                {edt.actividades.map((act, aIdx) => {
                                  const actKey = `${fIdx}-${eIdx}-${aIdx}`
                                  return (
                                    <div key={aIdx}>
                                      <div className="flex items-center gap-1 px-1 py-0.5 text-gray-500 group/act">
                                        <ClipboardList className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                                        {editingKey === actKey ? (
                                          <input
                                            className="flex-1 text-xs bg-white border border-blue-300 rounded px-1 py-0.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            value={editingValue}
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            onBlur={saveEditing}
                                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') setEditingKey(null) }}
                                            autoFocus
                                          />
                                        ) : (
                                          <>
                                            <span className="truncate">{act.row.name}</span>
                                            <button
                                              onClick={() => startEditing(actKey, act.row.name)}
                                              className="opacity-0 group-hover/act:opacity-100 transition-opacity flex-shrink-0"
                                              title="Editar nombre"
                                            >
                                              <Pencil className="h-2.5 w-2.5 text-gray-400 hover:text-blue-500" />
                                            </button>
                                          </>
                                        )}
                                        {act.tareas.length > 0 && editingKey !== actKey && (
                                          <span className="text-[9px] text-gray-400 ml-auto flex-shrink-0">
                                            {act.tareas.length} tareas
                                          </span>
                                        )}
                                      </div>
                                      {expandedFases.has(fIdx) && act.tareas.length > 0 && (
                                        <div className="ml-5">
                                          {act.tareas.map((tarea, tIdx) => {
                                            const tareaKey = `${fIdx}-${eIdx}-${aIdx}-${tIdx}`
                                            return (
                                              <div key={tIdx} className="flex items-center gap-1 px-1 py-0.5 text-gray-400 group/tarea">
                                                <Target className="h-2 w-2 text-orange-400 flex-shrink-0" />
                                                {editingKey === tareaKey ? (
                                                  <input
                                                    className="flex-1 text-xs bg-white border border-blue-300 rounded px-1 py-0.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    onBlur={saveEditing}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') setEditingKey(null) }}
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <>
                                                    <span className="truncate text-[11px]">{tarea.row.name}</span>
                                                    <button
                                                      onClick={() => startEditing(tareaKey, tarea.row.name)}
                                                      className="opacity-0 group-hover/tarea:opacity-100 transition-opacity flex-shrink-0"
                                                      title="Editar nombre"
                                                    >
                                                      <Pencil className="h-2 w-2 text-gray-400 hover:text-blue-500" />
                                                    </button>
                                                  </>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset}>
                Volver
              </Button>
              <Button
                onClick={handleGoToMapping}
                className="bg-green-600 hover:bg-green-700"
                disabled={loadingCatalog}
              >
                {loadingCatalog ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Mapping EDTs */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Mapear EDTs del Excel al Catálogo</p>
                <p className="mt-0.5">
                  Asigna cada EDT del Excel a un EDT existente de tu catálogo, o selecciona &quot;Crear nuevo&quot; para agregarlo.
                  {autoMatchCount > 0 && (
                    <span className="font-medium"> Se pre-seleccionaron {autoMatchCount} de {totalEdts} por coincidencia automática.</span>
                  )}
                  {skippedCount > 0 && (
                    <span className="text-red-600 font-medium"> {skippedCount} EDT(s) marcados como &quot;No importar&quot;.</span>
                  )}
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                    <span>EDT en Excel</span>
                    <span></span>
                    <span>EDT Catálogo</span>
                  </div>

                  {/* Rows */}
                  {Object.entries(edtMappings).map(([excelName, mappedId]) => {
                    const isMatched = mappedId !== CREATE_NEW && mappedId !== SKIP_EDT
                    const isSkipped = mappedId === SKIP_EDT
                    return (
                      <div key={excelName} className={`grid grid-cols-[1fr,auto,1fr] gap-2 px-4 py-2.5 items-center ${isSkipped ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2">
                          <ListTree className={`h-3.5 w-3.5 flex-shrink-0 ${isSkipped ? 'text-gray-300' : 'text-blue-500'}`} />
                          <span className={`text-sm font-medium truncate ${isSkipped ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{excelName}</span>
                        </div>
                        <ArrowRight className={`h-3.5 w-3.5 flex-shrink-0 ${isMatched ? 'text-green-500' : 'text-gray-300'}`} />
                        <Select
                          value={mappedId}
                          onValueChange={(val) => handleMappingChange(excelName, val)}
                        >
                          <SelectTrigger className={`h-8 text-xs ${
                            isSkipped ? 'border-red-300 bg-red-50' :
                            isMatched ? 'border-green-300 bg-green-50' :
                            'border-orange-300 bg-orange-50'
                          }`}>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SKIP_EDT}>
                              <span className="text-red-600 font-medium">No importar</span>
                            </SelectItem>
                            <SelectItem value={CREATE_NEW}>
                              <div className="flex items-center gap-1.5">
                                <Plus className="h-3 w-3 text-orange-500" />
                                <span className="text-orange-600 font-medium">Crear nuevo</span>
                              </div>
                            </SelectItem>
                            {catalogEdts.map(edt => (
                              <SelectItem key={edt.id} value={edt.id}>
                                {edt.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('preview')}>
                Volver
              </Button>
              <Button
                onClick={handleImport}
                className="bg-green-600 hover:bg-green-700"
                disabled={!allMapped || allSkipped}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Cronograma
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Importing */}
        {step === 'importing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 mx-auto text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-gray-700">Importando cronograma...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mx-auto max-w-xs">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              Creando fases, EDTs, actividades y tareas...
            </p>
          </div>
        )}

        {/* STEP: Success */}
        {step === 'success' && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-lg font-medium text-gray-900">Importación Exitosa</p>

            <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
              {[
                { label: 'Fases', value: importStats.fases },
                { label: 'EDTs', value: importStats.edts },
                { label: 'Actividades', value: importStats.actividades },
                { label: 'Tareas', value: importStats.tareas },
                { label: 'Dependencias', value: importStats.dependencias },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-[10px] text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {importStats.horasPorDia && (
              <p className="text-xs text-gray-500">
                <Calendar className="h-3 w-3 inline mr-1" />
                Horas calculadas con <strong>{importStats.horasPorDia}h/día</strong> del calendario laboral
              </p>
            )}

            <Button onClick={handleClose} className="mt-4">
              Cerrar
            </Button>
          </div>
        )}

        {/* STEP: Error */}
        {step === 'error' && (
          <div className="py-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
            <p className="text-lg font-medium text-gray-900">Error en la Importación</p>
            <p className="text-sm text-red-600 max-w-md mx-auto">{errorMessage}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={reset}>
                Volver al inicio
              </Button>
              <Button onClick={handleImport} className="bg-blue-600 hover:bg-blue-700">
                Reintentar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
