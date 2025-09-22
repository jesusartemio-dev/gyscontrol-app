'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface CronogramaComparisonViewProps {
  proyectoId: string
}

export function CronogramaComparisonView({ proyectoId }: CronogramaComparisonViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Comparación de Cronogramas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Vista de Comparación</h3>
          <p className="text-muted-foreground">
            La vista de comparación entre cronograma comercial y proyecto estará disponible próximamente.
            Permitirá comparar las estimaciones iniciales con la ejecución real.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            Proyecto ID: {proyectoId}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}