'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MisRegistrosRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/mi-trabajo/timesheet')
  }, [router])
  return null
}
