'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Wrench,
  ArrowLeftRight,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  Loader2,
  ArrowRight,
} from 'lucide-react'

interface KPIs {
  totalItemsConStock: number
  itemsConStockPositivo: number
  totalHerramientasDisponibles: number
  totalHerramientasPrestadas: number
  prestamosActivos: number
  prestamosVencidos: number
  devolucionesEsteMes: number
  movimientosHoy: number
}

export default function AlmacenDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const [stockRes, prestamosRes, movsRes] = await Promise.all([
          fetch('/api/logistica/almacen/stock'),
          fetch('/api/logistica/almacen/prestamos?limit=500'),
          fetch(`/api/logistica/almacen/movimientos?desde=${new Date().toISOString().slice(0, 10)}&limit=1`),
        ])

        const stock = await stockRes.json()
        const prestamosData = await prestamosRes.json()
        const movsData = await movsRes.json()

        const prestamos = prestamosData.prestamos || []
        const hoy = new Date().toISOString().slice(0, 10)

        const equiposStock = stock.filter((s: any) => s.catalogoEquipoId)
        const herrStock = stock.filter((s: any) => s.catalogoHerramientaId)

        setKpis({
          totalItemsConStock: equiposStock.length,
          itemsConStockPositivo: equiposStock.filter((s: any) => s.cantidadDisponible > 0).length,
          totalHerramientasDisponibles: herrStock.reduce((a: number, s: any) => a + s.cantidadDisponible, 0),
          totalHerramientasPrestadas: prestamos.filter((p: any) => p.estado === 'activo' || p.estado === 'devuelto_parcial').reduce(
            (a: number, p: any) => a + p.items.filter((i: any) => i.estado === 'prestado').length, 0
          ),
          prestamosActivos: prestamos.filter((p: any) => p.estado === 'activo' || p.estado === 'devuelto_parcial').length,
          prestamosVencidos: prestamos.filter((p: any) => p.estado === 'vencido').length,
          devolucionesEsteMes: 0,
          movimientosHoy: movsData.total || 0,
        })
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Almacén Central</h1>
        <p className="text-sm text-muted-foreground">Resumen de materiales, herramientas y préstamos</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="h-4 w-4" /> Materiales con stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis?.itemsConStockPositivo ?? 0}</p>
            <p className="text-xs text-muted-foreground">{kpis?.totalItemsConStock ?? 0} ítems registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wrench className="h-4 w-4" /> Herramientas disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis?.totalHerramientasDisponibles ?? 0}</p>
            <p className="text-xs text-muted-foreground">{kpis?.totalHerramientasPrestadas ?? 0} items prestados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowLeftRight className="h-4 w-4" /> Préstamos activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis?.prestamosActivos ?? 0}</p>
            {(kpis?.prestamosVencidos ?? 0) > 0 && (
              <Badge variant="outline" className="mt-1 bg-red-100 text-red-700">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {kpis?.prestamosVencidos} vencidos
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Movimientos hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis?.movimientosHoy ?? 0}</p>
            <p className="text-xs text-muted-foreground">entradas / salidas</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/logistica/almacen/materiales">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold">Materiales / Equipos</p>
                  <p className="text-xs text-muted-foreground">Stock de materiales y componentes</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/logistica/almacen/herramientas">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <Wrench className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="font-semibold">Herramientas</p>
                  <p className="text-xs text-muted-foreground">Catálogo y unidades serializadas</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/logistica/almacen/prestamos">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="font-semibold">Préstamos</p>
                  <p className="text-xs text-muted-foreground">Herramientas prestadas al personal</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/logistica/almacen/devoluciones">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <RotateCcw className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="font-semibold">Devoluciones</p>
                  <p className="text-xs text-muted-foreground">Material devuelto desde proyecto</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/logistica/almacen/movimientos">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-gray-600" />
                <div>
                  <p className="font-semibold">Movimientos (Kardex)</p>
                  <p className="text-xs text-muted-foreground">Historial completo de entradas y salidas</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
