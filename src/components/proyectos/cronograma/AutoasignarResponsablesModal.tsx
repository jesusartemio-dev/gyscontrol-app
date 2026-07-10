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

interface PropuestaResponsableEdt {
  proyectoEdtId: string
  edtCodigo: string
  edtNombre: string
  matrizFilaId: string | null
  matrizInformacion: string | null
  responsable: { userId: string; nombre: string; siglas: string; codigoOrigen: 'R' | 'E' } | null
  totalTareas: number
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
  const [sinMatriz, setSinMatriz] = useState(false)
  const [propuestas, setPropuestas] = useState<PropuestaResponsableEdt[]>([])

  useEffect(() => {
    if (!open) return
    setCargando(true)
    setSinMatriz(false)
    setPropuestas([])
    fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/autoasignar-responsables?cronogramaId=${cronogramaId}`)
      .then(async res => {
        if (!res.ok) throw new Error('No se pudo calcular la propuesta de responsables')
        return res.json()
      })
      .then((data: { sinMatriz: boolean; propuestas?: PropuestaResponsableEdt[] }) => {
        setSinMatriz(data.sinMatriz)
        setPropuestas(data.propuestas ?? [])
      })
      .catch(() => {
        toast({ title: 'Error calculando la propuesta de responsables', variant: 'destructive' })
        onOpenChange(false)
      })
      .finally(() => setCargando(false))
  }, [open, proyectoId, cronogramaId, onOpenChange, toast])

  const totalAsignables = propuestas.filter(p => p.responsable && p.totalTareas > 0).length

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
      toast({
        title: 'Responsables asignados',
        description: `${data.edtsAsignados} EDT(s), ${data.tareasActualizadas} tarea(s) actualizadas.`,
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
            Autoasignar responsables
          </DialogTitle>
          <DialogDescription>
            Se infiere desde la Matriz de Comunicaciones del proyecto (persona con código "Autoriza" por fila) — revisa antes de confirmar, nada se escribe todavía.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Calculando propuesta...
          </div>
        ) : sinMatriz ? (
          <Alert>
            <FileWarning className="h-4 w-4" />
            <AlertDescription>
              Este proyecto no tiene una Matriz de Comunicaciones — créala para poder autoasignar responsables.{' '}
              <Link href={`/proyectos/${proyectoId}/matriz-comunicacion`} className="underline font-medium">
                Ir a la Matriz de Comunicaciones
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
                  <TableHead>Responsable propuesto</TableHead>
                  <TableHead className="text-right">Tareas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propuestas.map(p => (
                  <TableRow key={p.proyectoEdtId}>
                    <TableCell>
                      <div className="font-medium text-sm">{p.edtNombre}</div>
                      <div className="text-xs text-muted-foreground">{p.edtCodigo}</div>
                    </TableCell>
                    <TableCell>
                      {p.responsable ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{p.responsable.nombre}</span>
                          <Badge variant={p.responsable.codigoOrigen === 'R' ? 'secondary' : 'outline'} className="text-[10px]">
                            {p.responsable.codigoOrigen === 'R' ? 'Autoriza' : 'Emisor'}
                          </Badge>
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
                    <TableCell className="text-right text-sm">{p.totalTareas}</TableCell>
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
          {!sinMatriz && propuestas.length > 0 && (
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
