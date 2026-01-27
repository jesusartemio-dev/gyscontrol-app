'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Redirect from old /crm/[id] to new /crm/oportunidades/[id]
export default function OportunidadRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    if (id) {
      router.replace(`/crm/oportunidades/${id}`)
    }
  }, [id, router])

  return (
    <div className="p-4 flex items-center justify-center min-h-[300px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}
