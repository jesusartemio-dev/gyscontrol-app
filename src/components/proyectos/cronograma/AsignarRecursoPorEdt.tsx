'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Wrench, Loader2, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EdtResumen {
  id: string
  nombre: string
  orden: number
  totalTareas: number
  tareasConRecurso: number
  recursoActualId: string | null
  recursoActualNombre: string | null
  mixto: boolean
}

interface RecursoOption {
  id: string
  nombre: string
  tipo: string
  costoHoraProyecto: number | null
  costoHora: number
}

interface AsignarRecursoPorEdtProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cronogramaId: string
  onSuccess: () => void
}

export function AsignarRecursoPorEdt({
  open,
  onOpenChange,
  cronogramaId,
  onSuccess,
}: AsignarRecursoPorEdtProps) {
  const [edts, setEdts] = useState<EdtResumen[]>([])
  const [recursos, setRecursos] = useState<RecursoOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null) // edtId currently saving
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (!cronogramaId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/proyectos/cronograma/asignar-recurso?cronogramaId=${cronogramaId}`)
      if (!res.ok) throw new Error('Error al cargar datos')
      const data = await res.json()
      setEdts(data.edts || [])
      setRecursos(data.recursos || [])
    } catch (error) {
      console.error('Error cargando EDTs:', error)
      toast({ title: 'Error', description: 'No se pudieron cargar las EDTs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [cronogramaId, toast])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  const handleAsignar = async (edtId: string, recursoId: string) => {
    const finalRecursoId = recursoId === '__none__' ? null : recursoId
    const edt = edts.find(e => e.id === edtId)

    try {
      setSaving(edtId)
      const res = await fetch('/api/proyectos/cronograma/asignar-recurso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edtId, recursoId: finalRecursoId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al asignar recurso')
      }

      const data = await res.json()

      toast({
        title: data.message,
        description: `${data.tareasActualizadas} tarea(s) actualizadas`,
      })

      // Actualizar estado local
      setEdts(prev =>
        prev.map(e => {
          if (e.id !== edtId) return e
          const recurso = recursos.find(r => r.id === finalRecursoId)
          return {
            ...e,
            tareasConRecurso: finalRecursoId ? e.totalTareas : 0,
            recursoActualId: finalRecursoId,
            recursoActualNombre: recurso?.nombre || null,
            mixto: false,
          }
        })
      )
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo asignar el recurso',
        variant: 'destructive',
      })
    } finally {
      setSaving(null)
    }
  }

  const handleClose = () => {
    onSuccess()
    onOpenChange(false)
  }

  const totalTareas = edts.reduce((s, e) => s + e.totalTareas, 0)
  const totalConRecurso = edts.reduce((s, e) => s + e.tareasConRecurso, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Asignar Recursos por EDT
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Selecciona un recurso para cada EDT. Se asignará automáticamente a todas sus tareas.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : edts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No hay EDTs en este cronograma.
          </div>
        ) : (
          <>
            {/* Resumen global */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pb-2 border-b">
              <span>{edts.length} EDTs</span>
              <span>•</span>
              <span>{totalTareas} tareas totales</span>
              <span>•</span>
              <span className={totalConRecurso === totalTareas ? 'text-emerald-600 font-medium' : ''}>
                {totalConRecurso}/{totalTareas} con recurso
              </span>
              {totalConRecurso === totalTareas && totalTareas > 0 && (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>

            {/* Tabla de EDTs */}
            <div className="overflow-y-auto flex-1 -mx-2 px-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 font-medium">EDT</th>
                    <th className="text-center py-2 font-medium w-20">Tareas</th>
                    <th className="text-left py-2 font-medium w-56">Recurso</th>
                  </tr>
                </thead>
                <tbody>
                  {edts.map(edt => (
                    <tr key={edt.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-3">
                        <span className="font-medium text-sm">{edt.nombre}</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            edt.tareasConRecurso === edt.totalTareas && edt.totalTareas > 0
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : edt.tareasConRecurso > 0
                              ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                              : ''
                          }`}
                        >
                          {edt.tareasConRecurso}/{edt.totalTareas}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={edt.recursoActualId || '__none__'}
                            onValueChange={(val) => handleAsignar(edt.id, val)}
                            disabled={saving !== null || edt.totalTareas === 0}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Sin recurso" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-muted-foreground">— Sin recurso —</span>
                              </SelectItem>
                              {recursos.map(r => (
                                <SelectItem key={r.id} value={r.id} className="text-xs">
                                  {r.nombre} {r.tipo === 'cuadrilla' ? '(Cuadrilla)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {saving === edt.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                          )}
                          {edt.mixto && saving !== edt.id && (
                            <Badge variant="outline" className="text-[9px] shrink-0 border-orange-300 text-orange-600">
                              mixto
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Los cambios se aplican inmediatamente al seleccionar.
              </p>
              <Button onClick={handleClose} size="sm">
                Cerrar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AsignarRecursoPorEdt
