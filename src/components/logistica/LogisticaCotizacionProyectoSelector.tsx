'use client'

// ===================================================
// 📁 Archivo: LogisticaCotizacionProyectoSelector.tsx
// 📌 Descripción: Selector de proyecto para la creación de cotización logística
// 🧠 Uso: Renderiza un select para elegir proyecto, comunica el ID seleccionado al padre
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-26
// ===================================================

import { Proyecto } from '@/types'

interface Props {
  proyectos: Proyecto[]
  selectedProyectoId: string
  onSelectProyecto: (proyectoId: string) => void
}

export default function LogisticaCotizacionProyectoSelector({
  proyectos,
  selectedProyectoId,
  onSelectProyecto,
}: Props) {
  return (
    <div>
      <label className="block font-semibold mb-1">Selecciona Proyecto</label>
      <select
        className="border p-2 rounded w-full"
        value={selectedProyectoId}
        onChange={(e) => onSelectProyecto(e.target.value)}
      >
        <option value="">-- Selecciona --</option>
        {proyectos.map((proy) => (
          <option key={proy.id} value={proy.id}>
            {proy.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
