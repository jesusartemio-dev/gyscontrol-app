'use client'

// Confirmación de "Recalcular datos", "Redactar con IA" y "Generar todo".
// Antes de ejecutar dice, sección por sección, qué se genera, qué se
// reemplaza y qué se RESPETA. Las secciones editadas a mano vienen
// desmarcadas: se respetan salvo que el usuario elija reescribirlas.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Hand, Sparkles, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SECCIONES_ETAPA_1, SECCIONES_ETAPA_2 } from '@/lib/planTrabajo/etapas'
import { NOMBRE_SECCION, contarTextosEditadosAlcance, type SeccionesEditadas } from '@/lib/planTrabajo/edicionesManuales'
import type { SeccionRegenerable } from '@/types/planTrabajo'

export type ModoRegeneracion = 'datos' | 'ia' | 'todo'

interface Props {
  modo: ModoRegeneracion | null
  onClose: () => void
  bloques: Record<string, boolean>
  ediciones: SeccionesEditadas
  alcanceDetallado: unknown
  tieneV2Vigente: boolean
  onConfirmar: (omitir: { datos: string[]; ia: string[] }) => void
}

const fmtFecha = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TITULO: Record<ModoRegeneracion, string> = {
  datos: 'Recalcular datos',
  ia: 'Redactar con IA',
  todo: 'Generar todo (datos + IA)',
}

export function ConfirmarRegeneracionDialog({ modo, onClose, bloques, ediciones, alcanceDetallado, tieneV2Vigente, onConfirmar }: Props) {
  // Secciones editadas a mano que el usuario decide REESCRIBIR (por defecto ninguna: se respetan).
  const [reescribir, setReescribir] = useState<Set<string>>(new Set())
  useEffect(() => { if (modo) setReescribir(new Set()) }, [modo])

  const textosEditadosAlcance = useMemo(() => contarTextosEditadosAlcance(alcanceDetallado), [alcanceDetallado])
  if (!modo) return null

  const secciones: SeccionRegenerable[] = [
    ...(modo !== 'ia' ? SECCIONES_ETAPA_1 : []),
    ...(modo !== 'datos' ? SECCIONES_ETAPA_2 : []),
  ]

  const filas = secciones.map((s) => {
    const tiene = bloques[s] === true
    const edicion = tiene ? ediciones[s] : undefined
    const respetada = !!edicion && !reescribir.has(s)
    return { s, tiene, edicion, respetada }
  })
  const respetadas = filas.filter((f) => f.respetada).map((f) => f.s as string)
  const seReescriben = filas.filter((f) => !f.respetada).length
  const conIA = modo !== 'datos'

  const confirmar = () => {
    onConfirmar({
      datos: respetadas.filter((s) => (SECCIONES_ETAPA_1 as readonly string[]).includes(s)),
      ia: respetadas.filter((s) => (SECCIONES_ETAPA_2 as readonly string[]).includes(s)),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {conIA ? <Sparkles size={18} className="text-indigo-600" /> : <Calculator size={18} className="text-emerald-600" />}
            {TITULO[modo]}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {modo === 'datos' && 'Recalcula estas secciones desde el organigrama y el cronograma, sin IA. Toma unos segundos.'}
            {modo === 'ia' && 'Redacta estas secciones con IA (Sonnet). Toma unos minutos y se puede cancelar mientras avanza.'}
            {modo === 'todo' && 'Primero recalcula los datos (sin IA, segundos) y luego redacta con IA (unos minutos, se puede cancelar).'}
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[50dvh] divide-y overflow-auto rounded-md border text-sm">
          {filas.map(({ s, tiene, edicion, respetada }) => (
            <li key={s} className="flex items-start gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800">{NOMBRE_SECCION[s]}</p>
                {!tiene ? (
                  <p className="text-xs text-muted-foreground">Vacía: se genera.</p>
                ) : s === 'alcanceDetallado' ? (
                  <p className="text-xs text-amber-700">
                    Se reescribe.{' '}
                    {textosEditadosAlcance > 0
                      ? <><strong>Se respetan {textosEditadosAlcance} texto(s) editado(s) a mano</strong>, las tareas excluidas y su orden.</>
                      : 'Se conservan las tareas excluidas y su orden.'}
                  </p>
                ) : edicion ? (
                  <p className={`flex items-center gap-1 text-xs ${respetada ? 'text-emerald-700' : 'text-red-700'}`}>
                    <Hand size={12} className="shrink-0" />
                    Editada a mano el {fmtFecha(edicion.fecha)} por {edicion.por}:{' '}
                    <strong>{respetada ? 'se respeta' : 'se reemplaza lo editado'}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-amber-700">Se reemplaza el contenido actual.</p>
                )}
              </div>
              {tiene && edicion && (
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 pt-0.5 text-xs text-muted-foreground">
                  <Checkbox
                    checked={reescribir.has(s)}
                    onCheckedChange={(v) => setReescribir((r) => {
                      const n = new Set(r)
                      if (v === true) n.add(s)
                      else n.delete(s)
                      return n
                    })}
                  />
                  Reescribir
                </label>
              )}
            </li>
          ))}
        </ul>

        {tieneV2Vigente && (
          <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            Hay una versión revisada (V2) vigente: esto solo cambia la vista estructurada, no la V2.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Se escriben <strong>{seReescriben}</strong> sección(es)
          {respetadas.length > 0 && <> · se respetan <strong>{respetadas.length}</strong> editada(s) a mano</>}.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={confirmar}
            disabled={seReescriben === 0}
            className={conIA ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
          >
            {modo === 'datos' ? 'Recalcular' : modo === 'ia' ? 'Redactar con IA' : 'Generar todo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
