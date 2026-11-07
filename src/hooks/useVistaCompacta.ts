'use client'

import { useCallback, useEffect, useState } from 'react'

export type Vista = 'compacta' | 'completa'

/**
 * Vista de una tabla: 'compacta' (para campo: lo esencial, sin costos ni
 * acciones) o 'completa'. Se recuerda por navegador con `clave`; la primera
 * vez, en celular arranca compacta y en PC completa.
 */
export function useVistaCompacta(clave: string): [Vista, (v: Vista) => void] {
  const [vista, setVistaState] = useState<Vista>('completa')
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(clave)
      if (guardada === 'compacta' || guardada === 'completa') setVistaState(guardada)
      else if (window.matchMedia('(max-width: 767px)').matches) setVistaState('compacta')
    } catch {
      // Sin almacenamiento: se queda en la vista por defecto.
    }
  }, [clave])
  const setVista = useCallback((v: Vista) => {
    setVistaState(v)
    try { localStorage.setItem(clave, v) } catch { /* sin almacenamiento */ }
  }, [clave])
  return [vista, setVista]
}

/**
 * Clases para que la cabecera de una tabla quede fija al bajar: el contenedor
 * scrollea por dentro (alto limitado a la pantalla; dvh descuenta la barra del
 * navegador en el celular) y cada <th> es sticky.
 */
export const CONTENEDOR_TABLA_SCROLL = 'overflow-auto max-h-[75vh] supports-[height:100dvh]:max-h-[75dvh] overscroll-contain'
export const CABECERA_FIJA = '[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 [&_th]:shadow-[inset_0_-1px_0_#e5e7eb]'
