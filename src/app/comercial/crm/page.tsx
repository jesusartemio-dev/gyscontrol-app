'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Redirect from old /comercial/crm to new /crm
export default function ComercialCrmRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/crm')
  }, [router])

  return (
    <div className="p-4 flex items-center justify-center min-h-[300px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}
