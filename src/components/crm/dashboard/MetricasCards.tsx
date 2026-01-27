'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/plantilla-utils'

interface MetricasCardsProps {
  resumen: {
    totalOportunidades: number
    oportunidadesActivas: number
    oportunidadesGanadas: number
    oportunidadesPerdidas: number
    valorTotalEmbudo: number
    valorEmbudoActivo: number
    tasaConversion: number
  }
}

export default function MetricasCards({ resumen }: MetricasCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Oportunidades</p>
          <p className="text-2xl font-bold">{resumen.totalOportunidades}</p>
          <p className="text-xs text-muted-foreground">{resumen.oportunidadesActivas} activas</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Valor Activo</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(resumen.valorEmbudoActivo)}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(resumen.valorTotalEmbudo)} total</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Conversión</p>
          <p className="text-2xl font-bold text-purple-600">{resumen.tasaConversion}%</p>
          <p className="text-xs text-muted-foreground">{resumen.oportunidadesGanadas} ganadas</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Ganadas / Perdidas</p>
          <p className="text-2xl font-bold">
            <span className="text-green-600">{resumen.oportunidadesGanadas}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-red-500">{resumen.oportunidadesPerdidas}</span>
          </p>
          <p className="text-xs text-muted-foreground">ratio</p>
        </CardContent>
      </Card>
    </div>
  )
}
