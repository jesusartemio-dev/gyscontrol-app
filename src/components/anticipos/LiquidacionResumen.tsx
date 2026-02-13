'use client'

import { DollarSign, ArrowDown, ArrowUp, CheckCircle2 } from 'lucide-react'
import type { SolicitudAnticipo } from '@/types'

interface LiquidacionResumenProps {
  anticipo: SolicitudAnticipo
}

export default function LiquidacionResumen({ anticipo }: LiquidacionResumenProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

  const saldo = anticipo.monto - anticipo.montoLiquidado
  const porcentaje = anticipo.monto > 0 ? Math.min(100, (anticipo.montoLiquidado / anticipo.monto) * 100) : 0

  return (
    <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-1.5">
        <DollarSign className="h-4 w-4 text-blue-600" />
        Resumen de Liquidación
      </h3>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Anticipo</p>
          <p className="text-sm font-semibold text-blue-700">{formatCurrency(anticipo.monto)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Rendido</p>
          <p className="text-sm font-semibold text-green-700">{formatCurrency(anticipo.montoLiquidado)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo</p>
          <p className={`text-sm font-semibold ${saldo > 0 ? 'text-orange-600' : saldo < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(Math.abs(saldo))}
          </p>
          {saldo > 0 && (
            <p className="text-[10px] text-orange-600 flex items-center justify-center gap-0.5">
              <ArrowDown className="h-2.5 w-2.5" />
              Por rendir
            </p>
          )}
          {saldo < 0 && (
            <p className="text-[10px] text-red-600 flex items-center justify-center gap-0.5">
              <ArrowUp className="h-2.5 w-2.5" />
              Reembolso
            </p>
          )}
          {saldo === 0 && (
            <p className="text-[10px] text-green-600 flex items-center justify-center gap-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Liquidado
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Progreso de rendición</span>
          <span>{porcentaje.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              porcentaje >= 100 ? 'bg-green-500' : porcentaje >= 50 ? 'bg-blue-500' : 'bg-orange-500'
            }`}
            style={{ width: `${Math.min(100, porcentaje)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
