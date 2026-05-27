'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mesAnterior, mesSiguiente, labelMes, formatearMes } from '@/lib/utils/periodoMes'

interface Props {
  value: string // "YYYY-MM"
  onChange: (mes: string) => void
  disabled?: boolean
}

export function SelectorMes({ value, onChange, disabled }: Props) {
  const mesActual = formatearMes(new Date())
  const esMesActualOFuturo = value >= mesActual

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(mesAnterior(value))}
        disabled={disabled}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[140px] text-center select-none">
        {labelMes(value)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(mesSiguiente(value))}
        disabled={disabled || esMesActualOFuturo}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
