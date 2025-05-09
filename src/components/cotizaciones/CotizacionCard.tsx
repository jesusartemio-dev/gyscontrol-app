// src/components/cotizaciones/CotizacionCard.tsx
import Link from 'next/link'
import type { Cotizacion } from '@/types'

interface Props {
  cotizacion: Cotizacion
}

export default function CotizacionCard({ cotizacion }: Props) {
  return (
    <div className="bg-white shadow rounded-lg p-4 border space-y-1 text-sm text-gray-800">
      <div className="flex justify-between items-center mb-1">
        <h2 className="font-bold text-base">{cotizacion.nombre}</h2>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          {cotizacion.estado}
        </span>
      </div>

      <p className="text-gray-500 text-xs">Cliente: {cotizacion.cliente?.nombre || 'Sin cliente'}</p>

      <div className="flex justify-between pt-2 border-t mt-2 text-sm">
        <span>Total Cliente:</span>
        <span className="text-green-600 font-semibold">S/ {cotizacion.totalCliente.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span>Total Interno:</span>
        <span className="text-gray-500">S/ {cotizacion.totalInterno.toFixed(2)}</span>
      </div>

      <div className="pt-2">
        <Link
          href={`/comercial/cotizaciones/${cotizacion.id}`}
          className="text-blue-600 hover:underline text-sm"
        >
          Ver detalles →
        </Link>
      </div>
    </div>
  )
}
