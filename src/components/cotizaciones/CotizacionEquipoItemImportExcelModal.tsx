// ===================================================
// Archivo: CotizacionEquipoItemImportExcelModal.tsx
// Ubicación: src/components/cotizaciones/
// Descripción: Modal para importar items de equipo desde Excel con comparación de catálogo
// Autor: Jesús Artemio
// Última actualización: 2025-02-02
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
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
  Plus,
  AlertTriangle,
  Database,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import {
  leerExcelEquipoItems,
  validarEImportarEquipoItems,
  generarPlantillaEquiposImportacion,
  recalcularItemConPriceSource,
  type ImportedEquipoItem,
  type CategoriaEquipoSimple,
  type PriceSource,
  type EquipoImportValidationResult
} from '@/lib/utils/cotizacionEquipoItemExcel'

import type { CatalogoEquipo, CotizacionEquipo, CotizacionEquipoItem, Unidad } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  equipo: CotizacionEquipo
  cotizacionId?: string
  cotizacionCodigo?: string
  onItemsCreated: (items: CotizacionEquipoItem[]) => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatTimeAgo = (date: Date | string): string => {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`
  return `hace ${Math.floor(diffDays / 365)} años`
}

export default function CotizacionEquipoItemImportExcelModal({
  isOpen,
  onClose,
  equipo,
  cotizacionId,
  cotizacionCodigo,
  onItemsCreated
}: Props) {
  const [catalogoEquipos, setCatalogoEquipos] = useState<CatalogoEquipo[]>([])
  const [categoriasEquipo, setCategoriasEquipo] = useState<CategoriaEquipoSimple[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [itemsNuevos, setItemsNuevos] = useState<ImportedEquipoItem[]>([])
  const [itemsActualizar, setItemsActualizar] = useState<ImportedEquipoItem[]>([])
  const [itemsConflicto, setItemsConflicto] = useState<ImportedEquipoItem[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [advertencias, setAdvertencias] = useState<string[]>([])
  const [summary, setSummary] = useState<EquipoImportValidationResult['summary'] | null>(null)

  const [selectedNuevos, setSelectedNuevos] = useState<Set<number>>(new Set())
  const [selectedActualizar, setSelectedActualizar] = useState<Set<number>>(new Set())
  const [selectedConflicto, setSelectedConflicto] = useState<Set<number>>(new Set())

  // Estado para las selecciones de precio en conflictos
  const [priceSourceSelections, setPriceSourceSelections] = useState<Map<number, PriceSource>>(new Map())

  // Estado para items nuevos que se agregarán al catálogo
  const [addToCatalogSelections, setAddToCatalogSelections] = useState<Set<number>>(new Set())

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
      const [catalogoData, categoriasData, unidadesData] = await Promise.all([
        getCatalogoEquipos(),
        getCategoriasEquipo(),
        getUnidades()
      ])
      setCatalogoEquipos(catalogoData)
      setCategoriasEquipo(categoriasData)
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
    setItemsNuevos([])
    setItemsActualizar([])
    setItemsConflicto([])
    setErrores([])
    setAdvertencias([])
    setSummary(null)
    setSelectedNuevos(new Set())
    setSelectedActualizar(new Set())
    setSelectedConflicto(new Set())
    setPriceSourceSelections(new Map())
    setAddToCatalogSelections(new Set())
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
        setItemsConflicto([])
        setStep('preview')
        return
      }

      // Preparar lista de items existentes para detección de duplicados
      const existingItems = (equipo.items || []).map(item => ({
        id: item.id,
        codigo: item.codigo
      }))

      const result = validarEImportarEquipoItems(rows, catalogoEquipos, existingItems, categoriasEquipo)
      setItemsNuevos(result.itemsNuevos)
      setItemsActualizar(result.itemsActualizar)
      setItemsConflicto(result.itemsConflicto)
      setErrores(result.errores)
      setAdvertencias(result.advertencias)
      setSummary(result.summary)

      // Seleccionar todos los items por defecto
      setSelectedNuevos(new Set(result.itemsNuevos.map((_, idx) => idx)))
      setSelectedActualizar(new Set(result.itemsActualizar.map((_, idx) => idx)))
      setSelectedConflicto(new Set(result.itemsConflicto.map((_, idx) => idx)))

      // Inicializar selección de precios para conflictos (por defecto: excel)
      const initialPriceSelections = new Map<number, PriceSource>()
      result.itemsConflicto.forEach((_, idx) => {
        initialPriceSelections.set(idx, 'excel')
      })
      setPriceSourceSelections(initialPriceSelections)

      setStep('preview')
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error('Error al leer el archivo Excel')
      setErrores(['Error al leer el archivo. Verifica que sea un archivo Excel válido (.xlsx)'])
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const prefix = (cotizacionCodigo || cotizacionId) ? `${cotizacionCodigo || cotizacionId}_` : ''
      const nombreArchivo = `${prefix}${equipo.nombre} - Plantilla`
      await generarPlantillaEquiposImportacion(nombreArchivo, categoriasEquipo, unidades)
      toast.success('Plantilla descargada')
    } catch (error) {
      console.error('Error downloading template:', error)
      toast.error('Error al descargar la plantilla')
    }
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

  const toggleConflicto = (index: number) => {
    const newSelected = new Set(selectedConflicto)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedConflicto(newSelected)
  }

  const handlePriceSourceChange = (index: number, source: PriceSource) => {
    const newSelections = new Map(priceSourceSelections)
    newSelections.set(index, source)
    setPriceSourceSelections(newSelections)
  }

  const toggleAddToCatalog = (index: number) => {
    const newSet = new Set(addToCatalogSelections)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setAddToCatalogSelections(newSet)
  }

  const handleImport = async () => {
    // Marcar items nuevos que deben agregarse al catálogo
    const nuevosToCreate = itemsNuevos
      .filter((_, idx) => selectedNuevos.has(idx))
      .map((item, idx) => ({
        ...item,
        addToCatalog: item.catalogStatus === 'new' && addToCatalogSelections.has(idx)
      }))
    const existentesToUpdate = itemsActualizar.filter((_, idx) => selectedActualizar.has(idx))
    const conflictosToCreate = itemsConflicto
      .filter((_, idx) => selectedConflicto.has(idx))
      .map((item, idx) => {
        const priceSource = priceSourceSelections.get(idx) || 'excel'
        return recalcularItemConPriceSource(item, priceSource)
      })

    const allItemsToCreate = [...nuevosToCreate, ...conflictosToCreate]

    if (allItemsToCreate.length === 0 && existentesToUpdate.length === 0) {
      toast.error('Selecciona al menos un item')
      return
    }

    setSaving(true)
    const resultItems: CotizacionEquipoItem[] = []
    let catalogUpdates = 0
    let catalogCreates = 0

    try {
      // Crear nuevos items (incluyendo conflictos)
      for (const item of allItemsToCreate) {
        const payload = {
          cotizacionEquipoId: equipo.id,
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

        const res = await fetch('/api/cotizacion-equipo-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (res.ok) {
          const created = await res.json()
          resultItems.push(created)
        }

        // Si el item tiene priceSource = 'excel_update_catalog', actualizar catálogo
        if (item.priceSource === 'excel_update_catalog' && item.catalogoEquipoId) {
          try {
            const catalogUpdateRes = await fetch(`/api/catalogo-equipo/${item.catalogoEquipoId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                precioInterno: item.precioInterno,
                precioLista: item.precioLista,
                margen: item.margen
              })
            })
            if (catalogUpdateRes.ok) {
              catalogUpdates++
            }
          } catch (err) {
            console.error('Error updating catalog:', err)
          }
        }

        // Si el item es nuevo y debe agregarse al catálogo (no duplicados ni provisionales)
        if (item.addToCatalog && item.catalogStatus === 'new' && !item.codigoDuplicadoEnExcel && !item.codigoProvisional) {
          try {
            // Buscar categoriaId por nombre
            const categoria = categoriasEquipo.find(
              c => c.nombre.toLowerCase().trim() === item.categoria.toLowerCase().trim()
            )
            // Buscar unidadId por nombre
            const unidad = unidades.find(
              u => u.nombre.toLowerCase().trim() === (item.unidad || '').toLowerCase().trim()
            )

            // Si no encontramos categoría o unidad, usar valores por defecto o saltar
            if (categoria && unidad) {
              const precioVenta = Math.round(item.precioInterno * (1 + item.margen) * 100) / 100
              const catalogPayload = {
                codigo: item.codigo,
                descripcion: item.descripcion,
                marca: item.marca || '',
                precioInterno: item.precioInterno,
                margen: item.margen,
                precioVenta,
                categoriaId: categoria.id,
                unidadId: unidad.id,
                estado: 'ACTIVO'
              }

              const catalogCreateRes = await fetch('/api/catalogo-equipo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(catalogPayload)
              })

              if (catalogCreateRes.ok) {
                catalogCreates++
              }
            } else {
              console.warn(`No se pudo crear en catálogo: categoría=${item.categoria}, unidad=${item.unidad}`)
            }
          } catch (err) {
            console.error('Error creating catalog entry:', err)
          }
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

        const res = await fetch(`/api/cotizacion-equipo-item/${item.existingItemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        })

        if (res.ok) {
          const updated = await res.json()
          resultItems.push(updated)
        }
      }

      const creados = allItemsToCreate.length
      const actualizados = existentesToUpdate.length
      const mensaje = []
      if (creados > 0) mensaje.push(`${creados} creados`)
      if (actualizados > 0) mensaje.push(`${actualizados} actualizados`)
      if (catalogUpdates > 0) mensaje.push(`${catalogUpdates} catálogo actualizado`)
      if (catalogCreates > 0) mensaje.push(`${catalogCreates} agregados al catálogo`)
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

  const totalItems = itemsNuevos.length + itemsActualizar.length + itemsConflicto.length

  // Calcular total sin redondeo intermedio (como Excel)
  const getItemsSeleccionados = () => {
    const nuevos = itemsNuevos.filter((_, idx) => selectedNuevos.has(idx))
    const actualizar = itemsActualizar.filter((_, idx) => selectedActualizar.has(idx))
    const conflictos = itemsConflicto
      .filter((_, idx) => selectedConflicto.has(idx))
      .map((item, idx) => {
        const priceSource = priceSourceSelections.get(idx) || 'excel'
        return recalcularItemConPriceSource(item, priceSource)
      })
    return [...nuevos, ...actualizar, ...conflictos]
  }

  const itemsSeleccionados = getItemsSeleccionados()
  const totalSeleccionado = Math.round(
    itemsSeleccionados.reduce((sum, item) =>
      sum + item.precioInterno * (1 + item.margen) * item.cantidad, 0
    ) * 100
  ) / 100

  const totalSelected = selectedNuevos.size + selectedActualizar.size + selectedConflicto.size

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-orange-600" />
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
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-orange-300 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-equipo-upload"
              />
              <label htmlFor="excel-equipo-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">
                  Arrastra un archivo Excel o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Formato .xlsx con columnas: Código, Descripción, Cantidad, P.Real, Margen
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
                <li>- Si el código existe en el catálogo, podrás comparar precios</li>
                <li>- Items con precio diferente al catálogo mostrarán opciones</li>
                <li>- Puedes actualizar el catálogo con los nuevos precios</li>
              </ul>
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
              <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-red-700">
                    {errores.length} error(es) encontrado(s)
                  </span>
                </div>
                <div className="space-y-1 pl-6">
                  {errores.map((error, idx) => (
                    <div key={idx} className="text-xs text-red-600 py-0.5 border-l-2 border-red-300 pl-2">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advertencias (códigos duplicados, provisionales, etc) */}
            {advertencias.length > 0 && (
              <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200 max-h-56 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-amber-700">
                    Advertencias ({advertencias.length})
                  </span>
                </div>
                <div className="space-y-1 pl-6">
                  {advertencias.map((advertencia, idx) => (
                    <div key={idx} className="text-xs text-amber-700 py-0.5 border-l-2 border-amber-300 pl-2 whitespace-pre-wrap">
                      {advertencia}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen con badges */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {itemsNuevos.length > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                      <Plus className="h-3 w-3 mr-1" />
                      {itemsNuevos.length} nuevos
                    </Badge>
                  )}
                  {summary && summary.totalMatch > 0 && (
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {summary.totalMatch} coinciden
                    </Badge>
                  )}
                  {itemsConflicto.length > 0 && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {itemsConflicto.length} precio diferente
                    </Badge>
                  )}
                  {itemsActualizar.length > 0 && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {itemsActualizar.length} a actualizar
                    </Badge>
                  )}
                  {summary && summary.codigosDuplicados > 0 && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {summary.codigosDuplicados} código(s) duplicado(s)
                    </Badge>
                  )}
                  {summary && summary.codigosProvisionales > 0 && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {summary.codigosProvisionales} código(s) provisional(es)
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
              <div className="flex-1 overflow-y-auto space-y-4">

                {/* Items con conflicto de precio */}
                {itemsConflicto.length > 0 && (
                  <div className="border border-amber-200 rounded-lg overflow-hidden">
                    <div className="bg-amber-50 px-3 py-2 border-b border-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-800">
                          Items con precio diferente al catálogo ({itemsConflicto.length})
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-amber-100">
                      {itemsConflicto.map((item, idx) => {
                        const priceSource = priceSourceSelections.get(idx) || 'excel'
                        const recalculatedItem = recalcularItemConPriceSource(item, priceSource)

                        return (
                          <div
                            key={`conflict-${idx}`}
                            className={cn(
                              'p-3 transition-colors',
                              selectedConflicto.has(idx) ? 'bg-amber-50/50' : 'bg-white'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedConflicto.has(idx)}
                                onCheckedChange={() => toggleConflicto(idx)}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-2">
                                {/* Info del item */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-mono text-xs text-gray-600">{item.codigo}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-xs font-medium">{item.descripcion}</span>
                                  </div>
                                  <span className="text-xs text-gray-500">Cant: {item.cantidad}</span>
                                </div>

                                {/* Comparación de precios */}
                                <div className="grid grid-cols-2 gap-3 p-2 bg-gray-50 rounded-lg">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                      <FileSpreadsheet className="h-3 w-3" />
                                      <span>Precio Excel</span>
                                    </div>
                                    <p className="text-sm font-mono font-medium text-amber-600">
                                      {formatCurrency(item.precioInterno)}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                      <Database className="h-3 w-3" />
                                      <span>Precio Catálogo</span>
                                      {item.catalogComparison && (
                                        <span className="text-gray-400">
                                          ({formatTimeAgo(item.catalogComparison.catalogoUpdatedAt)})
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-mono font-medium text-blue-600">
                                      {item.catalogComparison ? formatCurrency(item.catalogComparison.catalogoPrecioInterno) : '-'}
                                    </p>
                                  </div>
                                </div>

                                {/* Diferencia */}
                                {item.catalogComparison && (
                                  <div className="flex items-center gap-2 text-[10px]">
                                    <span className="text-gray-500">Diferencia:</span>
                                    <span className={cn(
                                      'font-medium',
                                      item.catalogComparison.priceDifference > 0 ? 'text-red-600' : 'text-green-600'
                                    )}>
                                      {item.catalogComparison.priceDifference > 0 ? '+' : ''}
                                      {formatCurrency(item.catalogComparison.priceDifference)}
                                      {' '}
                                      ({item.catalogComparison.priceDifferencePercent > 0 ? '+' : ''}
                                      {item.catalogComparison.priceDifferencePercent.toFixed(1)}%)
                                    </span>
                                  </div>
                                )}

                                {/* Opciones de precio */}
                                <RadioGroup
                                  value={priceSource}
                                  onValueChange={(value) => handlePriceSourceChange(idx, value as PriceSource)}
                                  className="flex flex-col gap-1.5"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="excel" id={`excel-${idx}`} />
                                    <Label htmlFor={`excel-${idx}`} className="text-[11px] cursor-pointer">
                                      Usar precio Excel ({formatCurrency(item.precioInterno)})
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="catalog" id={`catalog-${idx}`} />
                                    <Label htmlFor={`catalog-${idx}`} className="text-[11px] cursor-pointer">
                                      Usar precio Catálogo ({item.catalogComparison ? formatCurrency(item.catalogComparison.catalogoPrecioInterno) : '-'})
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="excel_update_catalog" id={`update-${idx}`} />
                                    <Label htmlFor={`update-${idx}`} className="text-[11px] cursor-pointer flex items-center gap-1">
                                      Usar Excel y <span className="text-amber-600 font-medium">actualizar catálogo</span>
                                      <ArrowRight className="h-3 w-3 text-amber-500" />
                                    </Label>
                                  </div>
                                </RadioGroup>

                                {/* Total calculado */}
                                <div className="flex justify-end text-xs">
                                  <span className="text-gray-500 mr-2">Total:</span>
                                  <span className="font-mono font-medium text-green-600">
                                    {formatCurrency(recalculatedItem.costoCliente)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Items nuevos (no en catálogo o precio coincide) */}
                {itemsNuevos.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-3 py-2 border-b">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-800">
                          Items a crear ({itemsNuevos.length})
                        </span>
                      </div>
                    </div>
                    <div className="divide-y">
                      {itemsNuevos.map((item, idx) => (
                        <div key={`new-${idx}`}>
                          <div
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-green-50/50 transition-colors cursor-pointer',
                              selectedNuevos.has(idx) ? 'bg-green-50/30' : ''
                            )}
                            onClick={() => toggleNuevo(idx)}
                          >
                            <div className="w-6">
                              <Checkbox
                                checked={selectedNuevos.has(idx)}
                                onCheckedChange={() => toggleNuevo(idx)}
                              />
                            </div>
                            <div className="w-20">
                              {item.catalogStatus === 'new' ? (
                                <Badge className="text-[9px] bg-gray-100 text-gray-600 hover:bg-gray-100">
                                  Sin catálogo
                                </Badge>
                              ) : (
                                <Badge className="text-[9px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                  Coincide
                                </Badge>
                              )}
                            </div>
                            <div className="w-28 font-mono text-[10px]">
                              <div className="flex items-center gap-1">
                                <span className={item.codigoProvisional ? 'text-amber-600' : ''}>
                                  {item.codigo}
                                </span>
                                {item.codigoProvisional && (
                                  <Badge className="text-[8px] bg-amber-100 text-amber-700 hover:bg-amber-100 px-1 py-0">
                                    Prov.
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 truncate" title={item.descripcion}>
                              {item.descripcion}
                            </div>
                            <div className="w-12 text-center">
                              {item.cantidad}
                            </div>
                            <div className="w-20 text-right font-mono">
                              {formatCurrency(item.precioInterno)}
                            </div>
                            <div className="w-24 text-right font-mono font-medium text-green-600">
                              {formatCurrency(item.costoCliente)}
                            </div>
                          </div>
                          {/* Checkbox para agregar al catálogo si es item nuevo */}
                          {item.catalogStatus === 'new' && selectedNuevos.has(idx) && (
                            <div
                              className="flex items-center gap-2 px-2 py-1.5 pl-10 bg-gray-50 border-t border-dashed"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* No permitir agregar al catálogo si es código duplicado o provisional */}
                              {item.codigoDuplicadoEnExcel || item.codigoProvisional ? (
                                <span className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                  <Database className="h-3 w-3" />
                                  {item.codigoDuplicadoEnExcel
                                    ? 'No se puede agregar al catálogo (código duplicado)'
                                    : 'No se puede agregar al catálogo (código provisional)'}
                                </span>
                              ) : (
                                <>
                                  <Checkbox
                                    id={`add-catalog-${idx}`}
                                    checked={addToCatalogSelections.has(idx)}
                                    onCheckedChange={() => toggleAddToCatalog(idx)}
                                  />
                                  <Label
                                    htmlFor={`add-catalog-${idx}`}
                                    className="text-[11px] text-gray-600 cursor-pointer flex items-center gap-1"
                                  >
                                    <Database className="h-3 w-3 text-gray-400" />
                                    Agregar también al catálogo de equipos
                                  </Label>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items a actualizar en cotización */}
                {itemsActualizar.length > 0 && (
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-800">
                          Items a actualizar en cotización ({itemsActualizar.length})
                        </span>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1.5 text-left w-8"></th>
                          <th className="px-2 py-1.5 text-left w-24">Código</th>
                          <th className="px-2 py-1.5 text-left">Descripción</th>
                          <th className="px-2 py-1.5 text-center w-12">Cant.</th>
                          <th className="px-2 py-1.5 text-right w-20">P.Real</th>
                          <th className="px-2 py-1.5 text-right w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
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
                            <td className="px-2 py-1.5 font-mono text-[10px]">
                              {item.codigo}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="truncate max-w-[200px]" title={item.descripcion}>
                                {item.descripcion}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {item.cantidad}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono">
                              {formatCurrency(item.precioInterno)}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono font-medium text-blue-600">
                              {formatCurrency(item.costoCliente)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
