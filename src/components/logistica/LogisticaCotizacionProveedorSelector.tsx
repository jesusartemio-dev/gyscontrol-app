'use client'

// ===================================================
// 📁 Archivo: LogisticaCotizacionProveedorSelector.tsx
// 📌 Descripción: Selector desplegable de proveedor para cotización logística
// 🧠 Uso: Permite elegir el proveedor antes de generar la cotización
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-27
// ===================================================

import { Proveedor } from '@/types'

interface Props {
  proveedores: Proveedor[]
  selectedProveedorId: string
  onSelectProveedor: (proveedorId: string) => void
}

export default function LogisticaCotizacionProveedorSelector({
  proveedores,
  selectedProveedorId,
  onSelectProveedor,
}: Props) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">Proveedor</label>
      <select
        className="border rounded p-2 w-full"
        value={selectedProveedorId}
        onChange={(e) => onSelectProveedor(e.target.value)}
      >
        <option value="">-- Selecciona un proveedor --</option>
        {proveedores.map((proveedor) => (
          <option key={proveedor.id} value={proveedor.id}>
            {proveedor.nombre} ({proveedor.ruc || 'sin RUC'})
          </option>
        ))}
      </select>
    </div>
  )
}
