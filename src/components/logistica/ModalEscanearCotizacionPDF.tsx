'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ScanSearch,
  FileText,
  Upload,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

import type { CotizacionProveedor } from '@/types'
import type { ScanMatch, ScanCondiciones } from '@/app/api/cotizacion-proveedor/[id]/scan-pdf/route'
import { updateCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import { CreditCard, MapPin, Truck, Phone, NotebookText } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  cotizacion: CotizacionProveedor
  onApplied?: () => void
}

type Phase = 'upload' | 'scanning' | 'review'

const CONFIANZA_STYLES = {
  alta: 'bg-green-100 text-green-700 border-green-200',
  media: 'bg-amber-100 text-amber-700 border-amber-200',
  baja: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function ModalEscanearCotizacionPDF({
  open,
  onClose,
  cotizacion,
  onApplied,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [matches, setMatches] = useState<ScanMatch[]>([])
  const [condiciones, setCondiciones] = useState<ScanCondiciones | null>(null)
  const [applyCondiciones, setApplyCondiciones] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const itemMap = useMemo(
    () => new Map((cotizacion.items || []).map(item => [item.id, item])),
    [cotizacion.items]
  )

  const handleFileSelect = (f: File) => {
    if (f.type !== 'application/pdf') {
      toast.error('Solo se aceptan archivos PDF')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('El archivo supera el límite de 20MB')
      return
    }
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  const handleScan = async () => {
    if (!file) return
    setPhase('scanning')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/cotizacion-proveedor/${cotizacion.id}/scan-pdf`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al procesar el PDF')
        setPhase('upload')
        return
      }

      const foundMatches: ScanMatch[] = data.matches || []
      setMatches(foundMatches)
      setCondiciones(data.condiciones || null)
      // Pre-select items where a price was found
      setSelected(new Set(foundMatches.filter(m => m.precioUnitario !== null).map(m => m.itemId)))
      setPhase('review')
    } catch (err) {
      console.error(err)
      toast.error('Error de conexión al procesar el PDF')
      setPhase('upload')
    }
  }

  const toggleSelected = (itemId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const getOverwriteCount = () => {
    return matches.filter(m => {
      if (!selected.has(m.itemId) || m.precioUnitario === null) return false
      const existing = itemMap.get(m.itemId)
      return existing?.precioUnitario && existing.precioUnitario > 0
    }).length
  }

  const handleApply = () => {
    const selectedMatches = matches.filter(m => selected.has(m.itemId))
    if (selectedMatches.length === 0) return
    if (getOverwriteCount() > 0) {
      setShowConfirm(true)
    } else {
      doApply()
    }
  }

  const doApply = async () => {
    const selectedMatches = matches.filter(m => selected.has(m.itemId))
    setApplying(true)
    try {
      await Promise.all(
        selectedMatches.map(m => {
          const existingItem = itemMap.get(m.itemId)
          const cantidad = existingItem?.cantidad ?? existingItem?.cantidadOriginal ?? 0
          return updateCotizacionProveedorItem(m.itemId, {
            precioUnitario: m.precioUnitario ?? undefined,
            tiempoEntrega: m.tiempoEntrega ?? undefined,
            tiempoEntregaDias: m.tiempoEntregaDias ?? undefined,
            costoTotal: m.precioUnitario !== null ? m.precioUnitario * cantidad : undefined,
          })
        })
      )

      // Aplicar condiciones comerciales a la cabecera de la cotización
      if (applyCondiciones && condiciones) {
        const hasCondiciones = Object.values(condiciones).some(v => v !== null)
        if (hasCondiciones) {
          await fetch(`/api/cotizacion-proveedor/${cotizacion.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(condiciones),
          })
        }
      }

      toast.success(`${selectedMatches.length} ítem(s) actualizados${applyCondiciones && condiciones ? ' + condiciones comerciales' : ''}`)
      onApplied?.()
      handleClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al aplicar los precios')
    } finally {
      setApplying(false)
    }
  }

  const handleClose = () => {
    setPhase('upload')
    setFile(null)
    setMatches([])
    setCondiciones(null)
    setApplyCondiciones(true)
    setSelected(new Set())
    setShowConfirm(false)
    onClose()
  }

  const foundCount = matches.filter(m => m.precioUnitario !== null).length

  return (
    <>
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 pr-10 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-purple-600" />
            <DialogTitle className="text-sm font-semibold">Escanear PDF de Cotización</DialogTitle>
            <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
              {cotizacion.proveedor?.nombre}
            </Badge>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* ── Phase: upload ── */}
          {phase === 'upload' && (
            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Cargá el PDF de cotización del proveedor. La IA detectará los precios y plazos de entrega
                para cada ítem de esta cotización.
              </p>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-purple-400 bg-purple-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(f)
                  }}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-green-500" />
                    <span className="text-sm font-medium text-green-700">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Clic para cambiar
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-300" />
                    <span className="text-sm text-muted-foreground">
                      Arrastrá el PDF aquí o hacé clic para seleccionar
                    </span>
                    <span className="text-xs text-muted-foreground">PDF · máx. 20MB</span>
                  </div>
                )}
              </div>

              {/* Items info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 rounded-md px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span>
                  Se buscarán precios para <strong>{cotizacion.items?.length || 0} ítems</strong> de esta cotización.
                  La IA intentará emparejar por código y descripción.
                </span>
              </div>
            </div>
          )}

          {/* ── Phase: scanning ── */}
          {phase === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Analizando PDF con IA...</p>
                <p className="text-xs text-muted-foreground">
                  Claude está leyendo el documento y buscando precios. Puede tardar unos segundos.
                </p>
              </div>
            </div>
          )}

          {/* ── Phase: review ── */}
          {phase === 'review' && (
            <div>
              {/* Summary */}
              <div className="px-4 py-2.5 border-b bg-gray-50/50 flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span>
                  <strong className="text-green-700">{foundCount}</strong> de{' '}
                  <strong>{matches.length}</strong> ítems encontrados en el PDF
                </span>
                {foundCount < matches.length && (
                  <span className="text-muted-foreground ml-1">
                    · {matches.length - foundCount} no encontrado(s)
                  </span>
                )}
              </div>

              {/* Condiciones comerciales detectadas */}
              {condiciones && Object.values(condiciones).some(v => v !== null) && (
                <div className="px-4 py-2.5 border-b bg-purple-50/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wide">
                      Condiciones comerciales detectadas
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={applyCondiciones}
                        onCheckedChange={(v) => setApplyCondiciones(!!v)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-[10px] text-purple-700">Aplicar</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-purple-800">
                    {condiciones.condicionPago && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 shrink-0" />
                        {condiciones.condicionPago}{condiciones.diasCredito ? ` · ${condiciones.diasCredito} días` : ''}
                      </span>
                    )}
                    {condiciones.tiempoEntrega && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3 shrink-0" />
                        {condiciones.tiempoEntrega}
                      </span>
                    )}
                    {condiciones.lugarEntrega && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {condiciones.lugarEntrega}
                      </span>
                    )}
                    {condiciones.contactoEntrega && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        {condiciones.contactoEntrega}
                      </span>
                    )}
                    {condiciones.observaciones && (
                      <span className="flex items-center gap-1">
                        <NotebookText className="h-3 w-3 shrink-0" />
                        {condiciones.observaciones}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10 border-b">
                  <tr>
                    <th className="py-2 px-2 w-8">
                      <Checkbox
                        checked={
                          matches.filter(m => m.precioUnitario !== null).length > 0 &&
                          matches.filter(m => m.precioUnitario !== null).every(m => selected.has(m.itemId))
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelected(new Set(matches.filter(m => m.precioUnitario !== null).map(m => m.itemId)))
                          } else {
                            setSelected(new Set())
                          }
                        }}
                        className="h-3.5 w-3.5"
                        disabled={foundCount === 0}
                      />
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground w-24">Código</th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground">Descripción</th>
                    <th className="py-2 px-2 text-right font-medium text-muted-foreground w-28">P.Unit detectado</th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground w-24">Entrega</th>
                    <th className="py-2 px-2 text-center font-medium text-muted-foreground w-20">Confianza</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(match => {
                    const found = match.precioUnitario !== null
                    const isSelected = selected.has(match.itemId)
                    const existing = itemMap.get(match.itemId)
                    const existingPrice = existing?.precioUnitario || 0
                    const willOverwritePrice = found && existingPrice > 0 && match.precioUnitario !== existingPrice
                    const existingEntrega = existing?.tiempoEntrega || ''
                    const willOverwriteEntrega = found && existingEntrega && match.tiempoEntrega && match.tiempoEntrega !== existingEntrega
                    return (
                      <tr
                        key={match.itemId}
                        className={`border-b transition-colors ${
                          !found
                            ? 'opacity-40'
                            : isSelected
                            ? 'bg-blue-50 cursor-pointer hover:bg-blue-100'
                            : 'cursor-pointer hover:bg-gray-50'
                        }`}
                        onClick={() => found && toggleSelected(match.itemId)}
                      >
                        <td className="py-1.5 px-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => found && toggleSelected(match.itemId)}
                            disabled={!found}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[11px]">{match.codigo}</td>
                        <td className="py-1.5 px-2 truncate max-w-[160px]" title={match.descripcion}>
                          {match.descripcion}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium">
                          {found ? (
                            willOverwritePrice ? (
                              <span className="flex items-center justify-end gap-1 flex-wrap">
                                <span className="text-muted-foreground line-through text-[10px]">
                                  ${existingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                                <ArrowRight className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                <span className="text-amber-700 font-semibold">
                                  ${match.precioUnitario!.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </span>
                            ) : (
                              `$${match.precioUnitario!.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            )
                          ) : (
                            <span className="text-muted-foreground text-[10px]">no encontrado</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-[11px]">
                          {found && match.tiempoEntrega ? (
                            willOverwriteEntrega ? (
                              <span className="flex items-center gap-1 flex-wrap">
                                <span className="text-muted-foreground line-through text-[10px]">{existingEntrega}</span>
                                <ArrowRight className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                <span className="text-amber-700">{match.tiempoEntrega}</span>
                              </span>
                            ) : (
                              match.tiempoEntrega
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {found && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 px-1.5 ${CONFIANZA_STYLES[match.confianza]}`}
                            >
                              {match.confianza}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {matches.some(m => m.observacion) && (
                <div className="px-4 py-2 border-t bg-amber-50 text-[10px] text-amber-700 space-y-0.5">
                  {matches.filter(m => m.observacion).map(m => (
                    <p key={m.itemId}><strong>{m.codigo}:</strong> {m.observacion}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground space-y-0.5">
              {phase === 'review' && selected.size > 0 && (
                <span className="text-blue-600 font-medium">{selected.size} ítem(s) seleccionados para aplicar</span>
              )}
              {phase === 'review' && selected.size > 0 && getOverwriteCount() > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{getOverwriteCount()} ítem(s) con precio existente serán sobreescritos</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {phase === 'review' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setPhase('upload'); setMatches([]); setSelected(new Set()) }}
                  disabled={applying}
                  className="h-7 text-xs"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Volver
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={applying}
                className="h-7 text-xs"
              >
                Cerrar
              </Button>
              {phase === 'upload' && (
                <Button
                  size="sm"
                  onClick={handleScan}
                  disabled={!file}
                  className="h-7 text-xs min-w-[130px] bg-purple-600 hover:bg-purple-700"
                >
                  <ScanSearch className="h-3 w-3 mr-1" />
                  Escanear con IA
                </Button>
              )}
              {phase === 'review' && (
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={applying || selected.size === 0}
                  className="h-7 text-xs min-w-[110px]"
                >
                  {applying ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Aplicando...</>
                  ) : (
                    <><CheckCircle2 className="h-3 w-3 mr-1" />Aplicar ({selected.size})</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Sobreescribir precios existentes?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{getOverwriteCount()} ítem(s)</strong> ya tienen un precio cargado que será reemplazado por el
            valor detectado en el PDF. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowConfirm(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowConfirm(false)
              doApply()
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Sobreescribir y aplicar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
