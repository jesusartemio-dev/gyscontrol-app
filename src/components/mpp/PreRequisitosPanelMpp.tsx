'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface Props {
  ipercExiste: boolean
  ipercTieneFilas: boolean
  proyectoId: string
}

export function PreRequisitosPanelMpp({ ipercExiste, ipercTieneFilas, proyectoId }: Props) {
  const faltantes: string[] = []
  if (!ipercExiste) faltantes.push('Crear un IPERC para el proyecto')
  else if (!ipercTieneFilas) faltantes.push('El IPERC debe tener al menos una fila registrada')

  if (faltantes.length === 0) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-medium mb-2">Para generar el MPP con IA completá los pre-requisitos:</p>
        <ul className="list-disc pl-4 space-y-1 text-sm">
          {faltantes.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" asChild>
            <a href={`/proyectos/${proyectoId}/iperc`}>Ir a IPERC</a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
