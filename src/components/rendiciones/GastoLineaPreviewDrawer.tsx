'use client'

import { useState, useRef, useCallback } from 'react'
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
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Circle,
  Search,
} from 'lucide-react'
import ZoomableImage from './ZoomableImage'
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
  const [conformidadOverrides, setConformidadOverrides] = useState<
    Record<string, { conformidad: string; comentarioConformidad?: string }>
  >({})
  const pendingRefreshRef = useRef(false)

  // RUC lookup state
  const [rucLookupLoading, setRucLookupLoading] = useState(false)
  const [rucSource, setRucSource] = useState<'local' | 'sunat' | null>(null)
  const [rucAlerta, setRucAlerta] = useState<string | null>(null)
  const [rucAlertaTipo, setRucAlertaTipo] = useState<'warning' | 'info' | null>(null)
  const rucTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Use local overrides so conformidad updates don't close the drawer
  const lineaOverride = linea ? conformidadOverrides[linea.id] : undefined
  const lineaConformidad = lineaOverride?.conformidad ?? linea?.conformidad
  const lineaComentarioConformidad =
    lineaOverride?.comentarioConformidad ?? linea?.comentarioConformidad

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onIndexChange(null)
      setActiveAdjuntoIdx(0)
      setIsEditing(false)
      setShowObservacionInput(false)
      setObservacionText('')
      setConformidadOverrides({})
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false
        onChanged()
      }
    }
  }

  const handleConformidad = async (estado: 'conforme' | 'observado', comentario?: string) => {
    if (!linea) return
    try {
      setConformidadLoading(true)
      await marcarConformidad(linea.id, estado, comentario)
      setShowObservacionInput(false)
      setObservacionText('')
      // Update local state so the drawer stays open showing the new conformidad
      setConformidadOverrides((prev) => ({
        ...prev,
        [linea.id]: { conformidad: estado, comentarioConformidad: comentario },
      }))
      pendingRefreshRef.current = true
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
    setRucSource(null)
    setRucAlerta(null)
    setRucAlertaTipo(null)
  }

  const lookupRuc = useCallback(async (ruc: string) => {
    if (!/^\d{11}$/.test(ruc)) return
    setRucLookupLoading(true)
    try {
      const res = await fetch(`/api/consulta-ruc?ruc=${ruc}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.nombre) {
        setEditForm(f => ({ ...f, proveedorNombre: data.nombre }))
      }
      setRucSource(data.source)
      setRucAlerta(data.alerta)
      setRucAlertaTipo(data.alertaTipo)
    } catch {
      setRucAlerta('Error al consultar RUC')
      setRucAlertaTipo('info')
    } finally {
      setRucLookupLoading(false)
    }
  }, [])

  const handleDrawerRucChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11)
    setEditForm(f => ({ ...f, proveedorRuc: cleaned }))
    setRucSource(null)
    setRucAlerta(null)
    if (rucTimeoutRef.current) clearTimeout(rucTimeoutRef.current)
    if (cleaned.length === 11) {
      rucTimeoutRef.current = setTimeout(() => lookupRuc(cleaned), 400)
    }
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

  if (!isOpen || !linea) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} className="flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="font-semibold text-sm">
            {linea.tipoComprobante ? TIPOS_COMPROBANTE_MAP[linea.tipoComprobante] : 'Comprobante'}
            {linea.numeroComprobante ? ` · ${linea.numeroComprobante}` : ''}
          </span>
          <span className="font-mono font-bold text-orange-600 text-sm">{formatCurrency(linea.monto, linea.moneda)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">
            {(currentIndex ?? 0) + 1}/{lineas.length}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev} disabled={currentIndex === 0 || saving}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext} disabled={currentIndex === lineas.length - 1 || saving}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {downloadUrl && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(downloadUrl, '_blank')}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {adjunto?.urlArchivo && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(adjunto.urlArchivo, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="ml-1 p-1.5 rounded hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Adjunto tabs (if multiple) */}
      {adjuntos.length > 1 && (
        <div className="flex gap-1 px-5 py-2 border-b shrink-0 bg-background">
          {adjuntos.map((adj, idx) => (
            <button
              key={adj.id}
              onClick={() => { setActiveAdjuntoIdx(idx); setIframeLoading(true) }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
                idx === activeAdjuntoIdx
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              {adj.tipoArchivo?.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              <span className="max-w-[100px] truncate">{adj.nombreArchivo}</span>
            </button>
          ))}
        </div>
      )}

      {/* Body split */}
      <div className="flex flex-1 min-h-0">
        {/* Data Panel (left) */}
        <div className="w-[380px] shrink-0 border-r bg-background flex flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* Adjunto info */}
            {adjunto && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-4 pb-3 border-b">
                {adjunto.tipoArchivo?.startsWith('image/') ? (
                  <ImageIcon className="h-3 w-3 shrink-0" />
                ) : (
                  <FileText className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{adjunto.nombreArchivo}</span>
                {adjunto.tamano && <span className="shrink-0">{formatSize(adjunto.tamano)}</span>}
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
                        <div className="relative">
                          <Input
                            value={editForm.proveedorRuc}
                            onChange={(e) => handleDrawerRucChange(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="20123456789"
                            disabled={saving}
                            maxLength={11}
                          />
                          {rucLookupLoading && (
                            <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          )}
                          {!rucLookupLoading && rucSource === 'sunat' && (
                            <ShieldCheck className="absolute right-2 top-2 h-3.5 w-3.5 text-green-600" />
                          )}
                          {!rucLookupLoading && rucSource === 'local' && (
                            <Search className="absolute right-2 top-2 h-3.5 w-3.5 text-blue-500" />
                          )}
                        </div>
                        {rucAlerta && (
                          <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${rucAlertaTipo === 'warning' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {rucAlertaTipo === 'warning' && <AlertTriangle className="h-3 w-3" />}
                            {rucAlerta}
                          </p>
                        )}
                        {rucSource && !rucAlerta && (
                          <p className="text-[10px] mt-0.5 text-muted-foreground">
                            {rucSource === 'local' ? 'Proveedor del sistema' : 'Verificado SUNAT'}
                          </p>
                        )}
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
                        <span className="text-sm font-semibold flex items-center gap-1">
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
                      {linea.centroCosto && (
                        <DataField
                          label="Centro de costo"
                          value={linea.centroCosto.nombre}
                        />
                      )}
                      {(linea.proyecto || linea.categoriaCosto) && (
                        <DataField
                          label="Destino"
                          value={[
                            linea.proyecto?.codigo,
                            linea.categoriaCosto,
                          ].filter(Boolean).join(' · ')}
                        />
                      )}
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
                        {lineaConformidad === 'conforme' ? (
                          <Badge className="bg-green-100 text-green-700 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Conforme
                          </Badge>
                        ) : lineaConformidad === 'observado' ? (
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
                      {lineaConformidad === 'observado' && lineaComentarioConformidad && (
                        <p className="text-xs text-orange-700 bg-orange-50 rounded p-2 mb-2">
                          {lineaComentarioConformidad}
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
                          {lineaConformidad !== 'conforme' && (
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
                          {lineaConformidad === 'conforme' ? (
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
                          ) : lineaConformidad !== 'observado' ? (
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
                          {lineaConformidad === 'observado' && (
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
          </div>
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
      <span className={`text-sm font-semibold ${className || ''}`}>{value}</span>
    </div>
  )
}
