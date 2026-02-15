'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  FileText,
  ShieldCheck,
  ImageIcon,
  Pencil,
  Save,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { isImage, isPdf } from '@/types/drive'
import { updateGastoLinea, marcarConformidad } from '@/lib/services/gastoLinea'
import type { GastoLinea, CategoriaGasto } from '@/types'

const TIPOS_COMPROBANTE_OPTIONS = [
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'sin_comprobante', label: 'Sin comprobante' },
]

const TIPOS_COMPROBANTE_MAP: Record<string, string> = Object.fromEntries(
  TIPOS_COMPROBANTE_OPTIONS.map((t) => [t.value, t.label])
)

interface GastoLineaPreviewDrawerProps {
  lineas: GastoLinea[]
  currentIndex: number | null
  onIndexChange: (index: number | null) => void
  categorias: CategoriaGasto[]
  editable: boolean
  onChanged: () => void
  showConformidad?: boolean
}

// ── Zoom/Pan Image Viewer ────────────────────────────

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const translateStart = useRef({ x: 0, y: 0 })

  const MIN_SCALE = 0.5
  const MAX_SCALE = 5
  const ZOOM_STEP = 0.3

  const resetZoom = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  // Reset on src change
  useEffect(() => {
    resetZoom()
  }, [src, resetZoom])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((prev) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta))
    })
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return
      e.preventDefault()
      setIsDragging(true)
      dragStart.current = { x: e.clientX, y: e.clientY }
      translateStart.current = { ...translate }
    },
    [scale, translate]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      setTranslate({
        x: translateStart.current.x + dx,
        y: translateStart.current.y + dy,
      })
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP))

  const isZoomed = scale !== 1

  return (
    <div className="relative w-full h-full">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border shadow-sm p-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground w-10 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        {isZoomed && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden flex items-center justify-center"
        style={{ cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded shadow-sm select-none"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────

export default function GastoLineaPreviewDrawer({
  lineas,
  currentIndex,
  onIndexChange,
  categorias,
  editable,
  onChanged,
  showConformidad = false,
}: GastoLineaPreviewDrawerProps) {
  const [iframeLoading, setIframeLoading] = useState(true)
  const [activeAdjuntoIdx, setActiveAdjuntoIdx] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conformidadLoading, setConformidadLoading] = useState(false)
  const [showObservacionInput, setShowObservacionInput] = useState(false)
  const [observacionText, setObservacionText] = useState('')

  // Edit form state
  const [editForm, setEditForm] = useState({
    descripcion: '',
    fecha: '',
    monto: '',
    tipoComprobante: '',
    numeroComprobante: '',
    proveedorNombre: '',
    proveedorRuc: '',
    categoriaGastoId: '',
    observaciones: '',
  })

  const isOpen = currentIndex !== null
  const linea = currentIndex !== null ? lineas[currentIndex] : null
  const adjuntos = linea?.adjuntos || []
  const adjunto = adjuntos[activeAdjuntoIdx] || null

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onIndexChange(null)
      setActiveAdjuntoIdx(0)
      setIsEditing(false)
      setShowObservacionInput(false)
      setObservacionText('')
    }
  }

  const handleConformidad = async (estado: 'conforme' | 'observado', comentario?: string) => {
    if (!linea) return
    try {
      setConformidadLoading(true)
      await marcarConformidad(linea.id, estado, comentario)
      toast.success(estado === 'conforme' ? 'Marcado como conforme' : 'Marcado como observado')
      setShowObservacionInput(false)
      setObservacionText('')
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al marcar conformidad')
    } finally {
      setConformidadLoading(false)
    }
  }

  const startEditing = () => {
    if (!linea) return
    setEditForm({
      descripcion: linea.descripcion || '',
      fecha: linea.fecha ? linea.fecha.split('T')[0] : '',
      monto: String(linea.monto),
      tipoComprobante: linea.tipoComprobante || '',
      numeroComprobante: linea.numeroComprobante || '',
      proveedorNombre: linea.proveedorNombre || '',
      proveedorRuc: linea.proveedorRuc || '',
      categoriaGastoId: linea.categoriaGastoId || '',
      observaciones: linea.observaciones || '',
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!linea) return
    if (!editForm.descripcion.trim() || !editForm.fecha || !editForm.monto || parseFloat(editForm.monto) <= 0) {
      toast.error('Complete los campos obligatorios (descripción, fecha, monto > 0)')
      return
    }
    try {
      setSaving(true)
      await updateGastoLinea(linea.id, {
        descripcion: editForm.descripcion.trim(),
        fecha: editForm.fecha,
        monto: parseFloat(editForm.monto),
        tipoComprobante: editForm.tipoComprobante || null,
        numeroComprobante: editForm.numeroComprobante || null,
        proveedorNombre: editForm.proveedorNombre || null,
        proveedorRuc: editForm.proveedorRuc || null,
        categoriaGastoId: editForm.categoriaGastoId || null,
        observaciones: editForm.observaciones || null,
      })
      toast.success('Línea actualizada')
      setIsEditing(false)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const goToPrev = () => {
    if (currentIndex !== null && currentIndex > 0) {
      onIndexChange(currentIndex - 1)
      setActiveAdjuntoIdx(0)
      setIframeLoading(true)
      setIsEditing(false)
      setShowObservacionInput(false)
      setObservacionText('')
    }
  }

  const goToNext = () => {
    if (currentIndex !== null && currentIndex < lineas.length - 1) {
      onIndexChange(currentIndex + 1)
      setActiveAdjuntoIdx(0)
      setIframeLoading(true)
      setIsEditing(false)
      setShowObservacionInput(false)
      setObservacionText('')
    }
  }

  const contentUrl = adjunto?.driveFileId
    ? `/api/drive/files/${adjunto.driveFileId}/content`
    : null
  const downloadUrl = adjunto?.driveFileId
    ? `/api/drive/files/${adjunto.driveFileId}/content?download=true`
    : null

  const formatCurrency = (amount: number, moneda?: string) =>
    new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: moneda === 'USD' ? 'USD' : 'PEN',
    }).format(amount)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const updateField = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-5xl w-[95vw] p-0 flex flex-col [&>button[class*='absolute']]:hidden"
      >
        {linea && (
          <>
            {/* Header */}
            <SheetHeader className="px-4 py-3 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-sm font-semibold">
                    Comprobante {(currentIndex ?? 0) + 1}/{lineas.length}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Vista previa del comprobante
                  </SheetDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={goToPrev}
                    disabled={currentIndex === 0 || saving}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={goToNext}
                    disabled={currentIndex === lineas.length - 1 || saving}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {downloadUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(downloadUrl, '_blank')}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {adjunto?.urlArchivo && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(adjunto.urlArchivo, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Adjunto tabs (if multiple) */}
              {adjuntos.length > 1 && (
                <div className="flex gap-1 mt-2">
                  {adjuntos.map((adj, idx) => (
                    <button
                      key={adj.id}
                      onClick={() => {
                        setActiveAdjuntoIdx(idx)
                        setIframeLoading(true)
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
                        idx === activeAdjuntoIdx
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {adj.tipoArchivo?.startsWith('image/') ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span className="max-w-[100px] truncate">{adj.nombreArchivo}</span>
                    </button>
                  ))}
                </div>
              )}
            </SheetHeader>

            {/* Content: Data left, Preview right */}
            <div className="flex-1 min-h-0 flex">
              {/* Data Panel (left) */}
              <div className="w-[320px] shrink-0 border-r bg-background flex flex-col">
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {/* Adjunto info */}
                  {adjunto && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-4 pb-3 border-b">
                      {adjunto.tipoArchivo?.startsWith('image/') ? (
                        <ImageIcon className="h-3 w-3 shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{adjunto.nombreArchivo}</span>
                      {adjunto.tamano && (
                        <span className="shrink-0">{formatSize(adjunto.tamano)}</span>
                      )}
                    </div>
                  )}

                  {isEditing ? (
                    /* ── Edit Mode ── */
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">
                          Fecha <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={editForm.fecha}
                          onChange={(e) => updateField('fecha', e.target.value)}
                          className="h-8 text-sm"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">
                          Monto <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.monto}
                          onChange={(e) => updateField('monto', e.target.value)}
                          className="h-8 text-sm font-mono"
                          disabled={saving}
                        />
                      </div>
                      <div className="border-t pt-3">
                        <label className="text-[10px] text-muted-foreground block mb-1">
                          Tipo comprobante
                        </label>
                        <Select
                          value={editForm.tipoComprobante || '__none__'}
                          onValueChange={(v) =>
                            updateField('tipoComprobante', v === '__none__' ? '' : v)
                          }
                          disabled={saving}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin especificar</SelectItem>
                            {TIPOS_COMPROBANTE_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">
                          N° comprobante
                        </label>
                        <Input
                          value={editForm.numeroComprobante}
                          onChange={(e) => updateField('numeroComprobante', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="F001-00123"
                          disabled={saving}
                        />
                      </div>
                      <div className="border-t pt-3">
                        <label className="text-[10px] text-muted-foreground block mb-1">
                          Proveedor
                        </label>
                        <Input
                          value={editForm.proveedorNombre}
                          onChange={(e) => updateField('proveedorNombre', e.target.value)}
                          className="h-8 text-sm"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">RUC</label>
                        <Input
                          value={editForm.proveedorRuc}
                          onChange={(e) => updateField('proveedorRuc', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="20123456789"
                          disabled={saving}
                        />
                      </div>
                      <div className="border-t pt-3">
                        <label className="text-[10px] text-muted-foreground block mb-1">
                          Categoria
                        </label>
                        <Select
                          value={editForm.categoriaGastoId || '__none__'}
                          onValueChange={(v) =>
                            updateField('categoriaGastoId', v === '__none__' ? '' : v)
                          }
                          disabled={saving}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin categoria</SelectItem>
                            {categorias.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">
                          Descripcion <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={editForm.descripcion}
                          onChange={(e) => updateField('descripcion', e.target.value)}
                          className="h-8 text-sm"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">
                          Observaciones
                        </label>
                        <Input
                          value={editForm.observaciones}
                          onChange={(e) => updateField('observaciones', e.target.value)}
                          className="h-8 text-sm"
                          disabled={saving}
                        />
                      </div>
                    </div>
                  ) : (
                    /* ── Read Mode ── */
                    <div className="space-y-3">
                      <DataField label="Fecha" value={formatDate(linea.fecha)} />
                      <DataField
                        label="Monto"
                        value={formatCurrency(linea.monto, linea.moneda)}
                        className="font-mono text-base"
                      />
                      <div className="border-t pt-3">
                        <DataField
                          label="Tipo comprobante"
                          value={
                            linea.tipoComprobante
                              ? TIPOS_COMPROBANTE_MAP[linea.tipoComprobante] ||
                                linea.tipoComprobante
                              : '-'
                          }
                        />
                      </div>
                      <DataField
                        label="N° comprobante"
                        value={linea.numeroComprobante || '-'}
                      />
                      <div className="border-t pt-3">
                        <DataField
                          label="Proveedor"
                          value={linea.proveedorNombre || '-'}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">
                          RUC
                        </span>
                        <span className="text-sm font-medium flex items-center gap-1">
                          {linea.proveedorRuc || '-'}
                          {linea.sunatVerificado === true && (
                            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </span>
                      </div>
                      <div className="border-t pt-3">
                        <DataField
                          label="Categoria"
                          value={linea.categoriaGasto?.nombre || '-'}
                        />
                      </div>
                      <DataField label="Descripcion" value={linea.descripcion} />
                      {linea.observaciones && (
                        <div className="border-t pt-3">
                          <span className="text-[10px] text-muted-foreground block mb-0.5">
                            Observaciones
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {linea.observaciones}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conformidad section */}
                  {showConformidad && !isEditing && (
                    <div className="border-t mt-4 pt-3">
                      <span className="text-[10px] text-muted-foreground block mb-2">
                        Conformidad
                      </span>
                      <div className="mb-2">
                        {linea.conformidad === 'conforme' ? (
                          <Badge className="bg-green-100 text-green-700 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Conforme
                          </Badge>
                        ) : linea.conformidad === 'observado' ? (
                          <Badge className="bg-orange-100 text-orange-700 text-[10px]">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Observado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            <Circle className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                      </div>
                      {linea.conformidad === 'observado' && linea.comentarioConformidad && (
                        <p className="text-xs text-orange-700 bg-orange-50 rounded p-2 mb-2">
                          {linea.comentarioConformidad}
                        </p>
                      )}
                      {showObservacionInput ? (
                        <div className="space-y-2">
                          <Textarea
                            value={observacionText}
                            onChange={(e) => setObservacionText(e.target.value)}
                            placeholder="Motivo de la observacion..."
                            rows={2}
                            className="text-xs"
                            disabled={conformidadLoading}
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] flex-1"
                              onClick={() => { setShowObservacionInput(false); setObservacionText('') }}
                              disabled={conformidadLoading}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-[11px] flex-1 bg-orange-600 hover:bg-orange-700"
                              onClick={() => handleConformidad('observado', observacionText)}
                              disabled={conformidadLoading || !observacionText.trim()}
                            >
                              {conformidadLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Observar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          {linea.conformidad !== 'conforme' && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleConformidad('conforme')}
                              disabled={conformidadLoading}
                            >
                              {conformidadLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Conforme
                            </Button>
                          )}
                          {linea.conformidad === 'conforme' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => setShowObservacionInput(true)}
                              disabled={conformidadLoading}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Observar
                            </Button>
                          ) : linea.conformidad !== 'observado' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => setShowObservacionInput(true)}
                              disabled={conformidadLoading}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Observar
                            </Button>
                          ) : null}
                          {linea.conformidad === 'observado' && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleConformidad('conforme')}
                              disabled={conformidadLoading}
                            >
                              {conformidadLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Conforme
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit/Save footer */}
                {editable && (
                  <div className="shrink-0 border-t px-4 py-2 flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs flex-1"
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs flex-1 bg-orange-600 hover:bg-orange-700"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3 mr-1" />
                          )}
                          Guardar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs w-full"
                        onClick={startEditing}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar datos
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Area (right, takes remaining space) */}
              <div className="flex-1 min-w-0 overflow-hidden bg-muted/30">
                {!adjunto ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <FileText className="h-12 w-12" />
                    <p className="text-sm">Sin documento adjunto</p>
                  </div>
                ) : !contentUrl ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <FileText className="h-12 w-12" />
                    <p className="text-sm">Vista previa no disponible</p>
                    {adjunto.urlArchivo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(adjunto.urlArchivo, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Abrir en Drive
                      </Button>
                    )}
                  </div>
                ) : adjunto.tipoArchivo && isImage(adjunto.tipoArchivo) ? (
                  <ZoomableImage src={contentUrl} alt={adjunto.nombreArchivo} />
                ) : adjunto.tipoArchivo && isPdf(adjunto.tipoArchivo) ? (
                  <div className="w-full h-full relative">
                    {iframeLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <iframe
                      src={`${contentUrl}#navpanes=0&zoom=page-width`}
                      className="w-full h-full border-0"
                      title={adjunto.nombreArchivo}
                      onLoad={() => setIframeLoading(false)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <FileText className="h-12 w-12" />
                    <p className="text-sm">
                      Vista previa no disponible para este tipo de archivo
                    </p>
                    <div className="flex gap-2">
                      {downloadUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(downloadUrl, '_blank')}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Descargar
                        </Button>
                      )}
                      {adjunto.urlArchivo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(adjunto.urlArchivo, '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Abrir en Drive
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DataField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground block mb-0.5">{label}</span>
      <span className={`text-sm font-medium ${className || ''}`}>{value}</span>
    </div>
  )
}
