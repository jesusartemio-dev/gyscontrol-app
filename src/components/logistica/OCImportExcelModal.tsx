'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  FileSpreadsheet,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  FileWarning,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  leerExcelOC,
  validarOCImport,
  generarPlantillaOC,
  type OCGroupValidated,
  type OCImportResult,
} from '@/lib/utils/ordenCompraExcel'

interface ProveedorRef {
  id: string
  nombre: string
  ruc: string | null
}

interface ProyectoRef {
  id: string
  codigo: string
  nombre: string
}

interface CentroCostoRef {
  id: string
  nombre: string
  activo: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
  proveedores: ProveedorRef[]
  proyectos: ProyectoRef[]
  centrosCosto: CentroCostoRef[]
  onImported: () => void
}

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

export default function OCImportExcelModal({
  isOpen,
  onClose,
  proveedores,
  proyectos,
  centrosCosto,
  onImported,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

  const [result, setResult] = useState<OCImportResult | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  const resetState = () => {
    setFile(null)
    setStep('upload')
    setResult(null)
    setSelectedGroups(new Set())
    setExpandedGroups(new Set())
    setLoading(false)
    setSaving(false)
  }

  useEffect(() => {
    if (isOpen) resetState()
  }, [isOpen])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setLoading(true)

    try {
      const rows = await leerExcelOC(selectedFile)
      const importResult = validarOCImport(rows, proveedores, proyectos, centrosCosto)

      setResult(importResult)

      // Select only valid groups
      const validGroupNums = new Set<number>()
      for (const g of importResult.grupos) {
        const hasItemErrors = g.items.some(it => it.errores.length > 0)
        if (g.erroresGrupo.length === 0 && !hasItemErrors) {
          validGroupNums.add(g.grupo)
        }
      }
      setSelectedGroups(validGroupNums)

      // Expand all groups initially
      setExpandedGroups(new Set(importResult.grupos.map(g => g.grupo)))
      setStep('preview')
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error('Error al leer el archivo Excel')
      setResult({ grupos: [], erroresGlobales: ['Error al leer el archivo. Verifica que sea un archivo Excel válido (.xlsx)'], totalItems: 0, totalOCs: 0, totalValidos: 0, totalInvalidos: 0 })
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await generarPlantillaOC()
      toast.success('Plantilla descargada')
    } catch (error) {
      console.error('Error downloading template:', error)
      toast.error('Error al descargar la plantilla')
    }
  }

  const isGroupValid = (g: OCGroupValidated): boolean => {
    return g.erroresGrupo.length === 0 && !g.items.some(it => it.errores.length > 0)
  }

  const toggleGroup = (grupo: number) => {
    const g = result?.grupos.find(gr => gr.grupo === grupo)
    if (!g || !isGroupValid(g)) return
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(grupo)) {
      newSelected.delete(grupo)
    } else {
      newSelected.add(grupo)
    }
    setSelectedGroups(newSelected)
  }

  const toggleExpandGroup = (grupo: number) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(grupo)) {
      newExpanded.delete(grupo)
    } else {
      newExpanded.add(grupo)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleAllValid = () => {
    if (!result) return
    const validGroups = result.grupos.filter(isGroupValid)
    if (selectedGroups.size === validGroups.length) {
      setSelectedGroups(new Set())
    } else {
      setSelectedGroups(new Set(validGroups.map(g => g.grupo)))
    }
  }

  const handleImport = async () => {
    if (!result) return
    const gruposToImport = result.grupos.filter(g => selectedGroups.has(g.grupo))
    if (gruposToImport.length === 0) {
      toast.error('Selecciona al menos una OC')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/orden-compra/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordenes: gruposToImport.map(g => ({
            proveedorId: g.proveedorId,
            proyectoId: g.proyectoId,
            centroCostoId: g.centroCostoId,
            categoriaCosto: g.categoriaCosto,
            moneda: g.moneda,
            condicionPago: g.condicionPago,
            lugarEntrega: g.lugarEntrega || null,
            observaciones: g.observaciones || null,
            items: g.items.map(it => ({
              codigo: it.codigoItem,
              descripcion: it.descripcionItem,
              unidad: it.unidad,
              cantidad: it.cantidad,
              precioUnitario: it.precioUnitario,
            })),
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al importar')
      }

      const data = await res.json()
      toast.success(`${data.creadas} orden(es) de compra importada(s)`)
      onImported()
      handleClose()
    } catch (error: any) {
      console.error('Error importing:', error)
      toast.error(error.message || 'Error al importar')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const totalSelected = selectedGroups.size
  const totalItemsSelected = result?.grupos
    .filter(g => selectedGroups.has(g.grupo))
    .reduce((sum, g) => sum + g.items.length, 0) || 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Importar Órdenes de Compra desde Excel</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Carga masiva de OCs con sus items
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading && step === 'upload' ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : step === 'upload' ? (
          <div className="space-y-4 py-4">
            {/* Upload zone */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-orange-300 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-oc-upload"
              />
              <label htmlFor="excel-oc-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">
                  Arrastra un archivo Excel o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Formato .xlsx con columnas: Grupo OC, RUC, Items, Cantidades, Precios, etc.
                </p>
              </label>
            </div>

            {/* Download template */}
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs font-medium">Descargar plantilla</p>
                  <p className="text-[10px] text-muted-foreground">
                    Excel con formato correcto, datos de ejemplo y validaciones
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-7 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Descargar
              </Button>
            </div>

            {/* Info */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-amber-800 mb-1">Notas</p>
              <ul className="text-[10px] text-amber-700 space-y-0.5">
                <li>- Cada fila es un item. La columna &quot;Grupo OC&quot; agrupa items en la misma orden</li>
                <li>- Filas con Grupo OC = 1 → OC #1, Grupo OC = 2 → OC #2, etc.</li>
                <li>- El proveedor se busca por RUC (debe existir en el sistema)</li>
                <li>- Indique Proyecto O Centro de Costo (no ambos)</li>
                <li>- Las OCs se crean en estado &quot;borrador&quot; con número auto-generado</li>
                <li>- IGV se calcula automático: 18% en PEN, 0% en USD</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Loaded file */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium">{file?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Global errors */}
            {result?.erroresGlobales && result.erroresGlobales.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Error</span>
                </div>
                {result.erroresGlobales.map((err, idx) => (
                  <p key={idx} className="text-xs text-red-600 mt-1">{err}</p>
                ))}
              </div>
            )}

            {/* Summary */}
            {result && result.grupos.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {result.totalOCs} OC(s) — {result.totalItems} item(s)
                  </Badge>
                  {result.totalValidos > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {result.totalValidos} válida(s)
                    </Badge>
                  )}
                  {result.totalInvalidos > 0 && (
                    <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {result.totalInvalidos} con errores
                    </Badge>
                  )}
                </div>
                {result.totalValidos > 0 && (
                  <Button variant="ghost" size="sm" onClick={toggleAllValid} className="h-6 text-[10px]">
                    {selectedGroups.size === result.totalValidos ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </Button>
                )}
              </div>
            )}

            {/* OC Groups */}
            {result && result.grupos.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3">
                {result.grupos.map(g => {
                  const valid = isGroupValid(g)
                  const expanded = expandedGroups.has(g.grupo)
                  const subtotal = g.items.reduce((sum, it) => sum + it.costoTotal, 0)

                  return (
                    <div
                      key={g.grupo}
                      className={cn(
                        'border rounded-lg overflow-hidden',
                        valid ? 'border-gray-200' : 'border-red-200'
                      )}
                    >
                      {/* Group header */}
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 cursor-pointer',
                          valid ? 'bg-green-50 hover:bg-green-100/70' : 'bg-red-50'
                        )}
                        onClick={() => toggleExpandGroup(g.grupo)}
                      >
                        {valid && (
                          <Checkbox
                            checked={selectedGroups.has(g.grupo)}
                            onCheckedChange={(e) => { e; toggleGroup(g.grupo) }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {!valid && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}

                        {expanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        }

                        <span className="text-xs font-semibold">OC Grupo {g.grupo}</span>
                        <span className="text-xs text-muted-foreground">—</span>
                        <span className="text-xs font-mono">{g.proveedorRuc}</span>
                        <span className="text-xs truncate max-w-[150px]">{g.proveedorNombre}</span>

                        <div className="ml-auto flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">
                            {g.items.length} item(s)
                          </Badge>
                          <span className="text-xs font-mono font-medium">
                            {formatCurrency(subtotal, g.moneda)}
                          </span>
                          {g.proyectoId && (
                            <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">
                              {g.items[0]?.proyectoCodigo}
                            </Badge>
                          )}
                          {g.centroCostoId && (
                            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200">
                              {g.items[0]?.centroCostoNombre}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Group errors */}
                      {g.erroresGrupo.length > 0 && (
                        <div className="px-3 py-1.5 bg-red-50 border-b border-red-200">
                          {g.erroresGrupo.map((err, idx) => (
                            <div key={idx} className="text-[10px] text-red-600 border-l-2 border-red-300 pl-2 py-0.5">
                              {err}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expanded items table */}
                      {expanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1.5 text-left w-10">Fila</th>
                                <th className="px-2 py-1.5 text-left">Código</th>
                                <th className="px-2 py-1.5 text-left">Descripción</th>
                                <th className="px-2 py-1.5 text-left">Unidad</th>
                                <th className="px-2 py-1.5 text-right">Cantidad</th>
                                <th className="px-2 py-1.5 text-right">P. Unit.</th>
                                <th className="px-2 py-1.5 text-right">Total</th>
                                <th className="px-2 py-1.5 text-left">Errores</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {g.items.map((item, idx) => (
                                <tr
                                  key={`item-${g.grupo}-${idx}`}
                                  className={cn(
                                    item.errores.length > 0 ? 'bg-red-50/50' : 'hover:bg-gray-50'
                                  )}
                                >
                                  <td className="px-2 py-1.5 text-muted-foreground">{item.fila}</td>
                                  <td className="px-2 py-1.5 font-mono">{item.codigoItem || '—'}</td>
                                  <td className="px-2 py-1.5 max-w-[200px] truncate">{item.descripcionItem}</td>
                                  <td className="px-2 py-1.5">{item.unidad}</td>
                                  <td className="px-2 py-1.5 text-right font-mono">{item.cantidad}</td>
                                  <td className="px-2 py-1.5 text-right font-mono">{item.precioUnitario.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 text-right font-mono font-medium">{item.costoTotal.toFixed(2)}</td>
                                  <td className="px-2 py-1.5">
                                    {item.errores.length > 0 && (
                                      <div className="space-y-0.5">
                                        {item.errores.map((err, errIdx) => (
                                          <div key={errIdx} className="text-[10px] text-red-600">
                                            {err}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileWarning className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron datos válidos
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t mt-3">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          {step === 'preview' && result && result.totalValidos > 0 && (
            <Button
              size="sm"
              onClick={handleImport}
              disabled={saving || totalSelected === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Importar {totalSelected} OC(s) ({totalItemsSelected} items)
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
