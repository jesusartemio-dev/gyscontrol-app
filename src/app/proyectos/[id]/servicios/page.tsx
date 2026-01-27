'use client'

import { useEffect, useState } from 'react'
import { Wrench, Table, Grid3X3, Download, Search, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useProyectoContext } from '../ProyectoContext'

function ServiciosSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

export default function ProyectoServiciosPage() {
  const { proyecto } = useProyectoContext()
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (proyecto) {
      setLoading(false)
    }
  }, [proyecto])

  if (!proyecto) return null

  const servicios = proyecto.servicios || []

  // Filtrar servicios
  const serviciosFiltrados = servicios.filter(servicio => {
    if (!busqueda) return true
    return servicio.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (servicio as any).edt?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  })

  // Stats compactos
  const totalItems = servicios.reduce((sum, s) => sum + (s.items?.length || 0), 0)
  const totalHoras = servicios.reduce((sum, s) =>
    sum + (s.items?.reduce((h, i) => h + i.cantidadHoras, 0) || 0), 0
  )
  const totalCosto = servicios.reduce((sum, s) => sum + (s.subtotalCliente || 0), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Compacto */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Wrench className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold">Servicios Cotizados</h2>
        <span className="text-sm text-muted-foreground">
          ({servicios.length} grupos · {totalItems} items · {totalHoras}h · {formatCurrency(totalCosto)})
        </span>

        <div className="flex-1" />

        {/* Búsqueda compacta */}
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-7 px-2 rounded-r-none"
          >
            <Table className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            className="h-7 px-2 rounded-l-none"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Contenido */}
      {loading ? (
        <ServiciosSkeleton />
      ) : serviciosFiltrados.length === 0 ? (
        <div className="flex items-center justify-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
          <div className="text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">
              {servicios.length === 0 ? 'No hay servicios en este proyecto' : 'No se encontraron servicios'}
            </p>
            <p className="text-sm text-muted-foreground">
              {servicios.length === 0 ? 'Los servicios se importan desde la cotización.' : 'Ajusta el filtro de búsqueda.'}
            </p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Vista Tabla */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Servicio</th>
                <th className="text-left p-3 font-medium">EDT</th>
                <th className="text-center p-3 font-medium">Items</th>
                <th className="text-center p-3 font-medium">Horas</th>
                <th className="text-center p-3 font-medium w-24">Progreso</th>
                <th className="text-right p-3 font-medium">Cliente</th>
                <th className="text-right p-3 font-medium">Interno</th>
              </tr>
            </thead>
            <tbody>
              {serviciosFiltrados.map((servicio) => {
                const items = servicio.items || []
                const horasTotales = items.reduce((sum, item) => sum + item.cantidadHoras, 0)
                const horasEjecutadas = items.reduce((sum, item) => sum + item.horasEjecutadas, 0)
                const progreso = horasTotales > 0 ? (horasEjecutadas / horasTotales) * 100 : 0
                const edtNombre = (servicio as any).edt?.nombre || '—'

                return (
                  <tr key={servicio.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{servicio.nombre}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {edtNombre}
                      </Badge>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">{items.length}</td>
                    <td className="p-3 text-center">
                      <span className="text-muted-foreground">{horasEjecutadas}</span>
                      <span className="text-muted-foreground/60">/{horasTotales}h</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress value={progreso} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{Math.round(progreso)}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-green-600">
                      {formatCurrency(servicio.subtotalCliente)}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {formatCurrency(servicio.subtotalInterno)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Vista Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviciosFiltrados.map((servicio) => {
            const items = servicio.items || []
            const horasTotales = items.reduce((sum, item) => sum + item.cantidadHoras, 0)
            const horasEjecutadas = items.reduce((sum, item) => sum + item.horasEjecutadas, 0)
            const progreso = horasTotales > 0 ? (horasEjecutadas / horasTotales) * 100 : 0

            return (
              <Card key={servicio.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">{servicio.nombre}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {(servicio as any).edt?.nombre || '—'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{items.length} items</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {horasEjecutadas}/{horasTotales}h
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium">{Math.round(progreso)}%</span>
                    </div>
                    <Progress value={progreso} className="h-1.5" />
                  </div>

                  <div className="flex justify-between pt-2 border-t text-sm">
                    <div>
                      <div className="font-semibold text-green-600">{formatCurrency(servicio.subtotalCliente)}</div>
                      <div className="text-[10px] text-muted-foreground">Cliente</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-muted-foreground">{formatCurrency(servicio.subtotalInterno)}</div>
                      <div className="text-[10px] text-muted-foreground">Interno</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
