// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: /app/comercial/plantillas/[id]/servicio/select/page.tsx
// 🔧 Descripción: Selector de servicios por categoría desde el catálogo para agregarlos a una sección
// 🧠 Uso: Se usa cuando el usuario quiere seleccionar servicios desde catálogo por categoría
// ✍️ Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-23
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getCatalogoServiciosByCategoriaId } from '@/lib/services/catalogoServicio'
import { createPlantillaServicioItem } from '@/lib/services/plantillaServicioItem'
import { recalcularPlantillaDesdeAPI } from '@/lib/services/plantilla'
import { getEdts } from '@/lib/services/edt'
import { calcularHoras } from '@/lib/utils/formulas'
import type { CatalogoServicio, Edt } from '@/types'

export default function SelectorServiciosPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const plantillaServicioId = searchParams.get('grupo')

  const [categorias, setCategorias] = useState<Edt[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('')
  const [catalogo, setCatalogo] = useState<CatalogoServicio[]>([])
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({})
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  useEffect(() => {
    getEdts()
      .then((cats) => {
        setCategorias(cats)
        if (cats.length > 0) setCategoriaSeleccionada(cats[0].id)
      })
      .catch(() => alert('Error al cargar categorías'))
  }, [])

  useEffect(() => {
    if (categoriaSeleccionada) {
      getCatalogoServiciosByCategoriaId(categoriaSeleccionada)
        .then(setCatalogo)
        .catch(() => alert('Error al cargar catálogo'))
    }
  }, [categoriaSeleccionada])

  const handleAgregar = async () => {
    if (!plantillaServicioId) return

    try {
      for (const s of catalogo) {
        if (!seleccionados[s.id]) continue

        const cantidad = cantidades[s.id] || 1
        const horas = calcularHoras({
          formula: s.formula,
          cantidad,
          horaBase: s.horaBase,
          horaRepetido: s.horaRepetido,
          horaUnidad: s.horaUnidad,
          horaFijo: s.horaFijo
        })

        const payload = {
          plantillaServicioId,
          catalogoServicioId: s.id,
          unidadServicioId: s.unidadServicio.id,
          recursoId: s.recurso.id,
          nombre: s.nombre,
          descripcion: s.descripcion,
          categoria: s.categoria.nombre,
          formula: s.formula,
          horaBase: s.horaBase,
          horaRepetido: s.horaRepetido,
          horaUnidad: s.horaUnidad,
          horaFijo: s.horaFijo,
          unidadServicioNombre: s.unidadServicio.nombre,
          recursoNombre: s.recurso.nombre,
          costoHora: s.recurso.costoHora,
          cantidad,
          horaTotal: horas,
          factorSeguridad: 1.0,
          costoInterno: horas * s.recurso.costoHora,
          margen: 1.35,
          costoCliente: horas * s.recurso.costoHora * 1.35
        }

        await createPlantillaServicioItem(payload)
      }

      await recalcularPlantillaDesdeAPI(id as string)
      alert('Servicios agregados correctamente ✅')
      router.push(`/comercial/plantillas/${id}`)
    } catch (err) {
      console.error(err)
      alert('Error al agregar servicios')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Seleccionar Servicios por Categoría</h1>

      <select
        className="border px-3 py-2 rounded"
        value={categoriaSeleccionada}
        onChange={(e) => setCategoriaSeleccionada(e.target.value)}
      >
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-100">
            <th className="p-2">Seleccionar</th>
            <th className="p-2">Servicio</th>
            <th className="p-2">Recurso</th>
            <th className="p-2">Unidad</th>
            <th className="p-2">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {catalogo.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={seleccionados[s.id] || false}
                  onChange={(e) => setSeleccionados({
                    ...seleccionados,
                    [s.id]: e.target.checked
                  })}
                />
              </td>
              <td className="p-2">{s.nombre}</td>
              <td className="p-2">{s.recurso.nombre}</td>
              <td className="p-2">{s.unidadServicio.nombre}</td>
              <td className="p-2">
                <input
                  type="number"
                  min={1}
                  value={cantidades[s.id] || 1}
                  onChange={(e) => setCantidades({
                    ...cantidades,
                    [s.id]: Number(e.target.value)
                  })}
                  className="border px-2 py-1 rounded w-20"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        onClick={handleAgregar}
      >
        Agregar Servicios Seleccionados
      </button>
    </div>
  )
}
