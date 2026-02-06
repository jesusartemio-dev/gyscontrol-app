'use client'

/**
 * Redirect de registro-campo a jornada-campo
 * La funcionalidad de Registro de Campo ha sido reemplazada por Jornada de Campo
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegistroCampoRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervision/jornada-campo')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo a Jornada de Campo...</p>
      </div>
    </div>
  )
}
