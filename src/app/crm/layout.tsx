'use client'

import { ReactNode } from 'react'

interface CrmLayoutProps {
  children: ReactNode
}

export default function CrmLayout({ children }: CrmLayoutProps) {
  return <>{children}</>
}