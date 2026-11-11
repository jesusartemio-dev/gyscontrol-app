'use client'

// Copiar / Pegar de los textos del plan (descripción de EDT, de actividad,
// viñeta de tarea). Flujo: copiar el texto → mejorarlo en una IA → pegarlo de
// vuelta. Siempre dentro de una edición (editor de oficina o el diálogo
// "Editar" de Modo Campo): pegar nunca guarda solo, se ve antes de guardar.

import { useState } from 'react'
import { Check, ClipboardPaste, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** Copia al portapapeles; si el navegador no deja (contexto viejo), usa un textarea temporal. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = texto
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

/** Lee texto del portapapeles; null si el navegador no deja (avisa cómo pegar a mano). */
export async function leerTextoPortapapeles(): Promise<string | null> {
  try {
    const t = await navigator.clipboard.readText()
    if (!t.trim()) {
      toast.info('El portapapeles está vacío')
      return null
    }
    return t
  } catch {
    toast.info('Tu navegador no deja leer el portapapeles: tocá el cuadro, mantené presionado y elegí "Pegar".')
    return null
  }
}

/**
 * Lee las imágenes copiadas (de una IA, WhatsApp, una captura…) como archivos
 * listos para subir. Lo que no sea JPG/PNG (p. ej. webp) se pasa a PNG, que es
 * lo que se exporta bien al Word. null si no hay imagen o el navegador no deja
 * (ya avisó al usuario).
 */
export async function leerImagenesPortapapeles(): Promise<File[] | null> {
  if (!navigator.clipboard?.read) {
    toast.info('Este navegador no deja pegar imágenes: usá "Subir".')
    return null
  }
  let items: ClipboardItems
  try {
    items = await navigator.clipboard.read()
  } catch {
    toast.info('No se pudo leer el portapapeles: permití el acceso o usá "Subir".')
    return null
  }
  const archivos: File[] = []
  try {
    for (const it of items) {
      const tipo = it.types.find(t => t.startsWith('image/'))
      if (!tipo) continue
      let blob = await it.getType(tipo)
      let tipoFinal = tipo
      if (tipo !== 'image/png' && tipo !== 'image/jpeg') {
        const bmp = await createImageBitmap(blob)
        const canvas = document.createElement('canvas')
        canvas.width = bmp.width
        canvas.height = bmp.height
        canvas.getContext('2d')!.drawImage(bmp, 0, 0)
        blob = await new Promise<Blob>((ok, mal) => canvas.toBlob(b => (b ? ok(b) : mal(new Error('conversión'))), 'image/png'))
        tipoFinal = 'image/png'
      }
      archivos.push(new File([blob], `pegada-${Date.now()}-${archivos.length + 1}.${tipoFinal === 'image/png' ? 'png' : 'jpg'}`, { type: tipoFinal }))
    }
  } catch {
    toast.error('No se pudo leer la imagen copiada')
    return null
  }
  if (archivos.length === 0) {
    toast.info('No hay ninguna imagen copiada (mantené presionada la imagen y elegí "Copiar imagen").')
    return null
  }
  return archivos
}

/** Limpia lo que suele traer una respuesta de IA: comillas envolventes, viñeta inicial, espacios. */
export function limpiarTextoPegado(t: string, unaLinea: boolean, parrafo = false): string {
  let s = t.replace(/\r\n/g, '\n').trim()
  // Si se copió la respuesta entera de la IA (texto entre marcas, o bloque
  // ``` + nota), queda solo el texto. Las marcas pueden venir con ** o \[.
  const marcado = s.match(/\[INICIO DEL TEXTO\\?\][*_]*\s*([\s\S]*?)\s*[*_\\]*\[FIN DEL TEXTO/i)
  const bloque = s.match(/```[^\n]*\n([\s\S]*?)```/)
  if (marcado) s = marcado[1].replace(/^[*_]+|[*_\\]+$/g, '').trim()
  else if (bloque) s = bloque[1].trim()
  else s = s.replace(/^```[^\n]*\n?|```$/g, '').trim()
  s = s.replace(/^["“”«]+|["“”»]+$/g, '').trim()
  // Párrafo: la IA corta las líneas para que se lean en el chat; se unen de
  // nuevo (un salto suelto = espacio; una línea en blanco separa párrafos).
  if (parrafo && !unaLinea) {
    s = s.split(/\n[ \t]*\n/).map(p => p.split('\n').map(l => l.trim()).filter(Boolean).join(' ')).filter(Boolean).join('\n\n')
  }
  if (unaLinea) s = s.replace(/^\s*(?:[-•*·]|\d+[.)])\s+/, '').replace(/\s+/g, ' ').trim()
  return s
}

/**
 * Ctrl+V / "Pegar" del celular directo en el cuadro: aplica la misma limpieza
 * que el botón Pegar (toma solo el texto entre marcas, une las líneas cortadas
 * del párrafo) y lo inserta donde está el cursor.
 */
export function pegarEnCuadro(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  onCambio: (valor: string) => void,
  unaLinea = false,
) {
  const crudo = e.clipboardData.getData('text/plain')
  if (!crudo) return
  const limpio = limpiarTextoPegado(crudo, unaLinea, !unaLinea)
  if (limpio === crudo.trim()) return // nada que corregir: pegado normal
  e.preventDefault()
  const ta = e.currentTarget
  onCambio(ta.value.slice(0, ta.selectionStart) + limpio + ta.value.slice(ta.selectionEnd))
}

export function CopiarPegarTexto({
  texto,
  onPegar,
  onCopiado,
  unaLinea = false,
  parrafo = false,
  conEtiqueta = false,
  className = '',
}: {
  texto: string
  /** Recibe el texto pegado (ya limpio). Sin él, solo se muestra Copiar. */
  onPegar?: (texto: string) => void
  /** Avisa que se copió (para marcar en la vista qué ítem se copió). */
  onCopiado?: () => void
  /** Viñetas de tarea: se pega en una sola línea, sin "- " inicial. */
  unaLinea?: boolean
  /** Descripción en párrafo: al pegar se unen las líneas cortadas (la IA las corta para que se lean). */
  parrafo?: boolean
  /** Siempre con texto ("Copiar"/"Pegar"); si no, en celular solo íconos. */
  conEtiqueta?: boolean
  className?: string
}) {
  const [copiado, setCopiado] = useState(false)
  const etiqueta = conEtiqueta ? '' : 'hidden sm:inline'

  const copiar = async () => {
    if (!texto.trim()) { toast.info('No hay texto para copiar'); return }
    if (await copiarTexto(texto)) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
      onCopiado?.()
      toast.success('Copiado')
    } else {
      toast.error('No se pudo copiar en este navegador')
    }
  }
  const pegar = async () => {
    const t = await leerTextoPortapapeles()
    if (t == null || !onPegar) return
    const limpio = limpiarTextoPegado(t, unaLinea, parrafo)
    if (!limpio) return
    onPegar(limpio)
    toast.success('Pegado — revisá y guardá')
  }

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`h-7 gap-1 px-2 text-[11px] ${copiado ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : ''}`}
        title="Copiar este texto"
        aria-label="Copiar"
        onClick={copiar}
      >
        {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span className={etiqueta}>{copiado ? 'Copiado' : 'Copiar'}</span>
      </Button>
      {onPegar && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          title="Reemplazar con lo que tengas copiado"
          aria-label="Pegar"
          onClick={pegar}
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          <span className={etiqueta}>Pegar</span>
        </Button>
      )}
    </span>
  )
}
