// ===================================================
// 📁 Archivo: ProveedorSelect.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Selector de proveedor para formularios
//
// 🧠 Uso: Usado en formularios que requieren elegir proveedor
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Proveedor } from '@/types'
import { getProveedores } from '@/lib/services/proveedor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
}

export default function ProveedorSelect({ value, onChange, disabled }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

  useEffect(() => {
    getProveedores().then((res) => setProveedores(res || []))
  }, [])

  return (
    <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleccionar proveedor" />
      </SelectTrigger>
      <SelectContent>
        {proveedores.map((prov) => (
          <SelectItem key={prov.id} value={prov.id}>
            {prov.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
