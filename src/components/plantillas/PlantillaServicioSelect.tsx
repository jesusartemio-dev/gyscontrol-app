// PlantillaServicioSelect.tsx
// Para seleccionar una sección de servicios en otros formularios

import { PlantillaServicio } from '@/types'

interface Props {
  value: string
  onChange: (val: string) => void
  options: PlantillaServicio[]
  disabled?: boolean
}

export default function PlantillaServicioSelect({ value, onChange, options, disabled }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border px-3 py-2 rounded text-sm ring-1 ring-gray-300 focus:outline-none focus:ring-blue-500"
      disabled={disabled}
    >
      <option value="">Selecciona sección</option>
      {options.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  )
}
