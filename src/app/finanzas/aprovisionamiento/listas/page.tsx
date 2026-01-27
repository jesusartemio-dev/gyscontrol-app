/**
 * Página de Listas de Equipo - Vista minimalista
 */

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import ListasEquipoPageContent from './ListasEquipoPageContent'

export default function ListasEquipoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ListasEquipoPageContent />
    </Suspense>
  )
}

function Loading() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
