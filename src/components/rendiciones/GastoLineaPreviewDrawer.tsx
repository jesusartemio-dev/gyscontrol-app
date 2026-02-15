'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  FileText,
  ShieldCheck,
  ImageIcon,
} from 'lucide-react'
import { isImage, isPdf } from '@/types/drive'
import type { GastoLinea } from '@/types'

const TIPOS_COMPROBANTE: Record<string, string> = {
  factura: 'Factura',
  boleta: 'Boleta',
  recibo: 'Recibo',
  ticket: 'Ticket',
  sin_comprobante: 'Sin comprobante',
}

interface GastoLineaPreviewDrawerProps {
  lineas: GastoLinea[]
  currentIndex: number | null
  onIndexChange: (index: number | null) => void
}

export default function GastoLineaPreviewDrawer({
  lineas,
  currentIndex,
  onIndexChange,
}: GastoLineaPreviewDrawerProps) {
  const [iframeLoading, setIframeLoading] = useState(true)
  const [activeAdjuntoIdx, setActiveAdjuntoIdx] = useState(0)

  const isOpen = currentIndex !== null
  const linea = currentIndex !== null ? lineas[currentIndex] : null
  const adjuntos = linea?.adjuntos || []
  const adjunto = adjuntos[activeAdjuntoIdx] || null

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onIndexChange(null)
      setActiveAdjuntoIdx(0)
    }
  }

  const goToPrev = () => {
    if (currentIndex !== null && currentIndex > 0) {
      onIndexChange(currentIndex - 1)
      setActiveAdjuntoIdx(0)
      setIframeLoading(true)
    }
  }

  const goToNext = () => {
    if (currentIndex !== null && currentIndex < lineas.length - 1) {
      onIndexChange(currentIndex + 1)
      setActiveAdjuntoIdx(0)
      setIframeLoading(true)
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

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-[90vw] p-0 flex flex-col"
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
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={goToNext}
                    disabled={currentIndex === lineas.length - 1}
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

            {/* Preview Area */}
            <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
              {!adjunto ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  <p className="text-sm">Sin documento adjunto</p>
                </div>
              ) : !contentUrl ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <FileText className="h-10 w-10" />
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
                <div className="w-full h-full flex items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={contentUrl}
                    alt={adjunto.nombreArchivo}
                    className="max-w-full max-h-full object-contain rounded shadow-sm"
                  />
                </div>
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
                  <FileText className="h-10 w-10" />
                  <p className="text-sm">Vista previa no disponible para este tipo de archivo</p>
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

            {/* Data Panel */}
            <div className="shrink-0 border-t bg-background px-4 py-3 overflow-y-auto max-h-[40%]">
              {/* Adjunto info */}
              {adjunto && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
                  {adjunto.tipoArchivo?.startsWith('image/') ? (
                    <ImageIcon className="h-3 w-3" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                  <span className="truncate">{adjunto.nombreArchivo}</span>
                  {adjunto.tamano && <span>{formatSize(adjunto.tamano)}</span>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                <DataField label="Fecha" value={formatDate(linea.fecha)} />
                <DataField
                  label="Monto"
                  value={formatCurrency(linea.monto, linea.moneda)}
                  className="font-mono"
                />
                <DataField
                  label="Tipo comprobante"
                  value={
                    linea.tipoComprobante
                      ? TIPOS_COMPROBANTE[linea.tipoComprobante] || linea.tipoComprobante
                      : '-'
                  }
                />
                <DataField label="N° comprobante" value={linea.numeroComprobante || '-'} />
                <DataField label="Proveedor" value={linea.proveedorNombre || '-'} />
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">RUC</span>
                  <span className="text-sm font-medium flex items-center gap-1">
                    {linea.proveedorRuc || '-'}
                    {linea.sunatVerificado === true && (
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                    )}
                  </span>
                </div>
                <DataField label="Categoria" value={linea.categoriaGasto?.nombre || '-'} />
                <DataField label="Descripcion" value={linea.descripcion} />
              </div>

              {linea.observaciones && (
                <div className="mt-2.5">
                  <span className="text-[10px] text-muted-foreground block mb-0.5">
                    Observaciones
                  </span>
                  <span className="text-xs text-muted-foreground">{linea.observaciones}</span>
                </div>
              )}
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
