'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Trash2,
  Send,
  X,
} from 'lucide-react'
import { procesarComprobante, createGastoLineasBatch } from '@/lib/services/comprobanteOcr'
import { uploadGastoAdjunto } from '@/lib/services/gastoAdjunto'
import type { ComprobanteOcrResponse } from '@/lib/services/comprobanteOcr'
import type { CategoriaGasto } from '@/types'
import { cn } from '@/lib/utils'

// ── Tipos internos ───────────────────────────────────────

type ProcessStatus = 'pending' | 'processing' | 'done' | 'error'

interface ComprobanteItem {
  id: string
  file: File
  status: ProcessStatus
  error?: string
  // Datos OCR editables
  tipoComprobante: string
  numeroComprobante: string
  proveedorRuc: string
  proveedorNombre: string
  fechaEmision: string
  montoTotal: string
  igv: string
  moneda: string
  descripcion: string
  confianza: 'alta' | 'media' | 'baja' | ''
  observaciones: string
  // SUNAT
  sunatAlerta: string | null
  sunatAlertaTipo: 'warning' | 'info' | null
  sunatRazonSocial: string | null
  sunatCondicion: string | null
  sunatVerificado: boolean | null
  // Categoría
  categoriaGastoId: string
  // Upload a Drive
  uploadStatus: 'uploading' | 'uploaded' | 'upload_error' | null
}

interface CargaMasivaComprobantesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hojaDeGastosId: string
  categorias: CategoriaGasto[]
  onSuccess: () => void
}

// ── Constantes ───────────────────────────────────────────

const TIPOS_COMPROBANTE = [
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'sin_comprobante', label: 'Sin comprobante' },
]

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

let itemIdCounter = 0

// ── Validación ───────────────────────────────────────────

interface ValidationErrors {
  fechaEmision?: string
  montoTotal?: string
}

function validateItem(item: ComprobanteItem): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!item.fechaEmision) errors.fechaEmision = 'Requerida'
  if (!item.montoTotal || parseFloat(item.montoTotal) <= 0) errors.montoTotal = 'Debe ser > 0'
  return errors
}

function hasErrors(item: ComprobanteItem): boolean {
  return Object.keys(validateItem(item)).length > 0
}

// ── Componente ───────────────────────────────────────────

export default function CargaMasivaComprobantes({
  open,
  onOpenChange,
  hojaDeGastosId,
  categorias,
  onSuccess,
}: CargaMasivaComprobantesProps) {
  const [items, setItems] = useState<ComprobanteItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, errors: 0 })
  const [showValidation, setShowValidation] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isBusy = isProcessing || isSaving || isUploading

  // ── Helpers ──────────────────────────────────────────

  const createItem = (file: File): ComprobanteItem => ({
    id: `ocr-${++itemIdCounter}`,
    file,
    status: 'pending',
    tipoComprobante: '',
    numeroComprobante: '',
    proveedorRuc: '',
    proveedorNombre: '',
    fechaEmision: '',
    montoTotal: '',
    igv: '',
    moneda: 'PEN',
    descripcion: '',
    confianza: '',
    observaciones: '',
    sunatAlerta: null,
    sunatAlertaTipo: null,
    sunatRazonSocial: null,
    sunatCondicion: null,
    sunatVerificado: null,
    categoriaGastoId: '',
    uploadStatus: null,
  })

  const updateItem = useCallback((id: string, updates: Partial<ComprobanteItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  const applyOcrResult = (id: string, result: ComprobanteOcrResponse) => {
    const d = result.data
    updateItem(id, {
      status: 'done',
      tipoComprobante: d.tipoComprobante || '',
      numeroComprobante: d.numeroComprobante || '',
      proveedorRuc: d.proveedorRuc || '',
      proveedorNombre: d.proveedorNombre || '',
      fechaEmision: d.fechaEmision || '',
      montoTotal: d.montoTotal != null ? String(d.montoTotal) : '',
      igv: d.igv != null ? String(d.igv) : '',
      moneda: d.moneda || 'PEN',
      descripcion: d.descripcion || '',
      confianza: d.confianza || 'baja',
      observaciones: d.observaciones || '',
      sunatAlerta: d.sunatAlerta || null,
      sunatAlertaTipo: d.sunatAlertaTipo || null,
      sunatRazonSocial: d.sunat?.razonSocial || null,
      sunatCondicion: d.sunat?.condicion || null,
      sunatVerificado: d.sunat ? true : (d.proveedorRuc ? false : null),
    })
  }

  // ── Selección de archivos ────────────────────────────

  const addFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: tipo no soportado (${f.type || 'desconocido'})`)
        return false
      }
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name}: archivo muy grande (máx 20MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return
    const newItems = validFiles.map(createItem)
    setItems((prev) => [...prev, ...newItems])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  // ── Procesamiento OCR ────────────────────────────────

  const processAll = async () => {
    const pending = items.filter((i) => i.status === 'pending' || i.status === 'error')
    if (pending.length === 0) {
      toast.info('No hay comprobantes pendientes de procesar')
      return
    }

    setIsProcessing(true)

    const results = await Promise.allSettled(
      pending.map(async (item) => {
        updateItem(item.id, { status: 'processing' })
        try {
          const result = await procesarComprobante(item.file)
          applyOcrResult(item.id, result)
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Error desconocido'
          updateItem(item.id, { status: 'error', error: msg })
        }
      })
    )

    const errors = results.filter((r) => r.status === 'rejected').length
    const succeeded = pending.length - errors
    setIsProcessing(false)

    if (succeeded > 0) {
      toast.success(`${succeeded} comprobante(s) procesado(s)`)
    }
  }

  // ── Guardar batch + upload a Drive ─────────────────

  const handleConfirm = async () => {
    setShowValidation(true)

    const doneItems = items.filter((i) => i.status === 'done')
    if (doneItems.length === 0) {
      toast.error('No hay comprobantes procesados para guardar')
      return
    }

    // Validar campos requeridos (inline errors ya visibles)
    const invalidCount = doneItems.filter((item) => hasErrors(item)).length
    if (invalidCount > 0) {
      toast.error(`${invalidCount} comprobante(s) con errores. Corrija los campos marcados en rojo.`)
      return
    }

    // ── Fase 1: Crear líneas de gasto ──
    setIsSaving(true)
    try {
      const lineas = doneItems.map((item) => ({
        descripcion: item.descripcion.trim(),
        fecha: item.fechaEmision,
        monto: parseFloat(item.montoTotal),
        moneda: item.moneda || 'PEN',
        tipoComprobante: item.tipoComprobante || null,
        numeroComprobante: item.numeroComprobante || null,
        proveedorNombre: item.proveedorNombre || null,
        proveedorRuc: item.proveedorRuc || null,
        categoriaGastoId: item.categoriaGastoId || null,
        observaciones: item.observaciones || null,
        sunatVerificado: item.sunatVerificado,
      }))

      const result = await createGastoLineasBatch(hojaDeGastosId, lineas)
      const createdLineas = result.data

      toast.success(`${lineas.length} línea(s) de gasto creadas`)
      setIsSaving(false)

      // ── Fase 2: Subir archivos a Google Drive ──
      setIsUploading(true)
      setUploadProgress({ current: 0, total: doneItems.length, errors: 0 })

      let uploadErrors = 0
      for (let i = 0; i < doneItems.length; i++) {
        const item = doneItems[i]
        const gastoLineaId = createdLineas[i]?.id
        if (!gastoLineaId) {
          uploadErrors++
          continue
        }

        updateItem(item.id, { uploadStatus: 'uploading' })
        setUploadProgress((prev) => ({ ...prev, current: i + 1 }))

        try {
          await uploadGastoAdjunto(gastoLineaId, item.file)
          updateItem(item.id, { uploadStatus: 'uploaded' })
        } catch (error) {
          console.error(`Error uploading ${item.file.name}:`, error)
          updateItem(item.id, { uploadStatus: 'upload_error' })
          uploadErrors++
        }
      }

      setIsUploading(false)

      if (uploadErrors > 0) {
        toast.warning(
          `${doneItems.length - uploadErrors} archivo(s) subidos a Drive. ${uploadErrors} fallaron.`,
          { duration: 6000 }
        )
      } else {
        toast.success(`${doneItems.length} archivo(s) adjuntados a Drive`)
      }

      // Limpiar y cerrar
      setItems([])
      setShowValidation(false)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
      setIsSaving(false)
    }
  }

  // ── Reset al cerrar ─────────────────────────────────

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isBusy) return
    onOpenChange(isOpen)
  }

  const handleCancel = () => {
    if (isBusy) return
    setItems([])
    setShowValidation(false)
    onOpenChange(false)
  }

  // ── Contadores ───────────────────────────────────────

  const countByStatus = (status: ProcessStatus) => items.filter((i) => i.status === status).length
  const doneCount = countByStatus('done')
  const errorCount = countByStatus('error')
  const processingCount = countByStatus('processing')
  const pendingCount = countByStatus('pending')
  const totalMonto = items
    .filter((i) => i.status === 'done' && i.montoTotal)
    .reduce((sum, i) => sum + (parseFloat(i.montoTotal) || 0), 0)

  // ── Render ───────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[95vw] lg:max-w-6xl max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => { if (items.length > 0) e.preventDefault() }}
        onEscapeKeyDown={(e) => { if (items.length > 0) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-100">
              <Upload className="h-4 w-4 text-blue-700" />
            </div>
            Carga Masiva de Comprobantes
          </DialogTitle>
          <DialogDescription>
            Sube fotos o PDFs de facturas, boletas y recibos. Claude Vision extraerá los datos automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* ─── Zona de carga ─────────────────────── */}
          {items.length === 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, PDF — Máximo 20MB por archivo
              </p>
            </div>
          ) : (
            <>
              {/* ─── Barra de estado ─────────────────── */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => inputRef.current?.click()}
                    disabled={isBusy}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Agregar más
                  </Button>
                  {(pendingCount > 0 || errorCount > 0) && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={processAll}
                      disabled={isBusy}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3 mr-1" />
                      )}
                      {isProcessing
                        ? `Procesando (${processingCount}/${pendingCount + processingCount})...`
                        : `Procesar ${pendingCount + errorCount} archivo(s)`}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
                  {doneCount > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      {doneCount}
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      {errorCount}
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      Pendientes: {pendingCount}
                    </span>
                  )}
                  {doneCount > 0 && (
                    <Badge variant="outline" className="text-xs font-mono">
                      Total: S/ {totalMonto.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* ─── Tabla de resultados ──────────────── */}
              <div className="flex-1 border rounded-lg overflow-auto" style={{ maxHeight: 'calc(90vh - 320px)' }}>
                <table className="w-full text-[11px] min-w-[900px]">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                    <tr>
                      <th className="text-left px-1.5 py-1.5 font-medium w-[32px]">#</th>
                      <th className="text-left px-1.5 py-1.5 font-medium min-w-[140px]">Archivo</th>
                      <th className="text-left px-1.5 py-1.5 font-medium">Tipo</th>
                      <th className="text-left px-1.5 py-1.5 font-medium">N° Comprobante</th>
                      <th className="text-left px-1.5 py-1.5 font-medium">RUC</th>
                      <th className="text-left px-1.5 py-1.5 font-medium">Proveedor</th>
                      <th className="text-left px-1.5 py-1.5 font-medium">Fecha</th>
                      <th className="text-right px-1.5 py-1.5 font-medium">Monto</th>
                      <th className="text-left px-1.5 py-1.5 font-medium">Categoría</th>
                      <th className="w-[28px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <ComprobanteRow
                        key={item.id}
                        item={item}
                        index={idx}
                        categorias={categorias}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                        disabled={isBusy}
                        showValidation={showValidation}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,.jpg,.jpeg,.png"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <DialogFooter className="pt-2 gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isBusy}
            className="h-9"
          >
            Cancelar
          </Button>

          {isUploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>
                Subiendo archivos a Drive ({uploadProgress.current}/{uploadProgress.total})
                {uploadProgress.errors > 0 && (
                  <span className="text-red-500 ml-1">({uploadProgress.errors} error(es))</span>
                )}
              </span>
            </div>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={doneCount === 0 || isBusy}
              className="h-9 bg-orange-600 hover:bg-orange-700"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              {isSaving ? 'Guardando...' : `Crear ${doneCount} línea(s) de gasto`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Fila de comprobante ──────────────────────────────────

interface ComprobanteRowProps {
  item: ComprobanteItem
  index: number
  categorias: CategoriaGasto[]
  onUpdate: (id: string, updates: Partial<ComprobanteItem>) => void
  onRemove: (id: string) => void
  disabled: boolean
  showValidation: boolean
}

function ComprobanteRow({ item, index, categorias, onUpdate, onRemove, disabled, showValidation }: ComprobanteRowProps) {
  const isImage = item.file.type.startsWith('image/')
  const FileIcon = isImage ? ImageIcon : FileText
  const errors = item.status === 'done' ? validateItem(item) : {}

  // Status indicator — upload states take priority over OCR status
  const StatusIcon =
    item.uploadStatus === 'uploading' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
    ) : item.uploadStatus === 'uploaded' ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
    ) : item.uploadStatus === 'upload_error' ? (
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
    ) : item.status === 'processing' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
    ) : item.status === 'done' ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
    ) : item.status === 'error' ? (
      <XCircle className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
    )

  // Row background based on status/alerts (only amber for real SUNAT warnings, not API errors)
  const rowBg =
    item.status === 'error'
      ? 'bg-red-50'
      : item.sunatAlertaTipo === 'warning'
        ? 'bg-amber-50'
        : item.confianza === 'baja'
          ? 'bg-yellow-50'
          : ''

  if (item.status === 'pending' || item.status === 'processing') {
    return (
      <tr className={`border-t ${rowBg}`}>
        <td className="px-1.5 py-1.5 text-center">{StatusIcon}</td>
        <td className="px-1.5 py-1" colSpan={8}>
          <div className="flex items-center gap-2">
            <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[200px]">{item.file.name}</span>
            <span className="text-muted-foreground">
              ({(item.file.size / 1024).toFixed(0)} KB)
            </span>
            {item.status === 'processing' && (
              <span className="text-blue-600 text-[10px]">Analizando con Claude Vision...</span>
            )}
          </div>
        </td>
        <td className="px-1 py-1">
          {!disabled && item.status === 'pending' && (
            <button onClick={() => onRemove(item.id)} className="p-0.5 rounded hover:bg-red-50">
              <X className="h-3 w-3 text-muted-foreground hover:text-red-500" />
            </button>
          )}
        </td>
      </tr>
    )
  }

  if (item.status === 'error') {
    return (
      <tr className={`border-t ${rowBg}`}>
        <td className="px-1.5 py-1.5 text-center">{StatusIcon}</td>
        <td className="px-1.5 py-1" colSpan={8}>
          <div className="flex items-center gap-2">
            <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[200px]">{item.file.name}</span>
            <span className="text-red-600">{item.error}</span>
          </div>
        </td>
        <td className="px-1 py-1">
          <button onClick={() => onRemove(item.id)} className="p-0.5 rounded hover:bg-red-50">
            <X className="h-3 w-3 text-muted-foreground hover:text-red-500" />
          </button>
        </td>
      </tr>
    )
  }

  // Done — editable row
  return (
    <>
      <tr className={`border-t ${rowBg}`}>
        <td className="px-1.5 py-1.5 text-center">{StatusIcon}</td>
        <td className="px-1.5 py-1">
          <div className="flex items-center gap-1">
            <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[100px]" title={item.file.name}>
              {item.file.name}
            </span>
            {item.confianza && (
              <Badge
                variant={
                  item.confianza === 'alta'
                    ? 'default'
                    : item.confianza === 'media'
                      ? 'secondary'
                      : 'destructive'
                }
                className="text-[8px] px-1 py-0 h-3.5 leading-none"
              >
                {item.confianza}
              </Badge>
            )}
          </div>
        </td>
        <td className="px-1.5 py-1">
          <Select
            value={item.tipoComprobante || '__none__'}
            onValueChange={(v) => onUpdate(item.id, { tipoComprobante: v === '__none__' ? '' : v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-6 text-[11px] w-[85px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">-</SelectItem>
              {TIPOS_COMPROBANTE.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-1.5 py-1">
          <Input
            value={item.numeroComprobante}
            onChange={(e) => onUpdate(item.id, { numeroComprobante: e.target.value })}
            className="h-6 text-[11px] w-[115px]"
            placeholder="F001-00123"
            disabled={disabled}
          />
        </td>
        <td className="px-1.5 py-1">
          <div className="flex items-center gap-1">
            <Input
              value={item.proveedorRuc}
              onChange={(e) => onUpdate(item.id, { proveedorRuc: e.target.value })}
              className="h-6 text-[11px] w-[95px]"
              placeholder="20123456789"
              disabled={disabled}
            />
            {item.sunatAlertaTipo === 'warning' && item.sunatAlerta && (
              <span title={item.sunatAlerta}>
                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
              </span>
            )}
          </div>
        </td>
        <td className="px-1.5 py-1">
          <Input
            value={item.proveedorNombre}
            onChange={(e) => onUpdate(item.id, { proveedorNombre: e.target.value })}
            className="h-6 text-[11px] w-[130px]"
            placeholder="Proveedor"
            disabled={disabled}
          />
        </td>
        <td className="px-1.5 py-1">
          <div>
            <Input
              type="date"
              value={item.fechaEmision}
              onChange={(e) => onUpdate(item.id, { fechaEmision: e.target.value })}
              className={cn(
                'h-6 text-[11px] w-[115px]',
                showValidation && errors.fechaEmision && 'border-red-500 bg-red-50'
              )}
              disabled={disabled}
            />
            {showValidation && errors.fechaEmision && (
              <span className="text-[9px] text-red-600">{errors.fechaEmision}</span>
            )}
          </div>
        </td>
        <td className="px-1.5 py-1">
          <div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.montoTotal}
              onChange={(e) => onUpdate(item.id, { montoTotal: e.target.value })}
              className={cn(
                'h-6 text-[11px] w-[80px] text-right font-mono',
                showValidation && errors.montoTotal && 'border-red-500 bg-red-50'
              )}
              placeholder="0.00"
              disabled={disabled}
            />
            {showValidation && errors.montoTotal && (
              <span className="text-[9px] text-red-600">{errors.montoTotal}</span>
            )}
          </div>
        </td>
        <td className="px-1.5 py-1">
          <Select
            value={item.categoriaGastoId || '__none__'}
            onValueChange={(v) => onUpdate(item.id, { categoriaGastoId: v === '__none__' ? '' : v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-6 text-[11px] w-[95px]">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">-</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-1 py-1">
          {!disabled && (
            <button onClick={() => onRemove(item.id)} className="p-0.5 rounded hover:bg-red-50">
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
            </button>
          )}
        </td>
      </tr>
      {/* Alert row for SUNAT or OCR issues */}
      {(item.sunatAlerta || item.observaciones) && (
        <tr className={rowBg}>
          <td></td>
          <td colSpan={9} className="px-1.5 pb-1.5">
            {item.sunatAlerta && item.sunatAlertaTipo === 'warning' && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-700">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                SUNAT: {item.sunatAlerta}
              </div>
            )}
            {item.sunatAlerta && item.sunatAlertaTipo === 'info' && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {item.sunatAlerta}
              </div>
            )}
            {item.observaciones && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <FileText className="h-3 w-3 shrink-0" />
                OCR: {item.observaciones}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
