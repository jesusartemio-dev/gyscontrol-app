'use client'

// Vista personal del solicitante: qué pedí, en qué va, y — lo importante — qué
// me despacharon y todavía no confirmé. Cierra el ciclo pedido → entrega →
// conformidad sin tener que navegar hasta el detalle de cada pedido.

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, PackageCheck, ShoppingCart, Truck, AlertTriangle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface RecepcionPorConfirmar {
  id: string
  pedidoId: string
  pedidoCodigo: string
  proyectoId: string | null
  proyectoNombre: string | null
  itemCodigo: string
  itemDescripcion: string
  unidad: string
  cantidadRecibida: number
  fechaEntregaProyecto: string | null
  entregadoPor: string | null
  ocNumero: string | null
}

interface PedidoResumen {
  id: string
  codigo: string
  nombre: string | null
  estado: string
  fechaPedido: string
  fechaNecesaria: string
  esSolicitante: boolean
  proyecto: { id: string; codigo: string; nombre: string } | null
  totalItems: number
  itemsEntregados: number
  enTransito: number
  aConfirmar: number
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador', enviado: 'Enviado', atendido: 'Atendido',
  parcial: 'Parcial', entregado: 'Entregado', cancelado: 'Cancelado',
}

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  atendido: 'bg-amber-100 text-amber-700',
  parcial: 'bg-orange-100 text-orange-700',
  entregado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MisPedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([])
  const [porConfirmar, setPorConfirmar] = useState<RecepcionPorConfirmar[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<RecepcionPorConfirmar | null>(null)
  const [cantidadReal, setCantidadReal] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [rechazoDialog, setRechazoDialog] = useState<RecepcionPorConfirmar | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/mi-trabajo/mis-pedidos')
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setPedidos(data.pedidos ?? [])
      setPorConfirmar(data.porConfirmar ?? [])
    } catch {
      toast.error('No se pudieron cargar tus pedidos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Confirmación rápida (recibí todo) desde el botón de la tarjeta
  const confirmarTodo = async (r: RecepcionPorConfirmar) => {
    setProcesando(r.id)
    try {
      const res = await fetch(`/api/recepcion-pendiente/${r.id}/confirmar-proyecto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al confirmar')
      toast.success('Recepción confirmada')
      await cargar()
    } catch (e: any) {
      toast.error(e.message || 'Error al confirmar')
    } finally {
      setProcesando(null)
    }
  }

  // Confirmación parcial: llegó menos de lo despachado
  const confirmarParcial = async () => {
    if (!confirmDialog) return
    const cantidad = parseFloat(cantidadReal)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      toast.error('Indica una cantidad válida')
      return
    }
    if (cantidad > confirmDialog.cantidadRecibida) {
      toast.error(`No puede superar lo entregado (${confirmDialog.cantidadRecibida})`)
      return
    }
    if (cantidad < confirmDialog.cantidadRecibida && !observaciones.trim()) {
      toast.error('Explica por qué recibiste menos')
      return
    }
    setProcesando(confirmDialog.id)
    try {
      const res = await fetch(`/api/recepcion-pendiente/${confirmDialog.id}/confirmar-proyecto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidadConfirmada: cantidad, observaciones: observaciones.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al confirmar')
      toast.success(cantidad < confirmDialog.cantidadRecibida ? 'Conformidad parcial registrada' : 'Recepción confirmada')
      setConfirmDialog(null)
      setCantidadReal('')
      setObservaciones('')
      await cargar()
    } catch (e: any) {
      toast.error(e.message || 'Error al confirmar')
    } finally {
      setProcesando(null)
    }
  }

  const reportarProblema = async () => {
    if (!rechazoDialog || !motivoRechazo.trim()) return
    setProcesando(rechazoDialog.id)
    try {
      const res = await fetch(`/api/recepcion-pendiente/${rechazoDialog.id}/rechazar-proyecto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones: motivoRechazo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reportar')
      toast.success('Disconformidad enviada a Logística')
      setRechazoDialog(null)
      setMotivoRechazo('')
      await cargar()
    } catch (e: any) {
      toast.error(e.message || 'Error al reportar')
    } finally {
      setProcesando(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="h-7 w-7 text-emerald-600" />
          Mis Pedidos
        </h1>
        <p className="text-gray-600 mt-1">
          Pedidos que solicitaste y confirmación de lo que te entregaron
        </p>
      </div>

      {/* Lo que espera mi confirmación */}
      {porConfirmar.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <PackageCheck className="h-5 w-5 text-amber-600" />
              Esperando tu confirmación ({porConfirmar.length})
            </CardTitle>
            <p className="text-sm text-amber-800">
              Logística ya despachó estos ítems. Confirma que los recibiste para cerrar el pedido.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {porConfirmar.map(r => (
              <div key={r.id} className="bg-white border border-amber-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[240px] flex-1">
                  <div className="text-sm font-medium">
                    {r.cantidadRecibida} {r.unidad} — {r.itemCodigo}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" title={r.itemDescripcion}>
                    {r.itemDescripcion}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Pedido {r.pedidoCodigo}
                    {r.ocNumero && ` · OC ${r.ocNumero}`}
                    {r.entregadoPor && ` · Despachado por ${r.entregadoPor}`}
                    {` · ${formatDate(r.fechaEntregaProyecto)}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-green-600 hover:bg-green-700"
                    disabled={procesando === r.id}
                    onClick={() => confirmarTodo(r)}
                  >
                    {procesando === r.id
                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      : <PackageCheck className="h-3 w-3 mr-1" />}
                    Recibí todo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={procesando === r.id}
                    onClick={() => {
                      setConfirmDialog(r)
                      setCantidadReal(String(r.cantidadRecibida))
                      setObservaciones('')
                    }}
                  >
                    Recibí menos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    disabled={procesando === r.id}
                    onClick={() => { setRechazoDialog(r); setMotivoRechazo('') }}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Problema
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Todos mis pedidos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Todos mis pedidos ({pedidos.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pedidos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Todavía no tienes pedidos registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead className="w-[110px]">Estado</TableHead>
                  <TableHead className="w-[110px] text-center">Ítems</TableHead>
                  <TableHead className="w-[150px] text-center">En camino</TableHead>
                  <TableHead className="w-[120px]">Necesario</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {p.codigo}
                      {!p.esSolicitante && (
                        <span className="block text-[10px] text-muted-foreground font-sans">como gestor</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.proyecto ? (
                        <span className="truncate block max-w-[220px]" title={p.proyecto.nombre}>
                          {p.proyecto.codigo} — {p.proyecto.nombre}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${ESTADO_COLORS[p.estado] || ''}`}>
                        {ESTADO_LABELS[p.estado] || p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {p.itemsEntregados}/{p.totalItems}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {p.enTransito > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700" title="En proceso logístico">
                            <Truck className="h-3 w-3" />
                            {p.enTransito}
                          </span>
                        )}
                        {p.aConfirmar > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                            {p.aConfirmar} por confirmar
                          </Badge>
                        )}
                        {p.enTransito === 0 && p.aConfirmar === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(p.fechaNecesaria)}</TableCell>
                    <TableCell>
                      {p.proyecto && (
                        <Link
                          href={`/proyectos/${p.proyecto.id}/pedidos/${p.id}`}
                          className="text-blue-600 hover:text-blue-800 inline-flex"
                          title="Ver pedido"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: recibí menos */}
      <Dialog open={!!confirmDialog} onOpenChange={open => { if (!open) setConfirmDialog(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar cantidad recibida</DialogTitle>
            <DialogDescription>
              Se despacharon <strong>{confirmDialog?.cantidadRecibida} {confirmDialog?.unidad}</strong> de {confirmDialog?.itemCodigo}.
              Indica cuánto llegó realmente. La diferencia vuelve a quedar pendiente en el pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cantidadReal">Cantidad recibida</Label>
              <Input
                id="cantidadReal"
                type="number"
                min="0"
                step="any"
                max={confirmDialog?.cantidadRecibida}
                value={cantidadReal}
                onChange={e => setCantidadReal(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="obs">Observaciones</Label>
              <Textarea
                id="obs"
                placeholder="Ej: llegaron 8 de 10, faltaron 2 unidades"
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button onClick={confirmarParcial} disabled={procesando !== null}>
              {procesando !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: problema / no lo recibí */}
      <Dialog open={!!rechazoDialog} onOpenChange={open => { if (!open) setRechazoDialog(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reportar problema</DialogTitle>
            <DialogDescription>
              El ítem vuelve a la cola de Logística y el stock regresa al almacén.
              Úsalo si no llegó, llegó dañado o no corresponde a lo pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="motivo">Motivo (obligatorio)</Label>
            <Textarea
              id="motivo"
              placeholder="Ej: el material llegó dañado / nunca llegó a obra"
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazoDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={reportarProblema} disabled={!motivoRechazo.trim() || procesando !== null}>
              {procesando !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
