// ===================================================
// Archivo: CotizacionServicioItemImportExcelModal.tsx
// Ubicación: src/components/cotizaciones/
// Descripción: Modal para importar items de servicio desde Excel usando fórmula inversa
// Autor: Jesús Artemio
// Última actualización: 2025-01-29
// ===================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
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
  FileWarning
} from 'lucide-react'
import { toast } from 'sonner'

import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import {
  leerExcelServicioItems,
  validarEImportarServicioItems,
  generarPlantillaImportacion,
  type ImportedServiceItem
} from '@/lib/utils/cotizacionServicioItemExcel'

import type { Recurso, UnidadServicio, CotizacionServicioItem, CotizacionServicioItemPayload } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    nombre: string
    edtId?: string
    edt?: { id: string; nombre: string }
  }
  onItemsCreated: (items: CotizacionServicioItem[]) => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const dificultadLabels: Record<number, string> = {
  1: 'Baja',
  2: 'Media',
  3: 'Alta',
  4: 'Crítica'
}

export default function CotizacionServicioItemImportExcelModal({
  isOpen,
  onClose,
  servicio,
  onItemsCreated
}: Props) {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [itemsValidos, setItemsValidos] = useState<ImportedServiceItem[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

  useEffect(() => {
    if (isOpen) {
      loadData()
      resetState()
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const [recursosData, unidadesData] = await Promise.all([
        getRecursos(),
        getUnidadesServicio()
      ])
      setRecursos(recursosData)
      setUnidades(unidadesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setFile(null)
    setItemsValidos([])
    setErrores([])
    setSelectedItems(new Set())
    setStep('upload')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setLoading(true)

    try {
      const rows = await leerExcelServicioItems(selectedFile)

      if (rows.length === 0) {
        setErrores(['El archivo está vacío o no tiene datos válidos'])
        setItemsValidos([])
        setStep('preview')
        return
      }

      const result = validarEImportarServicioItems(rows, recursos, unidades)
      setItemsValidos(result.itemsValidos)
      setErrores(result.errores)

      // Seleccionar todos los items válidos por defecto
      setSelectedItems(new Set(result.itemsValidos.map((_, idx) => idx)))
      setStep('preview')
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error('Error al leer el archivo Excel')
      setErrores(['Error al leer el archivo. Verifica que sea un archivo Excel válido (.xlsx)'])
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    generarPlantillaImportacion('PlantillaServiciosCotizacion')
    toast.success('Plantilla descargada')
  }

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedItems(newSelected)
  }

  const toggleAll = () => {
    if (selectedItems.size === itemsValidos.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(itemsValidos.map((_, idx) => idx)))
    }
  }

  const handleImport = async () => {
    const itemsToImport = itemsValidos.filter((_, idx) => selectedItems.has(idx))

    if (itemsToImport.length === 0) {
      toast.error('Selecciona al menos un item para importar')
      return
    }

    setSaving(true)
    const createdItems: CotizacionServicioItem[] = []
    const edtId = servicio.edtId || servicio.edt?.id || ''

    try {
      for (const item of itemsToImport) {
        const payload: CotizacionServicioItemPayload = {
          cotizacionServicioId: servicio.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          edtId,
          recursoId: item.recursoId,
          recursoNombre: item.recursoNombre,
          unidadServicioId: item.unidadServicioId,
          unidadServicioNombre: item.unidadServicioNombre,
          formula: 'Escalonada',
          horaBase: item.horaTotal, // Usamos horaTotal calculada como horaBase
          horaRepetido: 0,
          costoHora: item.costoHora,
          cantidad: 1,
          horaTotal: item.horaTotal,
          factorSeguridad: item.factorSeguridad,
          margen: item.margen,
          costoInterno: item.costoInterno,
          costoCliente: item.precioCliente,
          nivelDificultad: item.nivelDificultad
        }

        const created = await createCotizacionServicioItem(payload)
        createdItems.push(created)
      }

      toast.success(`${createdItems.length} servicios importados`)
      onItemsCreated(createdItems)
      handleClose()
    } catch (error) {
      console.error('Error importing items:', error)
      toast.error('Error al importar servicios')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const totalSeleccionado = itemsValidos
    .filter((_, idx) => selectedItems.has(idx))
    .reduce((sum, item) => sum + item.precioCliente, 0)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Importar desde Excel</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {servicio.edt?.nombre || servicio.nombre} - Fórmula Inversa (Precio → Horas)
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
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-orange-300 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">
                  Arrastra un archivo Excel o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Formato .xlsx con columnas: Nombre, Descripción, Recurso, Unidad, Precio Cliente
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
                    Archivo Excel con el formato correcto
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

            {/* Info de la fórmula inversa */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-amber-800 mb-1">Fórmula Inversa</p>
              <p className="text-[10px] text-amber-700">
                Se calculan las horas automáticamente a partir del precio cliente deseado:
              </p>
              <p className="text-[10px] text-amber-600 font-mono mt-1">
                HH = Precio / ($/hora × Factor × Dificultad × Margen)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Archivo cargado */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium">{file?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Errores */}
            {errores.length > 0 && (
              <div className="mb-3 p-2 bg-red-50 rounded-lg border border-red-200 max-h-24 overflow-y-auto">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-medium text-red-700">
                    {errores.length} error(es) encontrado(s)
                  </span>
                </div>
                <ul className="text-[10px] text-red-600 space-y-0.5 pl-4">
                  {errores.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                  {errores.length > 5 && (
                    <li>... y {errores.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}

            {/* Lista de items válidos */}
            {itemsValidos.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedItems.size === itemsValidos.length}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedItems.size} de {itemsValidos.length} seleccionados
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Total: {formatCurrency(totalSeleccionado)}
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left w-8"></th>
                        <th className="px-2 py-1.5 text-left">Nombre</th>
                        <th className="px-2 py-1.5 text-left w-24">Recurso</th>
                        <th className="px-2 py-1.5 text-center w-16">Dific.</th>
                        <th className="px-2 py-1.5 text-right w-16">HH</th>
                        <th className="px-2 py-1.5 text-right w-20">Interno</th>
                        <th className="px-2 py-1.5 text-right w-20">Cliente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {itemsValidos.map((item, idx) => (
                        <tr
                          key={idx}
                          className={cn(
                            'hover:bg-blue-50/50 transition-colors cursor-pointer',
                            selectedItems.has(idx) ? 'bg-blue-50/30' : ''
                          )}
                          onClick={() => toggleItem(idx)}
                        >
                          <td className="px-2 py-1.5">
                            <Checkbox
                              checked={selectedItems.has(idx)}
                              onCheckedChange={() => toggleItem(idx)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="font-medium truncate max-w-[200px]">
                              {item.nombre}
                            </div>
                            {item.descripcion && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {item.descripcion}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {item.recursoNombre}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {dificultadLabels[item.nivelDificultad]}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-purple-600">
                            {item.horaTotal.toFixed(2)}h
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {formatCurrency(item.costoInterno)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                            {formatCurrency(item.precioCliente)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileWarning className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron items válidos para importar
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
          {step === 'preview' && itemsValidos.length > 0 && (
            <Button
              size="sm"
              onClick={handleImport}
              disabled={saving || selectedItems.size === 0}
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
                  Importar {selectedItems.size} items
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
