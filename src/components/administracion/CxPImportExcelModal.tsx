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
} from 'lucide-react'
import { toast } from 'sonner'
import {
  leerExcelCxP,
  validarCxPImport,
  generarPlantillaCxP,
  type CxPValidatedRow,
} from '@/lib/utils/cuentasPagarExcel'

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

interface Props {
  isOpen: boolean
  onClose: () => void
  proveedores: ProveedorRef[]
  proyectos: ProyectoRef[]
  onImported: () => void
}

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

export default function CxPImportExcelModal({
  isOpen,
  onClose,
  proveedores,
  proyectos,
  onImported,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

  const [validos, setValidos] = useState<CxPValidatedRow[]>([])
  const [invalidos, setInvalidos] = useState<CxPValidatedRow[]>([])
  const [erroresGlobales, setErroresGlobales] = useState<string[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const resetState = () => {
    setFile(null)
    setStep('upload')
    setValidos([])
    setInvalidos([])
    setErroresGlobales([])
    setSelectedRows(new Set())
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
      const rows = await leerExcelCxP(selectedFile)
      const result = validarCxPImport(rows, proveedores, proyectos)

      setValidos(result.validos)
      setInvalidos(result.invalidos)
      setErroresGlobales(result.erroresGlobales)
      setSelectedRows(new Set(result.validos.map((_, idx) => idx)))
      setStep('preview')
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error('Error al leer el archivo Excel')
      setErroresGlobales(['Error al leer el archivo. Verifica que sea un archivo Excel válido (.xlsx)'])
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await generarPlantillaCxP()
      toast.success('Plantilla descargada')
    } catch (error) {
      console.error('Error downloading template:', error)
      toast.error('Error al descargar la plantilla')
    }
  }

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRows(newSelected)
  }

  const toggleAll = () => {
    if (selectedRows.size === validos.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(validos.map((_, idx) => idx)))
    }
  }

  const handleImport = async () => {
    const rowsToImport = validos.filter((_, idx) => selectedRows.has(idx))
    if (rowsToImport.length === 0) {
      toast.error('Selecciona al menos un registro')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/administracion/cuentas-pagar/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registros: rowsToImport.map(r => ({
            proveedorId: r.proveedorId,
            numeroFactura: r.nroFactura || null,
            monto: r.monto,
            moneda: r.moneda,
            fechaRecepcion: r.fechaRecepcion,
            fechaVencimiento: r.fechaVencimiento,
            condicionPago: r.condicionPago,
            estado: r.estado,
            proyectoId: r.proyectoId || null,
            observaciones: r.observaciones || null,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al importar')
      }

      const data = await res.json()
      toast.success(`${data.creados} cuenta(s) por pagar importada(s)`)
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

  const totalSelected = selectedRows.size
  const totalMontoSelected = validos
    .filter((_, idx) => selectedRows.has(idx))
    .reduce((sum, r) => sum + r.monto, 0)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Importar Cuentas por Pagar desde Excel</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Carga masiva de facturas de proveedores
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
            {/* Zona de upload */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-300 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-cxp-upload"
              />
              <label htmlFor="excel-cxp-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">
                  Arrastra un archivo Excel o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Formato .xlsx con columnas: RUC Proveedor, Monto, Moneda, Fechas, etc.
                </p>
              </label>
            </div>

            {/* Descargar plantilla */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
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
                <li>- El proveedor se busca por RUC (debe existir en el sistema)</li>
                <li>- El proyecto se busca por código (opcional)</li>
                <li>- Las filas con errores se mostrarán pero no se importarán</li>
                <li>- Puedes seleccionar qué filas válidas importar</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Archivo cargado */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium">{file?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Errores globales */}
            {erroresGlobales.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Error</span>
                </div>
                {erroresGlobales.map((err, idx) => (
                  <p key={idx} className="text-xs text-red-600 mt-1">{err}</p>
                ))}
              </div>
            )}

            {/* Resumen */}
            {(validos.length > 0 || invalidos.length > 0) && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {validos.length > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {validos.length} válidos
                    </Badge>
                  )}
                  {invalidos.length > 0 && (
                    <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {invalidos.length} con errores
                    </Badge>
                  )}
                </div>
                {totalSelected > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {totalSelected} seleccionado(s)
                  </span>
                )}
              </div>
            )}

            {/* Tabla de resultados */}
            {(validos.length > 0 || invalidos.length > 0) ? (
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Filas válidas */}
                {validos.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-3 py-2 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-800">
                          Registros válidos ({validos.length})
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={toggleAll} className="h-6 text-[10px]">
                        {selectedRows.size === validos.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left w-8"></th>
                            <th className="px-2 py-1.5 text-left w-8">Fila</th>
                            <th className="px-2 py-1.5 text-left">RUC</th>
                            <th className="px-2 py-1.5 text-left">Proveedor</th>
                            <th className="px-2 py-1.5 text-left">N° Factura</th>
                            <th className="px-2 py-1.5 text-right">Monto</th>
                            <th className="px-2 py-1.5 text-center">Moneda</th>
                            <th className="px-2 py-1.5 text-left">Vencimiento</th>
                            <th className="px-2 py-1.5 text-left">Proyecto</th>
                            <th className="px-2 py-1.5 text-left">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {validos.map((row, idx) => (
                            <tr
                              key={`valid-${idx}`}
                              className={cn(
                                'hover:bg-green-50/50 transition-colors cursor-pointer',
                                selectedRows.has(idx) ? 'bg-green-50/30' : ''
                              )}
                              onClick={() => toggleRow(idx)}
                            >
                              <td className="px-2 py-1.5">
                                <Checkbox
                                  checked={selectedRows.has(idx)}
                                  onCheckedChange={() => toggleRow(idx)}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-muted-foreground">{row.fila}</td>
                              <td className="px-2 py-1.5 font-mono">{row.proveedorRuc}</td>
                              <td className="px-2 py-1.5 max-w-[150px] truncate">{row.proveedorNombre}</td>
                              <td className="px-2 py-1.5 font-mono">{row.nroFactura || '—'}</td>
                              <td className="px-2 py-1.5 text-right font-mono font-medium">
                                {formatCurrency(row.monto, row.moneda)}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <Badge variant="outline" className="text-[9px]">{row.moneda}</Badge>
                              </td>
                              <td className="px-2 py-1.5">{row.fechaVencimiento}</td>
                              <td className="px-2 py-1.5 font-mono">{row.proyectoCodigo || '—'}</td>
                              <td className="px-2 py-1.5">
                                <Badge variant="outline" className="text-[9px]">{row.estado}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Filas con errores */}
                {invalidos.length > 0 && (
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-3 py-2 border-b border-red-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-red-800">
                          Filas con errores — no se importarán ({invalidos.length})
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-red-100">
                      {invalidos.map((row, idx) => (
                        <div key={`invalid-${idx}`} className="p-3">
                          <div className="flex items-center gap-3 text-xs mb-1">
                            <span className="text-muted-foreground">Fila {row.fila}</span>
                            <span className="font-mono">{row.proveedorRuc || '(sin RUC)'}</span>
                            <span className="truncate">{row.proveedorNombre}</span>
                            {row.monto > 0 && (
                              <span className="font-mono">{formatCurrency(row.monto, row.moneda)}</span>
                            )}
                          </div>
                          <div className="space-y-0.5 pl-4">
                            {row.errores.map((err, errIdx) => (
                              <div key={errIdx} className="text-[10px] text-red-600 border-l-2 border-red-300 pl-2">
                                {err}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileWarning className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron registros válidos
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
          {step === 'preview' && validos.length > 0 && (
            <Button
              size="sm"
              onClick={handleImport}
              disabled={saving || totalSelected === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Importar {totalSelected} registro(s)
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
