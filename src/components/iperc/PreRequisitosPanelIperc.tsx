'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface Props {
  faltantes: string[]
  proyectoId: string
}

export function PreRequisitosPanelIperc({ faltantes, proyectoId }: Props) {
  if (faltantes.length === 0) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-medium mb-2">Para generar el IPERC con IA completá los pre-requisitos:</p>
        <ul className="list-disc pl-4 space-y-1 text-sm">
          {faltantes.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" asChild>
            <a href={`/proyectos/${proyectoId}/plan-trabajo`}>Ir a Plan de Trabajo</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/proyectos/${proyectoId}/cronograma`}>Ir a Cronograma</a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
