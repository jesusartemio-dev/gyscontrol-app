import { AnalisisTransversalEdt } from '@/components/horas-hombre/AnalisisTransversalEdt'

export default function AnalisisTransversalPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Análisis Transversal por EDT
        </h1>
        <p className="text-gray-600 mt-2">
          Visualización de horas y costos por EDT (PLC, HMI, ING) a través de múltiples proyectos.
          Ideal para análisis de 2025 y planificación de cotizaciones futuras.
        </p>
      </div>
      
      <AnalisisTransversalEdt />
    </div>
  )
}