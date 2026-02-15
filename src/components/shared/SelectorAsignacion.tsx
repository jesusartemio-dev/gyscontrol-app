'use client'

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCentrosCosto } from '@/lib/services/centroCosto'
import type { CentroCosto } from '@/types'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  estado: string
}

export interface AsignacionValue {
  proyectoId: string | null
  centroCostoId: string | null
}

interface SelectorAsignacionProps {
  value: AsignacionValue
  onChange: (value: AsignacionValue) => void
  disabled?: boolean
  placeholder?: string
}

export default function SelectorAsignacion({
  value,
  onChange,
  disabled = false,
  placeholder = 'Seleccionar destino',
}: SelectorAsignacionProps) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/proyectos').then(r => r.json()).then(res => res.data || []),
      getCentrosCosto({ activo: true }),
    ]).then(([provs, cc]) => {
      // Filter active projects (not cancelled/closed)
      setProyectos(provs.filter((p: Proyecto) => !['cancelado', 'cerrado'].includes(p.estado)))
      setCentros(cc)
    }).catch(() => {
      // Silently fail - empty lists will show
    }).finally(() => setLoading(false))
  }, [])

  // Build a composite value: "p:ID" for projects, "c:ID" for centros
  const compositeValue = value.proyectoId
    ? `p:${value.proyectoId}`
    : value.centroCostoId
      ? `c:${value.centroCostoId}`
      : ''

  const handleChange = (val: string) => {
    if (val.startsWith('p:')) {
      onChange({ proyectoId: val.slice(2), centroCostoId: null })
    } else if (val.startsWith('c:')) {
      onChange({ proyectoId: null, centroCostoId: val.slice(2) })
    }
  }

  return (
    <Select value={compositeValue} onValueChange={handleChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Cargando...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {proyectos.length > 0 && (
          <SelectGroup>
            <SelectLabel>Proyectos</SelectLabel>
            {proyectos.map(p => (
              <SelectItem key={`p:${p.id}`} value={`p:${p.id}`}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
                  <span className="truncate">{p.nombre}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {centros.length > 0 && (
          <SelectGroup>
            <SelectLabel>Centros Administrativos</SelectLabel>
            {centros.map(c => (
              <SelectItem key={`c:${c.id}`} value={`c:${c.id}`}>
                <span className="flex items-center gap-2">
                  {c.nombre}
                  <span className="text-xs text-muted-foreground capitalize">({c.tipo})</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
