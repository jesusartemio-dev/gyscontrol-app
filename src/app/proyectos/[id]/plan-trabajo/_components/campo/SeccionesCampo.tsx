'use client'

// Secciones del Plan de Trabajo en Modo Campo (celular/tablet). Regla: en la
// vista solo se COPIA lo que no se edita (tablas calculadas); lo editable
// tiene un botón "Editar" y Copiar/Pegar viven DENTRO del diálogo, donde se
// ve qué ítem es y el antes/después antes de guardar (pegar suelto en la
// vista guardaba al instante y era fácil pegar en el ítem equivocado).
// Lo guardado queda como "editado a mano": una regeneración lo avisa y lo respeta.

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Pencil, Loader2, Hand } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ResultadoTexto } from '@/lib/planTrabajo/textoSecciones'
import { CopiarPegarTexto, copiarTexto } from '../CopiarPegarTexto'
import { BotonCopiarParaIA } from '../CopiarParaIA'

export { copiarTexto }

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
 * Editor de texto para campo: muestra dónde estás, arranca con el texto
 * actual, se copia / se pega encima, muestra el antes y cómo se va a leer, y
 * guarda y cierra (para ver en la vista que quedó bien).
 */
export function EditarTextoDialog({
  open, onOpenChange, titulo, ubicacion, ayuda, textoInicial, interpretar, onGuardar, onCopiado, unaLinea,
  textoParaIA, arriba,
}: {
  /** "Copiar para IA": arma el texto con contexto a partir de lo que se está escribiendo. */
  textoParaIA?: (textoActual: string) => string
  /** Bloque bajo el título (p. ej. "Del cronograma"). */
  arriba?: React.ReactNode
  open: boolean
  onOpenChange: (o: boolean) => void
  titulo: string
  /** Dónde está el ítem: "11.5 Tramo 3 › Armado de andamios › Tarea 2 de 6". */
  ubicacion?: string
  ayuda?: string
  textoInicial: string
  interpretar: (texto: string) => ResultadoTexto<unknown>
  onGuardar: (valor: unknown) => Promise<void>
  onCopiado?: () => void
  /** Viñeta de tarea: al pegar queda en una línea. */
  unaLinea?: boolean
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
        <DialogHeader className="space-y-1 text-left">
          {ubicacion && (
            <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-700">{ubicacion}</p>
          )}
          <DialogTitle className="text-base">Editar: {titulo}</DialogTitle>
          {ayuda && <DialogDescription className="text-xs">{ayuda}</DialogDescription>}
        </DialogHeader>
        {arriba}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">Copiá, mejoralo donde quieras y pegalo acá.</span>
          <span className="inline-flex items-center gap-1">
          {textoParaIA && <BotonCopiarParaIA obtenerTexto={() => textoParaIA(texto)} />}
          <CopiarPegarTexto
            conEtiqueta
            texto={texto}
            unaLinea={unaLinea}
            onCopiado={onCopiado}
            onPegar={setTexto}
          />
          </span>
        </div>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="h-[38dvh] resize-none text-[13px] leading-relaxed"
        />
        {!sinCambios && (
          <details className="rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
            <summary className="cursor-pointer select-none font-medium text-muted-foreground">Antes (texto guardado)</summary>
            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-gray-600">{textoInicial || '(vacío)'}</p>
          </details>
        )}
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
          {/* Editable: Copiar/Pegar dentro de "Editar". Solo lectura: copiar acá. */}
          {interpretar && onGuardar ? (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => setEditando(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          ) : (
            <BotonCopiar texto={texto} compacto />
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
          ubicacion="Sección del plan"
          ayuda={ayudaEdicion}
          textoInicial={texto}
          interpretar={interpretar}
          onGuardar={onGuardar}
        />
      )}
    </div>
  )
}
