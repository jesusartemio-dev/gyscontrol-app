'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Printer, Loader2, FileText, Package, Wrench, Receipt, Calendar, RefreshCw } from 'lucide-react'
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

  // Calculate stats
  const stats = useMemo(() => {
    if (!cotizacion) return null
    const equipos = cotizacion.equipos || []
    const servicios = cotizacion.servicios || []
    const gastos = cotizacion.gastos || []

    const equiposTotal = equipos.reduce((sum: number, e: any) => sum + (e.subtotalCliente || 0), 0)
    const serviciosTotal = servicios.reduce((sum: number, s: any) => sum + (s.subtotalCliente || 0), 0)
    const gastosTotal = gastos.reduce((sum: number, g: any) => sum + (g.subtotalCliente || 0), 0)
    const subtotal = equiposTotal + serviciosTotal + gastosTotal

    return {
      equiposCount: equipos.length,
      serviciosCount: servicios.length,
      gastosCount: gastos.length,
      equiposTotal,
      serviciosTotal,
      gastosTotal,
      subtotal,
      total: subtotal * 1.18
    }
  }, [cotizacion])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Cargando cotización...</p>
        </div>
      </div>
    )
  }

  if (error || !cotizacion) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.back()} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Vista Previa PDF</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {cotizacion.codigo}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {cotizacion.nombre} - {cotizacion.cliente?.nombre}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={pdfLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${pdfLoading ? 'animate-spin' : ''}`} />
            Regenerar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!pdfUrl || pdfLoading}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!pdfUrl || pdfLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Equipos</p>
                  <p className="text-sm font-medium">{stats.equiposCount} grupos</p>
                  <p className="text-xs text-blue-600">{formatCurrency(stats.equiposTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Servicios</p>
                  <p className="text-sm font-medium">{stats.serviciosCount} grupos</p>
                  <p className="text-xs text-green-600">{formatCurrency(stats.serviciosTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="text-sm font-medium">{stats.gastosCount} grupos</p>
                  <p className="text-xs text-orange-600">{formatCurrency(stats.gastosTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total + IGV</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PDF Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {pdfLoading ? (
            <div className="flex items-center justify-center h-[700px] bg-gray-50">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-muted-foreground">Generando vista previa...</p>
                <p className="text-xs text-muted-foreground mt-1">Esto puede tomar unos segundos</p>
              </div>
            </div>
          ) : pdfError ? (
            <div className="flex items-center justify-center h-[700px] bg-red-50">
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
              className="w-full h-[700px] border-0"
              title="Vista Previa del PDF"
            />
          ) : (
            <div className="flex items-center justify-center h-[700px] bg-gray-50">
              <p className="text-muted-foreground">No hay vista previa disponible</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
