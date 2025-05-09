// ===================================================
// 📁 Archivo: PlantillaGastoSelect.tsx
// 📌 Ubicación: src/components/plantillas/PlantillaGastoSelect.tsx
// 🔧 Descripción: Selector de secciones de gasto por plantilla
//
// 🧠 Uso: En formularios donde se necesita seleccionar una sección de gastos
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-05
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { getPlantillaGastos } from '@/lib/services/plantillaGasto'
import type { PlantillaGasto } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface Props {
  plantillaId: string
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function PlantillaGastoSelect({ plantillaId, value, onChange, disabled }: Props) {
  const [gastos, setGastos] = useState<PlantillaGasto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlantillaGastos()
      .then(data => setGastos(data.filter(g => g.plantillaId === plantillaId)))
      .catch(() => setGastos([]))
      .finally(() => setLoading(false))
  }, [plantillaId])

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
