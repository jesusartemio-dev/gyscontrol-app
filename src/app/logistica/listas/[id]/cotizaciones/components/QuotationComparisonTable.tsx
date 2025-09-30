'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Star, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react'
import { toast } from 'sonner'

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

  const getPriceComparison = (quotations: QuotationItem[]) => {
    if (quotations.length === 0) return null

    const prices = quotations
      .filter(q => q.precioUnitario && q.precioUnitario > 0)
      .map(q => q.precioUnitario!)
      .sort((a, b) => a - b)

    if (prices.length === 0) return null

    return {
      min: prices[0],
      max: prices[prices.length - 1],
      avg: prices.reduce((sum, p) => sum + p, 0) / prices.length
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

  const getPriceIcon = (price: number, comparison: { min: number; max: number; avg: number }) => {
    if (price === comparison.min) return <TrendingDown className="h-4 w-4 text-green-600" />
    if (price === comparison.max) return <TrendingUp className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-yellow-600" />
  }

  const getDeliveryIcon = (days: number, comparison: { min: number; max: number; avg: number }) => {
    if (days === comparison.min) return <TrendingDown className="h-4 w-4 text-green-600" />
    if (days === comparison.max) return <TrendingUp className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-yellow-600" />
  }

  const handleWinnerSelection = (itemId: string, winnerId: string) => {
    setComparisonData(prev =>
      prev.map(item =>
        item.itemId === itemId
          ? { ...item, selectedWinner: winnerId }
          : item
      )
    )
    onWinnerSelected(itemId, winnerId)
  }

  const getRecommendation = (quotations: QuotationItem[]) => {
    if (quotations.length === 0) return null

    // Simple recommendation algorithm: best price with reasonable delivery time
    const validQuotations = quotations.filter(q =>
      q.precioUnitario && q.precioUnitario > 0 && q.tiempoEntregaDias && q.tiempoEntregaDias > 0
    )

    if (validQuotations.length === 0) return null

    // Score each quotation: 70% price, 30% delivery time
    const scored = validQuotations.map(q => {
      const priceScore = 1 / q.precioUnitario! // Lower price = higher score
      const timeScore = 1 / q.tiempoEntregaDias! // Shorter time = higher score
      const totalScore = (priceScore * 0.7) + (timeScore * 0.3)
      return { ...q, score: totalScore }
    })

    return scored.sort((a, b) => b.score - a.score)[0].id
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
              const recommendedWinner = getRecommendation(itemData.quotations)

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
                      {recommendedWinner && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Recomendado
                        </Badge>
                      )}
                      <Select
                        value={itemData.selectedWinner || ''}
                        onValueChange={(value) => handleWinnerSelection(itemData.itemId, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Seleccionar ganador" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemData.quotations.map((quotation) => (
                            <SelectItem key={quotation.id} value={quotation.id}>
                              {quotation.cotizacion.proveedor.nombre}
                              {quotation.id === recommendedWinner && ' ⭐'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Precio Unitario</TableHead>
                        <TableHead className="text-right">Tiempo Entrega</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-center">Ganador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemData.quotations.map((quotation) => {
                        const isWinner = itemData.selectedWinner === quotation.id
                        const isRecommended = recommendedWinner === quotation.id

                        return (
                          <TableRow
                            key={quotation.id}
                            className={isWinner ? 'bg-green-50 border-green-200' : ''}
                          >
                            <TableCell className="font-medium">
                              {quotation.cotizacion.proveedor.nombre}
                              {isRecommended && <Star className="h-4 w-4 text-yellow-500 inline ml-1" />}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {quotation.precioUnitario ? (
                                  <>
                                    ${quotation.precioUnitario.toFixed(2)}
                                    {priceComparison && getPriceIcon(quotation.precioUnitario, priceComparison)}
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
                                    {deliveryComparison && getDeliveryIcon(quotation.tiempoEntregaDias, deliveryComparison)}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
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
                            <TableCell className="text-center">
                              {isWinner && <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />}
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