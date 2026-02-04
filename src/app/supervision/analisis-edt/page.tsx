import { AnalisisTransversalEdt } from '@/components/horas-hombre/AnalisisTransversalEdt'
import { Layers } from 'lucide-react'

export default function AnalisisEdtPage() {
  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-600" />
            Análisis por EDT
          </h1>
          <p className="text-sm text-gray-500">
            Horas por EDT (PLC, HMI, ING) a través de múltiples proyectos
          </p>
        </div>
      </div>

      <AnalisisTransversalEdt />
    </div>
  )
}
