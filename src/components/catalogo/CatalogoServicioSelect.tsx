// ===================================================
// 📁 Archivo: CatalogoServicioSelect.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Selector de servicios desde el catálogo
// 
// 🧠 Uso: Se utiliza en formularios relacionados como PlantillaServicioItem
// 🖍️ Autor: Jesús Artemio (Master Experto)
// 🗓️ Última actualización: 2025-04-20
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { CatalogoServicio } from '@/types'
import { getCatalogoServicios } from '@/lib/services/catalogoServicio'

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Props {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  categoriaId?: string
}

export default function CatalogoServicioSelect({
  value,
  onChange,
  disabled,
  categoriaId,
}: Props) {
  const [servicios, setServicios] = useState<CatalogoServicio[]>([])

  useEffect(() => {
    const fetchServicios = async () => {
      const todos = await getCatalogoServicios()
      if (categoriaId) {
        setServicios(todos.filter((s) => s.categoriaId === categoriaId))
      } else {
        setServicios(todos)
      }
    }
    fetchServicios()
  }, [categoriaId])

  return (
    <div className="space-y-1">
      <Label>Servicio del Catálogo</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona servicio" />
        </SelectTrigger>
        <SelectContent>
          {servicios.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
