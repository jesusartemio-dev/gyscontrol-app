// ===================================================
// 📁 Archivo: CotizacionGastoSelect.tsx
// 📌 Ubicación: src/components/cotizaciones/CotizacionGastoSelect.tsx
// 🔧 Descripción: Selector de secciones de gasto por cotización
//
// 🧠 Uso: En formularios donde se necesita seleccionar un grupo de gasto
// ✍️ Autor: Adaptado por GYS AI Assistant
// 📅 Última actualización: 2025-05-06
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { getCotizacionGastos } from '@/lib/services/cotizacionGasto'
import type { CotizacionGasto } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface Props {
  cotizacionId: string
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function CotizacionGastoSelect({ cotizacionId, value, onChange, disabled }: Props) {
  const [gastos, setGastos] = useState<CotizacionGasto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCotizacionGastos()
      .then(data => setGastos(data.filter(g => g.cotizacionId === cotizacionId)))
      .catch(() => setGastos([]))
      .finally(() => setLoading(false))
  }, [cotizacionId])

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger className="w-full">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="animate-spin w-4 h-4" /> Cargando...
          </div>
        ) : (
          <SelectValue placeholder="Selecciona grupo de gasto" />
        )}
      </SelectTrigger>
      <SelectContent>
        {gastos.map(gasto => (
          <SelectItem key={gasto.id} value={gasto.id}>
            {gasto.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
