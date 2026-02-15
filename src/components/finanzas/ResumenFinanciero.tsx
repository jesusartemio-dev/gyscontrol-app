'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Banknote, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'
import clsx from 'clsx'

interface ResumenFinancieroProps {
  montoAnticipo: number
  montoDepositado: number
  montoGastado: number
  saldo: number
  requiereAnticipo: boolean
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

export default function ResumenFinanciero({
  montoAnticipo,
  montoDepositado,
  montoGastado,
  saldo,
  requiereAnticipo,
}: ResumenFinancieroProps) {
  const items = [
    ...(requiereAnticipo ? [
      { label: 'Anticipo solicitado', value: montoAnticipo, icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Depositado', value: montoDepositado, icon: ArrowDownCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ] : []),
    { label: 'Total gastado', value: montoGastado, icon: ArrowUpCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Saldo', value: saldo, icon: Wallet, color: saldo >= 0 ? 'text-emerald-600' : 'text-red-600', bg: saldo >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
  ]

  return (
    <div className={clsx('grid gap-2', requiereAnticipo ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
      {items.map((item) => (
        <Card key={item.label} className="border-none shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <div className={clsx('p-1.5 rounded-md', item.bg)}>
              <item.icon className={clsx('h-4 w-4', item.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">{item.label}</p>
              <p className={clsx('text-sm font-semibold font-mono', item.color)}>
                {formatCurrency(item.value)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
