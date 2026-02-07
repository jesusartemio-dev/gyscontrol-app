'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle,
  ChevronRight, ChevronDown, Layers, ListTree, ClipboardList,
  Target, AlertTriangle, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  parseMSProjectExcel, buildHierarchy, serializeTree,
  type MSProjectTree, type MSProjectFase
} from '@/lib/utils/msProjectExcelParser'

type Step = 'upload' | 'preview' | 'importing' | 'success' | 'error'

interface ImportExcelCronogramaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  onImportSuccess: () => void
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setTree(null)
    setFileName('')
    setProgress(0)
    setErrorMessage('')
    setImportStats({})
    setExpandedFases(new Set())
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
      // Expandir las 2 primeras fases por defecto
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

  const handleImport = async () => {
    if (!tree) return

    setStep('importing')
    setProgress(10)

    try {
      setProgress(30)

      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/importar-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeTree(tree)),
      })

      setProgress(90)

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.message || 'Error al importar')
        setStep('error')
        return
      }

      setProgress(100)
      setImportStats(data.stats)
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

  const formatDate = (d: Date | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

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
                                {edt.actividades.map((act, aIdx) => (
                                  <div key={aIdx} className="flex items-center gap-1 px-1 py-0.5 text-gray-500">
                                    <ClipboardList className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                                    <span className="truncate">{act.row.name}</span>
                                    {act.tareas.length > 0 && (
                                      <span className="text-[9px] text-gray-400 ml-auto flex-shrink-0">
                                        {act.tareas.length} tareas
                                      </span>
                                    )}
                                  </div>
                                ))}
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
              <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700">
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
