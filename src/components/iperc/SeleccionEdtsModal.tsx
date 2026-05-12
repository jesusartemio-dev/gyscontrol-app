'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface EdtDisponible {
  id: string
  nombre: string
  orden: number
  totalTareas: number
  recomendado: boolean
}

interface FaseConEdts {
  fase: { id: string; nombre: string; orden: number; esEjecucion: boolean }
  edts: EdtDisponible[]
}

interface Props {
  open: boolean
  proyectoId: string
  onClose: () => void
  onConfirmar: (edtIds: string[]) => void
  generando: boolean
}

export function SeleccionEdtsModal({ open, proyectoId, onClose, onConfirmar, generando }: Props) {
  const [fases, setFases] = useState<FaseConEdts[]>([])
  const [loading, setLoading] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc/edts-disponibles`)
      if (!res.ok) throw new Error('Error al cargar EDTs')
      const { data } = await res.json()
      const faseData = data as FaseConEdts[]
      setFases(faseData)
      const preSeleccionados = new Set<string>()
      for (const { edts } of faseData) {
        for (const edt of edts) {
          if (edt.recomendado) preSeleccionados.add(edt.id)
        }
      }
      setSeleccionados(preSeleccionados)
    } catch {
      toast.error('No se pudieron cargar los EDTs disponibles')
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => {
    if (open) cargar()
  }, [open, cargar])

  const toggleEdt = (edtId: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(edtId)) next.delete(edtId)
      else next.add(edtId)
      return next
    })
  }

  const edtsConTareas = fases.flatMap(f => f.edts).filter(e => seleccionados.has(e.id))
  const totalTareas = edtsConTareas.reduce((acc, e) => acc + e.totalTareas, 0)
  const totalEdts = seleccionados.size

  const defaultOpen = fases.filter(f => f.fase.esEjecucion).map(f => f.fase.id)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !generando) onClose() }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle>Seleccionar EDTs para generar IPERC</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : fases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay EDTs disponibles en el cronograma</p>
          ) : (
            <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
              {fases.map(({ fase, edts }) => (
                <AccordionItem key={fase.id} value={fase.id}>
                  <AccordionTrigger className="text-sm font-medium hover:no-underline py-2.5">
                    <span className="flex items-center gap-2">
                      {fase.nombre}
                      {fase.esEjecucion && (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-normal">alto riesgo</Badge>
                      )}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({edts.length} {edts.length === 1 ? 'EDT' : 'EDTs'})
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-1 pl-1">
                      {edts.map(edt => (
                        <label
                          key={edt.id}
                          className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${
                            edt.totalTareas === 0
                              ? 'opacity-40 cursor-not-allowed'
                              : 'cursor-pointer hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={seleccionados.has(edt.id)}
                            onCheckedChange={() => edt.totalTareas > 0 && toggleEdt(edt.id)}
                            disabled={edt.totalTareas === 0}
                          />
                          <span className="flex-1 text-sm">{edt.nombre}</span>
                          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {edt.totalTareas} {edt.totalTareas === 1 ? 'tarea' : 'tareas'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 items-center border-t pt-4 mt-4">
          <p className="text-xs text-muted-foreground flex-1">
            {totalEdts > 0
              ? `${totalTareas} ${totalTareas === 1 ? 'tarea' : 'tareas'} en ${totalEdts} ${totalEdts === 1 ? 'EDT' : 'EDTs'}`
              : 'Seleccioná al menos un EDT'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={generando}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => onConfirmar(Array.from(seleccionados))}
              disabled={seleccionados.size === 0 || generando || loading}
            >
              {generando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generar IPERC con IA
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
