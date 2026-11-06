'use client'

// ===================================================
// 📁 DescripcionExpandible
// 📌 Descripción recortada a N líneas que se abre completa al hacer clic.
//
// Las descripciones del catálogo pasan de 200 caracteres (un andamio con
// armado incluido, un manlift con operador y equivalentes) y en dos líneas se
// cortaban justo donde está lo que distingue un ítem de otro. El tooltip
// nativo del navegador no alcanzaba: es lento y no se puede copiar.
// ===================================================

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  texto?: string | null
  /** Líneas visibles mientras está contraída. */
  lineas?: 1 | 2 | 3
  /**
   * A partir de cuántos caracteres se ofrece abrir. Por debajo se pinta como
   * texto normal, sin chevron: la mayoría de descripciones caben enteras y no
   * tiene sentido llenar la tabla de flechas que no hacen nada.
   */
  umbral?: number
  /** Clases del texto (tamaño, color). */
  className?: string
  /** Qué mostrar cuando no hay texto. */
  vacio?: string
}

export default function DescripcionExpandible({
  texto,
  lineas = 2,
  umbral = 95,
  className = '',
  vacio = '—',
}: Props) {
  const [abierta, setAbierta] = useState(false)

  const contenido = (texto ?? '').trim()
  if (!contenido) return <span className={className}>{vacio}</span>
  if (contenido.length <= umbral) return <div className={className}>{contenido}</div>

  // Clases completas, no interpoladas: Tailwind las necesita literales.
  const recorte = lineas === 1 ? 'line-clamp-1' : lineas === 3 ? 'line-clamp-3' : 'line-clamp-2'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setAbierta(v => !v)
      }}
      title={abierta ? 'Clic para contraer' : 'Clic para ver la descripción completa'}
      className="flex w-full items-start gap-1 text-left hover:opacity-80"
    >
      <span className={`flex-1 ${abierta ? '' : recorte} ${className}`}>{contenido}</span>
      <ChevronDown
        className={`h-3 w-3 shrink-0 text-gray-400 mt-px transition-transform ${abierta ? 'rotate-180' : ''}`}
      />
    </button>
  )
}
