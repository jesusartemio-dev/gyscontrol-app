'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sparkles, Upload, Loader2, CheckCircle2, AlertCircle,
  FileText, Package, Search, X, ArrowRight, Info, Hash,
} from 'lucide-react'
import { scanPdfCatalogo, bulkCreateCatalogoEquipo } from '@/lib/services/catalogoEquipo'
import { calcularPrecioInterno, calcularPrecioVenta } from '@/lib/utils/recalculoCatalogoEquipo'
import type { CategoriaEquipo, Unidad } from '@/types'
import type { PdfExtractedItem } from '@/app/api/catalogo-equipo/import-pdf/route'

// ── Types ──────────────────────────────────────────────────────────────────

type ReviewItem = PdfExtractedItem & {
  _selected: boolean
  _categoriaId: string
  _unidadId: string
  _editCodigo: string
  _editDescripcion: string
  _editMarca: string
  _editPrecioLista: number
}

type Step = 'upload' | 'review' | 'done'

interface Props {
  open: boolean
  onClose: () => void
  categorias: CategoriaEquipo[]
  unidades: Unidad[]
  onSuccess: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function matchCategoria(sugerida: string | null, categorias: CategoriaEquipo[]): string {
  if (!sugerida || categorias.length === 0) return categorias[0]?.id ?? ''
  const lower = sugerida.toLowerCase()
  const exact = categorias.find(c => c.nombre.toLowerCase() === lower)
  if (exact) return exact.id
  const partial = categorias.find(c =>
    c.nombre.toLowerCase().includes(lower) || lower.includes(c.nombre.toLowerCase())
  )
  return partial?.id ?? categorias[0]?.id ?? ''
}

function matchUnidad(sugerida: string | null, unidades: Unidad[]): string {
  if (!sugerida || unidades.length === 0) return unidades[0]?.id ?? ''
  const lower = sugerida.toLowerCase()
  const exact = unidades.find(u => u.nombre.toLowerCase() === lower)
  if (exact) return exact.id
  const partial = unidades.find(u =>
    u.nombre.toLowerCase().includes(lower) || lower.includes(u.nombre.toLowerCase())
  )
  return partial?.id ?? unidades[0]?.id ?? ''
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ImportarPdfDialog({ open, onClose, categorias, unidades, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const [items, setItems] = useState<ReviewItem[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'nuevos' | 'existentes'>('todos')

  const resetState = useCallback(() => {
    setStep('upload')
    setScanning(false)
    setImporting(false)
    setFileName('')
    setItems([])
    setSearchFilter('')
    setStatusFilter('todos')
  }, [])

  const handleClose = () => {
    resetState()
    onClose()
  }

  // ── Step 1: Upload & Scan ──────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.type !== 'application/pdf') {
      toast.error('Solo se aceptan archivos PDF')
      return
    }

    setFileName(file.name)
    setScanning(true)

    try {
      const result = await scanPdfCatalogo(file)

      if (!result.ok || !result.items?.length) {
        toast.error('No se encontraron equipos en el PDF')
        setScanning(false)
        return
      }

      const reviewItems: ReviewItem[] = result.items.map((item: PdfExtractedItem) => ({
        ...item,
        _selected: item.isNew,
        _categoriaId: matchCategoria(item.categoriaSugerida, categorias),
        _unidadId: matchUnidad(item.unidadSugerida, unidades),
        _editCodigo: item.codigo,
        _editDescripcion: item.descripcion,
        _editMarca: item.marca,
        _editPrecioLista: item.precioLista ?? 0,
      }))

      setItems(reviewItems)
      setStep('review')
      toast.success(`${result.stats.total} equipos extraídos (${result.stats.nuevos} nuevos, ${result.stats.existentes} existentes)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al escanear PDF'
      toast.error(msg)
    } finally {
      setScanning(false)
    }
  }

  // ── Step 2: Review & Edit ──────────────────────────────────────────────

  const updateItem = (index: number, updates: Partial<ReviewItem>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter === 'nuevos' && !item.isNew) return false
      if (statusFilter === 'existentes' && item.isNew) return false
      if (searchFilter) {
        const term = searchFilter.toLowerCase()
        return (
          item._editCodigo.toLowerCase().includes(term) ||
          item._editDescripcion.toLowerCase().includes(term) ||
          item._editMarca.toLowerCase().includes(term)
        )
      }
      return true
    })
  }, [items, statusFilter, searchFilter])

  const selectedNewItems = useMemo(() =>
    items.filter(i => i._selected && i.isNew),
    [items]
  )

  const stats = useMemo(() => ({
    total: items.length,
    nuevos: items.filter(i => i.isNew).length,
    existentes: items.filter(i => !i.isNew).length,
    seleccionados: selectedNewItems.length,
  }), [items, selectedNewItems])

  const toggleSelectAllNew = () => {
    const allNewSelected = items.filter(i => i.isNew).every(i => i._selected)
    setItems(prev => prev.map(item => item.isNew ? { ...item, _selected: !allNewSelected } : item))
  }

  // ── Step 3: Import ────────────────────────────────────────────────────

  const handleImport = async () => {
    if (selectedNewItems.length === 0) {
      toast.warning('Selecciona al menos un equipo nuevo para importar')
      return
    }

    // Validate all selected items have categoria and unidad
    const invalid = selectedNewItems.filter(i => !i._categoriaId || !i._unidadId)
    if (invalid.length > 0) {
      toast.warning(`${invalid.length} equipo(s) sin categoría o unidad asignada`)
      return
    }

    setImporting(true)
    try {
      const FACTOR_COSTO = 1.0
      const FACTOR_VENTA = 1.15

      const payload = selectedNewItems.map(item => {
        const precioLista = item._editPrecioLista || 0
        const precioInterno = calcularPrecioInterno(precioLista, FACTOR_COSTO)
        const precioVenta = calcularPrecioVenta(precioInterno, FACTOR_VENTA)
        return {
          codigo: item._editCodigo.trim(),
          descripcion: item._editDescripcion.trim(),
          marca: item._editMarca.trim(),
          precioLista,
          factorCosto: FACTOR_COSTO,
          factorVenta: FACTOR_VENTA,
          precioInterno,
          precioVenta,
          categoriaId: item._categoriaId,
          unidadId: item._unidadId,
          estado: 'pendiente',
        }
      })

      const result = await bulkCreateCatalogoEquipo(payload)
      toast.success(`${result.created} equipo(s) creados exitosamente`)
      setStep('done')
      onSuccess()
      setTimeout(handleClose, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al importar'
      toast.error(msg)
    } finally {
      setImporting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-5xl w-full max-h-[92vh] overflow-hidden p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Importar Equipos desde PDF
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-0.5">
              {step === 'upload' && 'Sube una cotización o catálogo en PDF para extraer equipos con IA'}
              {step === 'review' && `${stats.total} equipos extraídos — revisa y selecciona los nuevos para importar`}
              {step === 'done' && 'Importación completada'}
            </p>
          </div>
          {step === 'review' && (
            <div className="flex gap-1.5">
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                {stats.nuevos} nuevos
              </Badge>
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                {stats.existentes} existentes
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex items-center justify-center p-8"
            >
              <div className="w-full max-w-md space-y-6 text-center">
                {scanning ? (
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Analizando PDF con IA...</p>
                      <p className="text-sm text-gray-500 mt-1">{fileName}</p>
                      <p className="text-xs text-gray-400 mt-2">Esto puede tomar unos segundos</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-xl p-10 hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-10 w-10 text-gray-400 group-hover:text-purple-500 mx-auto mb-4 transition-colors" />
                      <p className="font-medium text-gray-700 group-hover:text-purple-700">
                        Haz clic para seleccionar un PDF
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Cotización de proveedor o catálogo de equipos
                      </p>
                      <p className="text-xs text-gray-400 mt-2">PDF, máximo 20MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 text-left">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>La IA extraerá códigos, descripciones, marcas y precios del PDF. Podrás revisar y editar antes de importar.</p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Toolbar */}
              <div className="px-4 py-3 border-b bg-gray-50/50 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar en resultados..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                  {searchFilter && (
                    <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchFilter('')}>
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'todos' | 'nuevos' | 'existentes')}>
                  <SelectTrigger className="h-8 text-sm w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos ({stats.total})</SelectItem>
                    <SelectItem value="nuevos">Nuevos ({stats.nuevos})</SelectItem>
                    <SelectItem value="existentes">Existentes ({stats.existentes})</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={toggleSelectAllNew}>
                  {items.filter(i => i.isNew).every(i => i._selected) ? 'Deseleccionar nuevos' : 'Seleccionar todos los nuevos'}
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {stats.seleccionados} seleccionado(s) para importar
                </span>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <div className="min-w-[900px]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="w-8 px-2 py-2"></th>
                        <th className="text-left px-2 py-2 text-xs font-medium text-gray-500 w-10">Estado</th>
                        <th className="text-left px-2 py-2 text-xs font-medium text-gray-500 w-[130px]">Código</th>
                        <th className="text-left px-2 py-2 text-xs font-medium text-gray-500">Descripción</th>
                        <th className="text-left px-2 py-2 text-xs font-medium text-gray-500 w-[100px]">Marca</th>
                        <th className="text-right px-2 py-2 text-xs font-medium text-gray-500 w-[90px]">Precio</th>
                        <th className="text-left px-2 py-2 text-xs font-medium text-gray-500 w-[150px]">Categoría</th>
                        <th className="text-left px-2 py-2 text-xs font-medium text-gray-500 w-[100px]">Unidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredItems.map((item, idx) => {
                        const realIndex = items.indexOf(item)
                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              !item.isNew
                                ? 'bg-amber-50/40'
                                : item._selected
                                  ? 'bg-green-50/40'
                                  : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-2 py-1.5 text-center">
                              {item.isNew ? (
                                <Checkbox
                                  checked={item._selected}
                                  onCheckedChange={(checked) => updateItem(realIndex, { _selected: !!checked })}
                                />
                              ) : (
                                <div className="h-4 w-4" />
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              {item.isNew ? (
                                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Nuevo</Badge>
                              ) : (
                                <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Existe</Badge>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              {item.isNew ? (
                                <Input
                                  value={item._editCodigo}
                                  onChange={e => updateItem(realIndex, { _editCodigo: e.target.value })}
                                  className="h-7 text-xs font-mono"
                                />
                              ) : (
                                <span className="text-xs font-mono text-gray-600">{item.codigo}</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              {item.isNew ? (
                                <Input
                                  value={item._editDescripcion}
                                  onChange={e => updateItem(realIndex, { _editDescripcion: e.target.value })}
                                  className="h-7 text-xs"
                                />
                              ) : (
                                <div>
                                  <span className="text-xs text-gray-600">{item.descripcion}</span>
                                  {item.matchedCodigo && (
                                    <p className="text-[10px] text-amber-600 mt-0.5">
                                      Coincide con: {item.matchedCodigo}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              {item.isNew ? (
                                <Input
                                  value={item._editMarca}
                                  onChange={e => updateItem(realIndex, { _editMarca: e.target.value })}
                                  className="h-7 text-xs"
                                />
                              ) : (
                                <span className="text-xs text-gray-500">{item.marca}</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {item.isNew ? (
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item._editPrecioLista}
                                  onChange={e => updateItem(realIndex, { _editPrecioLista: parseFloat(e.target.value) || 0 })}
                                  className="h-7 text-xs text-right"
                                />
                              ) : (
                                <span className="text-xs text-gray-600">
                                  {item.precioLista != null ? `$${item.precioLista.toFixed(2)}` : '—'}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              {item.isNew ? (
                                <Select value={item._categoriaId} onValueChange={v => updateItem(realIndex, { _categoriaId: v })}>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Categoría" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categorias.map(c => (
                                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-gray-500">{item.categoriaSugerida || '—'}</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              {item.isNew ? (
                                <Select value={item._unidadId} onValueChange={v => updateItem(realIndex, { _unidadId: v })}>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Und" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {unidades.map(u => (
                                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-gray-500">{item.unidadSugerida || '—'}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex items-center justify-center p-8"
            >
              <div className="text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-medium text-gray-900">Importación completada</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {step === 'review' && (
          <div className="border-t px-6 py-3 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" /> {stats.total} extraídos
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> {stats.seleccionados} seleccionados
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={importing}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || stats.seleccionados === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {importing ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Importando...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Importar {stats.seleccionados} equipo(s)</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
