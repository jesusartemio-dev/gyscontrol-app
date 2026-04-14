'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowLeft, ShoppingCart, Loader2, Building2, Calendar, User, AlertTriangle, Package } from 'lucide-react'
import { toast } from 'sonner'
import { getPedidoInternoById, deletePedidoInterno, type PedidoInterno } from '@/lib/services/pedidoInterno'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

const estadoColor: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  en_proceso: 'bg-amber-100 text-amber-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

const prioridadColor: Record<string, string> = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-blue-100 text-blue-600',
  alta: 'bg-orange-100 text-orange-600',
  critica: 'bg-red-100 text-red-600',
}

export default function DetallePedidoInternoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [pedido, setPedido] = useState<PedidoInterno | null>(null)
  const [loading, setLoading] = useState(true)
  const [openDelete, setOpenDelete] = useState(false)

  useEffect(() => {
    getPedidoInternoById(id)
      .then(setPedido)
      .catch(() => toast.error('Error al cargar el pedido'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!pedido) return
    try {
      await deletePedidoInterno(pedido.id)
      toast.success('Pedido eliminado')
      router.push('/gastos/mis-pedidos')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="container mx-auto p-6 text-center text-muted-foreground">
        Pedido no encontrado.
        <Button variant="link" onClick={() => router.push('/gastos/mis-pedidos')}>Volver</Button>
      </div>
    )
  }

  const totalPresupuesto = pedido.pedidoEquipoItem?.reduce(
    (sum, item) => sum + (item.costoTotal ?? 0), 0
  ) ?? 0

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/gastos/mis-pedidos')} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold font-mono">{pedido.codigo}</h1>
            {pedido.esUrgente && (
              <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgente
              </Badge>
            )}
            <Badge className={`border-0 text-xs ${estadoColor[pedido.estado] ?? 'bg-gray-100 text-gray-700'}`}>
              {pedido.estado}
            </Badge>
            {pedido.prioridad && (
              <Badge className={`border-0 text-xs capitalize ${prioridadColor[pedido.prioridad] ?? ''}`}>
                {pedido.prioridad}
              </Badge>
            )}
          </div>
          {pedido.nombre && (
            <p className="text-sm text-muted-foreground">{pedido.nombre}</p>
          )}
        </div>
        {pedido.estado === 'borrador' && (
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-600 hover:bg-red-50 h-8"
            onClick={() => setOpenDelete(true)}
          >
            Eliminar
          </Button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Centro de costo</p>
              <p className="font-medium truncate">{pedido.centroCosto?.nombre ?? '—'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{pedido.centroCosto?.tipo}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha necesaria</p>
              <p className="font-medium">{formatDate(pedido.fechaNecesaria)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Solicitante</p>
              <p className="font-medium truncate">{pedido.user?.name ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Observacion */}
      {pedido.observacion && (
        <Card>
          <CardContent className="p-3 text-sm text-muted-foreground">
            <span className="font-medium text-gray-700">Observación: </span>
            {pedido.observacion}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Ítems del pedido ({pedido.pedidoEquipoItem?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(pedido.pedidoEquipoItem?.length ?? 0) === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Sin ítems</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Cant.</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">P. Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.pedidoEquipoItem?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="text-sm">{item.descripcion}</TableCell>
                    <TableCell className="text-center text-sm">{item.cantidadPedida}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.unidad}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.precioUnitario ? formatCurrency(item.precioUnitario) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {item.costoTotal ? formatCurrency(item.costoTotal) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className="text-xs bg-gray-100 text-gray-700 border-0">
                        {item.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPresupuesto > 0 && (
            <div className="flex justify-end px-4 py-3 border-t">
              <span className="text-sm font-semibold">
                Total: <span className="text-blue-700">{formatCurrency(totalPresupuesto)}</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <p className="text-[11px] text-muted-foreground text-right">
        Creado el {formatDate(pedido.createdAt)}
      </p>

      {/* Delete dialog */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el pedido &quot;{pedido.codigo}&quot;? Esta acción no se puede deshacer.
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
