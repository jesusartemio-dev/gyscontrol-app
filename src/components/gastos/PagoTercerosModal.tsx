'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Users, DollarSign, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  previsualizarPagoTerceros,
  crearPagoTerceros,
  type GrupoPagoTercero,
} from '@/lib/services/hojaDeGastos'

interface PagoTercerosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

interface GrupoEditable extends GrupoPagoTercero {
  incluido: boolean
  monto: number
}

// Primer y último día del mes calendario en curso, en formato YYYY-MM-DD —
// el rango más común para liquidar (quincena/mes).
function rangoMesActual() {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { desde: iso(inicio), hasta: iso(fin) }
}

export function PagoTercerosModal({ open, onOpenChange, onCreated }: PagoTercerosModalProps) {
  const router = useRouter()
  const [paso, setPaso] = useState<'periodo' | 'resumen'>('periodo')
  const [{ desde, hasta }, setRango] = useState(rangoMesActual())
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [grupos, setGrupos] = useState<GrupoEditable[]>([])
  const [creando, setCreando] = useState(false)

  const abrirPreview = async () => {
    if (!desde || !hasta) {
      toast.error('Selecciona el rango de fechas')
      return
    }
    if (desde > hasta) {
      toast.error('La fecha desde no puede ser posterior a la fecha hasta')
      return
    }
    try {
      setLoadingPreview(true)
      const { grupos: data } = await previsualizarPagoTerceros({ fechaDesde: desde, fechaHasta: hasta })
      if (data.length === 0) {
        toast.info('No hay horas de terceros aprobadas y sin liquidar en ese rango')
        return
      }
      setGrupos(data.map((g) => ({ ...g, incluido: true, monto: g.subtotal })))
      setPaso('resumen')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al calcular la liquidación')
    } finally {
      setLoadingPreview(false)
    }
  }

  const actualizarMonto = (key: string, monto: number) => {
    setGrupos((prev) => prev.map((g) => (`${g.usuarioId}::${g.proyectoId}` === key ? { ...g, monto } : g)))
  }

  const toggleIncluido = (key: string) => {
    setGrupos((prev) => prev.map((g) => (`${g.usuarioId}::${g.proyectoId}` === key ? { ...g, incluido: !g.incluido } : g)))
  }

  const submit = async () => {
    const seleccionadas = grupos.filter((g) => g.incluido)
    if (seleccionadas.length === 0) {
      toast.error('Selecciona al menos una línea')
      return
    }
    try {
      setCreando(true)
      const resultado = await crearPagoTerceros({
        fechaDesde: desde,
        fechaHasta: hasta,
        lineas: seleccionadas.map((g) => ({ usuarioId: g.usuarioId, proyectoId: g.proyectoId, monto: g.monto })),
      })
      if (resultado.omitidas.length > 0) {
        toast.warning(`${resultado.omitidas.length} línea(s) ya se habían liquidado en otra hoja y se omitieron`)
      }
      toast.success(`Liquidación ${resultado.hoja.numero} creada y enviada`)
      onOpenChange(false)
      onCreated()
      router.push(`/gastos/mis-requerimientos/${resultado.hoja.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la liquidación')
    } finally {
      setCreando(false)
    }
  }

  const resetAlCerrar = (v: boolean) => {
    if (creando) return
    onOpenChange(v)
    if (!v) {
      setPaso('periodo')
      setGrupos([])
    }
  }

  const totalGeneral = grupos.filter((g) => g.incluido).reduce((sum, g) => sum + (Number(g.monto) || 0), 0)
  const personasSinTarifa = grupos.filter((g) => g.sinTarifa).length

  return (
    <Dialog open={open} onOpenChange={resetAlCerrar}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-teal-600" />
            Pago a terceros
          </DialogTitle>
          <DialogDescription>
            {paso === 'periodo'
              ? 'Elige el periodo a liquidar. Se juntan las horas aprobadas de personal tercero, agrupadas por persona y proyecto.'
              : 'Revisa los montos, desmarca lo que no corresponda pagar ahora, y ajusta si hace falta antes de enviar.'}
          </DialogDescription>
        </DialogHeader>

        {paso === 'periodo' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} disabled={loadingPreview} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input type="date" value={hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} disabled={loadingPreview} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Solo se incluyen horas ya aprobadas y que no formen parte de una liquidación anterior.
            </p>
          </div>
        )}

        {paso === 'resumen' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            {personasSinTarifa > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {personasSinTarifa} persona{personasSinTarifa !== 1 && 's'} sin tarifa/día cargada en /admin/personal — su monto sale en 0, cárgalo a mano o edítalo ahí primero.
              </div>
            )}
            <div className="space-y-2">
              {grupos.map((g) => {
                const key = `${g.usuarioId}::${g.proyectoId}`
                return (
                  <div
                    key={key}
                    className={`border rounded-md p-3 flex items-start gap-3 ${g.incluido ? '' : 'opacity-50'}`}
                  >
                    <Checkbox checked={g.incluido} onCheckedChange={() => toggleIncluido(key)} disabled={creando} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{g.nombre}</span>
                        <Badge variant="outline" className="text-[10px]">{g.proyectoCodigo}</Badge>
                        {g.sinTarifa && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            sin tarifa
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {g.horas}h · {g.dias}d × {g.tarifaDia ?? 0} {g.monedaTarifa}
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={g.monto}
                      onChange={(e) => actualizarMonto(key, Number(e.target.value))}
                      disabled={creando || !g.incluido}
                      className="w-28 shrink-0"
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
              <span className="flex items-center gap-1.5 text-muted-foreground font-normal">
                <Users className="h-3.5 w-3.5" />
                {grupos.filter((g) => g.incluido).length} de {grupos.length} líneas
              </span>
              <span>Total S/ {totalGeneral.toFixed(2)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 pt-2">
          {paso === 'resumen' && (
            <Button variant="outline" onClick={() => setPaso('periodo')} disabled={creando}>
              Atrás
            </Button>
          )}
          <Button variant="outline" onClick={() => resetAlCerrar(false)} disabled={creando || loadingPreview}>
            Cancelar
          </Button>
          {paso === 'periodo' ? (
            <Button onClick={abrirPreview} disabled={loadingPreview} className="bg-teal-600 hover:bg-teal-700">
              {loadingPreview && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Calcular
            </Button>
          ) : (
            <Button onClick={submit} disabled={creando} className="bg-teal-600 hover:bg-teal-700">
              {creando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Crear y enviar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
