'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader2, Plus, RotateCcw } from 'lucide-react'

interface Devolucion {
  id: string
  fechaDevolucion: string
  estado: string
  proyecto: { nombre: string; codigo: string }
  registradoPor: { name: string | null }
  devueltoPor: { name: string | null } | null
  items: { id: string; cantidad: number; estadoItem: string; catalogoEquipo: { codigo: string; descripcion: string } }[]
}

export default function DevolucionesPage() {
  const [data, setData] = useState<Devolucion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/logistica/almacen/devoluciones')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Devoluciones de Material</h1>
          <p className="text-sm text-muted-foreground">Material devuelto desde proyecto al almacén</p>
        </div>
        <Link href="/logistica/almacen/devoluciones/nuevo">
          <Button><Plus className="mr-2 h-4 w-4" /> Nueva devolución</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Ítems</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Devuelto por</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(d.fechaDevolucion).toLocaleDateString('es-PE')}
                    </TableCell>
                    <TableCell>{d.proyecto.codigo} — {d.proyecto.nombre}</TableCell>
                    <TableCell className="text-sm">
                      <ul className="space-y-0.5">
                        {d.items.map(i => (
                          <li key={i.id} className="text-xs text-muted-foreground">
                            {i.catalogoEquipo.codigo}: {i.cantidad} ({i.estadoItem})
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="text-sm">{d.registradoPor.name || '—'}</TableCell>
                    <TableCell className="text-sm">{d.devueltoPor?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={d.estado === 'registrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}>
                        {d.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Sin devoluciones registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
