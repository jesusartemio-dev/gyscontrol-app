// ===================================================
// Archivo: PlantillaEquipoItemImportExcelModal.tsx
// Ubicación: src/components/plantillas/equipos/
// Descripción: Modal para importar items de equipo de plantilla desde Excel
// Autor: Jesús Artemio
// Última actualización: 2025-01-31
// ===================================================

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
  RefreshCw,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'

import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import {
  leerExcelEquipoItems,
  validarEImportarPlantillaEquipoItems,
  generarPlantillaEquiposImportacion,
  type ImportedPlantillaEquipoItem
} from '@/lib/utils/plantillaEquipoItemExcel'

import type { CatalogoEquipo, PlantillaEquipo, PlantillaEquipoItem } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  equipo: PlantillaEquipo
  onItemsCreated: (items: PlantillaEquipoItem[]) => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function PlantillaEquipoItemImportExcelModal({
  isOpen,
  onClose,
  equipo,
  onItemsCreated
}: Props) {
  const [catalogoEquipos, setCatalogoEquipos] = useState<CatalogoEquipo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [itemsNuevos, setItemsNuevos] = useState<ImportedPlantillaEquipoItem[]>([])
  const [itemsActualizar, setItemsActualizar] = useState<ImportedPlantillaEquipoItem[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [selectedNuevos, setSelectedNuevos] = useState<Set<number>>(new Set())
  const [selectedActualizar, setSelectedActualizar] = useState<Set<number>>(new Set())
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
      const catalogoData = await getCatalogoEquipos()
      setCatalogoEquipos(catalogoData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar catálogo de equipos')
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setFile(null)
    setItemsNuevos([])
    setItemsActualizar([])
    setErrores([])
    setSelectedNuevos(new Set())
    setSelectedActualizar(new Set())
    setStep('upload')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setLoading(true)

    try {
      const rows = await leerExcelEquipoItems(selectedFile)

      if (rows.length === 0) {
        setErrores(['El archivo está vacío o no tiene datos válidos'])
        setItemsNuevos([])
        setItemsActualizar([])
        setStep('preview')
        return
      }

      // Preparar lista de items existentes para detección de duplicados
      const existingItems = (equipo.items || []).map(item => ({
        id: item.id,
        codigo: item.codigo
      }))

      const result = validarEImportarPlantillaEquipoItems(rows, catalogoEquipos, existingItems)
      setItemsNuevos(result.itemsNuevos)
      setItemsActualizar(result.itemsActualizar)
      setErrores(result.errores)

      // Seleccionar todos los items por defecto
      setSelectedNuevos(new Set(result.itemsNuevos.map((_, idx) => idx)))
      setSelectedActualizar(new Set(result.itemsActualizar.map((_, idx) => idx)))
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
    generarPlantillaEquiposImportacion('PlantillaEquiposPlantilla')
    toast.success('Plantilla descargada')
  }

  const toggleNuevo = (index: number) => {
    const newSelected = new Set(selectedNuevos)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedNuevos(newSelected)
  }

  const toggleActualizar = (index: number) => {
    const newSelected = new Set(selectedActualizar)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedActualizar(newSelected)
  }

  const handleImport = async () => {
    const nuevosToCreate = itemsNuevos.filter((_, idx) => selectedNuevos.has(idx))
    const existentesToUpdate = itemsActualizar.filter((_, idx) => selectedActualizar.has(idx))

    if (nuevosToCreate.length === 0 && existentesToUpdate.length === 0) {
      toast.error('Selecciona al menos un item')
      return
    }

    setSaving(true)
    const resultItems: PlantillaEquipoItem[] = []

    try {
      // Crear nuevos items
      for (const item of nuevosToCreate) {
        const payload = {
          plantillaEquipoId: equipo.id,
          catalogoEquipoId: item.catalogoEquipoId,
          codigo: item.codigo,
          descripcion: item.descripcion,
          categoria: item.categoria,
          unidad: item.unidad,
          marca: item.marca,
          precioLista: item.precioLista,
          precioInterno: item.precioInterno,
          margen: item.margen,
          precioCliente: item.precioCliente,
          cantidad: item.cantidad,
          costoInterno: item.costoInterno,
          costoCliente: item.costoCliente
        }

        const res = await fetch('/api/plantilla-equipo-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })

        if (res.ok) {
          const created = await res.json()
          resultItems.push(created)
        }
      }

      // Actualizar items existentes
      for (const item of existentesToUpdate) {
        if (!item.existingItemId) continue

        const updatePayload = {
          precioLista: item.precioLista,
          precioInterno: item.precioInterno,
          margen: item.margen,
          precioCliente: item.precioCliente,
          cantidad: item.cantidad,
          costoInterno: item.costoInterno,
          costoCliente: item.costoCliente
        }

        const res = await fetch(`/api/plantilla-equipo-item/${item.existingItemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatePayload)
        })

        if (res.ok) {
          const updated = await res.json()
          resultItems.push(updated)
        }
      }

      const creados = nuevosToCreate.length
      const actualizados = existentesToUpdate.length
      const mensaje = []
      if (creados > 0) mensaje.push(`${creados} creados`)
      if (actualizados > 0) mensaje.push(`${actualizados} actualizados`)
      toast.success(`Equipos importados: ${mensaje.join(', ')}`)

      onItemsCreated(resultItems)
      handleClose()
    } catch (error) {
      console.error('Error importing items:', error)
      toast.error('Error al importar equipos')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const totalItems = itemsNuevos.length + itemsActualizar.length
  const totalSeleccionado = [
    ...itemsNuevos.filter((_, idx) => selectedNuevos.has(idx)),
    ...itemsActualizar.filter((_, idx) => selectedActualizar.has(idx))
  ].reduce((sum, item) => sum + item.costoCliente, 0)

  const totalSelected = selectedNuevos.size + selectedActualizar.size

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Importar Equipos desde Excel</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {equipo.nombre}
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
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-purple-300 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-plantilla-equipo-upload"
              />
              <label htmlFor="excel-plantilla-equipo-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">
                  Arrastra un archivo Excel o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Formato .xlsx con columnas: Código, Descripción, Cantidad, P.Cliente
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

            {/* Info */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-amber-800 mb-1">Información</p>
              <ul className="text-[10px] text-amber-700 space-y-0.5">
                <li>- Si el código existe en el catálogo, se usará el precio interno del catálogo</li>
                <li>- Si no existe, se estimará el precio interno (70% del precio cliente)</li>
                <li>- Los items con código duplicado se actualizarán</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Archivo cargado */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-500" />
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

            {/* Resumen */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {itemsNuevos.length > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                      <Plus className="h-3 w-3 mr-1" />
                      {itemsNuevos.length} nuevos
                    </Badge>
                  )}
                  {itemsActualizar.length > 0 && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {itemsActualizar.length} a actualizar
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  Total: {formatCurrency(totalSeleccionado)}
                </Badge>
              </div>
            )}

            {/* Lista de items */}
            {totalItems > 0 ? (
              <div className="flex-1 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left w-8"></th>
                      <th className="px-2 py-1.5 text-left w-20">Acción</th>
                      <th className="px-2 py-1.5 text-left w-20">Código</th>
                      <th className="px-2 py-1.5 text-left">Descripción</th>
                      <th className="px-2 py-1.5 text-center w-12">Cant.</th>
                      <th className="px-2 py-1.5 text-right w-20">P.Unit.</th>
                      <th className="px-2 py-1.5 text-right w-24">Total Cliente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* Items nuevos */}
                    {itemsNuevos.map((item, idx) => (
                      <tr
                        key={`new-${idx}`}
                        className={cn(
                          'hover:bg-green-50/50 transition-colors cursor-pointer',
                          selectedNuevos.has(idx) ? 'bg-green-50/30' : ''
                        )}
                        onClick={() => toggleNuevo(idx)}
                      >
                        <td className="px-2 py-1.5">
                          <Checkbox
                            checked={selectedNuevos.has(idx)}
                            onCheckedChange={() => toggleNuevo(idx)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">
                            <Plus className="h-2.5 w-2.5 mr-0.5" />
                            Nuevo
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px]">
                          {item.codigo}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium truncate max-w-[200px]">
                            {item.descripcion}
                          </div>
                          {item.catalogoEquipoId && (
                            <span className="text-[9px] text-green-600">Del catálogo</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {item.cantidad}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {formatCurrency(item.precioCliente)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                          {formatCurrency(item.costoCliente)}
                        </td>
                      </tr>
                    ))}
                    {/* Items a actualizar */}
                    {itemsActualizar.map((item, idx) => (
                      <tr
                        key={`update-${idx}`}
                        className={cn(
                          'hover:bg-blue-50/50 transition-colors cursor-pointer',
                          selectedActualizar.has(idx) ? 'bg-blue-50/30' : ''
                        )}
                        onClick={() => toggleActualizar(idx)}
                      >
                        <td className="px-2 py-1.5">
                          <Checkbox
                            checked={selectedActualizar.has(idx)}
                            onCheckedChange={() => toggleActualizar(idx)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                            <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                            Actualizar
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px]">
                          {item.codigo}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium truncate max-w-[200px]">
                            {item.descripcion}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {item.cantidad}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {formatCurrency(item.precioCliente)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                          {formatCurrency(item.costoCliente)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          {step === 'preview' && totalItems > 0 && (
            <Button
              size="sm"
              onClick={handleImport}
              disabled={saving || totalSelected === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Importar {totalSelected} items
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
