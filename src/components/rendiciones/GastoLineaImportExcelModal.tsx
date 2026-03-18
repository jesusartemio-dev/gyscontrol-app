'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CategoriaGasto } from '@/types'
import {
  leerExcelGastoLineas,
  validarGastoLineas,
  generarPlantillaGastoLineas,
  type GastoLineaImportRow,
} from '@/lib/utils/gastoLineaExcel'

interface Props {
  isOpen: boolean
  onClose: () => void
  hojaDeGastosId: string
  categorias: CategoriaGasto[]
  onSuccess: () => void
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

export default function GastoLineaImportExcelModal({
  isOpen,
  onClose,
  hojaDeGastosId,
  categorias,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [items, setItems] = useState<GastoLineaImportRow[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [advertencias, setAdvertencias] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setStep('upload')
    setFile(null)
    setItems([])
    setErrores([])
    setAdvertencias([])
    setLoading(false)
    setSaving(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true)
      await generarPlantillaGastoLineas(categorias)
      toast.success('Plantilla descargada')
    } catch {
      toast.error('Error al generar plantilla')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Solo se aceptan archivos Excel (.xlsx, .xls)')
      return
    }

    setFile(selectedFile)
    setLoading(true)

    try {
      const rows = await leerExcelGastoLineas(selectedFile)
      const result = validarGastoLineas(rows, categorias)

      setItems(result.items)
      setErrores(result.errores)
      setAdvertencias(result.advertencias)

      if (result.items.length > 0) {
        setStep('preview')
      } else if (result.errores.length > 0) {
        toast.error('No se encontraron registros válidos')
      }
    } catch {
      toast.error('Error al procesar el archivo Excel')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (items.length === 0) return

    setSaving(true)
    try {
      const lineas = items.map(item => ({
        descripcion: item.descripcion,
        fecha: item.fecha,
        monto: item.monto,
        categoriaGastoId: item.categoriaGastoId,
        tipoComprobante: item.tipoComprobante,
        numeroComprobante: item.numeroComprobante,
        proveedorNombre: item.proveedorNombre,
        proveedorRuc: item.proveedorRuc,
      }))

      const response = await fetch('/api/gasto-linea/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hojaDeGastosId, lineas }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al importar')
      }

      const result = await response.json()
      toast.success(`${result.count} líneas de gasto importadas correctamente`)
      handleClose()
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al importar gastos')
    } finally {
      setSaving(false)
    }
  }

  const totalMonto = items.reduce((sum, item) => sum + item.monto, 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-orange-100">
              <FileSpreadsheet className="h-5 w-5 text-orange-700" />
            </div>
            Importar Gastos desde Excel
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 pt-2">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center cursor-pointer hover:bg-orange-50/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const droppedFile = e.dataTransfer.files[0]
                if (droppedFile) {
                  const input = fileInputRef.current
                  if (input) {
                    const dt = new DataTransfer()
                    dt.items.add(droppedFile)
                    input.files = dt.files
                    input.dispatchEvent(new Event('change', { bubbles: true }))
                  }
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                  <p className="text-sm text-muted-foreground">Procesando archivo...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-orange-400" />
                  <p className="font-medium text-gray-700">
                    Arrastra un archivo Excel o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formato .xlsx con columnas: Fecha, Descripción, Monto, Categoría, Tipo Comprobante, N° Comprobante, Proveedor, RUC
                  </p>
                </div>
              )}
            </div>

            {/* Download template */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Descargar plantilla</p>
                <p className="text-xs text-muted-foreground">Archivo Excel con el formato correcto</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
              >
                {downloadingTemplate ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Descargar
              </Button>
            </div>

            {/* Errors from previous attempt */}
            {errores.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Errores encontrados</span>
                </div>
                <ul className="text-xs text-red-600 space-y-1">
                  {errores.slice(0, 10).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {errores.length > 10 && (
                    <li className="text-red-500">...y {errores.length - 10} errores más</li>
                  )}
                </ul>
              </div>
            )}

            {/* Info */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-1">Información</p>
              <ul className="text-xs text-amber-700 space-y-0.5">
                <li>- Las columnas Fecha, Descripción y Monto son obligatorias</li>
                <li>- La categoría debe coincidir con las del sistema</li>
                <li>- Tipos de comprobante: Factura, Boleta, Recibo, Ticket, Sin comprobante</li>
              </ul>
            </div>

            {/* Cancel */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 pt-2">
            {/* Summary */}
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">
                  {items.length} línea{items.length > 1 ? 's' : ''} lista{items.length > 1 ? 's' : ''} para importar
                </p>
                <p className="text-xs text-green-600">
                  Total: {formatCurrency(totalMonto)}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                {file?.name}
              </Badge>
            </div>

            {/* Warnings */}
            {advertencias.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">Advertencias ({advertencias.length})</span>
                </div>
                <ul className="text-xs text-amber-600 space-y-0.5">
                  {advertencias.slice(0, 5).map((adv, i) => (
                    <li key={i}>• {adv}</li>
                  ))}
                  {advertencias.length > 5 && (
                    <li>...y {advertencias.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}

            {/* Errors */}
            {errores.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-red-700">Filas omitidas ({errores.length})</span>
                </div>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {errores.slice(0, 5).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {errores.length > 5 && (
                    <li>...y {errores.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Fecha</th>
                    <th className="text-left p-2 font-medium">Descripción</th>
                    <th className="text-left p-2 font-medium">Categoría</th>
                    <th className="text-left p-2 font-medium">Comprobante</th>
                    <th className="text-right p-2 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 whitespace-nowrap">{item.fecha}</td>
                      <td className="p-2">
                        <span className="line-clamp-1">{item.descripcion}</span>
                        {item.proveedorNombre && (
                          <span className="text-[10px] text-muted-foreground block">{item.proveedorNombre}</span>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {item.categoria ? (
                          <span className={item.categoriaGastoId ? '' : 'text-amber-600'}>
                            {item.categoria}
                            {!item.categoriaGastoId && ' ⚠'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {item.tipoComprobante || '-'}
                        {item.numeroComprobante && ` #${item.numeroComprobante}`}
                      </td>
                      <td className="p-2 text-right font-mono">{formatCurrency(item.monto)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30 font-medium">
                    <td colSpan={5} className="p-2 text-right">Total:</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(totalMonto)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep('upload')
                  setFile(null)
                  setItems([])
                  setErrores([])
                  setAdvertencias([])
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cambiar archivo
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={handleImport}
                  disabled={saving || items.length === 0}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Importar {items.length} gasto{items.length > 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
