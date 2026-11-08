'use client'

import { useState } from 'react'
import { RefreshCw, Loader2, Hand, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { SeccionRegenerable } from '@/types/planTrabajo'
import { esSeccionEtapa1 } from '@/lib/planTrabajo/etapas'
import { NOMBRE_SECCION, type EdicionManual } from '@/lib/planTrabajo/edicionesManuales'

interface Props {
  seccion: SeccionRegenerable
  isRegenerando: boolean
  iaOcupada?: boolean
  onRegen: (seccion: SeccionRegenerable, instrucciones?: string) => Promise<void>
  /** Hay contenido que se va a reemplazar. */
  tieneContenido?: boolean
  /** Editada a mano desde la última generación (se reemplaza al regenerar). */
  edicion?: EdicionManual
  /** Solo Alcance Detallado: textos editados a mano, que se respetan. */
  textosEditadosAlcance?: number
}

const fmtFecha = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function BotonRegenerarSeccion({ seccion, isRegenerando, iaOcupada, onRegen, tieneContenido, edicion, textosEditadosAlcance = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [instrucciones, setInstrucciones] = useState('')
  const [running, setRunning] = useState(false)
  const esEtapa1 = esSeccionEtapa1(seccion)
  const nombre = NOMBRE_SECCION[seccion]

  const handleConfirm = async () => {
    setRunning(true)
    setOpen(false)
    try {
      await onRegen(seccion, esEtapa1 ? undefined : instrucciones.trim() || undefined)
    } finally {
      setRunning(false)
      setInstrucciones('')
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-muted-foreground hover:text-indigo-600"
        disabled={isRegenerando || running || iaOcupada}
        onClick={() => setOpen(true)}
        title={esEtapa1 ? `Recalcular ${nombre} (sin IA)` : `Regenerar ${nombre} con IA`}
      >
        {isRegenerando
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <RefreshCw className="h-3.5 w-3.5" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{esEtapa1 ? 'Recalcular' : 'Regenerar con IA'}: {nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {esEtapa1
                ? <>Se recalcula desde la base de datos (organigrama y cronograma), sin IA. El resto del plan no cambia.</>
                : <>Se vuelve a redactar con IA. El resto del plan no cambia.</>}
            </p>

            {/* Qué pasa con lo actual: se reemplaza, o se respeta lo editado */}
            {seccion === 'alcanceDetallado' ? (
              <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                <p>
                  <strong>Se reprocesan TODOS los EDTs</strong> (Construcción, Comisionamiento, etc.). Si solo necesitás uno,
                  usá &quot;Regenerar&quot; de ese EDT dentro del editor de Alcance Detallado.
                </p>
                <p className="flex items-start gap-1 text-emerald-800">
                  <Hand size={12} className="mt-0.5 shrink-0" />
                  {textosEditadosAlcance > 0
                    ? <span><strong>Se respetan {textosEditadosAlcance} texto(s) editado(s) a mano</strong>, las tareas excluidas y su orden. Para reescribir un texto editado, liberalo antes desde el editor.</span>
                    : <span>Se conservan las tareas excluidas y su orden.</span>}
                </p>
              </div>
            ) : edicion ? (
              <p className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-800">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Editaste esta sección a mano</strong> el {fmtFecha(edicion.fecha)} ({edicion.por}).
                  Al {esEtapa1 ? 'recalcular' : 'regenerar'} <strong>se reemplaza lo editado</strong>.
                  {!esEtapa1 && ' Si querés conservar algo, indicalo en las instrucciones.'}
                </span>
              </p>
            ) : tieneContenido ? (
              <p className="text-xs text-amber-700">Se reemplaza el contenido actual de esta sección.</p>
            ) : null}

            {!esEtapa1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Instrucciones adicionales (opcional)</Label>
                <Textarea
                  value={instrucciones}
                  onChange={e => setInstrucciones(e.target.value)}
                  placeholder="Ej: Agregar restricciones específicas para trabajo en caliente..."
                  className="text-sm resize-none"
                  rows={3}
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right">{instrucciones.length}/2000</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {esEtapa1 ? 'Recalcular' : 'Regenerar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
