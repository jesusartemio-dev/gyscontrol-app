'use client'

// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: /app/comercial/cotizaciones/[id]/servicio/select/page.tsx
// 🔧 Descripción: Selector de servicios por categoría para cotizaciones
// 🧠 Uso: Permite agregar servicios del catálogo a un grupo de cotización
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-25
// ===================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getCatalogoServiciosByCategoriaId } from '@/lib/services/catalogoServicio'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { recalcularCotizacionDesdeAPI } from '@/lib/services/cotizacion'
import { getEdts } from '@/lib/services/edt'
import { calcularHoras } from '@/lib/utils/formulas'
import type { CatalogoServicio, Edt } from '@/types'

export default function SelectorServiciosCotizacionPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const cotizacionServicioId = searchParams.get('grupo')

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
    if (!cotizacionServicioId) return

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
          cotizacionServicioId,
          catalogoServicioId: s.id,
          categoria: s.categoria.nombre,
          unidadServicioId: s.unidadServicio.id,
          recursoId: s.recurso.id,
          unidadServicioNombre: s.unidadServicio.nombre,
          recursoNombre: s.recurso.nombre,
          formula: s.formula,
          horaBase: s.horaBase,
          horaRepetido: s.horaRepetido,
          horaUnidad: s.horaUnidad,
          horaFijo: s.horaFijo,
          costoHora: s.recurso.costoHora,
          nombre: s.nombre,
          descripcion: s.descripcion,
          cantidad,
          horaTotal: horas,
          factorSeguridad: 1.0,
          margen: 1.35,
          costoInterno: horas * s.recurso.costoHora,
          costoCliente: horas * s.recurso.costoHora * 1.35,
          nivelDificultad: s.nivelDificultad
        }

        await createCotizacionServicioItem(payload)
      }

      await recalcularCotizacionDesdeAPI(id as string)
      alert('Servicios agregados correctamente ✅')
      router.push(`/comercial/cotizaciones/${id}`)
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
