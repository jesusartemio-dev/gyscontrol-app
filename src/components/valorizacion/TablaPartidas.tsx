'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Plus, Trash2, Loader2, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface Partida {
  id?: string
  numero: number
  descripcion: string
  origen: string
  proyectoEquipoCotizadoId?: string | null
  proyectoServicioCotizadoId?: string | null
  proyectoGastoCotizadoId?: string | null
  proyectoEdtId?: string | null
  montoContractual: number
  porcentajeAvance: number
  montoAvance: number
  porcentajeAcumuladoAnterior: number
  montoAcumuladoAnterior: number
  orden: number
}

interface TablaPartidasProps {
  valorizacionId: string
  proyectoId: string
  readOnly: boolean
  tieneCotizacion?: boolean
  onMontoChange: (monto: number) => void
}

const ORIGEN_BADGES: Record<string, { label: string; className: string }> = {
  equipo: { label: 'EQ', className: 'bg-blue-100 text-blue-700' },
  servicio: { label: 'SV', className: 'bg-green-100 text-green-700' },
  gasto: { label: 'GT', className: 'bg-orange-100 text-orange-700' },
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)

export default function TablaPartidas({ valorizacionId, proyectoId, readOnly, tieneCotizacion, onMontoChange }: TablaPartidasProps) {
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [cargandoCotizacion, setCargandoCotizacion] = useState(false)
  const [showConfirmCotizacion, setShowConfirmCotizacion] = useState(false)
  const newRowRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Avance desde cronograma de ejecución
  // key: ProyectoEdt.id → porcentajeAvance del cronograma
  const [avancesEdt, setAvancesEdt] = useState<Map<string, number>>(new Map())
  // Reverse map: catalog edtId → ProyectoEdt.id (para resolver al cargar cotización)
  const [edtCatalogMap, setEdtCatalogMap] = useState<Map<string, string>>(new Map())

  const apiBase = `/api/proyectos/${proyectoId}/valorizaciones/${valorizacionId}/partidas`

  const cargarPartidas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(apiBase)
      if (!res.ok) throw new Error('Error al cargar partidas')
      const data = await res.json()
      setPartidas(data.partidas || [])
      const total = (data.partidas || []).reduce((s: number, p: Partida) => s + p.montoAvance, 0)
      onMontoChange(Math.round(total * 100) / 100)
    } catch {
      toast.error('Error al cargar partidas')
    } finally {
      setLoading(false)
    }
  }, [apiBase, onMontoChange])

  // Cargar avance de EDTs del cronograma de ejecución
  const cargarAvancesEdt = useCallback(async () => {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/avance-edts`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.tieneEjecucion) return

      const avances = new Map<string, number>()
      const catalogMap = new Map<string, string>()
      for (const edt of data.edts) {
        avances.set(edt.id, edt.porcentajeAvance)
        catalogMap.set(edt.edtId, edt.id)
      }
      setAvancesEdt(avances)
      setEdtCatalogMap(catalogMap)
    } catch {
      // Silencioso — la sugerencia es opcional
    }
  }, [proyectoId])

  useEffect(() => {
    cargarPartidas()
    cargarAvancesEdt()
  }, [cargarPartidas, cargarAvancesEdt])

  const calcularTotal = (items: Partida[]) => {
    return Math.round(items.reduce((s, p) => s + p.montoAvance, 0) * 100) / 100
  }

  const guardarPartidas = useCallback(async (items: Partida[]) => {
    setGuardando(true)
    try {
      const payload = items.filter(p => p.descripcion.trim()).map((p, idx) => ({
        numero: idx + 1,
        descripcion: p.descripcion,
        origen: p.origen || 'libre',
        proyectoEquipoCotizadoId: p.proyectoEquipoCotizadoId || null,
        proyectoServicioCotizadoId: p.proyectoServicioCotizadoId || null,
        proyectoGastoCotizadoId: p.proyectoGastoCotizadoId || null,
        proyectoEdtId: p.proyectoEdtId || null,
        montoContractual: p.montoContractual,
        porcentajeAvance: p.porcentajeAvance,
        orden: idx + 1,
      }))

      if (payload.length === 0) {
        const res = await fetch(apiBase, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partidas: [] }),
        })
        if (!res.ok) throw new Error('Error al guardar')
        const data = await res.json()
        onMontoChange(data.montoValorizacion ?? 0)
        return
      }

      const res = await fetch(apiBase, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partidas: payload }),
      })
      if (!res.ok) throw new Error('Error al guardar partidas')
      const data = await res.json()
      setPartidas(data.partidas || [])
      onMontoChange(data.montoValorizacion ?? 0)
    } catch {
      toast.error('Error al guardar partidas')
      cargarPartidas()
    } finally {
      setGuardando(false)
    }
  }, [apiBase, onMontoChange, cargarPartidas])

  const debouncedSave = useCallback((items: Partida[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => guardarPartidas(items), 800)
  }, [guardarPartidas])

  const updatePartida = (index: number, field: keyof Partida, value: string | number) => {
    setPartidas(prev => {
      const updated = [...prev]
      const p = { ...updated[index] }

      if (field === 'descripcion') {
        p.descripcion = value as string
      } else if (field === 'montoContractual') {
        p.montoContractual = parseFloat(value as string) || 0
        p.montoAvance = Math.round(p.montoContractual * (p.porcentajeAvance / 100) * 100) / 100
      } else if (field === 'porcentajeAvance') {
        let pct = parseFloat(value as string) || 0
        if (pct > 100) pct = 100
        if (pct < 0) pct = 0
        p.porcentajeAvance = pct
        p.montoAvance = Math.round(p.montoContractual * (pct / 100) * 100) / 100
      }

      updated[index] = p
      const total = calcularTotal(updated)
      onMontoChange(total)
      return updated
    })
  }

  // Aplicar sugerencia de % desde cronograma
  const aplicarSugerencia = (index: number, incremento: number) => {
    setPartidas(prev => {
      const updated = [...prev]
      const p = { ...updated[index] }
      p.porcentajeAvance = Math.round(incremento * 100) / 100
      p.montoAvance = Math.round(p.montoContractual * (p.porcentajeAvance / 100) * 100) / 100
      updated[index] = p
      const total = calcularTotal(updated)
      onMontoChange(total)
      // Trigger save
      debouncedSave(updated.filter(pp => pp.descripcion.trim()))
      return updated
    })
  }

  const handleBlur = () => {
    if (readOnly) return
    const validItems = partidas.filter(p => p.descripcion.trim())
    if (validItems.length !== partidas.length) {
      setPartidas(validItems)
    }
    debouncedSave(validItems)
  }

  const agregarPartida = () => {
    const newPartida: Partida = {
      numero: partidas.length + 1,
      descripcion: '',
      origen: 'libre',
      montoContractual: 0,
      porcentajeAvance: 0,
      montoAvance: 0,
      porcentajeAcumuladoAnterior: 0,
      montoAcumuladoAnterior: 0,
      orden: partidas.length + 1,
    }
    setPartidas(prev => [...prev, newPartida])
    setTimeout(() => newRowRef.current?.focus(), 50)
  }

  const eliminarPartida = async (index: number) => {
    const partida = partidas[index]
    if (!window.confirm(`¿Eliminar partida "${partida.descripcion || 'sin descripción'}"?`)) return

    if (partida.id) {
      try {
        setGuardando(true)
        const res = await fetch(`${apiBase}/${partida.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Error al eliminar')
        const data = await res.json()
        onMontoChange(data.montoValorizacion ?? 0)
      } catch {
        toast.error('Error al eliminar partida')
        cargarPartidas()
        return
      } finally {
        setGuardando(false)
      }
    }

    setPartidas(prev => {
      const updated = prev.filter((_, i) => i !== index)
      const total = calcularTotal(updated)
      onMontoChange(total)
      return updated
    })
  }

  // Cargar items desde cotización
  const cargarDesdeCotizacion = async () => {
    setCargandoCotizacion(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/items-cotizados`)
      if (!res.ok) throw new Error('Error al cargar cotización')
      const data = await res.json()

      if (!data.tieneCotizacion) {
        toast.error('Este proyecto no tiene cotización vinculada')
        return
      }

      const nuevasPartidas: Partida[] = []
      let orden = 1

      // Equipos
      for (const eq of data.equipos) {
        nuevasPartidas.push({
          numero: orden,
          descripcion: eq.nombre,
          origen: 'equipo',
          proyectoEquipoCotizadoId: eq.id,
          montoContractual: eq.subtotalCliente,
          porcentajeAvance: 0,
          montoAvance: 0,
          porcentajeAcumuladoAnterior: 0,
          montoAcumuladoAnterior: 0,
          orden: orden,
        })
        orden++
      }

      // Servicios — resolver proyectoEdtId desde catalog edtId
      for (const sv of data.servicios) {
        const proyectoEdtId = sv.edtId ? (edtCatalogMap.get(sv.edtId) || null) : null
        nuevasPartidas.push({
          numero: orden,
          descripcion: sv.nombre,
          origen: 'servicio',
          proyectoServicioCotizadoId: sv.id,
          proyectoEdtId,
          montoContractual: sv.subtotalCliente,
          porcentajeAvance: 0,
          montoAvance: 0,
          porcentajeAcumuladoAnterior: 0,
          montoAcumuladoAnterior: 0,
          orden: orden,
        })
        orden++
      }

      // Gastos
      for (const gt of data.gastos) {
        nuevasPartidas.push({
          numero: orden,
          descripcion: gt.nombre,
          origen: 'gasto',
          proyectoGastoCotizadoId: gt.id,
          montoContractual: gt.subtotalCliente,
          porcentajeAvance: 0,
          montoAvance: 0,
          porcentajeAcumuladoAnterior: 0,
          montoAcumuladoAnterior: 0,
          orden: orden,
        })
        orden++
      }

      if (nuevasPartidas.length === 0) {
        toast.error('La cotización no tiene items')
        return
      }

      setPartidas(nuevasPartidas)
      const total = calcularTotal(nuevasPartidas)
      onMontoChange(total)
      await guardarPartidas(nuevasPartidas)
      toast.success(`${nuevasPartidas.length} partidas cargadas desde cotización`)
    } catch {
      toast.error('Error al cargar desde cotización')
    } finally {
      setCargandoCotizacion(false)
      setShowConfirmCotizacion(false)
    }
  }

  const handleCargarCotizacion = () => {
    if (partidas.length > 0) {
      setShowConfirmCotizacion(true)
    } else {
      cargarDesdeCotizacion()
    }
  }

  const total = calcularTotal(partidas)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Cargando partidas...
      </div>
    )
  }

  // Determine separator positions (when origin changes between groups)
  const getSeparatorLabel = (currentOrigen: string, prevOrigen: string | null): string | null => {
    if (currentOrigen === prevOrigen) return null
    if (currentOrigen === 'equipo') return 'EQUIPOS'
    if (currentOrigen === 'servicio') return 'SERVICIOS'
    if (currentOrigen === 'gasto') return 'GASTOS'
    return null
  }

  // Check if we have mixed origins (to show separators)
  const origenes = new Set(partidas.map(p => p.origen).filter(o => o !== 'libre'))
  const showSeparators = origenes.size > 1

  const colCount = readOnly ? 6 : 7

  return (
    <div className="space-y-3">
      {/* Header con título y acciones */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Partidas de Valorización</h3>
          {partidas.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {partidas.length} {partidas.length === 1 ? 'partida' : 'partidas'}
            </Badge>
          )}
          {guardando && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && tieneCotizacion && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCargarCotizacion}
              disabled={cargandoCotizacion}
            >
              {cargandoCotizacion ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5 mr-1" />
              )}
              Cargar desde cotización
            </Button>
          )}
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={agregarPartida}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar
            </Button>
          )}
        </div>
      </div>

      {partidas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
          <p className="text-sm font-medium">Sin partidas registradas</p>
          {!readOnly && (
            <p className="text-xs mt-1.5">
              {tieneCotizacion
                ? 'Carga desde cotización o agrega partidas manualmente'
                : 'Haz click en "Agregar" para comenzar'}
            </p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                  <TableHead className="min-w-[220px] text-xs">Descripción</TableHead>
                  <TableHead className="w-32 text-right text-xs">Contractual</TableHead>
                  <TableHead className="w-20 text-center text-xs">% Ant.</TableHead>
                  <TableHead className="w-40 text-right text-xs">% Esta Val.</TableHead>
                  <TableHead className="w-32 text-right text-xs">Monto Avance</TableHead>
                  {!readOnly && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {partidas.map((p, idx) => {
                  const acumTotal = p.porcentajeAcumuladoAnterior + p.porcentajeAvance
                  const overLimit = acumTotal > 100
                  const isLast = idx === partidas.length - 1 && !p.id
                  const prevOrigen = idx > 0 ? partidas[idx - 1].origen : null
                  const separatorLabel = showSeparators ? getSeparatorLabel(p.origen, prevOrigen) : null
                  const badge = ORIGEN_BADGES[p.origen]

                  // Sugerencia de avance desde cronograma
                  const avanceCronograma = p.proyectoEdtId ? avancesEdt.get(p.proyectoEdtId) : undefined
                  const tieneSugerencia = avanceCronograma !== undefined
                  const sugerenciaIncremento = tieneSugerencia
                    ? Math.round((avanceCronograma - p.porcentajeAcumuladoAnterior) * 100) / 100
                    : 0
                  const alDia = tieneSugerencia && sugerenciaIncremento <= 0
                  const mostrarSugerenciaPositiva = tieneSugerencia && sugerenciaIncremento > 0

                  // Tooltip mejorado para % anterior
                  const tooltipAnterior = tieneSugerencia
                    ? `Valorizado en períodos anteriores: ${p.porcentajeAcumuladoAnterior}%\nAvance en cronograma: ${avanceCronograma}%\nDisponible para valorizar: ${Math.max(sugerenciaIncremento, 0)}%`
                    : 'Valorizado anteriormente'

                  return (
                    <React.Fragment key={p.id || `new-${idx}`}>
                      {separatorLabel && (
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableCell colSpan={colCount} className="py-1.5 px-4">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {separatorLabel}
                            </span>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className={`${overLimit ? 'bg-yellow-50/80' : idx % 2 === 0 ? '' : 'bg-muted/20'} hover:bg-accent/50 transition-colors`}>
                        <TableCell className="text-center text-xs text-muted-foreground font-mono py-2.5">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-1.5 px-2">
                          <div className="flex items-center gap-2">
                            {badge && (
                              <Badge className={`${badge.className} text-[10px] px-1.5 py-0 leading-tight shrink-0`}>
                                {badge.label}
                              </Badge>
                            )}
                            {readOnly ? (
                              <span className="text-sm leading-tight">{p.descripcion}</span>
                            ) : (
                              <Input
                                ref={isLast ? newRowRef : undefined}
                                className="h-8 text-sm border-muted"
                                placeholder="Descripción de la partida"
                                value={p.descripcion}
                                onChange={e => updatePartida(idx, 'descripcion', e.target.value)}
                                onBlur={handleBlur}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5 px-2">
                          {readOnly ? (
                            <span className="text-sm font-mono text-right block">{formatCurrency(p.montoContractual)}</span>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-8 text-sm text-right font-mono border-muted"
                              value={p.montoContractual || ''}
                              onChange={e => updatePartida(idx, 'montoContractual', e.target.value)}
                              onBlur={handleBlur}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground font-mono py-2.5 px-2" title={tooltipAnterior}>
                          {p.porcentajeAcumuladoAnterior > 0 ? (
                            <span className="inline-block bg-muted/60 rounded px-1.5 py-0.5">
                              {p.porcentajeAcumuladoAnterior.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 px-2">
                          {readOnly ? (
                            <span className="text-sm font-mono text-right block font-medium">{p.porcentajeAvance.toFixed(1)}%</span>
                          ) : (
                            <div>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className={`h-8 text-sm text-right font-mono border-muted ${
                                  p.porcentajeAvance > 100 ? 'border-red-400 text-red-600 bg-red-50/50' : ''
                                }`}
                                value={p.porcentajeAvance || ''}
                                onChange={e => updatePartida(idx, 'porcentajeAvance', e.target.value)}
                                onBlur={handleBlur}
                              />
                              {/* Badge sugerencia positiva */}
                              {mostrarSugerenciaPositiva && (
                                <div className="mt-1 flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5">
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    Cron: {avanceCronograma}%
                                  </span>
                                  <button
                                    type="button"
                                    className="text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                                    onClick={() => aplicarSugerencia(idx, sugerenciaIncremento)}
                                  >
                                    Usar {sugerenciaIncremento}%
                                  </button>
                                </div>
                              )}
                              {/* Badge "al día" */}
                              {alDia && (
                                <div className="mt-1 flex items-center gap-1 rounded border border-green-200 bg-green-50 px-1.5 py-0.5">
                                  <span className="text-[10px] text-green-700 whitespace-nowrap">
                                    Cron: {avanceCronograma}% - Al día
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm py-2.5 px-3">
                          <span className={p.montoAvance === 0 ? 'text-muted-foreground' : 'font-semibold'}>
                            {formatCurrency(p.montoAvance)}
                          </span>
                          {overLimit && (
                            <div className="text-[10px] text-yellow-600 leading-tight mt-0.5">
                              Supera 100% acum.
                            </div>
                          )}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="py-1.5 px-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              onClick={() => eliminarPartida(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {/* Total footer */}
          <div className="flex justify-between items-center px-4 py-3 bg-primary/5 border-t-2 border-primary/20">
            <span className="text-sm font-semibold text-foreground">Total Valorización</span>
            <span className="text-lg font-bold font-mono text-primary">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}

      {/* Dialog de confirmación para reemplazar partidas */}
      <Dialog open={showConfirmCotizacion} onOpenChange={setShowConfirmCotizacion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reemplazar partidas existentes</DialogTitle>
            <DialogDescription>
              Ya existen {partidas.length} partida{partidas.length !== 1 ? 's' : ''} en esta valorización.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Al cargar desde cotización se reemplazarán todas las partidas actuales. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmCotizacion(false)}>
              Cancelar
            </Button>
            <Button onClick={cargarDesdeCotizacion} disabled={cargandoCotizacion}>
              {cargandoCotizacion && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reemplazar partidas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
