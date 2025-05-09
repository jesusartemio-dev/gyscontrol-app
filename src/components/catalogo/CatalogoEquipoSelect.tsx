// ===================================================
// 📁 Archivo: CatalogoEquipoSelect.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Select para elegir un equipo del catálogo.
// 🧐 Uso: Reutilizable en formularios o flujos que necesiten seleccionar un equipo.
// 🖋️ Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-25
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { CatalogoEquipo } from '@/types'

interface CatalogoEquipoSelectProps {
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
}

export default function CatalogoEquipoSelect({ value, onChange, disabled }: CatalogoEquipoSelectProps) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getCatalogoEquipos()
      .then(data => setEquipos(data))
      .catch(() => setEquipos([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Cargando equipos...' : 'Seleccionar equipo'} />
      </SelectTrigger>
      <SelectContent>
        {equipos.map(eq => (
          <SelectItem key={eq.id} value={eq.id}>
            {eq.codigo} - {eq.descripcion}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
