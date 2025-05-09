'use client'

import type { Plantilla } from '@/types'

function calcularRenta(pCliente: number, pInterno: number): string {
  if (pInterno === 0) return '∞'
  const renta = ((pCliente - pInterno) / pInterno) * 100
  return `${renta.toFixed(1)}%`
}

interface Props {
  plantilla: Plantilla
}

export default function ResumenTotalesPlantilla({ plantilla }: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border max-w-md ml-auto space-y-4">
      {/* Encabezado de columnas */}
      <div className="grid grid-cols-[100px_1fr_1fr_1fr] text-xs font-semibold text-gray-500 px-1">
        <span></span>
        <span className="text-left">Interno</span>
        <span className="text-left">Cliente</span>
        <span className="text-left">% Rent</span>
      </div>

      {/* Equipos */}
      <div className="grid grid-cols-[100px_1fr_1fr_1fr] text-sm items-center">
        <span className="text-red-600">🧰 Equipos:</span>
        <span className="text-gray-700">${plantilla.totalEquiposInterno.toFixed(2)}</span>
        <span className="text-blue-600 font-semibold">${plantilla.totalEquiposCliente.toFixed(2)}</span>
        <span className="text-blue-600">{calcularRenta(plantilla.totalEquiposCliente, plantilla.totalEquiposInterno)}</span>
      </div>

      {/* Servicios */}
      <div className="grid grid-cols-[100px_1fr_1fr_1fr] text-sm items-center">
        <span className="text-gray-700">🛠️ Servicios:</span>
        <span className="text-gray-700">${plantilla.totalServiciosInterno.toFixed(2)}</span>
        <span className="text-indigo-600 font-semibold">${plantilla.totalServiciosCliente.toFixed(2)}</span>
        <span className="text-indigo-600">{calcularRenta(plantilla.totalServiciosCliente, plantilla.totalServiciosInterno)}</span>
      </div>

      {/* Gastos */}
      <div className="grid grid-cols-[100px_1fr_1fr_1fr] text-sm items-center">
        <span className="text-orange-600">💸 Gastos:</span>
        <span className="text-gray-700">${plantilla.totalGastosInterno.toFixed(2)}</span>
        <span className="text-orange-600 font-semibold">${plantilla.totalGastosCliente.toFixed(2)}</span>
        <span className="text-orange-600">{calcularRenta(plantilla.totalGastosCliente, plantilla.totalGastosInterno)}</span>
      </div>

      <hr className="border-gray-200 my-2" />

      {/* Totales globales */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between font-medium text-gray-700">
          <span>💼 Total Interno:</span>
          <span>${plantilla.totalInterno.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium text-gray-800">
          <span>💵 Total Cliente:</span>
          <span>${plantilla.totalCliente.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium text-yellow-600">
          <span>🔻 Descuento:</span>
          <span>${plantilla.descuento.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-green-700 text-base">
          <span>✅ Total Final:</span>
          <span>${plantilla.grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
