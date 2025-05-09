'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ConfirmDialog'


export const schema = z.object({
  id: z.string().optional(),
  email: z.string().email({ message: 'Correo inválido' }),
  name: z.string().min(2, { message: 'Nombre debe tener al menos 2 caracteres' }),
  password: z.string().min(4, { message: 'La contraseña debe tener al menos 4 caracteres' }).optional(),
  role: z.enum(['admin', 'comercial', 'proyectos', 'logistica'], {
    required_error: 'Elige un rol',
  }),
}).refine(data => {
  if (!data.id && !data.password) return false
  if (data.id && data.password && data.password.length < 4) return false
  return true
}, {
  path: ['password'],
  message: 'La contraseña es obligatoria (mín. 4 caracteres)',
})

export default function UsuariosClient() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [form, setForm] = useState({ id: '', email: '', name: '', password: '', role: 'comercial' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchUsuarios = async () => {
      const res = await fetch('/api/admin/usuarios')
      const data = await res.json()
      setUsuarios(data)
    }
    fetchUsuarios()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const dataToSend: any = { ...form }

    if (form.id && !form.password) {
      delete dataToSend.password
    }

    const valid = schema.safeParse(dataToSend)
    if (!valid.success) {
      setError(valid.error.issues[0].message)
      return
    }

    setError('')
    setLoading(true)

    const method = form.id ? 'PUT' : 'POST'
    const res = await fetch('/api/admin/usuarios', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.message || 'Error al guardar')
      toast.error(err.message || 'Error al guardar')
      setLoading(false)
      return
    }

    toast.success(method === 'POST' ? 'Usuario creado' : 'Usuario actualizado')

    const data = await res.json()
    if (method === 'POST') {
      setUsuarios([...usuarios, data])
    } else {
      setUsuarios(usuarios.map(u => u.id === data.id ? data : u))
    }

    setForm({ id: '', email: '', name: '', password: '', role: 'comercial' })
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch('/api/admin/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (res.ok) {
      setUsuarios(usuarios.filter(u => u.id !== id))
    } else {
      alert('Error al eliminar')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {form.id ? 'Editar Usuario' : 'Crear Usuario'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input name="email" placeholder="Correo" className="border p-2 rounded" value={form.email} onChange={handleChange} />
          <input name="name" placeholder="Nombre" className="border p-2 rounded" value={form.name} onChange={handleChange} />
          <input
            name="password"
            placeholder="Contraseña"
            type="password"
            className="border p-2 rounded"
            value={form.password}
            onChange={handleChange}
          />
          {form.id && (
            <p className="text-sm text-gray-500 col-span-2">Deja la contraseña vacía si no deseas cambiarla.</p>
          )}
          <select name="role" className="border p-2 rounded" value={form.role} onChange={handleChange}>
            <option value="admin">Administrador</option>
            <option value="comercial">Comercial</option>
            <option value="proyectos">Proyectos</option>
            <option value="logistica">Logística</option>
          </select>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {loading
              ? 'Guardando...'
              : form.id
              ? 'Actualizar Usuario'
              : 'Crear Usuario'}
          </button>

          {form.id && (
            <button
              type="button"
              onClick={() => setForm({ id: '', email: '', name: '', password: '', role: 'comercial' })}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h2 className="text-xl font-semibold mb-2">Lista de Usuarios</h2>
      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Correo</th>
            <th className="p-2">Nombre</th>
            <th className="p-2">Rol</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.name}</td>
              <td className="p-2 capitalize">{u.role}</td>
              <td className="p-2">
                <button
                  className="text-sm text-blue-600 hover:underline mr-3"
                  onClick={() =>
                    setForm({
                      id: u.id,
                      email: u.email || '',
                      name: u.name || '',
                      password: '',
                      role: u.role || 'comercial',
                    })
                  }
                >
                  Editar
                </button>

                <ConfirmDialog
                    title="¿Eliminar usuario?"
                    description={`¿Estás seguro de eliminar a ${u.name}?`}
                    onConfirm={() => handleDelete(u.id)}
                    trigger={
                        <button className="text-sm text-red-500 hover:underline">
                        Eliminar
                        </button>
                    }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
