'use client'

import { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container mx-auto p-6">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Error al cargar el proyecto</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || 'Ocurrio un error inesperado al cargar los datos del proyecto.'}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => reset()}>Reintentar</Button>
            <Button variant="outline" asChild>
              <a href="/finanzas/aprovisionamiento">Volver a aprovisionamiento</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
