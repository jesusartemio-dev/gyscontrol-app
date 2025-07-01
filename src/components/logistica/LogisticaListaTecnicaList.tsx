// ===================================================
// 📁 Archivo: LogisticaListaTecnicaList.tsx
// 📌 Ubicación: src/components/logistica/
// 📌 Descripción: Lista contenedora que renderiza múltiples tarjetas LogisticaListaTecnicaCard
// 🧠 Uso: Mostrar todas las listas técnicas filtradas en logística
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

'use client'

import { ListaEquipo } from '@/types'
import LogisticaListaTecnicaCard from './LogisticaListaTecnicaCard'

interface Props {
  listas: ListaEquipo[]
  onRefresh?: () => void
}

export default function LogisticaListaTecnicaList({ listas, onRefresh }: Props) {
  if (listas.length === 0) {
    return <p className="text-gray-500">No hay listas técnicas disponibles.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listas.map((lista) => (
        <LogisticaListaTecnicaCard
          key={lista.id}
          lista={lista}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}
