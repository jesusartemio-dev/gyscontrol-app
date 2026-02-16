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
  Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  leerExcelRendicion,
  validarRendicionImport,
  generarPlantillaRendicion,
  type RendicionGroupValidated,
  type RendicionImportResult,
} from '@/lib/utils/rendicionExcel'

interface ProyectoRef { id: string; codigo: string; nombre: string }
interface CentroCostoRef { id: string; nombre: string; activo: boolean }
interface EmpleadoRef { id: string; name: string | null; email: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  proyectos: ProyectoRef[]
  centrosCosto: CentroCostoRef[]
  empleados: EmpleadoRef[]
  onImported: () => void
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

export default function RendicionImportExcelModal({
  isOpen,
  onClose,
  proyectos,
  centrosCosto,
  empleados,
  onImported,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

  const [result, setResult] = useState<RendicionImportResult | null>(null)
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
      const rows = await leerExcelRendicion(selectedFile)
      const importResult = validarRendicionImport(rows, proyectos, centrosCosto, empleados)

      setResult(importResult)

      const validGroupNums = new Set<number>()
      for (const g of importResult.grupos) {
        const hasItemErrors = g.lineas.some(it => it.errores.length > 0)
        if (g.erroresGrupo.length === 0 && !hasItemErrors) {
          validGroupNums.add(g.grupo)
        }
      }
      setSelectedGroups(validGroupNums)
      setExpandedGroups(new Set(importResult.grupos.map(g => g.grupo)))
      setStep('preview')
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error('Error al leer el archivo Excel')
      setResult({ grupos: [], erroresGlobales: ['Error al leer el archivo. Verifica que sea un archivo Excel válido (.xlsx)'], totalLineas: 0, totalHojas: 0, totalValidos: 0, totalInvalidos: 0 })
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await generarPlantillaRendicion()
      toast.success('Plantilla descargada')
    } catch (error) {
      console.error('Error downloading template:', error)
      toast.error('Error al descargar la plantilla')
    }
  }

  const isGroupValid = (g: RendicionGroupValidated): boolean => {
    return g.erroresGrupo.length === 0 && !g.lineas.some(it => it.errores.length > 0)
  }

  const toggleGroup = (grupo: number) => {
    const g = result?.grupos.find(gr => gr.grupo === grupo)
    if (!g || !isGroupValid(g)) return
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(grupo)) newSelected.delete(grupo)
    else newSelected.add(grupo)
    setSelectedGroups(newSelected)
  }

  const toggleExpandGroup = (grupo: number) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(grupo)) newExpanded.delete(grupo)
    else newExpanded.add(grupo)
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
      toast.error('Selecciona al menos una hoja')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/hoja-de-gastos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hojas: gruposToImport.map(g => ({
            proyectoId: g.proyectoId,
            centroCostoId: g.centroCostoId,
            empleadoId: g.empleadoId,
            motivo: g.motivo,
            montoAnticipo: g.montoAnticipo,
            montoDepositado: g.montoDepositado,
            estado: g.estado,
            lineas: g.lineas.map(l => ({
              descripcion: l.descripcion,
              fecha: l.fecha,
              monto: l.monto,
              moneda: l.moneda,
              tipoComprobante: l.tipoComprobante || null,
              numeroComprobante: l.numeroComprobante || null,
              proveedorNombre: l.proveedorNombre || null,
              proveedorRuc: l.proveedorRuc || null,
            })),
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al importar')
      }

      const data = await res.json()
      toast.success(`${data.creadas} hoja(s) de gastos importada(s)`)
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
  const totalLineasSelected = result?.grupos
    .filter(g => selectedGroups.has(g.grupo))
    .reduce((sum, g) => sum + g.lineas.length, 0) || 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-100 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Importar Rendiciones desde Excel</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Carga masiva de hojas de gastos con líneas de detalle
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
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-rose-300 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-rendicion-upload"
              />
              <label htmlFor="excel-rendicion-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">
                  Arrastra un archivo Excel o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Formato .xlsx con columnas: Grupo Hoja, Empleado, Proyecto/CC, Gastos, etc.
                </p>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-rose-500" />
                <div>
                  <p className="text-xs font-medium">Descargar plantilla</p>
                  <p className="text-[10px] text-muted-foreground">
                    Excel con formato correcto, datos de ejemplo y validaciones
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-7 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Descargar
              </Button>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-amber-800 mb-1">Notas</p>
              <ul className="text-[10px] text-amber-700 space-y-0.5">
                <li>- Cada fila es una línea de gasto. &quot;Grupo Hoja&quot; agrupa líneas en la misma hoja</li>
                <li>- El empleado se busca por email (debe existir en el sistema)</li>
                <li>- Indique Proyecto O Centro de Costo (no ambos)</li>
                <li>- Las hojas se crean en estado &quot;borrador&quot; por defecto</li>
                <li>- Monto gastado y saldo se calculan automáticamente</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-medium">{file?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>

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

            {result && result.grupos.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Receipt className="h-3 w-3 mr-1" />
                    {result.totalHojas} hoja(s) — {result.totalLineas} línea(s)
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

            {result && result.grupos.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3">
                {result.grupos.map(g => {
                  const valid = isGroupValid(g)
                  const expanded = expandedGroups.has(g.grupo)
                  const totalGasto = g.lineas.reduce((sum, l) => sum + l.monto, 0)

                  return (
                    <div
                      key={g.grupo}
                      className={cn('border rounded-lg overflow-hidden', valid ? 'border-gray-200' : 'border-red-200')}
                    >
                      <div
                        className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer', valid ? 'bg-green-50 hover:bg-green-100/70' : 'bg-red-50')}
                        onClick={() => toggleExpandGroup(g.grupo)}
                      >
                        {valid && (
                          <Checkbox
                            checked={selectedGroups.has(g.grupo)}
                            onCheckedChange={() => toggleGroup(g.grupo)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {!valid && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}

                        {expanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        }

                        <span className="text-xs font-semibold">Hoja {g.grupo}</span>
                        <span className="text-xs text-muted-foreground">—</span>
                        <span className="text-xs truncate max-w-[120px]">{g.empleadoNombre}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">{g.motivo}</span>

                        <div className="ml-auto flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">
                            {g.lineas.length} gasto(s)
                          </Badge>
                          <span className="text-xs font-mono font-medium">
                            {formatCurrency(totalGasto)}
                          </span>
                          {g.proyectoId && (
                            <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">
                              {g.proyectoCodigo}
                            </Badge>
                          )}
                          {g.centroCostoId && (
                            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200">
                              {g.centroCostoNombre}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {g.erroresGrupo.length > 0 && (
                        <div className="px-3 py-1.5 bg-red-50 border-b border-red-200">
                          {g.erroresGrupo.map((err, idx) => (
                            <div key={idx} className="text-[10px] text-red-600 border-l-2 border-red-300 pl-2 py-0.5">
                              {err}
                            </div>
                          ))}
                        </div>
                      )}

                      {expanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1.5 text-left w-10">Fila</th>
                                <th className="px-2 py-1.5 text-left">Descripción</th>
                                <th className="px-2 py-1.5 text-left">Fecha</th>
                                <th className="px-2 py-1.5 text-right">Monto</th>
                                <th className="px-2 py-1.5 text-left">Comprobante</th>
                                <th className="px-2 py-1.5 text-left">Proveedor</th>
                                <th className="px-2 py-1.5 text-left">Errores</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {g.lineas.map((linea, idx) => (
                                <tr
                                  key={`linea-${g.grupo}-${idx}`}
                                  className={cn(linea.errores.length > 0 ? 'bg-red-50/50' : 'hover:bg-gray-50')}
                                >
                                  <td className="px-2 py-1.5 text-muted-foreground">{linea.fila}</td>
                                  <td className="px-2 py-1.5 max-w-[180px] truncate">{linea.descripcion}</td>
                                  <td className="px-2 py-1.5">{linea.fecha}</td>
                                  <td className="px-2 py-1.5 text-right font-mono font-medium">{linea.monto.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 text-[10px]">
                                    {linea.tipoComprobante && <span>{linea.tipoComprobante}</span>}
                                    {linea.numeroComprobante && <span className="ml-1 font-mono">{linea.numeroComprobante}</span>}
                                  </td>
                                  <td className="px-2 py-1.5 max-w-[120px] truncate">{linea.proveedorNombre || '—'}</td>
                                  <td className="px-2 py-1.5">
                                    {linea.errores.length > 0 && (
                                      <div className="space-y-0.5">
                                        {linea.errores.map((err, errIdx) => (
                                          <div key={errIdx} className="text-[10px] text-red-600">{err}</div>
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
                  <p className="text-sm text-muted-foreground">No se encontraron datos válidos</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t mt-3">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          {step === 'preview' && result && result.totalValidos > 0 && (
            <Button
              size="sm"
              onClick={handleImport}
              disabled={saving || totalSelected === 0}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Importar {totalSelected} hoja(s) ({totalLineasSelected} líneas)
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
