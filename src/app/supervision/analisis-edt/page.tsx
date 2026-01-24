import { AnalisisTransversalEdt } from '@/components/horas-hombre/AnalisisTransversalEdt'

export default function AnalisisEdtPage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Analisis por EDT
        </h1>
        <p className="text-gray-600 mt-2">
          Visualizacion de horas y costos por EDT (PLC, HMI, ING) a traves de multiples proyectos.
          Ideal para analisis de {currentYear} y planificacion de cotizaciones futuras.
        </p>
      </div>

      <AnalisisTransversalEdt />
    </div>
  )
}
