'use client'

import type { Plantilla } from '@/types'

function formatCurrency(amount: number | undefined | null): string {
  const safeAmount = amount ?? 0
  return `$${safeAmount.toFixed(2)}`
}

function calcularRenta(pCliente: number | undefined | null, pInterno: number | undefined | null): string {
  const cliente = pCliente ?? 0
  const interno = pInterno ?? 0
  if (interno === 0) return '∞'
  const renta = ((cliente - interno) / interno) * 100
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
        <span className="text-gray-700">{formatCurrency(plantilla.totalEquiposInterno)}</span>
        <span className="text-blue-600 font-semibold">{formatCurrency(plantilla.totalEquiposCliente)}</span>
        <span className="text-blue-600">{calcularRenta(plantilla.totalEquiposCliente, plantilla.totalEquiposInterno)}</span>
      </div>

      {/* Servicios */}
      <div className="grid grid-cols-[100px_1fr_1fr_1fr] text-sm items-center">
        <span className="text-gray-700">🛠️ Servicios:</span>
        <span className="text-gray-700">{formatCurrency(plantilla.totalServiciosInterno)}</span>
        <span className="text-indigo-600 font-semibold">{formatCurrency(plantilla.totalServiciosCliente)}</span>
        <span className="text-indigo-600">{calcularRenta(plantilla.totalServiciosCliente, plantilla.totalServiciosInterno)}</span>
      </div>

      {/* Gastos */}
      <div className="grid grid-cols-[100px_1fr_1fr_1fr] text-sm items-center">
        <span className="text-orange-600">💸 Gastos:</span>
        <span className="text-gray-700">{formatCurrency(plantilla.totalGastosInterno)}</span>
        <span className="text-orange-600 font-semibold">{formatCurrency(plantilla.totalGastosCliente)}</span>
        <span className="text-orange-600">{calcularRenta(plantilla.totalGastosCliente, plantilla.totalGastosInterno)}</span>
      </div>

      <hr className="border-gray-200 my-2" />

      {/* Totales globales */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between font-medium text-gray-700">
          <span>💼 Total Interno:</span>
          <span>{formatCurrency(plantilla.totalInterno)}</span>
        </div>
        <div className="flex justify-between font-medium text-gray-800">
          <span>💵 Total Cliente:</span>
          <span>{formatCurrency(plantilla.totalCliente)}</span>
        </div>
        <div className="flex justify-between font-medium text-yellow-600">
          <span>🔻 Descuento:</span>
          <span>{formatCurrency(plantilla.descuento)}</span>
        </div>
        <div className="flex justify-between font-bold text-green-700 text-base">
          <span>✅ Total Final:</span>
          <span>{formatCurrency(plantilla.grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}
