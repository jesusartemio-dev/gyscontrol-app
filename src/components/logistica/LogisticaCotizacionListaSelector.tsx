'use client'

// ===================================================
// 📁 Archivo: LogisticaCotizacionListaSelector.tsx
// 📌 Descripción: Selector de lista técnica para la creación de cotización logística (con código y nombre)
// 🧠 Uso: Permite elegir de qué lista traer los ítems para cotizar
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-29
// ===================================================

import { ListaEquipo } from '@/types'

interface Props {
  listas: ListaEquipo[]
  selectedListaId: string
  onSelectLista: (listaId: string) => void
}

export default function LogisticaCotizacionListaSelector({
  listas,
  selectedListaId,
  onSelectLista,
}: Props) {
  return (
    <div>
      <label className="block font-semibold mb-1">Selecciona Lista Técnica</label>
      <select
        className="border p-2 rounded w-full"
        value={selectedListaId}
        onChange={(e) => onSelectLista(e.target.value)}
      >
        <option value="">-- Selecciona --</option>
        {listas.map((lista) => (
          <option key={lista.id} value={lista.id}>
            {lista.codigo} - {lista.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
