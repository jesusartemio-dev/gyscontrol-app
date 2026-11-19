'use client'

// Cantidad a pedir de un ítem de lista. Acepta decimales (1.41 m de canaleta,
// 0.66 de riel): antes se usaba parseInt con mínimo 1, así que una cantidad
// decimal no se podía pedir completa. Se escribe libre y al salir del cuadro
// se ajusta a (0, disponible].

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'

const redondear = (n: number) => Math.round(n * 1000) / 1000

export function CantidadPedidoInput({
  value, max, onChange, disabled, className = '',
}: {
  value: number
  max: number
  onChange: (v: number) => void
  disabled?: boolean
  className?: string
}) {
  const [texto, setTexto] = useState(String(value))
  // Si cambia desde afuera (p. ej. "Todos" vuelve a poner el disponible).
  useEffect(() => {
    if (Number(texto.replace(',', '.')) !== value) setTexto(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const ajustar = (n: number) => redondear(Math.min(Math.max(n, 0), max))

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={texto}
      disabled={disabled}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '')
        setTexto(t)
        const n = Number(t.replace(',', '.'))
        if (t !== '' && !Number.isNaN(n) && n > 0) onChange(ajustar(n))
      }}
      onBlur={() => {
        const n = Number(texto.replace(',', '.'))
        const final = !Number.isNaN(n) && n > 0 ? ajustar(n) : max
        setTexto(String(final))
        onChange(final)
      }}
      className={`h-8 w-20 text-right text-sm tabular-nums ${className}`}
      aria-label="Cantidad a pedir"
    />
  )
}
