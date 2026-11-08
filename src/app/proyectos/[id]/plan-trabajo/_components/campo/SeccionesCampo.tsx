'use client'

// Secciones del Plan de Trabajo en Modo Campo (celular/tablet): cada una se
// puede COPIAR al portapapeles (para corregirla en WhatsApp, Notas…) y las de
// texto se pueden EDITAR pegando el texto corregido. Lo guardado queda como
// "editado a mano", así una regeneración posterior lo avisa y lo respeta.

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Pencil, ClipboardPaste, Loader2, Hand } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ResultadoTexto } from '@/lib/planTrabajo/textoSecciones'

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

export function BotonCopiar({ texto, etiqueta = 'Copiar', compacto }: { texto: string; etiqueta?: string; compacto?: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={compacto ? 'h-8 w-8 p-0' : 'h-8 px-2.5 text-xs'}
      disabled={!texto}
      title="Copiar al portapapeles"
      onClick={async (e) => {
        e.stopPropagation()
        const ok = await copiarTexto(texto)
        if (ok) toast.success('Copiado. Pegalo donde quieras corregirlo.')
        else toast.error('No se pudo copiar en este navegador')
      }}
    >
      <Copy className="h-3.5 w-3.5" />
      {!compacto && <span className="ml-1">{etiqueta}</span>}
    </Button>
  )
}

/**
 * Editor de texto para campo: arranca con el texto actual, se puede pegar
 * encima (manteniendo presionado el cuadro, o con "Pegar"), muestra cómo se
 * va a leer y guarda.
 */
export function EditarTextoDialog({
  open, onOpenChange, titulo, ayuda, textoInicial, interpretar, onGuardar,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  titulo: string
  ayuda?: string
  textoInicial: string
  interpretar: (texto: string) => ResultadoTexto<unknown>
  onGuardar: (valor: unknown) => Promise<void>
}) {
  const [texto, setTexto] = useState(textoInicial)
  const [guardando, setGuardando] = useState(false)
  const [abiertoCon, setAbiertoCon] = useState<string | null>(null)
  // Al abrir, arranca con el texto actual.
  if (open && abiertoCon !== textoInicial) {
    setAbiertoCon(textoInicial)
    setTexto(textoInicial)
  }
  if (!open && abiertoCon !== null) setAbiertoCon(null)

  const resultado = useMemo(() => interpretar(texto), [interpretar, texto])
  const sinCambios = texto.trim() === textoInicial.trim()

  const pegar = async () => {
    try {
      const t = await navigator.clipboard.readText()
      if (!t) { toast.info('El portapapeles está vacío'); return }
      setTexto(t)
      toast.success('Texto pegado: revisá la vista previa y guardá')
    } catch {
      toast.info('Tu navegador no deja leer el portapapeles: mantené presionado el cuadro y elegí "Pegar".')
    }
  }

  const guardar = async () => {
    if (!resultado.valor) return
    setGuardando(true)
    try {
      await onGuardar(resultado.valor)
      toast.success(`${titulo} guardado`)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!guardando) onOpenChange(o) }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-xl p-4">
        <DialogHeader>
          <DialogTitle className="text-base">Editar: {titulo}</DialogTitle>
          {ayuda && <DialogDescription className="text-xs">{ayuda}</DialogDescription>}
        </DialogHeader>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={pegar}>
            <ClipboardPaste className="mr-1 h-3.5 w-3.5" />
            Pegar del portapapeles
          </Button>
        </div>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="h-[45dvh] resize-none font-mono text-[13px] leading-relaxed"
          autoFocus
        />
        <p className={`text-xs ${resultado.error ? 'text-red-600' : 'text-muted-foreground'}`}>
          {resultado.error ?? `Se guardará: ${resultado.resumen}${sinCambios ? ' (sin cambios)' : ''}`}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-amber-700">
          <Hand className="h-3 w-3 shrink-0" />
          Quedará como editado a mano: si después se regenera con IA, se avisará y se podrá respetar.
        </p>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={guardando}>Cancelar</Button>
          <Button size="sm" onClick={guardar} disabled={guardando || !resultado.valor || sinCambios}>
            {guardando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Tarjeta plegable de una sección: ver, copiar y (si es de texto) editar. */
export function SeccionCampoCard({
  titulo, texto, editada, ayudaEdicion, interpretar, onGuardar,
}: {
  titulo: string
  texto: string
  editada?: boolean
  ayudaEdicion?: string
  /** Si viene, la sección se puede editar pegando texto. */
  interpretar?: (texto: string) => ResultadoTexto<unknown>
  onGuardar?: (valor: unknown) => Promise<void>
}) {
  const [abierta, setAbierta] = useState(false)
  const [editando, setEditando] = useState(false)
  const vacia = !texto.trim()

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={() => setAbierta((a) => !a)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {abierta ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="truncate text-sm font-semibold text-gray-800">{titulo}</span>
          {editada && <Hand className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label="Editada a mano" />}
          {vacia && <span className="shrink-0 text-[11px] text-muted-foreground">(vacía)</span>}
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <BotonCopiar texto={texto} compacto />
          {interpretar && onGuardar && (
            <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" title="Editar (pegar texto corregido)" onClick={() => setEditando(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {abierta && (
        <div className="border-t px-3 py-2.5">
          {vacia
            ? <p className="text-xs italic text-muted-foreground">Esta sección todavía no tiene contenido.</p>
            : <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700">{texto}</p>}
        </div>
      )}
      {interpretar && onGuardar && (
        <EditarTextoDialog
          open={editando}
          onOpenChange={setEditando}
          titulo={titulo}
          ayuda={ayudaEdicion}
          textoInicial={texto}
          interpretar={interpretar}
          onGuardar={onGuardar}
        />
      )}
    </div>
  )
}
