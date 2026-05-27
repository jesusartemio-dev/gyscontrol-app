import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header skeleton */}
      <div className="rounded-xl border p-6 space-y-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-8 w-28" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-64" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>

      {/* Selector mes skeleton */}
      <Skeleton className="h-10 w-56" />

      {/* Content skeleton */}
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
