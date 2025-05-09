// ===================================================
// 📁 Archivo: CategoriaServicioSelect.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Select para elegir una categoría de servicio.
//
// 🧠 Uso: Usado en formularios que requieren seleccionar una categoría
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-04-20
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { CategoriaServicio } from '@/types'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
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

export default function CategoriaServicioSelect({
  value,
  onChange,
  disabled = false,
}: Props) {
  const [data, setData] = useState<CategoriaServicio[]>([])

  useEffect(() => {
    getCategoriasServicio().then(setData)
  }, [])

  return (
    <div className="space-y-1">
      <Label>Categoría</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccionar categoría" />
        </SelectTrigger>
        <SelectContent>
          {data.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
