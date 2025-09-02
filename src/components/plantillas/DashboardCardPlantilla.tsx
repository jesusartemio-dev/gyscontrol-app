'use client'

import type { Plantilla } from '@/types'
import Link from 'next/link'

interface Props {
  plantilla: Plantilla
}

export default function DashboardCardPlantilla({ plantilla }: Props) {
  const totalEquipos = plantilla.equipos.reduce(
    (acc, eq) => acc + eq.subtotalCliente,
    0
  )

  const totalServicios = plantilla.servicios.reduce(
    (acc, sv) => acc + sv.subtotalCliente,
    0
  )

  return (
    <div className="p-5 rounded-xl shadow-sm border bg-white hover:shadow-md transition-all space-y-3">
      {/* Título + Estado */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          📋 {plantilla.nombre}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
          ${plantilla.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
            plantilla.estado === 'rechazado' ? 'bg-red-100 text-red-600' :
            plantilla.estado === 'revisado' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
          {plantilla.estado ?? 'borrador'}
        </span>
      </div>

      {/* Cliente (si existe) */}
      {'cliente' in plantilla && (plantilla as any).cliente?.nombre && (
        <div className="text-sm text-gray-600">
          👤 Cliente: {(plantilla as any).cliente.nombre}
        </div>
      )}

      {/* Subtotales */}
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span>🧰 Equipos:</span>
          <span className="text-blue-600 font-medium">$ {totalEquipos.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>🛠️ Servicios:</span>
          <span className="text-indigo-600 font-medium">$ {totalServicios.toFixed(2)}</span>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Total final */}
      <div className="flex justify-between text-base font-semibold text-green-700">
        <span>💰 Total Cliente:</span>
        <span className="text-lg">$ {plantilla.totalCliente.toFixed(2)}</span>
      </div>

      {/* Link a detalle */}
      <Link
        href={`/comercial/plantillas/${plantilla.id}`}
        className="inline-block mt-2 text-blue-600 text-sm hover:underline"
      >
        Ver detalles →
      </Link>
    </div>
  )
}
