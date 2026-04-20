'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, ArrowLeftRight, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Prestamo {
  id: string
  fechaPrestamo: string
  fechaDevolucionEstimada: string | null
  estado: string
  usuario: { name: string | null; email: string }
  proyecto: { nombre: string; codigo: string } | null
  entregadoPor: { name: string | null }
  items: {
    id: string
    cantidadPrestada: number
    cantidadDevuelta: number
    estado: string
    herramientaUnidad: { serie: string; catalogoHerramienta: { nombre: string; codigo: string } } | null
    catalogoHerramienta: { nombre: string; codigo: string } | null
  }[]
}

const ESTADO_COLORS: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  devuelto: 'bg-gray-100 text-gray-600',
  devuelto_parcial: 'bg-amber-100 text-amber-700',
  vencido: 'bg-red-100 text-red-700',
  perdido: 'bg-red-200 text-red-800',
}

export default function PrestamosPage() {
  const [data, setData] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [devolviendo, setDevolviendo] = useState<string | null>(null)

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroEstado !== 'todos') params.set('estado', filtroEstado)
    const r = await fetch(`/api/logistica/almacen/prestamos?${params}`)
    const json = await r.json()
    setData(json.prestamos || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [filtroEstado])

  async function devolverTodo(prestamoId: string, items: Prestamo['items']) {
    if (!confirm('¿Confirmar devolución total de este préstamo?')) return
    setDevolviendo(prestamoId)
    try {
      const r = await fetch(`/api/logistica/almacen/prestamos/${prestamoId}/devolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items
            .filter(i => i.estado === 'prestado')
            .map(i => ({
              prestamoItemId: i.id,
              cantidadDevuelta: i.cantidadPrestada - i.cantidadDevuelta,
            })),
        }),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error'); return }
      toast.success('Devolución registrada')
      cargar()
    } finally {
      setDevolviendo(null)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Préstamos de Herramientas</h1>
          <p className="text-sm text-muted-foreground">Herramientas prestadas al personal</p>
        </div>
        <Link href="/logistica/almacen/prestamos/nuevo">
          <Button><Plus className="mr-2 h-4 w-4" /> Nuevo préstamo</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-3">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="devuelto_parcial">Parciales</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="devuelto">Devueltos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Sin préstamos en el período seleccionado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map(p => {
            const vencido = p.fechaDevolucionEstimada && new Date(p.fechaDevolucionEstimada) < new Date() && p.estado === 'activo'
            return (
              <Card key={p.id} className={vencido ? 'border-red-300' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      {p.usuario.name || p.usuario.email}
                    </span>
                    <div className="flex items-center gap-2">
                      {vencido && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <Badge variant="outline" className={ESTADO_COLORS[p.estado] || 'bg-gray-100'}>
                        {p.estado.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardTitle>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Prestado: {new Date(p.fechaPrestamo).toLocaleDateString('es-PE')}</span>
                    {p.fechaDevolucionEstimada && (
                      <span className={vencido ? 'text-red-600 font-semibold' : ''}>
                        Dev. estimada: {new Date(p.fechaDevolucionEstimada).toLocaleDateString('es-PE')}
                      </span>
                    )}
                    {p.proyecto && <span>Proyecto: {p.proyecto.codigo}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {p.items.map(item => {
                      const nombre = item.herramientaUnidad
                        ? `${item.herramientaUnidad.catalogoHerramienta.nombre} — Serie: ${item.herramientaUnidad.serie}`
                        : item.catalogoHerramienta?.nombre
                      return (
                        <li key={item.id} className="flex items-center justify-between rounded border px-2 py-1">
                          <span>{nombre}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.cantidadDevuelta}/{item.cantidadPrestada} devueltos
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  {(p.estado === 'activo' || p.estado === 'devuelto_parcial') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      disabled={devolviendo === p.id}
                      onClick={() => devolverTodo(p.id, p.items)}
                    >
                      {devolviendo === p.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                      Registrar devolución total
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
