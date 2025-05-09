// ===================================================
// 📁 Archivo: PlantillaEquipoList.tsx
// 📌 Ubicación: src/components/plantillas/equipos/PlantillaEquipoList.tsx
// 🔧 Descripción: Lista de grupos de equipos en una plantilla, usa acordeones.
// 🧠 Uso: Dentro del detalle de plantilla para visualizar y editar equipos.
// ===================================================

'use client'

import type { PlantillaEquipo, PlantillaEquipoItem } from '@/types'
import PlantillaEquipoAccordion from './PlantillaEquipoAccordion'

interface Props {
  equipos: PlantillaEquipo[]
  onItemChange: (equipoId: string, items: PlantillaEquipoItem[]) => void
  onUpdatedNombre: (equipoId: string, nuevoNombre: string) => void
  onDeletedGrupo: (equipoId: string) => void
  onChange: (equipoId: string, changes: Partial<PlantillaEquipo>) => void
}

export default function PlantillaEquipoList({
  equipos,
  onItemChange,
  onUpdatedNombre,
  onDeletedGrupo,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      {equipos.map((equipo) => (
        <PlantillaEquipoAccordion
          key={equipo.id}
          equipo={equipo}
          onItemChange={(items) => onItemChange(equipo.id, items)} // Correctly maps equipo.id and items
          onUpdatedNombre={(nuevo) => onUpdatedNombre(equipo.id, nuevo)}
          onDeletedGrupo={() => onDeletedGrupo(equipo.id)}
          onChange={(changes) => onChange(equipo.id, changes)}
        />
      ))}
    </div>
  )
}
