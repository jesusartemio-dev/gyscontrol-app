'use client'

// "Texto / IA" del PETS: una parte (sección, etapa, paso o el procedimiento)
// como texto para copiar, mejorar en una IA y pegar de vuelta. Antes de
// guardar se ve cómo queda (vista previa) y los errores; Guardar cierra.

import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CopiarPegarTexto } from '@/components/portapapeles/CopiarPegarTexto'
import { INSTRUCCIONES_PETS, type Interpretado } from '@/lib/pets/textoPets'

export interface ParteTextoPets<T = unknown> {
  /** "Etapa B: Ejecución", "Paso 3 de la etapa A", "EPP requerido"… */
  titulo: string
  textoInicial: string
  interpretar: (texto: string) => Interpretado<T>
  vistaPrevia?: (valor: T) => ReactNode
  /** Guarda (sobre el contenido más reciente del servidor). */
  guardar: (valor: T) => Promise<void>
}

interface Props {
  parte: ParteTextoPets | null
  onClose: () => void
}

export function EditarPetsTextoDialog({ parte, onClose }: Props) {
  const [texto, setTexto] = useState('')
  const [conInstrucciones, setConInstrucciones] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [abiertoCon, setAbiertoCon] = useState<string | null>(null)
  if (parte && abiertoCon !== parte.textoInicial) {
    setAbiertoCon(parte.textoInicial)
    setTexto(parte.textoInicial)
  }
  if (!parte && abiertoCon !== null) setAbiertoCon(null)

  const resultado = useMemo(() => (parte ? parte.interpretar(texto) : null), [parte, texto])
  const sinCambios = !!parte && texto.trim() === parte.textoInicial.trim()
  const puedeGuardar = !!resultado?.valor && !resultado.errores.length && !sinCambios && !guardando

  const guardar = async () => {
    if (!parte || !resultado?.valor) return
    setGuardando(true)
    try {
      await parte.guardar(resultado.valor)
      toast.success(`${parte.titulo}: guardado`)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={!!parte} onOpenChange={(o) => { if (!o && !guardando) onClose() }}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-3 overflow-y-auto p-3 sm:p-5">
        <DialogHeader className="space-y-1 text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-700">PETS · {parte?.titulo}</p>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <Sparkles className="h-4 w-4 text-indigo-500" /> Editar con texto / IA
          </DialogTitle>
          <DialogDescription className="text-xs">
            Copiá, pegalo en Claude o ChatGPT, pedile los cambios y pegá acá su respuesta. Abajo ves cómo queda antes de guardar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={conInstrucciones} onCheckedChange={(v) => setConInstrucciones(v === true)} />
            Copiar con instrucciones para la IA
          </label>
          <CopiarPegarTexto
            conEtiqueta
            texto={conInstrucciones ? `${INSTRUCCIONES_PETS}\n\n${texto}` : texto}
            onPegar={setTexto}
          />
        </div>

        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck={false}
          className="h-[34dvh] min-h-[180px] resize-y font-mono text-[12px] leading-relaxed"
        />

        <div className="space-y-2 rounded-md border bg-muted/30 p-2 text-xs">
          {resultado?.errores.length ? (
            <ul className="space-y-0.5 rounded border border-red-200 bg-red-50 p-2 text-red-700">
              {resultado.errores.slice(0, 12).map((e, i) => (
                <li key={i} className="flex gap-1"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{e}</li>
              ))}
            </ul>
          ) : sinCambios ? (
            <p className="text-muted-foreground">Sin cambios todavía: pegá la respuesta de la IA.</p>
          ) : resultado?.valor ? (
            <>
              <p className="font-medium text-blue-700">Se guardará: {resultado.resumen}</p>
              {parte?.vistaPrevia && (
                <details open className="rounded border bg-white">
                  <summary className="cursor-pointer px-2 py-1.5 font-medium text-gray-600">Vista previa</summary>
                  <div className="max-h-[40dvh] overflow-y-auto border-t p-2">{parte.vistaPrevia(resultado.valor)}</div>
                </details>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button size="sm" onClick={guardar} disabled={!puedeGuardar}>
            {guardando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
