'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowLeft, Loader2, CheckCircle, Send, Package, XCircle, FileDown, Building2, CreditCard, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { getOrdenCompraById, aprobarOC, enviarOC, confirmarOC, cancelarOC, deleteOrdenCompra } from '@/lib/services/ordenCompra'
import OCEstadoStepper from '@/components/logistica/OCEstadoStepper'
import type { OrdenCompra } from '@/types'

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

const formatDate = (date: string | null | undefined) =>
  date ? new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

const condicionLabel: Record<string, string> = {
  contado: 'Contado',
  credito_15: 'Crédito 15 días',
  credito_30: 'Crédito 30 días',
  credito_60: 'Crédito 60 días',
}

export default function OrdenCompraDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [oc, setOC] = useState<OrdenCompra | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getOrdenCompraById(id)
      setOC(data)
    } catch {
      toast.error('Error al cargar la orden de compra')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string, fn: () => Promise<any>) => {
    try {
      setActionLoading(action)
      const updated = await fn()
      setOC(updated)
      toast.success(`OC ${action} exitosamente`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Error al ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!oc) return
    try {
      await deleteOrdenCompra(oc.id)
      toast.success(`OC ${oc.numero} eliminada`)
      router.push('/logistica/ordenes-compra')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!oc) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Orden de compra no encontrada
      </div>
    )
  }

  const estadoColor: Record<string, string> = {
    borrador: 'bg-gray-100 text-gray-700',
    aprobada: 'bg-emerald-100 text-emerald-700',
    enviada: 'bg-blue-100 text-blue-700',
    confirmada: 'bg-purple-100 text-purple-700',
    parcial: 'bg-orange-100 text-orange-700',
    completada: 'bg-green-100 text-green-800',
    cancelada: 'bg-red-100 text-red-700',
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/logistica/ordenes-compra')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono">{oc.numero}</h1>
            <Badge className={`text-xs ${estadoColor[oc.estado] || ''}`}>{oc.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Creada {formatDate(oc.createdAt)} por {oc.solicitante?.name || oc.solicitante?.email}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="py-3">
          <OCEstadoStepper estado={oc.estado} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {oc.estado === 'borrador' && (
          <>
            <Button
              size="sm"
              onClick={() => handleAction('aprobada', () => aprobarOC(oc.id))}
              disabled={!!actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {actionLoading === 'aprobada' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDelete(true)}
              disabled={!!actionLoading}
            >
              Eliminar
            </Button>
          </>
        )}
        {oc.estado === 'aprobada' && (
          <>
            <Button
              size="sm"
              onClick={() => handleAction('enviada', () => enviarOC(oc.id))}
              disabled={!!actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === 'enviada' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Enviar al Proveedor
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCancel(true)}
              disabled={!!actionLoading}
            >
              <XCircle className="h-4 w-4 mr-1" /> Cancelar OC
            </Button>
          </>
        )}
        {oc.estado === 'enviada' && (
          <Button
            size="sm"
            onClick={() => handleAction('confirmada', () => confirmarOC(oc.id))}
            disabled={!!actionLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {actionLoading === 'confirmada' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Package className="h-4 w-4 mr-1" />}
            Confirmar Recepción
          </Button>
        )}
        {['enviada', 'confirmada', 'parcial', 'completada'].includes(oc.estado) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`/api/orden-compra/${oc.id}/pdf`, '_blank')}
          >
            <FileDown className="h-4 w-4 mr-1" /> Descargar PDF
          </Button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Proveedor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-medium">{oc.proveedor?.nombre}</div>
            {oc.proveedor?.ruc && <div className="text-muted-foreground">RUC: {oc.proveedor.ruc}</div>}
            {oc.proveedor?.direccion && <div className="text-muted-foreground">{oc.proveedor.direccion}</div>}
            {oc.proveedor?.contactoNombre && <div className="text-muted-foreground">Contacto: {oc.proveedor.contactoNombre}</div>}
            {oc.proveedor?.contactoTelefono && <div className="text-muted-foreground">Tel: {oc.proveedor.contactoTelefono}</div>}
            {oc.proveedor?.banco && (
              <div className="text-muted-foreground">
                Banco: {oc.proveedor.banco} | Cta: {oc.proveedor.numeroCuenta}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Montos & Condiciones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Montos y Condiciones
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono">{formatCurrency(oc.subtotal, oc.moneda)}</span>
            </div>
            {oc.moneda !== 'USD' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGV (18%):</span>
                <span className="font-mono">{formatCurrency(oc.igv, oc.moneda)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Total:</span>
              <span className="font-mono">{formatCurrency(oc.total, oc.moneda)}</span>
            </div>
            <div className="border-t pt-1 mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condición:</span>
                <span>{condicionLabel[oc.condicionPago] || oc.condicionPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moneda:</span>
                <span>{oc.moneda}</span>
              </div>
              {oc.centroCosto && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Centro de Costo:</span>
                  <span>{oc.centroCosto.nombre}</span>
                </div>
              )}
              {oc.proyecto && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proyecto:</span>
                  <span>{oc.proyecto.codigo} - {oc.proyecto.nombre}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Info */}
      {(oc.lugarEntrega || oc.contactoEntrega || oc.fechaEntregaEstimada) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {oc.lugarEntrega && <div><span className="text-muted-foreground">Lugar:</span> {oc.lugarEntrega}</div>}
            {oc.contactoEntrega && <div><span className="text-muted-foreground">Contacto:</span> {oc.contactoEntrega}</div>}
            {oc.fechaEntregaEstimada && <div><span className="text-muted-foreground">Fecha estimada:</span> {formatDate(oc.fechaEntregaEstimada)}</div>}
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Items ({oc.items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">N°</TableHead>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[70px]">Unidad</TableHead>
                <TableHead className="w-[70px] text-right">Cant.</TableHead>
                <TableHead className="w-[100px] text-right">P. Unit.</TableHead>
                <TableHead className="w-[100px] text-right">Total</TableHead>
                {['confirmada', 'parcial', 'completada'].includes(oc.estado) && (
                  <TableHead className="w-[80px] text-right">Recibido</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {oc.items?.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                  <TableCell className="text-sm">{item.descripcion}</TableCell>
                  <TableCell className="text-xs">{item.unidad}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{item.cantidad}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(item.precioUnitario, oc.moneda)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(item.costoTotal, oc.moneda)}</TableCell>
                  {['confirmada', 'parcial', 'completada'].includes(oc.estado) && (
                    <TableCell className={`text-right font-mono text-sm ${item.cantidadRecibida >= item.cantidad ? 'text-green-600' : item.cantidadRecibida > 0 ? 'text-orange-600' : ''}`}>
                      {item.cantidadRecibida}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Observations */}
      {oc.observaciones && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{oc.observaciones}</p>
          </CardContent>
        </Card>
      )}

      {/* Dates Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Historial</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div className="flex gap-2"><span className="text-muted-foreground w-32">Emisión:</span> {formatDate(oc.fechaEmision)}</div>
          {oc.fechaAprobacion && <div className="flex gap-2"><span className="text-muted-foreground w-32">Aprobación:</span> {formatDate(oc.fechaAprobacion)} por {oc.aprobador?.name}</div>}
          {oc.fechaEnvio && <div className="flex gap-2"><span className="text-muted-foreground w-32">Envío:</span> {formatDate(oc.fechaEnvio)}</div>}
          {oc.fechaConfirmacion && <div className="flex gap-2"><span className="text-muted-foreground w-32">Confirmación:</span> {formatDate(oc.fechaConfirmacion)}</div>}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Orden de Compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar la OC {oc.numero}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowCancel(false); handleAction('cancelada', () => cancelarOC(oc.id)) }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Orden de Compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la OC {oc.numero}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
