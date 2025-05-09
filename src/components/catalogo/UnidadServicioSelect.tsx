// ===================================================
// 📁 Archivo: UnidadServicioSelect.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Selector para elegir Unidad de Servicio en formularios
//
// 🧠 Uso: En formularios donde se relacionan servicios con unidades
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-20
// ===================================================

'use client'

import { UnidadServicio } from '@/types'
import { useEffect, useState } from 'react'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Props {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}

export default function UnidadServicioSelect({ value, onChange, disabled }: Props) {
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])

  useEffect(() => {
    getUnidadesServicio().then(setUnidades)
  }, [])

  return (
    <div className="space-y-1">
      <Label>Unidad de Servicio</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona unidad" />
        </SelectTrigger>
        <SelectContent>
          {unidades.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
