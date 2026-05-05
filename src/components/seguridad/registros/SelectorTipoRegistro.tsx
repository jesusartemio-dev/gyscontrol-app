'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TIPO_REGISTRO_LABELS,
  type TipoRegistroSeguridad,
  tipoRegistroSeguridadEnum,
} from '@/lib/validators/registroSeguridad'

const ORDEN: TipoRegistroSeguridad[] = [
  'charla',
  'inspeccion',
  'observacion',
  'incidente',
  'actividad_general',
  'riesgo_critico',
  'medio_ambiente',
  'prevencion_salud',
]

interface Props {
  value: TipoRegistroSeguridad | null
  onChange: (tipo: TipoRegistroSeguridad) => void
  disabled?: boolean
  id?: string
  placeholder?: string
}

export function SelectorTipoRegistro({ value, onChange, disabled, id, placeholder }: Props) {
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => {
        const parsed = tipoRegistroSeguridadEnum.safeParse(v)
        if (parsed.success) onChange(parsed.data)
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder ?? 'Selecciona el tipo'} />
      </SelectTrigger>
      <SelectContent>
        {ORDEN.map((tipo) => (
          <SelectItem key={tipo} value={tipo}>
            {TIPO_REGISTRO_LABELS[tipo]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
