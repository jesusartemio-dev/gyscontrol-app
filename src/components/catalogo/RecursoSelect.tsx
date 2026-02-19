// ===================================================
// 📁 Archivo: RecursoSelect.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Dropdown para seleccionar recurso
//
// 🧠 Uso: En formularios donde se relaciona con `CatalogoServicio`
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Recurso } from '@/types'
import { getRecursos } from '@/lib/services/recurso'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Props {
  value?: string
  onChange?: (id: string) => void
  disabled?: boolean
}

export default function RecursoSelect({ value, onChange, disabled }: Props) {
  const [recursos, setRecursos] = useState<Recurso[]>([])

  useEffect(() => {
    getRecursos(true).then(setRecursos)
  }, [])

  return (
    <div className="space-y-1">
      <Label>Recurso</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona recurso" />
        </SelectTrigger>
        <SelectContent>
          {recursos.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
