// ===================================================
// 📁 Archivo: EdtSelect.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Select para elegir un EDT.
//
// 🧠 Uso: Usado en formularios que requieren seleccionar un EDT
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-10-15
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Edt } from '@/types'
import { getEdts } from '@/lib/services/edt'
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
  onChange?: (value: string) => void
  disabled?: boolean
}

export default function EdtSelect({
  value,
  onChange,
  disabled = false,
}: Props) {
  const [data, setData] = useState<Edt[]>([])

  useEffect(() => {
    getEdts().then(setData)
  }, [])

  return (
    <div className="space-y-1">
      <Label>EDT</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccionar EDT" />
        </SelectTrigger>
        <SelectContent>
          {data.map((edt) => (
            <SelectItem key={edt.id} value={edt.id}>
              {edt.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
