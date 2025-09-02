// ===================================================
// 📁 Archivo: CotizacionProveedorItemForm.tsx
// 📌 Llama al modal CotizacionSeleccionarItemsModal para agregar ítems múltiples
// 🧠 Uso: Se integra con el flujo principal de cotizaciones
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-24
// ===================================================

'use client'

import CotizacionSeleccionarItemsModal from './CotizacionSeleccionarItemsModal'

interface Props {
  cotizacionId: string
  proyectoId: string
  onCreated?: () => void // ✅ corregido: sin argumentos, solo callback vacío
}

export default function CotizacionProveedorItemForm({ cotizacionId, proyectoId, onCreated }: Props) {
  return (
    <div className="space-y-4 p-4 border rounded-xl shadow-sm bg-white">
      <CotizacionSeleccionarItemsModal
        cotizacionId={cotizacionId}
        onCreated={onCreated}
      />
    </div>
  )
}
