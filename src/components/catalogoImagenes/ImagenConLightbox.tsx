'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Minus, Plus, Maximize2, Scan } from 'lucide-react'

interface Props {
  src: string
  alt: string
  /** Alto del thumbnail — ancho siempre automático, la imagen nunca se recorta (bug de imágenes deformadas). */
  alturaClase?: string
  className?: string
}

const ESCALA_MIN = 1
const ESCALA_MAX = 10
const PASO_BOTON = 1.4

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * Thumbnail que SIEMPRE respeta el aspect ratio original (`object-contain`,
 * nunca `cover` ni alto+ancho fijos) — antes una foto vertical (ej. una
 * escalera) salía recortada y "decapitada" porque el contenedor forzaba
 * ambos ejes.
 *
 * Al hacer clic abre la imagen a pantalla casi completa, con zoom. Antes el
 * modal estaba topado en 768 px de ancho, así que en un monitor normal
 * desperdiciaba dos tercios de la pantalla y un diagrama con texto chico
 * (una topología de red, un unifilar) quedaba ilegible.
 *
 * El zoom va con la rueda del mouse apuntando donde está el cursor, con los
 * botones, con doble clic y con las teclas + − 0. Estando ampliada se arrastra
 * para desplazarse. En celular funciona el pellizco de dos dedos.
 */
export function ImagenConLightbox({ src, alt, alturaClase = 'h-40', className = '' }: Props) {
  const [abierta, setAbierta] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className={`w-full ${alturaClase} bg-gray-100 rounded overflow-hidden flex items-center justify-center cursor-zoom-in ${className}`}
      >
        <img src={src} alt={alt} className="w-full h-full object-contain" />
      </button>

      {abierta && (
        <Dialog open onOpenChange={setAbierta}>
          <DialogContent
            // El botón de cerrar del Dialog queda sobre la imagen (sin padding
            // que lo separe), así que necesita su propio fondo para leerse
            // tanto sobre un diagrama blanco como sobre una foto oscura.
            className="max-w-[96vw] sm:max-w-[96vw] w-[96vw] h-[94vh] p-0 gap-0 bg-black/95 border-0 rounded-md overflow-hidden
              [&>button:last-child]:z-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-black/60
              [&>button:last-child]:p-1.5 [&>button:last-child]:text-white [&>button:last-child]:opacity-100
              [&>button:last-child]:hover:bg-black/80"
            // Sin esto, el primer Tab enfoca el botón de cerrar y la rueda del
            // mouse llega al scroll de la página en vez de al visor.
            onOpenAutoFocus={e => e.preventDefault()}
          >
            <DialogTitle className="sr-only">{alt || 'Imagen ampliada'}</DialogTitle>
            <VisorConZoom src={src} alt={alt} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function VisorConZoom({ src, alt }: { src: string; alt: string }) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [escala, setEscala] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [arrastrando, setArrastrando] = useState(false)
  const [pellizcando, setPellizcando] = useState(false)
  /** Cuánto ocupa la imagen ajustada al contenedor, para saber qué es el 100% real. */
  const [escalaAjuste, setEscalaAjuste] = useState(1)

  const arrastreRef = useRef({ x: 0, y: 0, origenX: 0, origenY: 0 })
  const pellizcoRef = useRef<{ distancia: number; escala: number } | null>(null)

  const ajustar = useCallback(() => {
    setEscala(1)
    setPos({ x: 0, y: 0 })
  }, [])

  /** Mide cuánto encoge `object-contain` a la imagen: 1 = cabe a tamaño real. */
  const medir = useCallback(() => {
    const cont = contenedorRef.current
    const img = imgRef.current
    if (!cont || !img?.naturalWidth) return
    setEscalaAjuste(Math.min(cont.clientWidth / img.naturalWidth, cont.clientHeight / img.naturalHeight, 1))
  }, [])

  useEffect(() => {
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [medir])

  /**
   * Cambia la escala dejando quieto el punto que está bajo el cursor. Sin esto
   * el zoom tira siempre hacia el centro y para leer una esquina del diagrama
   * hay que ampliar y después buscar a ciegas.
   */
  const zoomHacia = useCallback((nuevaEscala: number, clienteX?: number, clienteY?: number) => {
    const cont = contenedorRef.current
    if (!cont) return
    const destino = limitar(nuevaEscala, ESCALA_MIN, ESCALA_MAX)

    setEscala(anterior => {
      if (destino === anterior) return anterior
      if (destino === ESCALA_MIN) {
        setPos({ x: 0, y: 0 })
        return destino
      }
      const r = cont.getBoundingClientRect()
      // Punto de anclaje respecto al centro del contenedor.
      const anclaX = (clienteX ?? r.left + r.width / 2) - r.left - r.width / 2
      const anclaY = (clienteY ?? r.top + r.height / 2) - r.top - r.height / 2
      setPos(p => ({
        x: anclaX - ((anclaX - p.x) / anterior) * destino,
        y: anclaY - ((anclaY - p.y) / anterior) * destino,
      }))
      return destino
    })
  }, [])

  // La rueda tiene que ir con listener no pasivo para poder cancelar el scroll
  // de la página; React la registra como pasiva y preventDefault no haría nada.
  useEffect(() => {
    const cont = contenedorRef.current
    if (!cont) return
    const alGirar = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * 0.0015)
      setEscala(actual => {
        const destino = limitar(actual * factor, ESCALA_MIN, ESCALA_MAX)
        if (destino === actual) return actual
        if (destino === ESCALA_MIN) {
          setPos({ x: 0, y: 0 })
          return destino
        }
        const r = cont.getBoundingClientRect()
        const anclaX = e.clientX - r.left - r.width / 2
        const anclaY = e.clientY - r.top - r.height / 2
        setPos(p => ({
          x: anclaX - ((anclaX - p.x) / actual) * destino,
          y: anclaY - ((anclaY - p.y) / actual) * destino,
        }))
        return destino
      })
    }
    cont.addEventListener('wheel', alGirar, { passive: false })
    return () => cont.removeEventListener('wheel', alGirar)
  }, [])

  // Teclado: + y − para el zoom, 0 para volver a ajustar.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomHacia(escala * PASO_BOTON) }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomHacia(escala / PASO_BOTON) }
      else if (e.key === '0') { e.preventDefault(); ajustar() }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [escala, zoomHacia, ajustar])

  const iniciarArrastre = (e: React.MouseEvent) => {
    if (escala <= ESCALA_MIN) return
    e.preventDefault()
    setArrastrando(true)
    arrastreRef.current = { x: e.clientX, y: e.clientY, origenX: pos.x, origenY: pos.y }
  }

  useEffect(() => {
    if (!arrastrando) return
    const alMover = (e: MouseEvent) => {
      const a = arrastreRef.current
      setPos({ x: a.origenX + (e.clientX - a.x), y: a.origenY + (e.clientY - a.y) })
    }
    const alSoltar = () => setArrastrando(false)
    window.addEventListener('mousemove', alMover)
    window.addEventListener('mouseup', alSoltar)
    return () => {
      window.removeEventListener('mousemove', alMover)
      window.removeEventListener('mouseup', alSoltar)
    }
  }, [arrastrando])

  // Celular: un dedo desplaza, dos dedos pellizcan.
  const distanciaEntre = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

  const tocar = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pellizcoRef.current = { distancia: distanciaEntre(e.touches), escala }
      setPellizcando(true)
    } else if (e.touches.length === 1 && escala > ESCALA_MIN) {
      arrastreRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, origenX: pos.x, origenY: pos.y }
    }
  }

  const moverDedo = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pellizcoRef.current) {
      const p = pellizcoRef.current
      const centroX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const centroY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      zoomHacia(p.escala * (distanciaEntre(e.touches) / p.distancia), centroX, centroY)
    } else if (e.touches.length === 1 && escala > ESCALA_MIN) {
      const a = arrastreRef.current
      setPos({ x: a.origenX + (e.touches[0].clientX - a.x), y: a.origenY + (e.touches[0].clientY - a.y) })
    }
  }

  // El 100% real: cuánto hay que ampliar para que 1 píxel de la imagen sea
  // 1 píxel de pantalla. Si la imagen ya cabe entera, es lo mismo que ajustar.
  const escalaTamanoReal = escalaAjuste > 0 ? 1 / escalaAjuste : 1
  const puedeTamanoReal = escalaTamanoReal > 1.01
  const porcentaje = Math.round(escala * escalaAjuste * 100)

  return (
    <div className="relative w-full h-full flex flex-col">
      <div
        ref={contenedorRef}
        className="flex-1 min-h-0 overflow-hidden flex items-center justify-center select-none touch-none"
        style={{ cursor: escala > ESCALA_MIN ? (arrastrando ? 'grabbing' : 'grab') : 'zoom-in' }}
        onMouseDown={iniciarArrastre}
        onDoubleClick={e => zoomHacia(escala > ESCALA_MIN ? ESCALA_MIN : 2.5, e.clientX, e.clientY)}
        onTouchStart={tocar}
        onTouchMove={moverDedo}
        onTouchEnd={() => { pellizcoRef.current = null; setPellizcando(false) }}
        onTouchCancel={() => { pellizcoRef.current = null; setPellizcando(false) }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={medir}
          draggable={false}
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})`,
            transition: arrastrando || pellizcando ? 'none' : 'transform 120ms ease-out',
          }}
        />
      </div>

      <div className="flex items-center justify-center gap-1 bg-black/80 px-3 py-2 text-white">
        <Boton onClick={() => zoomHacia(escala / PASO_BOTON)} titulo="Alejar (−)" desactivado={escala <= ESCALA_MIN}>
          <Minus className="h-4 w-4" />
        </Boton>
        <span className="w-16 text-center text-xs tabular-nums text-white/70">{porcentaje}%</span>
        <Boton onClick={() => zoomHacia(escala * PASO_BOTON)} titulo="Acercar (+)" desactivado={escala >= ESCALA_MAX}>
          <Plus className="h-4 w-4" />
        </Boton>

        <span className="mx-2 h-5 w-px bg-white/20" />

        <Boton onClick={ajustar} titulo="Ajustar a la pantalla (0)" desactivado={escala === ESCALA_MIN}>
          <Maximize2 className="h-4 w-4" />
        </Boton>
        {puedeTamanoReal && (
          <Boton onClick={() => zoomHacia(escalaTamanoReal)} titulo="Tamaño real (100%)">
            <Scan className="h-4 w-4" />
          </Boton>
        )}

        <span className="ml-3 hidden text-[11px] text-white/40 sm:inline">
          rueda para ampliar · arrastra para moverte · doble clic alterna
        </span>
      </div>
    </div>
  )
}

function Boton({
  onClick, titulo, desactivado, children,
}: {
  onClick: () => void
  titulo: string
  desactivado?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      disabled={desactivado}
      className="rounded p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}
