'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Trash2, AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteWithValidation } from '@/hooks/useDeleteWithValidation'
import { DeleteWithValidationDialog } from '@/components/DeleteWithValidationDialog'
import type { DeletableEntity } from '@/lib/utils/deleteValidation'

interface DependencyTree {
  proyecto: { id: string; nombre: string; codigo: string }
  listas: Array<{ id: string; codigo: string; nombre: string; estado: string; _count: { listaEquipoItem: number; pedidoEquipo: number } }>
  pedidos: Array<{ id: string; codigo: string; estado: string; listaId: string | null; _count: { ordenesCompra: number; pedidoEquipoItem: number } }>
  ordenesCompra: Array<{ id: string; numero: string; estado: string; pedidoEquipoId: string; _count: { items: number; cuentasPorPagar: number } }>
  cuentasPorPagar: Array<{ id: string; numeroFactura: string | null; monto: number; saldoPendiente: number; estado: string; pedidoEquipoId: string | null; ordenCompraId: string | null }>
  valorizaciones: Array<{ id: string; codigo: string; estado: string; montoValorizacion: number; _count: { cuentasPorCobrar: number } }>
  cuentasPorCobrar: Array<{ id: string; descripcion: string | null; monto: number; montoPagado: number; estado: string; valorizacionId: string | null; _count: { pagos: number } }>
  resumen: { totalListas: number; totalPedidos: number; totalOCs: number; totalCxP: number; totalValorizaciones: number; totalCxC: number }
}

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-800',
  pendiente: 'bg-yellow-100 text-yellow-800',
  anulada: 'bg-red-100 text-red-800',
  anulado: 'bg-red-100 text-red-800',
}

export default function LimpiarPruebasClient() {
  const [proyectoId, setProyectoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [tree, setTree] = useState<DependencyTree | null>(null)
  const [deleteEntity, setDeleteEntity] = useState<{ entity: DeletableEntity; label: string } | null>(null)

  const deleteValidation = useDeleteWithValidation({
    entity: deleteEntity?.entity || 'listaEquipo',
    deleteEndpoint: (id) => {
      switch (deleteEntity?.entity) {
        case 'listaEquipo': return `/api/lista-equipo/${id}`
        case 'pedidoEquipo': return `/api/pedido-equipo/${id}`
        case 'ordenCompra': return `/api/orden-compra/${id}`
        case 'valorizacion': return `/api/proyectos/${proyectoId}/valorizaciones/${id}`
        case 'cuentaPorCobrar': return `/api/administracion/cuentas-cobrar/${id}`
        default: return `/api/${deleteEntity?.entity}/${id}`
      }
    },
    onSuccess: () => {
      toast.success(`${deleteEntity?.label || 'Registro'} eliminado`)
      if (proyectoId) fetchTree()
    },
    onError: (msg) => toast.error(msg),
  })

  const fetchTree = async () => {
    if (!proyectoId.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/proyecto/${proyectoId}/dependency-tree`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al obtener dependencias')
      }
      const data: DependencyTree = await res.json()
      setTree(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al buscar proyecto')
      setTree(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (entity: DeletableEntity, id: string, label: string) => {
    setDeleteEntity({ entity, label })
    setTimeout(() => deleteValidation.requestDelete(id), 0)
  }

  const estadoBadge = (estado: string) => (
    <Badge variant="outline" className={`text-[10px] ${ESTADO_COLORS[estado] || ''}`}>
      {estado}
    </Badge>
  )

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Limpieza de datos de prueba</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualiza el arbol de dependencias de un proyecto y elimina registros bottom-up.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="ID del proyecto..."
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTree()}
              className="flex-1"
            />
            <Button onClick={fetchTree} disabled={loading || !proyectoId.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Buscar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {tree && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {tree.proyecto.codigo} - {tree.proyecto.nombre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Listas', count: tree.resumen.totalListas },
                  { label: 'Pedidos', count: tree.resumen.totalPedidos },
                  { label: 'OCs', count: tree.resumen.totalOCs },
                  { label: 'CxP', count: tree.resumen.totalCxP },
                  { label: 'Valoriz.', count: tree.resumen.totalValorizaciones },
                  { label: 'CxC', count: tree.resumen.totalCxC },
                ].map(({ label, count }) => (
                  <div key={label} className="rounded-md border p-2">
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-[11px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottom-up sections: CxP -> OC -> Pedido -> Lista */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              Eliminar en orden bottom-up: CxP/CxC primero, Listas al final
            </div>

            {/* CxP */}
            {tree.cuentasPorPagar.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cuentas por Pagar ({tree.cuentasPorPagar.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tree.cuentasPorPagar.map((cxp) => (
                    <div key={cxp.id} className="flex items-center justify-between rounded px-3 py-1.5 text-xs hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {estadoBadge(cxp.estado)}
                        <span>{cxp.numeroFactura || cxp.id.slice(0, 8)}</span>
                        <span className="text-muted-foreground">S/ {cxp.monto.toFixed(2)}</span>
                      </div>
                      <span className="text-muted-foreground">Solo anulacion</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* CxC */}
            {tree.cuentasPorCobrar.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cuentas por Cobrar ({tree.cuentasPorCobrar.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tree.cuentasPorCobrar.map((cxc) => (
                    <div key={cxc.id} className="flex items-center justify-between rounded px-3 py-1.5 text-xs hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {estadoBadge(cxc.estado)}
                        <span>{cxc.descripcion || cxc.id.slice(0, 8)}</span>
                        <span className="text-muted-foreground">Pagos: {cxc._count.pagos}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete('cuentaPorCobrar', cxc.id, 'CxC')}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* OCs */}
            {tree.ordenesCompra.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ordenes de Compra ({tree.ordenesCompra.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tree.ordenesCompra.map((oc) => (
                    <div key={oc.id} className="flex items-center justify-between rounded px-3 py-1.5 text-xs hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {estadoBadge(oc.estado)}
                        <span>{oc.numero}</span>
                        <span className="text-muted-foreground">{oc._count.items} items, {oc._count.cuentasPorPagar} CxP</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete('ordenCompra', oc.id, 'Orden de compra')}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Valorizaciones */}
            {tree.valorizaciones.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Valorizaciones ({tree.valorizaciones.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tree.valorizaciones.map((val) => (
                    <div key={val.id} className="flex items-center justify-between rounded px-3 py-1.5 text-xs hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {estadoBadge(val.estado)}
                        <span>{val.codigo}</span>
                        <span className="text-muted-foreground">{val._count.cuentasPorCobrar} CxC</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete('valorizacion', val.id, 'Valorizacion')}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pedidos */}
            {tree.pedidos.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pedidos de Equipo ({tree.pedidos.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tree.pedidos.map((pedido) => (
                    <div key={pedido.id} className="flex items-center justify-between rounded px-3 py-1.5 text-xs hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {estadoBadge(pedido.estado)}
                        <span>{pedido.codigo}</span>
                        <span className="text-muted-foreground">{pedido._count.pedidoEquipoItem} items, {pedido._count.ordenesCompra} OCs</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete('pedidoEquipo', pedido.id, 'Pedido')}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Listas */}
            {tree.listas.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Listas de Equipo ({tree.listas.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tree.listas.map((lista) => (
                    <div key={lista.id} className="flex items-center justify-between rounded px-3 py-1.5 text-xs hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {estadoBadge(lista.estado)}
                        <span>{lista.codigo}</span>
                        <span className="text-muted-foreground">{lista._count.listaEquipoItem} items, {lista._count.pedidoEquipo} pedidos</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete('listaEquipo', lista.id, 'Lista')}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      <DeleteWithValidationDialog
        open={deleteValidation.dialogOpen}
        onOpenChange={(open) => !open && deleteValidation.cancelDelete()}
        checking={deleteValidation.checking}
        deleting={deleteValidation.deleting}
        allowed={deleteValidation.canDeleteResult?.allowed ?? null}
        blockers={deleteValidation.canDeleteResult?.blockers ?? []}
        message={deleteValidation.canDeleteResult?.message ?? ''}
        onConfirm={deleteValidation.confirmDelete}
        onCancel={deleteValidation.cancelDelete}
        entityLabel={deleteEntity?.label || 'registro'}
      />
    </div>
  )
}
