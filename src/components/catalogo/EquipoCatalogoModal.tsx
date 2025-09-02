'use client'

// ===================================================
// 📁 Archivo: EquipoCatalogoModal.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔍 Modal para buscar equipos del catálogo por nombre, código y categoría.
// ✍️ Autor: ChatGPT para GYS
// ===================================================

import { useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import type { CatalogoEquipo, CategoriaEquipo } from '@/types'

interface Props {
  abierto: boolean
  onClose: () => void
  onSeleccionar: (equipo: CatalogoEquipo) => void
}

export default function EquipoCatalogoModal({ abierto, onClose, onSeleccionar }: Props) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('__ALL__')

  useEffect(() => {
    if (abierto) {
      getCatalogoEquipos().then(setEquipos)
      getCategoriasEquipo().then(setCategorias)
    }
  }, [abierto])

  const equiposFiltrados = equipos.filter(eq =>
    (filtroCategoria === '__ALL__' || eq.categoriaId === filtroCategoria) &&
    (`${eq.codigo} ${eq.descripcion}`.toLowerCase().includes(filtroTexto.toLowerCase()))
  )

  return (
    <Dialog open={abierto} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white max-w-2xl w-full rounded-lg p-6 space-y-4 shadow-xl">
          <Dialog.Title className="text-lg font-bold">🔍 Buscar equipo del catálogo</Dialog.Title>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Buscar por código o descripción"
              className="border rounded px-3 py-2 flex-1 text-sm"
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
            />
            <select
              className="border rounded px-3 py-2 text-sm"
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
            >
              <option value="__ALL__">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[300px] overflow-y-auto border rounded">
            {equiposFiltrados.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm text-center">No se encontraron equipos.</p>
            ) : (
              <ul>
                {equiposFiltrados.map(eq => (
                  <li
                    key={eq.id}
                    onClick={() => {
                      onSeleccionar(eq)
                      onClose()
                    }}
                    className="p-2 hover:bg-blue-100 border-b cursor-pointer text-sm flex justify-between"
                  >
                    <span>{eq.codigo} - {eq.descripcion}</span>
                    <span className="text-green-700 font-medium">$ {eq.precioVenta.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-right">
            <button onClick={onClose} className="text-sm text-gray-600 hover:underline">
              Cancelar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
