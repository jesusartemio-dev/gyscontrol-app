'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AprobarCampoRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/supervision/jornada-campo')
  }, [router])
  return null
}
