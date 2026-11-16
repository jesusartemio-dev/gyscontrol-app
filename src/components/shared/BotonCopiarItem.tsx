'use client'

// ===================================================
// 📁 BotonCopiarItem
// 📌 Copia un ítem al portapapeles para pegarlo en otro lado.
//
// La descripción de un equipo no entra en la celda: se corta y el resto vive
// en el tooltip, que desaparece apenas se mueve el mouse —así que tampoco
// sirve sacarle una captura—. Con esto el texto completo sale de la tabla sin
// tener que abrir el ítem ni exportar la lista entera.
// ===================================================

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ItemCopiable {
  codigo: string
  descripcion: string
  marca?: string | null
  unidad?: string | null
  cantidad?: number | null
  categoria?: string | null
}

/** Lo que de verdad identifica al equipo; lo vacío no ocupa una línea. */
export function textoDeItem(item: ItemCopiable): string {
  const marca = item.marca && item.marca !== 'SIN-MARCA' ? item.marca : null
  const categoria = item.categoria && item.categoria !== 'SIN-CATEGORIA' ? item.categoria : null

  const detalle = [
    marca && `Marca: ${marca}`,
    item.cantidad != null && `Cantidad: ${item.cantidad}${item.unidad ? ` ${item.unidad}` : ''}`,
    categoria && `Categoría: ${categoria}`,
  ].filter(Boolean).join(' · ')

  return [item.codigo, item.descripcion, detalle].filter(Boolean).join('\n')
}

/**
 * Copia texto al portapapeles.
 *
 * `navigator.clipboard` no existe fuera de HTTPS ni en navegadores viejos, y
 * ahí el botón quedaría sin hacer nada; el textarea oculto es el camino que
 * siempre funciona.
 */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // Sigue por el camino de abajo.
  }

  try {
    const area = document.createElement('textarea')
    area.value = texto
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

interface Props {
  item: ItemCopiable
  className?: string
  /** Texto al lado del icono. Sin esto va solo el icono. */
  etiqueta?: string
}

export default function BotonCopiarItem({ item, className, etiqueta }: Props) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async (e: React.MouseEvent) => {
    // La fila suele abrir el detalle al hacer clic.
    e.stopPropagation()
    e.preventDefault()
    const ok = await copiarAlPortapapeles(textoDeItem(item))
    if (!ok) return
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title={copiado ? 'Copiado' : 'Copiar código, descripción y marca'}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[10px] transition-colors',
        copiado
          ? 'text-emerald-600'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700',
        className,
      )}
    >
      {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {etiqueta && <span>{copiado ? 'Copiado' : etiqueta}</span>}
    </button>
  )
}
