'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface EntregaListItem {
  id: string
  numero: string
  fechaEntrega: string
  estado: string
  empleado: {
    documentoIdentidad: string | null
    cargo: { nombre: string } | null
    departamento: { nombre: string } | null
    user: { name: string }
  }
  almacen: { nombre: string }
  proyecto: { codigo: string } | null
  centroCosto: { nombre: string } | null
  entregadoPor: { name: string }
  items: Array<{
    id: string
    cantidad: number
    talla: string | null
    catalogoEpp: { codigo: string; descripcion: string; subcategoria: string }
  }>
}

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })

const ESTADO_COLOR: Record<string, string> = {
  vigente: 'bg-emerald-100 text-emerald-700',
  parcialmente_renovada: 'bg-amber-100 text-amber-700',
  renovada: 'bg-gray-100 text-gray-600',
  dada_baja: 'bg-red-100 text-red-700',
}

export default function EntregasEppListaPage() {
  const [entregas, setEntregas] = useState<EntregaListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/entrega-epp')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setEntregas)
      .catch(() => toast.error('Error al cargar entregas'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Entregas de EPPs</h1>
          <p className="text-sm text-muted-foreground">Registro de EPPs entregados a empleados</p>
        </div>
        <Link href="/seguridad/entregas/nueva">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-1" /> Nueva entrega
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : entregas.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Sin entregas registradas. Crea la primera con "Nueva entrega".
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Cargo / Depto</TableHead>
                  <TableHead>Imputación</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Entregó</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregas.map(e => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell className="font-mono text-xs">
                      <Link href={`/seguridad/entregas/${e.id}`} className="hover:underline">
                        {e.numero}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{formatFecha(e.fechaEntrega)}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{e.empleado.user.name}</div>
                      {e.empleado.documentoIdentidad && <div className="text-[10px] font-mono text-muted-foreground">{e.empleado.documentoIdentidad}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.empleado.cargo?.nombre || '—'}
                      {e.empleado.departamento && <div className="text-[10px] text-muted-foreground">{e.empleado.departamento.nombre}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.proyecto?.codigo || e.centroCosto?.nombre || '—'}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{e.items.length}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${ESTADO_COLOR[e.estado] ?? ''}`}>{e.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.entregadoPor.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
