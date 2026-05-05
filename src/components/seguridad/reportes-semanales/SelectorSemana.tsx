'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatearSemanaIso } from '@/lib/validators/reporteSeguridad'
import { getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek, addWeeks, subWeeks, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  value: string // "YYYY-Www"
  onChange: (semana: string) => void
  disabled?: boolean
}

function semanaToDate(semana: string): Date {
  const m = semana.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return new Date()
  const year = Number(m[1])
  const week = Number(m[2])
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const monday = startOfISOWeek(jan4)
  return addWeeks(monday, week - 1)
}

function semanaLabel(semana: string): string {
  const d = semanaToDate(semana)
  const inicio = startOfISOWeek(d)
  const fin = endOfISOWeek(d)
  const week = getISOWeek(d)
  const year = getISOWeekYear(d)
  const inicioFmt = format(inicio, 'd MMM', { locale: es })
  const finFmt = format(fin, 'd MMM yyyy', { locale: es })
  return `Semana ${week} · ${inicioFmt} – ${finFmt} (${year})`
}

export function SelectorSemana({ value, onChange, disabled }: Props) {
  const anteriorSemana = () => {
    const d = semanaToDate(value)
    onChange(formatearSemanaIso(subWeeks(d, 1)))
  }

  const siguienteSemana = () => {
    const d = semanaToDate(value)
    onChange(formatearSemanaIso(addWeeks(d, 1)))
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={anteriorSemana}
        disabled={disabled}
        aria-label="Semana anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[260px] text-center">
        {semanaLabel(value)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={siguienteSemana}
        disabled={disabled}
        aria-label="Semana siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
