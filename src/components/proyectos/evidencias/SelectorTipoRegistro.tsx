'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TIPO_REGISTRO_AVANCE_LABELS,
  SECCIONES_REPORTE,
  type TipoRegistroAvance,
  tipoRegistroAvanceEnum,
} from '@/lib/validators/registroAvance'

interface Props {
  value: TipoRegistroAvance | null
  onChange: (tipo: TipoRegistroAvance) => void
  disabled?: boolean
  id?: string
  placeholder?: string
}

export function SelectorTipoRegistro({ value, onChange, disabled, id, placeholder }: Props) {
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => {
        const parsed = tipoRegistroAvanceEnum.safeParse(v)
        if (parsed.success) onChange(parsed.data)
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder ?? 'Selecciona el tipo'} />
      </SelectTrigger>
      <SelectContent>
        {SECCIONES_REPORTE.map((tipo) => (
          <SelectItem key={tipo} value={tipo}>
            {TIPO_REGISTRO_AVANCE_LABELS[tipo]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
