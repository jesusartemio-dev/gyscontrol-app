import { Suspense } from 'react'
import BloqueosCampoList from '@/components/supervision/BloqueosCampoList'
import { Card, CardContent } from '@/components/ui/card'

function BloqueosSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="w-20 h-3 bg-muted rounded animate-pulse mb-2" />
              <div className="w-10 h-6 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 border rounded-lg">
                <div className="w-16 h-5 bg-muted rounded animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="w-full h-4 bg-muted rounded animate-pulse" />
                  <div className="w-2/3 h-3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BloqueosCampoPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <Suspense fallback={<BloqueosSkeleton />}>
        <BloqueosCampoList />
      </Suspense>
    </div>
  )
}

export const metadata = {
  title: 'Bloqueos de Campo | GYS',
}
