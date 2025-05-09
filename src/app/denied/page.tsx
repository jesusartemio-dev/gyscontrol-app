'use client'

import { AlertTriangle } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AccessDeniedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50 text-yellow-800 p-6">
      <div className="bg-white border border-yellow-200 p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
        <h1 className="text-2xl font-bold mb-2">Oops... no tienes acceso</h1>
        <p className="mb-6 text-gray-600">
          Esta sección está restringida. Contacta al administrador si necesitas acceso.
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.back()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition"
          >
            Volver
          </button>
          <button
            onClick={() => signOut()}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
