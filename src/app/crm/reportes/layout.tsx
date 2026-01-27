'use client'

import { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReportesLayoutProps {
  children: ReactNode
}

const reportesTitles: Record<string, string> = {
  embudo: 'Embudo de Ventas',
  rendimiento: 'Rendimiento',
  clientes: 'Clientes',
  metricas: 'Métricas'
}

export default function ReportesLayout({ children }: ReportesLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Check if we're on a sub-report page
  const pathParts = pathname.split('/')
  const isSubReport = pathParts.length > 3 && pathParts[3] !== ''
  const reporteSlug = isSubReport ? pathParts[3] : null
  const reporteTitle = reporteSlug ? reportesTitles[reporteSlug] || reporteSlug : null

  // If we're on the main /crm/reportes page, just render children
  if (!isSubReport) {
    return <>{children}</>
  }

  // For sub-report pages, add navigation header
  return (
    <div className="flex flex-col h-full">
      {/* Navigation header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/crm/reportes')}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Reportes</span>
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{reporteTitle}</span>
        </div>
      </div>

      {/* Report content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
