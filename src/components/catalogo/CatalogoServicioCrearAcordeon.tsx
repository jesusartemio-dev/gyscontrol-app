'use client'

// ===================================================
// 📁 Archivo: CatalogoServicioCrearAcordeon.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Acordeón para desplegar/ocultar el formulario de nuevo servicio
// 👩‍💻 Uso: Usado dentro de la página de Catálogo de Servicios
// 📝 Autor: Jesús Artemio (Master Experto)
// 🗓️ Última actualización: 2025-04-27
// ===================================================

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import CatalogoServicioForm from './CatalogoServicioForm'
import type { CatalogoServicio } from '@/types'

interface Props {
  onCreated?: (nuevo: CatalogoServicio) => void
}

export default function CatalogoServicioCrearAcordeon({ onCreated }: Props) {
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
        {mostrarFormulario ? 'Ocultar Formulario' : 'Nuevo Servicio'}
        {mostrarFormulario ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </Button>

      {mostrarFormulario && (
        <div className="bg-white rounded-lg shadow-md p-6 border mt-4">
          <CatalogoServicioForm onCreated={(nuevo) => {
            onCreated?.(nuevo)
            setMostrarFormulario(false)
          }} />
        </div>
      )}
    </div>
  )
}
