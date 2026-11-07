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

/*
 * Cabecera fija al bajar. Dos casos:
 *
 * - Tablas ANCHAS (vista completa): necesitan scroll lateral, y un contenedor
 *   con overflow-x ya es de scroll, así que la cabecera solo puede pegarse a su
 *   propio scroll. El contenedor ocupa casi toda la pantalla (no ¾) y sin
 *   overscroll-contain: al llegar al final de la tabla la página sigue bajando.
 *
 * - Tablas COMPACTAS (entran sin scroll lateral): sin scroll interno; bajan con
 *   la página y la cabecera se pega arriba del <main>. En celular, debajo de la
 *   barra fija (MobileNav, h-14). El recuadro usa overflow-clip, no
 *   overflow-hidden: hidden crearía un contenedor de scroll y rompería el sticky.
 */
export const CONTENEDOR_TABLA_SCROLL = 'overflow-auto max-h-[calc(100dvh-5rem)] md:max-h-[calc(100dvh-2rem)]'
export const CABECERA_FIJA = '[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 [&_th]:shadow-[inset_0_-1px_0_#e5e7eb]'
export const CABECERA_FIJA_PAGINA = '[&_th]:sticky [&_th]:top-14 md:[&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 [&_th]:shadow-[inset_0_-1px_0_#e5e7eb]'
