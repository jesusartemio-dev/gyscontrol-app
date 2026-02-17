'use client'

import { useEffect, useState } from 'react'
import {
  FileText,
  Plus,
  Download,
  DollarSign,
  Loader2,
  CheckCircle2,
  Clock,
  Send,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CotizacionModal from '@/components/cotizaciones/CotizacionModal'
import CotizacionList from '@/components/cotizaciones/CotizacionList'
import { getCotizaciones } from '@/lib/services/cotizacion'
import type { Cotizacion } from '@/types'
import { penToUSD } from '@/lib/costos'
import { ExcelImportWizard } from '@/components/agente/ExcelImportWizard'

const formatCurrencyKPI = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount.toFixed(0)}`
}

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    getCotizaciones()
      .then((data) => setCotizaciones(data))
      .catch(() => setError('Error al cargar cotizaciones.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (nueva: Cotizacion) => {
    setCotizaciones(prev => [...prev, nueva])
  }

  const handleDelete = (id: string) => {
    setCotizaciones(prev => prev.filter(c => c.id !== id))
  }

  const handleUpdated = (actualizada: Cotizacion) => {
    setCotizaciones(prev =>
      prev.map(c => c.id === actualizada.id ? actualizada : c)
    )
  }

  // Calculate statistics
  const totalCotizaciones = cotizaciones.length
  const aprobadas = cotizaciones.filter(c => c.estado?.toLowerCase() === 'aprobada').length
  const enviadas = cotizaciones.filter(c => c.estado?.toLowerCase() === 'enviada').length
  const borradores = cotizaciones.filter(c => c.estado?.toLowerCase() === 'borrador').length
  // KPI total: consolidate all cotizaciones to USD
  const montoTotal = cotizaciones.reduce((sum, c) => {
    const monto = c.totalCliente || 0
    if (c.moneda === 'PEN' && c.tipoCambio) return sum + penToUSD(monto, c.tipoCambio)
    return sum + monto
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Cotizaciones</h1>
          <Badge variant="secondary" className="text-xs">
            {totalCotizaciones}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline Stats */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <div className="flex items-center gap-1 text-green-600" title="Aprobadas">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium">{aprobadas}</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600" title="Enviadas">
              <Send className="h-3.5 w-3.5" />
              <span className="font-medium">{enviadas}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500" title="Borradores">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">{borradores}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1 text-emerald-600" title="Monto Total">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-semibold">{formatCurrencyKPI(montoTotal)}</span>
            </div>
          </div>

          <Button variant="outline" size="sm" className="h-8" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            Importar Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar
          </Button>
          <CotizacionModal
            onCreated={handleCreated}
            trigger={
              <Button size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nueva
              </Button>
            }
          />
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="md:hidden grid grid-cols-4 gap-2">
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">{aprobadas}</div>
          <div className="text-[10px] text-green-700">Aprobadas</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-blue-600">{enviadas}</div>
          <div className="text-[10px] text-blue-700">Enviadas</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-gray-600">{borradores}</div>
          <div className="text-[10px] text-gray-700">Borradores</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-600">{formatCurrencyKPI(montoTotal)}</div>
          <div className="text-[10px] text-emerald-700">Total</div>
        </div>
      </div>

      {/* Cotizaciones List */}
      {error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error al cargar</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : cotizaciones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cotizaciones
            </h3>
            <p className="text-gray-500 mb-4">
              Comienza creando tu primera cotización
            </p>
            <CotizacionModal
              onCreated={handleCreated}
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Cotización
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <CotizacionList
          cotizaciones={cotizaciones}
          onDelete={handleDelete}
          onUpdated={handleUpdated}
        />
      )}

      <ExcelImportWizard open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
