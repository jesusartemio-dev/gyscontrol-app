'use client'

/**
 * Sección que muestra los PedidoEquipoItem imputados a un proyecto vía override,
 * filtrados por categoría de costo (equipos/servicios/gastos). Se renderiza al
 * final de cada tab del proyecto (Equipos/Servicios/Gastos).
 */

import { useEffect, useState } from 'react'
import { ArrowRightLeft, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type Categoria = 'equipos' | 'servicios' | 'gastos'

interface PedidoItemOverride {
  id: string
  codigo: string
  descripcion: string
  unidad: string
  cantidadPedida: number
  cantidadAtendida: number | null
  precioUnitario: number | null
  costoTotal: number | null
  estado: string
  categoriaCosto: string | null
  pedidoEquipo: {
    id: string
    codigo: string
    nombre: string | null
    estado: string
    centroCosto: { id: string; nombre: string } | null
    proyecto: { id: string; codigo: string; nombre: string } | null
  }
}

interface Response {
  items: PedidoItemOverride[]
  totals: { totalPresupuesto: number; totalReal: number; cantidad: number }
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

export function PedidoItemsOverrideSection({
  proyectoId,
  categoria,
}: {
  proyectoId: string
  categoria: Categoria
}) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/proyecto/${proyectoId}/pedido-items-override?categoria=${categoria}`)
      .then(r => (r.ok ? r.json() : { items: [], totals: { totalPresupuesto: 0, totalReal: 0, cantidad: 0 } }))
      .then(setData)
      .catch(() => setData({ items: [], totals: { totalPresupuesto: 0, totalReal: 0, cantidad: 0 } }))
      .finally(() => setLoading(false))
  }, [proyectoId, categoria])

  if (loading) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-amber-600" />
            Items imputados desde pedidos internos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        </CardContent>
      </Card>
    )
  }

  // Si no hay items con override para esta categoría, no renderizamos nada (mantiene la UI limpia).
  if (!data || data.items.length === 0) return null

  return (
    <Card className="mt-4 border-amber-200">
      <CardHeader className="pb-3 bg-amber-50/50">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-amber-600" />
          Items imputados desde pedidos internos
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 ml-1">
            {data.items.length}
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Items de pedidos internos reasignados a este proyecto (categoría: {categoria}).
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead>Pedido origen</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">P. Unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map(it => (
              <TableRow key={it.id}>
                <TableCell>
                  <p className="text-sm font-medium">{it.descripcion}</p>
                  {it.codigo && <p className="text-[10px] text-muted-foreground font-mono">{it.codigo}</p>}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/gastos/mis-pedidos/${it.pedidoEquipo.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    {it.pedidoEquipo.codigo}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {it.pedidoEquipo.centroCosto && (
                    <p className="text-[10px] text-muted-foreground">{it.pedidoEquipo.centroCosto.nombre}</p>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {it.cantidadPedida}
                  <span className="text-muted-foreground text-[10px] ml-1">{it.unidad}</span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {it.precioUnitario ? fmtCurrency(it.precioUnitario) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">
                  {it.costoTotal ? fmtCurrency(it.costoTotal) : '—'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-[10px] capitalize">{it.estado}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end gap-6 px-4 py-3 border-t bg-amber-50/30 text-sm">
          <span>
            Presupuestado: <span className="font-semibold">{fmtCurrency(data.totals.totalPresupuesto)}</span>
          </span>
          <span>
            Real (atendido): <span className="font-semibold text-amber-700">{fmtCurrency(data.totals.totalReal)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
