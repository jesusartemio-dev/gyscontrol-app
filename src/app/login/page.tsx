'use client'

import { signIn } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

const loginSchema = z.object({
  email: z.string().email({ message: 'Correo inválido' }),
  password: z.string().min(4, { message: 'Mínimo 4 caracteres' }),
})

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { data: session } = useSession()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      setError(validation.error.issues[0].message)
      return
    }

    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    // ✅ Redirigir según el rol
    const role = session?.user?.role
    if (role === 'admin') router.push('/admin/usuarios')
    else if (role === 'comercial') router.push('/comercial/plantillas')
    else if (role === 'proyectos') router.push('/proyectos')
    else if (role === 'logistica') router.push('/logistica')
    else router.push('/')

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-700">Iniciar Sesión</h2>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Correo</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="email"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-1">Contraseña</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
