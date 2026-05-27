'use client'

import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintControls({ backUrl }: { backUrl: string }) {
  return (
    <div className="flex items-center justify-between gap-3 print:hidden mb-6 sticky top-0 bg-background/95 backdrop-blur border-b py-3 px-4 z-10">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backUrl}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Volver al dashboard
        </Link>
      </Button>
      <Button
        size="sm"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4 mr-1.5" />
        Imprimir / Guardar PDF
      </Button>
    </div>
  )
}
