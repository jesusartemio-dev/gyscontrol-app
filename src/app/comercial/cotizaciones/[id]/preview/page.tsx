'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Printer, Loader2, FileText, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { pdf } from '@react-pdf/renderer'
import CotizacionPDF from '@/components/pdf/CotizacionPDF'

export default function CotizacionPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const [cotizacion, setCotizacion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const cotizacionId = params.id as string

  // Generate PDF blob and URL
  const generatePdf = useCallback(async (cotizacionData: any) => {
    if (!cotizacionData) return

    try {
      setPdfLoading(true)
      setPdfError(null)

      // Revoke previous URL to prevent memory leaks
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }

      const blob = await pdf(<CotizacionPDF cotizacion={cotizacionData} />).toBlob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar PDF'
      setPdfError(errorMessage)
      console.error('Error generating PDF:', err)
    } finally {
      setPdfLoading(false)
    }
  }, [pdfUrl])

  // Load cotizacion data
  useEffect(() => {
    const loadCotizacion = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/cotizacion/${cotizacionId}`)
        if (!response.ok) throw new Error('Error al cargar la cotización')

        const data = await response.json()
        setCotizacion(data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (cotizacionId) {
      loadCotizacion()
    }
  }, [cotizacionId])

  // Generate PDF when cotizacion loads
  useEffect(() => {
    if (cotizacion && !pdfUrl && !pdfLoading) {
      generatePdf(cotizacion)
    }
  }, [cotizacion, pdfUrl, pdfLoading, generatePdf])

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `Cotizacion_${cotizacion?.cliente?.nombre || 'Cliente'}_${cotizacion?.codigo || 'N-A'}.pdf`
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      link.click()
      toast.success('PDF descargado')
    }
  }

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    }
  }

  const handleRegenerate = () => {
    if (cotizacion) {
      generatePdf(cotizacion)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando cotización...</p>
        </div>
      </div>
    )
  }

  if (error || !cotizacion) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium text-red-600 mb-2">Error al cargar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error || 'No se pudo cargar la cotización'}
          </p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header compacto */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="shrink-0 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate">Vista Previa PDF</span>
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {cotizacion.codigo}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {cotizacion.nombre} — {cotizacion.cliente?.nombre}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={pdfLoading}
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${pdfLoading ? 'animate-spin' : ''}`} />
            Regenerar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrint}
            disabled={!pdfUrl || pdfLoading}
            className="h-8"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Imprimir
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!pdfUrl || pdfLoading}
            className="h-8 bg-blue-600 hover:bg-blue-700"
          >
            {pdfLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Descargar
          </Button>
        </div>
      </div>

      {/* PDF Viewer - ocupa todo el espacio restante */}
      <div className="flex-1 bg-gray-100">
        {pdfLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-500" />
              <p className="text-sm text-muted-foreground">Generando vista previa...</p>
            </div>
          </div>
        ) : pdfError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p className="text-red-600 font-medium">Error al generar el PDF</p>
              <p className="text-sm text-muted-foreground mt-2">{pdfError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleRegenerate}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="Vista Previa del PDF"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No hay vista previa disponible</p>
          </div>
        )}
      </div>
    </div>
  )
}
