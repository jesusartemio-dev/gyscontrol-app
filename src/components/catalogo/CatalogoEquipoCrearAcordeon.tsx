'use client'

// ===================================================
// 📁 Archivo: CatalogoEquipoCrearAcordeon.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Acordeón para mostrar/ocultar el formulario de nuevo equipo
// 🧠 Uso: Usado dentro de la página de Catálogo de Equipos
// ✍️ Autor: Basado en componente de servicios
// ===================================================

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import CatalogoEquipoForm from './CatalogoEquipoForm'
import type { CatalogoEquipo } from '@/types'

interface Props {
  onCreated?: (nuevo: CatalogoEquipo) => void
}

export default function CatalogoEquipoCrearAcordeon({ onCreated }: Props) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const toggleFormulario = () => {
    setMostrarFormulario(prev => !prev)
  }

  return (
    <div className="space-y-4">
      <Button
        variant="default"
        onClick={toggleFormulario}
        className="flex items-center gap-2"
      >
        <Plus size={18} />
        {mostrarFormulario ? 'Ocultar Formulario' : 'Nuevo Equipo'}
        {mostrarFormulario ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </Button>

      {mostrarFormulario && (
        <div className="bg-white rounded-lg shadow-md p-6 border mt-4">
          <CatalogoEquipoForm onCreated={(nuevo) => {
            onCreated?.(nuevo)
            setMostrarFormulario(false)
          }} />
        </div>
      )}
    </div>
  )
}
