'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  FileCheck, Loader2, ChevronDown, ChevronRight, XCircle, Paperclip,
  User, FolderOpen, Calendar, Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { getHojasDeGastos, validarHoja, rechazarHoja } from '@/lib/services/hojaDeGastos'
import type { HojaDeGastos } from '@/types'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

export default function RendicionesPage() {
  const router = useRouter()
  const [hojas, setHojas] = useState<HojaDeGastos[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Rechazo dialog
  const [rechazoTarget, setRechazoTarget] = useState<HojaDeGastos | null>(null)
  const [comentarioRechazo, setComentarioRechazo] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getHojasDeGastos({ estado: 'rendido' })
      setHojas(data)
    } catch {
      toast.error('Error al cargar rendiciones')
    } finally {
      setLoading(false)
    }
  }

  const handleValidar = async (hoja: HojaDeGastos) => {
    try {
      setActionLoading(hoja.id)
      await validarHoja(hoja.id)
      toast.success(`${hoja.numero} validado`)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al validar')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRechazar = async () => {
    if (!rechazoTarget || !comentarioRechazo.trim()) return
    try {
      setActionLoading(rechazoTarget.id)
      await rechazarHoja(rechazoTarget.id, comentarioRechazo.trim())
      toast.success(`${rechazoTarget.numero} rechazado`)
      setRechazoTarget(null)
      setComentarioRechazo('')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al rechazar')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Cargando rendiciones...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-orange-600" />
          Rendiciones por Validar
        </h1>
        <p className="text-sm text-muted-foreground">
          {hojas.length === 0
            ? 'No hay rendiciones pendientes'
            : `${hojas.length} rendición${hojas.length === 1 ? '' : 'es'} pendiente${hojas.length === 1 ? '' : 's'} de validación`}
        </p>
      </div>

      {/* Cards */}
      {hojas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No hay rendiciones pendientes de validación.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hojas.map(hoja => {
            const isExpanded = expanded[hoja.id] || false
            const isLoading = actionLoading === hoja.id
            const lineas = hoja.lineas || []
            const totalAdjuntos = lineas.reduce((sum, l) => sum + (l.adjuntos?.length || 0), 0)
            const saldoPositivo = hoja.saldo >= 0

            return (
              <Card key={hoja.id} className="overflow-hidden">
                {/* Card header */}
                <div
                  className="px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(hoja.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold">{hoja.numero}</span>
                        <Badge className="bg-orange-100 text-orange-700 text-[10px]">Rendido</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {hoja.empleado?.name || hoja.empleado?.email}
                        </span>
                        {(hoja.proyecto || hoja.centroCosto) && (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" />
                            {hoja.proyecto ? hoja.proyecto.codigo : hoja.centroCosto?.nombre}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {hoja.fechaRendicion ? formatDate(hoja.fechaRendicion) : formatDate(hoja.updatedAt)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">{hoja.motivo}</div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Finance summary */}
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-muted-foreground">Depositado</div>
                        <div className="font-mono text-sm">{formatCurrency(hoja.montoDepositado)}</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-muted-foreground">Gastado</div>
                        <div className="font-mono text-sm">{formatCurrency(hoja.montoGastado)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">Saldo</div>
                        <div className={`font-mono text-sm font-bold ${saldoPositivo ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(hoja.saldo)}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Mobile finance row */}
                  <div className="flex items-center gap-4 mt-2 sm:hidden text-xs">
                    <span>Dep: <strong className="font-mono">{formatCurrency(hoja.montoDepositado)}</strong></span>
                    <span>Gast: <strong className="font-mono">{formatCurrency(hoja.montoGastado)}</strong></span>
                    <span>
                      Saldo: <strong className={`font-mono ${saldoPositivo ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(hoja.saldo)}
                      </strong>
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      {lineas.length} línea{lineas.length !== 1 ? 's' : ''} de gasto
                    </span>
                    {totalAdjuntos > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        {totalAdjuntos} adjunto{totalAdjuntos !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded: line items */}
                {isExpanded && (
                  <div className="border-t">
                    <div className="divide-y">
                      {lineas.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-muted-foreground">
                          Sin líneas de gasto registradas
                        </div>
                      ) : (
                        lineas.map(linea => (
                          <div key={linea.id} className="px-4 py-2.5 bg-gray-50/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{linea.descripcion}</div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                                  <span>{formatDate(linea.fecha)}</span>
                                  {linea.categoriaGasto?.nombre && (
                                    <Badge variant="outline" className="text-[10px] h-4">
                                      {linea.categoriaGasto.nombre}
                                    </Badge>
                                  )}
                                  {linea.tipoComprobante && (
                                    <span>{linea.tipoComprobante} {linea.numeroComprobante || ''}</span>
                                  )}
                                  {linea.proveedorNombre && (
                                    <span>{linea.proveedorNombre}</span>
                                  )}
                                </div>
                              </div>
                              <div className="font-mono text-sm font-medium flex-shrink-0">
                                {formatCurrency(linea.monto)}
                              </div>
                            </div>
                            {linea.adjuntos && linea.adjuntos.length > 0 && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {linea.adjuntos.map(adj => (
                                  <a
                                    key={adj.id}
                                    href={adj.urlArchivo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 rounded px-1.5 py-0.5"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Paperclip className="h-2.5 w-2.5" />
                                    {adj.nombreArchivo}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => router.push(`/finanzas/requerimientos/${hoja.id}`)}
                      >
                        Ver detalle completo
                      </Button>
                      <div className="flex items-center gap-2">
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => { setRechazoTarget(hoja); setComentarioRechazo('') }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs bg-teal-600 hover:bg-teal-700"
                              onClick={() => handleValidar(hoja)}
                            >
                              <FileCheck className="h-3.5 w-3.5 mr-1" />
                              Validar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Rechazo dialog */}
      <Dialog open={!!rechazoTarget} onOpenChange={(open) => { if (!open) setRechazoTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rechazar Rendición
            </DialogTitle>
            <DialogDescription>
              Rechazar la rendición de {rechazoTarget?.numero}. El empleado podrá corregir y reenviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Motivo del rechazo <span className="text-red-500">*</span></Label>
              <Textarea
                value={comentarioRechazo}
                onChange={(e) => setComentarioRechazo(e.target.value)}
                placeholder="Indique el motivo del rechazo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazoTarget(null)}>Cancelar</Button>
            <Button
              onClick={handleRechazar}
              disabled={!!actionLoading || !comentarioRechazo.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
