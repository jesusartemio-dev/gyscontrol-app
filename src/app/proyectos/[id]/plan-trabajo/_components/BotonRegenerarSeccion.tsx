'use client'

import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
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

interface Props {
  seccion: SeccionRegenerable
  isRegenerando: boolean
  iaOcupada?: boolean
  onRegen: (seccion: SeccionRegenerable, instrucciones?: string) => Promise<void>
}

export function BotonRegenerarSeccion({ seccion, isRegenerando, iaOcupada, onRegen }: Props) {
  const [open, setOpen] = useState(false)
  const [instrucciones, setInstrucciones] = useState('')
  const [running, setRunning] = useState(false)
  const esEtapa1 = esSeccionEtapa1(seccion)

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
        title={esEtapa1 ? 'Recalcular esta sección (sin IA)' : 'Regenerar esta sección con IA'}
      >
        {isRegenerando
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <RefreshCw className="h-3.5 w-3.5" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{esEtapa1 ? 'Recalcular sección' : 'Regenerar sección'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {esEtapa1 ? (
                <>
                  Se recalculará <span className="font-medium text-foreground">&quot;{seccion}&quot;</span> directamente
                  desde la base de datos (organigrama/cronograma), sin IA. El resto del plan permanece intacto.
                </>
              ) : (
                <>
                  Se regenerará <span className="font-medium text-foreground">&quot;{seccion}&quot;</span> con IA.
                  El resto del plan permanece intacto.
                </>
              )}
            </p>
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
