'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Award, DollarSign, Clock, CreditCard, MapPin, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { getMonedaSymbol } from '@/lib/utils/currency'

interface QuotationItem {
  id: string
  listaEquipoItemId: string
  listaEquipoItem: {
    descripcion: string
    codigo: string
    cantidad: number
    unidad: string
  }
  precioUnitario?: number
  tiempoEntrega?: string
  tiempoEntregaDias?: number
  estado: string
  cotizacion: {
    proveedor: {
      nombre: string
    }
  }
  // La API devuelve cotizacionProveedor completo (moneda, tipoCambio y condiciones comerciales)
  cotizacionProveedor?: {
    moneda?: string
    tipoCambio?: number | null
    condicionPago?: string | null
    diasCredito?: number | null
    lugarEntrega?: string | null
    tiempoEntrega?: string | null
    contactoEntrega?: string | null
    observaciones?: string | null
    proveedor?: { nombre: string }
  }
}

interface ComparisonData {
  itemId: string
  item: {
    descripcion: string
    codigo: string
    cantidad: number
    unidad: string
  }
  quotations: QuotationItem[]
  selectedWinner?: string
  recommendedWinner?: string
}

interface QuotationComparisonTableProps {
  listaId: string
  onWinnerSelected: (itemId: string, winnerId: string) => void
}

export default function QuotationComparisonTable({ listaId, onWinnerSelected }: QuotationComparisonTableProps) {
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComparisonData()
  }, [listaId])

  const loadComparisonData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/logistica/listas/${listaId}/cotizaciones/comparison`)
      if (response.ok) {
        const data = await response.json()
        setComparisonData(data.comparisonData || [])
      }
    } catch (error) {
      console.error('Error loading comparison data:', error)
      toast.error('Error al cargar datos de comparación')
    } finally {
      setLoading(false)
    }
  }

  // Convierte precio nativo a USD para comparaciones entre cotizaciones de distinta moneda
  const toUSD = (quotation: QuotationItem): number => {
    const precio = quotation.precioUnitario ?? 0
    const moneda = quotation.cotizacionProveedor?.moneda
    const tc = quotation.cotizacionProveedor?.tipoCambio
    if (moneda === 'PEN' && tc && tc > 0) return precio / tc
    return precio
  }

  const getPriceComparison = (quotations: QuotationItem[]) => {
    if (quotations.length === 0) return null

    // Comparar en USD para equidad entre monedas
    const pricesUSD = quotations
      .filter(q => q.precioUnitario && q.precioUnitario > 0)
      .map(q => toUSD(q))
      .sort((a, b) => a - b)

    if (pricesUSD.length === 0) return null

    return {
      min: pricesUSD[0],
      max: pricesUSD[pricesUSD.length - 1],
      avg: pricesUSD.reduce((sum, p) => sum + p, 0) / pricesUSD.length
    }
  }

  const getDeliveryTimeComparison = (quotations: QuotationItem[]) => {
    if (quotations.length === 0) return null

    const times = quotations
      .filter(q => q.tiempoEntregaDias && q.tiempoEntregaDias > 0)
      .map(q => q.tiempoEntregaDias!)
      .sort((a, b) => a - b)

    if (times.length === 0) return null

    return {
      min: times[0],
      max: times[times.length - 1],
      avg: times.reduce((sum, t) => sum + t, 0) / times.length
    }
  }

  const getBestPriceIcon = (quotation: QuotationItem, allQuotations: QuotationItem[]) => {
    if (!quotation.precioUnitario) return null

    // Comparar en USD para detectar mejor precio entre monedas distintas
    const validPricesUSD = allQuotations
      .filter(q => q.precioUnitario && q.precioUnitario > 0)
      .map(q => toUSD(q))

    const minPriceUSD = Math.min(...validPricesUSD)
    return toUSD(quotation) === minPriceUSD ?
      <span title="Mejor precio"><DollarSign className="h-4 w-4 text-green-600 ml-1" /></span> : null
  }

  const getBestDeliveryIcon = (quotation: QuotationItem, allQuotations: QuotationItem[]) => {
    if (!quotation.tiempoEntregaDias) return null

    const validTimes = allQuotations
      .filter(q => q.tiempoEntregaDias && q.tiempoEntregaDias > 0)
      .map(q => q.tiempoEntregaDias!)

    const minTime = Math.min(...validTimes)
    return quotation.tiempoEntregaDias === minTime ?
      <span title="Mejor tiempo de entrega"><Clock className="h-4 w-4 text-blue-600 ml-1" /></span> : null
  }

  const handleWinnerSelection = (itemId: string, winnerId: string | null) => {
    setComparisonData(prev =>
      prev.map(item =>
        item.itemId === itemId
          ? { ...item, selectedWinner: winnerId || undefined }
          : item
      )
    )
    onWinnerSelected(itemId, winnerId || '')
  }


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600" />
          Comparación de Cotizaciones
          <Badge variant="secondary" className="ml-auto">
            {comparisonData.length} ítems
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {comparisonData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos de comparación disponibles</p>
            <p className="text-sm">Asegúrate de que las cotizaciones estén completas</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comparisonData.map((itemData) => {
              const priceComparison = getPriceComparison(itemData.quotations)
              const deliveryComparison = getDeliveryTimeComparison(itemData.quotations)

              return (
                <div key={itemData.itemId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {itemData.item.descripcion}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Código: {itemData.item.codigo} • Cantidad: {itemData.item.cantidad} {itemData.item.unidad}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex flex-wrap gap-2 items-center">
                        {itemData.quotations.map((quotation) => {
                          const isSelected = itemData.selectedWinner === quotation.id

                          return (
                            <Button
                              key={quotation.id}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleWinnerSelection(itemData.itemId, quotation.id)}
                              className={`relative transition-all ${isSelected ? 'ring-2 ring-green-500 bg-green-600 hover:bg-green-700' : 'hover:bg-gray-100'}`}
                            >
                              {quotation.cotizacion.proveedor.nombre}
                              {isSelected && <CheckCircle className="h-3 w-3 ml-1 text-white" />}
                              {getBestPriceIcon(quotation, itemData.quotations) && <DollarSign className="h-3 w-3 ml-1 text-green-600" />}
                              {getBestDeliveryIcon(quotation, itemData.quotations) && <Clock className="h-3 w-3 ml-1 text-blue-600" />}
                            </Button>
                          )
                        })}
                        {itemData.selectedWinner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWinnerSelection(itemData.itemId, null)}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Precio Unit.</TableHead>
                        <TableHead className="text-right">T. Entrega</TableHead>
                        <TableHead>Condiciones comerciales</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemData.quotations.map((quotation) => {
                        const isWinner = itemData.selectedWinner === quotation.id
                        const cond = quotation.cotizacionProveedor

                        return (
                          <TableRow
                            key={quotation.id}
                            className={isWinner ? 'bg-green-50 border-green-200' : ''}
                          >
                            <TableCell className="font-medium">
                              {quotation.cotizacion.proveedor.nombre}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {quotation.precioUnitario ? (
                                  <>
                                    {getMonedaSymbol(quotation.cotizacionProveedor?.moneda)}{quotation.precioUnitario.toFixed(2)}
                                    {getBestPriceIcon(quotation, itemData.quotations)}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {quotation.tiempoEntregaDias ? (
                                  <>
                                    {quotation.tiempoEntregaDias} días
                                    {getBestDeliveryIcon(quotation, itemData.quotations)}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                {cond?.condicionPago && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3 shrink-0" />
                                    {cond.condicionPago}
                                    {cond.diasCredito ? ` ${cond.diasCredito}d` : ''}
                                  </span>
                                )}
                                {cond?.tiempoEntrega && (
                                  <span className="flex items-center gap-1">
                                    <Truck className="h-3 w-3 shrink-0" />
                                    {cond.tiempoEntrega}
                                  </span>
                                )}
                                {cond?.lugarEntrega && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {cond.lugarEntrega}
                                  </span>
                                )}
                                {!cond?.condicionPago && !cond?.tiempoEntrega && !cond?.lugarEntrega && (
                                  <span className="italic">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={quotation.estado === 'cotizado' ? 'default' : 'secondary'}
                              >
                                {quotation.estado}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}