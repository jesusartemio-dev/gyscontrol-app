'use client'

import { motion } from 'framer-motion'
import { Target, TrendingUp, Users, Activity, DollarSign, Percent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const cards = [
    {
      title: 'Total Oportunidades',
      value: resumen.totalOportunidades,
      description: `${resumen.oportunidadesActivas} activas`,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Valor Embudo Activo',
      value: formatCurrency(resumen.valorEmbudoActivo),
      description: `${formatCurrency(resumen.valorTotalEmbudo)} total`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Tasa de Conversión',
      value: `${resumen.tasaConversion}%`,
      description: `${resumen.oportunidadesGanadas} ganadas`,
      icon: Percent,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Oportunidades Ganadas',
      value: resumen.oportunidadesGanadas,
      description: `${resumen.oportunidadesPerdidas} perdidas`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}