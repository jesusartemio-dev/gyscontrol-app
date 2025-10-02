// ===================================================
// 📁 Archivo: ProyectoEquipoList.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Lista de secciones de equipos en un proyecto, cada uno con acordeón
//
// 🧠 Uso: Se utiliza en la vista de detalle del proyecto para mostrar y editar equipos
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-08
// ===================================================

'use client'

import React, { memo, useMemo } from 'react'
import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@/types'
import ProyectoEquipoAccordion from './ProyectoEquipoAccordion'

interface Props {
  equipos: ProyectoEquipoCotizado[]
  onItemChange: (equipoId: string, items: ProyectoEquipoCotizadoItem[]) => void
  onUpdatedNombre: (equipoId: string, nuevoNombre: string) => void
  onDeletedGrupo: (equipoId: string) => void
  onChange: (equipoId: string, changes: Partial<ProyectoEquipoCotizado>) => void
}

const ProyectoEquipoList = memo(function ProyectoEquipoList({
  equipos,
  onItemChange,
  onUpdatedNombre,
  onDeletedGrupo,
  onChange
}: Props) {
  return (
    <div className="space-y-4">
      {equipos.map((equipo) => {
        // 🔁 Handlers por cada equipo (evita redefinir inline en render)
        const handleItemChange = (items: ProyectoEquipoCotizadoItem[]) =>
          onItemChange(equipo.id, items)

        const handleEquipoChange = (changes: Partial<ProyectoEquipoCotizado>) =>
          onChange(equipo.id, changes)

        const handleNombreUpdate = (nuevoNombre: string) =>
          onUpdatedNombre(equipo.id, nuevoNombre)

        const handleGrupoDelete = () => onDeletedGrupo(equipo.id)

        return (
          <ProyectoEquipoAccordion
            key={equipo.id}
            equipo={equipo}
            onItemChange={handleItemChange}
            onUpdatedNombre={handleNombreUpdate}
            onDeletedGrupo={handleGrupoDelete}
            onChange={handleEquipoChange}
          />
        )
      })}
    </div>
  )
})

export default ProyectoEquipoList
