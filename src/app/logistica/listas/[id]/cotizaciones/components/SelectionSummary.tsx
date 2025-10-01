'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle, DollarSign, Clock, Award } from 'lucide-react'

interface SelectionStats {
  totalItems: number
  selectedItems: number
  pendingItems: number
  completionPercentage: number
  totalSavings: number
  averageDeliveryTime: number
  bestPriceItems: number
  fastestDeliveryItems: number
}

interface SelectionSummaryProps {
  stats: SelectionStats
  selections: Record<string, string | null>
}

export default function SelectionSummary({ stats, selections }: SelectionSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Completion Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Progreso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              {stats.completionPercentage.toFixed(0)}%
            </div>
            <Progress value={stats.completionPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {stats.selectedItems} de {stats.totalItems} completados
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Ahorro Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${stats.totalSavings.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            vs precio promedio
          </div>
        </CardContent>
      </Card>

      {/* Delivery Time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Entrega Promedio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {stats.averageDeliveryTime.toFixed(1)} días
          </div>
          <div className="text-xs text-muted-foreground">
            tiempo estimado
          </div>
        </CardContent>
      </Card>

      {/* Quality Indicators */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Calidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Mejor precio:</span>
              <Badge variant="outline" className="text-xs">
                {stats.bestPriceItems}
              </Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span>Más rápido:</span>
              <Badge variant="outline" className="text-xs">
                {stats.fastestDeliveryItems}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Items Alert */}
      {stats.pendingItems > 0 && (
        <Card className="md:col-span-2 lg:col-span-4 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900">
                  {stats.pendingItems} ítems pendientes de selección
                </h4>
                <p className="text-sm text-yellow-800">
                  Completa la selección de ganadores para todos los ítems antes de finalizar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}