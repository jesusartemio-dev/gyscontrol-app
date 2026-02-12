'use client'

// ===================================================
// 📁 Archivo: LogisticaCatalogoEquipoCrearAcordeon.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Acordeón simple para agregar nuevo equipo al catálogo logística.
// 🧠 Uso: Llama a onCreated cuando se completa y guarda el formulario.
// ✍️ Autor: Jesús Artemio
// 📅 Actualizado: 2025-05-28
// ===================================================

import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { CatalogoEquipoPayload } from '@/types'

interface Props {
  onCreated: (data: CatalogoEquipoPayload) => void
}

export default function LogisticaCatalogoEquipoCrearAcordeon({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<CatalogoEquipoPayload>>({
    categoriaId: '',
    unidadId: '',
    codigo: '',
    descripcion: '',
    marca: '',
    precioLista: 0,
    precioInterno: 0,
    factorCosto: 1.00,
    factorVenta: 1.15,
  })

  const handleSubmit = () => {
    if (
      form.categoriaId &&
      form.unidadId &&
      form.codigo &&
      form.descripcion &&
      form.marca &&
      form.precioLista !== undefined &&
      form.factorCosto !== undefined &&
      form.factorVenta !== undefined
    ) {
      const precioInterno = +(form.precioLista * form.factorCosto).toFixed(2)
      const precioVenta = +(precioInterno * form.factorVenta).toFixed(2)
      onCreated({ ...form, precioInterno, precioVenta } as CatalogoEquipoPayload)
      setForm({
        categoriaId: '',
        unidadId: '',
        codigo: '',
        descripcion: '',
        marca: '',
        precioLista: 0,
        precioInterno: 0,
        factorCosto: 1.00,
        factorVenta: 1.15,
      })
      setOpen(false)
    } else {
      alert('Por favor completa todos los campos.')
    }
  }

  return (
    <div className="border rounded p-4 space-y-2 bg-white shadow">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
      >
        <Plus size={16} />
        {open ? 'Ocultar Formulario' : 'Añadir Equipo'}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          <input
            type="text"
            placeholder="Categoría ID"
            value={form.categoriaId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, categoriaId: e.target.value }))
            }
            className="w-full border px-2 py-1 rounded"
          />
          <input
            type="text"
            placeholder="Unidad ID"
            value={form.unidadId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, unidadId: e.target.value }))
            }
            className="w-full border px-2 py-1 rounded"
          />
          <input
            type="text"
            placeholder="Código"
            value={form.codigo}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, codigo: e.target.value }))
            }
            className="w-full border px-2 py-1 rounded"
          />
          <input
            type="text"
            placeholder="Descripción"
            value={form.descripcion}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, descripcion: e.target.value }))
            }
            className="w-full border px-2 py-1 rounded"
          />
          <input
            type="text"
            placeholder="Marca"
            value={form.marca}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, marca: e.target.value }))
            }
            className="w-full border px-2 py-1 rounded"
          />
          <input
            type="number"
            placeholder="Precio Lista"
            value={form.precioLista || ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                precioLista: parseFloat(e.target.value),
              }))
            }
            className="w-full border px-2 py-1 rounded"
          />
          <input
            type="number"
            placeholder="Factor Costo (ej: 1.00)"
            value={form.factorCosto || ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                factorCosto: parseFloat(e.target.value),
              }))
            }
            className="w-full border px-2 py-1 rounded"
          />
          <input
            type="number"
            placeholder="Factor Venta (ej: 1.15)"
            value={form.factorVenta || ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                factorVenta: parseFloat(e.target.value),
              }))
            }
            className="w-full border px-2 py-1 rounded"
          />
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          >
            Guardar Equipo
          </button>
        </div>
      )}
    </div>
  )
}
