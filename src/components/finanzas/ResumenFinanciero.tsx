'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Banknote, ArrowDownCircle, ArrowUpCircle, Wallet, Package, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

interface ResumenFinancieroProps {
  montoAnticipo: number
  montoDepositado: number
  montoGastado: number
  saldo: number
  requiereAnticipo: boolean
  materialesTotal?: number
  materialesPendientesMonto?: number
  materialesPendientesCount?: number
  materialesCount?: number
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

export default function ResumenFinanciero({
  montoAnticipo,
  montoDepositado,
  montoGastado,
  saldo,
  requiereAnticipo,
  materialesTotal,
  materialesPendientesMonto,
  materialesPendientesCount,
  materialesCount,
}: ResumenFinancieroProps) {
  const items = [
    ...(requiereAnticipo ? [
      { label: 'Anticipo solicitado', value: montoAnticipo, icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Depositado', value: montoDepositado, icon: ArrowDownCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ] : []),
    { label: 'Total gastado', value: montoGastado, icon: ArrowUpCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Saldo', value: saldo, icon: Wallet, color: saldo >= 0 ? 'text-emerald-600' : 'text-red-600', bg: saldo >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
  ]

  const hayMaterialesPendientes = materialesPendientesCount != null && materialesPendientesCount > 0

  return (
    <div className="space-y-2">
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

      {materialesCount != null && materialesCount > 0 && (
        <Card className={clsx('border', hayMaterialesPendientes ? 'border-amber-200 bg-amber-50/60' : 'border-green-200 bg-green-50/60')}>
          <CardContent className="p-3 flex items-start gap-3">
            <div className={clsx('p-1.5 rounded-md shrink-0', hayMaterialesPendientes ? 'bg-amber-100' : 'bg-green-100')}>
              {hayMaterialesPendientes
                ? <AlertCircle className="h-4 w-4 text-amber-600" />
                : <Package className="h-4 w-4 text-green-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx('text-xs font-medium', hayMaterialesPendientes ? 'text-amber-800' : 'text-green-800')}>
                {hayMaterialesPendientes
                  ? `${materialesPendientesCount} de ${materialesCount} material${materialesCount !== 1 ? 'es' : ''} pendiente${materialesPendientesCount !== 1 ? 's' : ''} de rendir`
                  : `Todos los materiales han sido rendidos`}
              </p>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                <span className="text-[11px] text-muted-foreground">
                  Total estimado: <span className="font-mono font-medium text-foreground">{formatCurrency(materialesTotal ?? 0)}</span>
                </span>
                {hayMaterialesPendientes && materialesPendientesMonto != null && materialesPendientesMonto > 0 && (
                  <span className="text-[11px] text-amber-700">
                    Pendiente: <span className="font-mono font-medium">{formatCurrency(materialesPendientesMonto)}</span>
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground/70">
                  · El saldo solo refleja gastos rendidos, no los materiales estimados aún pendientes
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
