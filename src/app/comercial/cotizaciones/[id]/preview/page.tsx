'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, Eye, Loader2, FileText, Building, User, DollarSign, Package, Wrench, Calculator, Truck, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PDFDownloadLink } from '@react-pdf/renderer'
import CotizacionPDF from '@/components/pdf/CotizacionPDF'

export default function CotizacionPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const [cotizacion, setCotizacion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cotizacionId = params.id as string


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


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando vista previa del PDF...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !cotizacion) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground mb-4">
                {error || 'No se pudo cargar la cotización'}
              </p>
              <Button
                onClick={() => router.back()}
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Vista Previa del PDF</h1>
            <p className="text-xs text-muted-foreground">
              {cotizacion.codigo} - {cotizacion.cliente?.nombre}
            </p>
          </div>
        </div>

        {cotizacion ? (
          <PDFDownloadLink
            document={<CotizacionPDF cotizacion={cotizacion} />}
            fileName={`Cotizacion_${cotizacion?.cliente?.nombre || 'Cliente'}_${cotizacion?.codigo || 'N/A'}.pdf`}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm hover:shadow-md h-8 min-w-[120px] justify-center flex-shrink-0"
          >
            {({ blob, url, loading, error }) => {
              if (loading) {
                return (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Generando PDF...</span>
                    <span className="sm:hidden">PDF...</span>
                  </>
                )
              }

              if (error) {
                return (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="hidden sm:inline">Error al generar</span>
                    <span className="sm:hidden">Error</span>
                  </>
                )
              }

              return (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Descargar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </>
              )
            }}
          </PDFDownloadLink>
        ) : (
          <Button disabled size="sm">
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        )}
      </div>

      {/* PDF Preview */}
      <Card className="w-full">
        <CardContent className="p-0">
          <div className="w-full bg-gray-100">
            {cotizacion ? (
              <PDFDownloadLink
                document={<CotizacionPDF cotizacion={cotizacion} />}
                fileName={`Cotizacion_${cotizacion?.cliente?.nombre || 'Cliente'}_${cotizacion?.codigo || 'N/A'}.pdf`}
              >
                {({ blob, url, loading, error }) => {
                  if (loading) {
                    return (
                      <div className="flex items-center justify-center h-[600px]">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                          <p className="text-muted-foreground">Generando vista previa del PDF...</p>
                        </div>
                      </div>
                    )
                  }

                  if (error) {
                    return (
                      <div className="flex items-center justify-center h-[600px]">
                        <div className="text-center text-red-600">
                          <p>Error al generar la vista previa del PDF</p>
                          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
                        </div>
                      </div>
                    )
                  }

                  if (url) {
                    return (
                      <iframe
                        src={url}
                        className="w-full h-[800px] border rounded"
                        title="Vista Previa del PDF"
                      />
                    )
                  }

                  return null
                }}
              </PDFDownloadLink>
            ) : (
              <div className="flex items-center justify-center h-[600px]">
                <p className="text-muted-foreground">No hay datos para mostrar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}