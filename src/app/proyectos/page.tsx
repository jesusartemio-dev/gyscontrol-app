'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getProyectos, deleteProyecto, createProyecto } from '@/lib/services/proyecto'
import type { Proyecto, ProyectoPayload } from '@/types'
import { toast } from 'sonner'

// Roles permitidos para acceder a la página de Proyectos
const ALLOWED_ROLES = [
  'proyectos',
  'coordinador',
  'gestor',
  'gerente',
  'admin',
]

export default function ProyectosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔐 Protección de ruta por rol
  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user.role
    if (!role || !ALLOWED_ROLES.includes(role)) {
      router.replace('/denied')
    }
  }, [session, status, router])

  // 🔄 Cargar proyectos
  useEffect(() => {
    getProyectos()
      .then(setProyectos)
      .catch(() => toast.error('Error al cargar proyectos.'))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !codigo.trim()) {
      setError('Todos los campos son obligatorios.')
      return
    }

    setLoading(true)
    try {
      const payload: ProyectoPayload = {
        clienteId: '',
        comercialId: '',
        gestorId: '',
        nombre,
        codigo,
        totalCliente: 0,
        totalInterno: 0,
        totalEquiposInterno: 0,
        totalServiciosInterno: 0,
        totalGastosInterno: 0,
        descuento: 0,
        grandTotal: 0,
        estado: 'activo',
        fechaInicio: new Date().toISOString(),
      }

      const nuevo = await createProyecto(payload)
      if (nuevo) {
        setProyectos([...proyectos, nuevo])
        setNombre('')
        setCodigo('')
        toast.success('Proyecto creado exitosamente')
      }
    } catch {
      toast.error('Error al crear proyecto.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProyecto(id)
      setProyectos((prev) => prev.filter((p) => p.id !== id))
      toast.success('Proyecto eliminado.')
    } catch {
      toast.error('Error al eliminar proyecto.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📁 Proyectos</h1>

      {/* Formulario para agregar proyecto */}
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
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          {loading ? 'Creando...' : 'Agregar'}
        </button>
        {error && <span className="text-red-500 text-sm ml-2">{error}</span>}
      </form>

      {/* Tabla de proyectos */}
      <div className="overflow-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Comercial</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Inicio</th>
              <th className="p-3 text-right">Total Cliente</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-500">
                  No hay proyectos registrados.
                </td>
              </tr>
            ) : (
              proyectos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{p.codigo}</td>
                  <td
                    className="p-3 text-blue-600 underline cursor-pointer"
                    onClick={() => router.push(`/proyectos/${p.id}`)}
                  >
                    {p.nombre}
                  </td>
                  <td className="p-3">{p.cliente?.nombre ?? '—'}</td>
                  <td className="p-3">{p.comercial?.name ?? '—'}</td>
                  <td className="p-3">{p.estado}</td>
                  <td className="p-3">{p.fechaInicio?.split('T')[0]}</td>
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
