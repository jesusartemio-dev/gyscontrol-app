import { Proyecto } from '@/types'

interface Props {
  value: string
  onChange: (id: string) => void
  proyectos: Proyecto[]
}

export default function ProyectoSelect({ value, onChange, proyectos }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border p-2 rounded w-full"
    >
      <option value="">Seleccione un proyecto</option>
      {proyectos.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nombre}
        </option>
      ))}
    </select>
  )
}
