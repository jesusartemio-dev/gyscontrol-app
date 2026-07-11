'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, UserCheck, AlertTriangle, FileWarning } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ROL_RESPONSABLE_LABELS, type RolResponsable } from '@/lib/cronogramaResponsables/reglasResponsable'

interface ResponsablePreviewDesglose {
  rol: RolResponsable
  responsableUserId: string | null
  responsableNombre: string | null
  tareasCount: number
}

interface ResponsablePreviewEdt {
  proyectoEdtId?: string
  edtNombre: string
  edtCodigo: string
  desglose: ResponsablePreviewDesglose[]
  advertencia: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  cronogramaId: string
  onSuccess: () => void
}

export function AutoasignarResponsablesModal({ open, onOpenChange, proyectoId, cronogramaId, onSuccess }: Props) {
  const { toast } = useToast()
  const [cargando, setCargando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [sinOrganigrama, setSinOrganigrama] = useState(false)
  const [propuestas, setPropuestas] = useState<ResponsablePreviewEdt[]>([])

  useEffect(() => {
    if (!open) return
    setCargando(true)
    setSinOrganigrama(false)
    setPropuestas([])
    fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/autoasignar-responsables?cronogramaId=${cronogramaId}`)
      .then(async res => {
        if (!res.ok) throw new Error('No se pudo calcular la propuesta de responsables')
        return res.json()
      })
      .then((data: { sinOrganigrama: boolean; propuestas?: ResponsablePreviewEdt[] }) => {
        setSinOrganigrama(data.sinOrganigrama)
        setPropuestas(data.propuestas ?? [])
      })
      .catch(() => {
        toast({ title: 'Error calculando la propuesta de responsables', variant: 'destructive' })
        onOpenChange(false)
      })
      .finally(() => setCargando(false))
  }, [open, proyectoId, cronogramaId, onOpenChange, toast])

  const totalAsignables = propuestas.filter(p => p.desglose.some(d => d.responsableUserId)).length

  async function confirmar() {
    setAplicando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/autoasignar-responsables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronogramaId, confirmar: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error asignando responsables')
      }
      const data = await res.json()
      const omitidasTexto = data.tareasOmitidasPorEdicionManual > 0 ? ` (${data.tareasOmitidasPorEdicionManual} editada(s) manualmente, sin tocar)` : ''
      toast({
        title: 'Responsables sincronizados',
        description: `${data.tareasActualizadas} tarea(s) actualizadas${omitidasTexto}.`,
      })
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setAplicando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Re-sincronizar responsables
          </DialogTitle>
          <DialogDescription>
            Se infiere desde el organigrama del proyecto (rol requerido por cada EDT) — revisa antes de confirmar, nada se escribe todavía. Las tareas editadas manualmente nunca se sobrescriben.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Calculando propuesta...
          </div>
        ) : sinOrganigrama ? (
          <Alert>
            <FileWarning className="h-4 w-4" />
            <AlertDescription>
              Este proyecto no tiene organigrama definido — créalo para poder autoasignar responsables.{' '}
              <Link href={`/proyectos/${proyectoId}/organigrama`} className="underline font-medium">
                Ir al organigrama
              </Link>
            </AlertDescription>
          </Alert>
        ) : propuestas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Este cronograma no tiene EDTs todavía.</p>
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EDT</TableHead>
                  <TableHead>Responsable(s) propuesto(s)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propuestas.map(p => (
                  <TableRow key={p.proyectoEdtId ?? p.edtCodigo}>
                    <TableCell>
                      <div className="font-medium text-sm">{p.edtNombre}</div>
                      <div className="text-xs text-muted-foreground">{p.edtCodigo}</div>
                    </TableCell>
                    <TableCell>
                      {p.desglose.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {p.desglose.map(d => (
                            <div key={d.rol} className="flex items-center gap-2">
                              <span className="text-sm">{d.responsableNombre ?? '—'}</span>
                              <Badge variant={d.responsableUserId ? 'secondary' : 'destructive'} className="text-[10px]">
                                {ROL_RESPONSABLE_LABELS[d.rol]} · {d.tareasCount} tarea(s)
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                      {p.advertencia && (
                        <div className="flex items-start gap-1 mt-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{p.advertencia}</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Se van a actualizar {totalAsignables} de {propuestas.length} EDT(s) — los demás quedan sin cambios (ver advertencia por fila).
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={aplicando}>
            Cancelar
          </Button>
          {!sinOrganigrama && propuestas.length > 0 && (
            <Button size="sm" onClick={confirmar} disabled={aplicando || cargando || totalAsignables === 0}>
              {aplicando ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Asignando...</>
              ) : (
                'Confirmar y asignar'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
