'use client'

import React, { useMemo, useState } from 'react'
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
import { Loader2, Users, DollarSign, AlertTriangle, ShieldAlert, QrCode, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
  previsualizarPagoTerceros,
  crearPagoTerceros,
  type LineaPagoTercero,
  type EstadoAsistenciaDia,
} from '@/lib/services/hojaDeGastos'

interface PagoTercerosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

interface LineaEditable extends LineaPagoTercero {
  incluido: boolean
  monto: number
}

const claveLinea = (l: Pick<LineaPagoTercero, 'usuarioId' | 'proyectoId' | 'fecha'>) =>
  `${l.usuarioId}::${l.proyectoId}::${l.fecha}`

// Cómo se ve cada estado de asistencia frente a las horas de tarea: el marcaje
// (QR) es una fuente independiente de la persona que carga horas de tarea, y
// pueden no coincidir — esto es para que la persona que liquida lo vea y decida,
// no para bloquear nada automáticamente.
const ASISTENCIA_INFO: Record<EstadoAsistenciaDia, { label: string; className: string; icon: typeof QrCode }> = {
  completo: { label: 'con marcaje', className: 'text-emerald-700 border-emerald-300 bg-emerald-50', icon: QrCode },
  sin_ingreso: { label: 'sin ingreso marcado', className: 'text-amber-700 border-amber-300 bg-amber-50', icon: AlertTriangle },
  sin_salida: { label: 'jornada sin cerrar', className: 'text-amber-700 border-amber-300 bg-amber-50', icon: AlertTriangle },
  sin_marcaje: { label: 'sin ningún marcaje', className: 'text-red-700 border-red-300 bg-red-50', icon: ShieldAlert },
  sin_sesion: { label: 'sin sesión de asistencia', className: 'text-slate-600 border-slate-300 bg-slate-50', icon: ShieldAlert },
}

function formatFechaCorta(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })
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
  const [lineas, setLineas] = useState<LineaEditable[]>([])
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
      const { lineas: data } = await previsualizarPagoTerceros({ fechaDesde: desde, fechaHasta: hasta })
      if (data.length === 0) {
        toast.info('No hay horas de terceros aprobadas y sin liquidar en ese rango')
        return
      }
      setLineas(data.map((l) => ({ ...l, incluido: true, monto: l.subtotal })))
      setPaso('resumen')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al calcular la liquidación')
    } finally {
      setLoadingPreview(false)
    }
  }

  const actualizarMonto = (key: string, monto: number) => {
    setLineas((prev) => prev.map((l) => (claveLinea(l) === key ? { ...l, monto } : l)))
  }

  const toggleIncluido = (key: string) => {
    setLineas((prev) => prev.map((l) => (claveLinea(l) === key ? { ...l, incluido: !l.incluido } : l)))
  }

  const submit = async () => {
    const seleccionadas = lineas.filter((l) => l.incluido)
    if (seleccionadas.length === 0) {
      toast.error('Selecciona al menos una línea')
      return
    }
    try {
      setCreando(true)
      const resultado = await crearPagoTerceros({
        fechaDesde: desde,
        fechaHasta: hasta,
        lineas: seleccionadas.map((l) => ({ usuarioId: l.usuarioId, proyectoId: l.proyectoId, fecha: l.fecha, monto: l.monto })),
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
      setLineas([])
    }
  }

  const totalGeneral = lineas.filter((l) => l.incluido).reduce((sum, l) => sum + (Number(l.monto) || 0), 0)
  const personasSinTarifa = new Set(lineas.filter((l) => l.sinTarifa).map((l) => l.usuarioId)).size
  const diasConProblema = lineas.filter((l) => l.estadoAsistencia !== 'completo').length

  // Subtotal por trabajador (suma todos sus días marcados, sin importar en
  // cuántos proyectos — si alguien trabajó en 2, se cuenta igual una vez).
  // Se recalcula solo, refleja lo marcado/desmarcado y los montos editados.
  const subtotalesPorUsuario = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of lineas) {
      if (!l.incluido) continue
      map.set(l.usuarioId, (map.get(l.usuarioId) ?? 0) + (Number(l.monto) || 0))
    }
    return map
  }, [lineas])

  // Cabeceras por persona+proyecto, para no repetir nombre y código en cada
  // fila de día — las líneas ya vienen ordenadas por nombre/fecha del backend.
  // `esUltimoDeUsuario` marca dónde pintar el subtotal: al cierre del bloque
  // de esa persona (después de su último proyecto/día), no de cada proyecto.
  const conCabeceras = useMemo(() => {
    let anteriorGrupo = ''
    return lineas.map((l, i) => {
      const grupoKey = `${l.usuarioId}::${l.proyectoId}`
      const esNuevoGrupo = grupoKey !== anteriorGrupo
      anteriorGrupo = grupoKey
      const siguiente = lineas[i + 1]
      const esUltimoDeUsuario = !siguiente || siguiente.usuarioId !== l.usuarioId
      return { linea: l, esNuevoGrupo, esUltimoDeUsuario }
    })
  }, [lineas])

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
              ? 'Elige el periodo a liquidar. Se junta un día por línea, con las horas de tarea y el marcaje de asistencia de esa jornada.'
              : 'Cada línea es un día. Revisa el marcaje, desmarca lo que no corresponda pagar ahora, y ajusta el monto si hace falta.'}
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
            {diasConProblema > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                {diasConProblema} día{diasConProblema !== 1 && 's'} con horas de tarea pero sin marcaje completo — revisa si corresponde pagarlo antes de confirmar.
              </div>
            )}
            <div className="space-y-2">
              {conCabeceras.map(({ linea: l, esNuevoGrupo, esUltimoDeUsuario }) => {
                const key = claveLinea(l)
                const info = ASISTENCIA_INFO[l.estadoAsistencia]
                const Icono = info.icon
                return (
                  <div key={key}>
                    {esNuevoGrupo && (
                      <div className="text-xs font-medium text-muted-foreground mt-3 mb-1 flex items-center gap-1.5">
                        {l.nombre}
                        <Badge variant="outline" className="text-[10px]">{l.proyectoCodigo}</Badge>
                      </div>
                    )}
                    <div className={`border rounded-md p-2.5 flex items-start gap-3 ${l.incluido ? '' : 'opacity-50'}`}>
                      <Checkbox checked={l.incluido} onCheckedChange={() => toggleIncluido(key)} disabled={creando} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium capitalize">{formatFechaCorta(l.fecha)}</span>
                          {l.sinTarifa && (
                            <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                              sin tarifa
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] gap-1 ${info.className}`}>
                            <Icono className="h-3 w-3" />
                            {info.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>{l.horas}h tarea · {l.dias}d × {l.tarifaDia ?? 0} {l.monedaTarifa}</span>
                          {(l.horaIngreso || l.horaSalida) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {l.horaIngreso ?? '—'} a {l.horaSalida ?? '—'}
                              {l.horasMarcadas != null && ` (${l.horasMarcadas}h marcadas)`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.monto}
                        onChange={(e) => actualizarMonto(key, Number(e.target.value))}
                        disabled={creando || !l.incluido}
                        className="w-28 shrink-0"
                      />
                    </div>
                    {esUltimoDeUsuario && (
                      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground pt-1 pr-1">
                        Subtotal {l.nombre}:
                        <span className="font-semibold text-foreground">
                          S/ {(subtotalesPorUsuario.get(l.usuarioId) ?? 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
              <span className="flex items-center gap-1.5 text-muted-foreground font-normal">
                <Users className="h-3.5 w-3.5" />
                {lineas.filter((l) => l.incluido).length} de {lineas.length} días
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
