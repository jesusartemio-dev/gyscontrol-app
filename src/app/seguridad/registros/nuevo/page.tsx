'use client'

// Compat shim: este URL legacy redirige al nuevo flujo /seguridad/evidencias.
// TODO: deprecar tras una release.
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function NuevoRegistroSeguridadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams()
    const proyectoId = searchParams.get('proyectoId')
    const semanaIso = searchParams.get('semanaIso')
    const tipo = searchParams.get('tipo')
    const reporteId = searchParams.get('reporteId')
    if (proyectoId) params.set('proyectoId', proyectoId)
    if (semanaIso) params.set('semanaIso', semanaIso)
    if (tipo) params.set('tipo', tipo)
    if (reporteId) params.set('reporteId', reporteId)
    const qs = params.toString()
    router.replace(`/seguridad/evidencias${qs ? `?${qs}` : ''}`)
  }, [router, searchParams])

  return (
    <div className="container mx-auto p-6 flex items-center justify-center text-muted-foreground gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo al nuevo flujo de evidencias…
    </div>
  )
}
