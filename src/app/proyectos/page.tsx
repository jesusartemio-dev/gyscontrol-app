// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/page.tsx
// 🔧 Descripción: Página principal de listado de proyectos
//
// 🧠 Uso: Muestra los proyectos creados y permite crear nuevos
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-08
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProyectos, deleteProyecto, createProyecto } from '@/lib/services/proyecto'
import { toast } from 'sonner'

interface Proyecto {
  id: string
  nombre: string
  codigo: string
  totalCliente: number
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    getProyectos()
      .then(setProyectos)
      .catch(() => setError('Error al cargar proyectos.'))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !codigo.trim()) {
      setError('Todos los campos son obligatorios.')
      return
    }

    try {
      const nuevo = await createProyecto({
        nombre,
        codigo,
        totalCliente: 0,
        totalInterno: 0
      })
      setProyectos([...proyectos, nuevo])
      setNombre('')
      setCodigo('')
      setError(null)
      toast.success('Proyecto creado exitosamente')
    } catch {
      toast.error('Error al crear proyecto.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProyecto(id)
      setProyectos(proyectos.filter(p => p.id !== id))
      toast.success('Proyecto eliminado.')
    } catch {
      toast.error('Error al eliminar proyecto.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📁 Proyectos</h1>

      <form onSubmit={handleCreate} className="flex gap-2 items-center flex-wrap">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del proyecto"
          className="border px-3 py-2 rounded-md w-64"
        />
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código"
          className="border px-3 py-2 rounded-md w-48"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Agregar
        </button>
        {error && <span className="text-red-500 text-sm ml-2">{error}</span>}
      </form>

      <div className="overflow-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Nombre</th>
              <th className="p-3 text-right">Total Cliente</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-500">
                  No hay proyectos registrados.
                </td>
              </tr>
            ) : (
              proyectos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{p.codigo}</td>
                  <td className="p-3 text-blue-600 underline cursor-pointer" onClick={() => router.push(`/proyectos/${p.id}`)}>
                    {p.nombre}
                  </td>
                  <td className="p-3 text-right">S/ {p.totalCliente.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
