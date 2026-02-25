'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Home,
  ChevronRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Types ───

interface CartaFianza {
  id: string
  proyectoId: string
  tipo: string
  estado: string
  entidadFinanciera: string
  numeroCarta: string | null
  moneda: string
  monto: number
  fechaEmision: string
  fechaVencimiento: string
  notas: string | null
  proyecto: {
    id: string
    codigo: string
    nombre: string
    cliente: { nombre: string }
  }
  adjuntos: { id: string; nombreArchivo: string; urlArchivo: string }[]
  renovaciones?: { id: string; numeroCarta: string | null; estado: string; fechaVencimiento: string }[]
}

interface Resumen {
  total: number
  vigentes: number
  porVencer: number
  vencidas: number
  montoTotalUSD: number
  montoTotalPEN: number
}

// ─── Helpers ───

const TIPO_LABELS: Record<string, string> = {
  fiel_cumplimiento: 'Fiel Cumplimiento',
  adelanto: 'Adelanto',
  garantia: 'Garantía',
  beneficios_sociales: 'Beneficios Sociales',
}

const ESTADO_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por Vencer',
  vencida: 'Vencida',
  ejecutada: 'Ejecutada',
  devuelta: 'Devuelta',
  renovada: 'Renovada',
}

const ESTADO_COLORS: Record<string, string> = {
  vigente: 'bg-emerald-100 text-emerald-700',
  por_vencer: 'bg-amber-100 text-amber-700',
  vencida: 'bg-red-100 text-red-700',
  ejecutada: 'bg-purple-100 text-purple-700',
  devuelta: 'bg-gray-100 text-gray-700',
  renovada: 'bg-blue-100 text-blue-700',
}

const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatCurrency = (amount: number, moneda: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: moneda === 'PEN' ? 'PEN' : 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

const diasRestantes = (fecha: string) => {
  const diff = new Date(fecha).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Component ───

export default function CartasFianzaPage() {
  const [cartas, setCartas] = useState<CartaFianza[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('__all__')
  const [filtroTipo, setFiltroTipo] = useState('__all__')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroEstado !== '__all__') params.set('estado', filtroEstado)
      if (filtroTipo !== '__all__') params.set('tipo', filtroTipo)
      const res = await fetch(`/api/cartas-fianza?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCartas(data.cartas || [])
        setResumen(data.resumen || null)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, filtroTipo])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="p-4 space-y-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion" className="hover:text-foreground transition-colors">
          Gestión
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Cartas de Fianza</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cartas de Fianza</h1>
          <p className="text-sm text-muted-foreground">
            Vista global de todas las cartas de fianza del sistema
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="text-2xl font-bold">{resumen.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Vigentes</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600">{resumen.vigentes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Por Vencer</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">{resumen.porVencer}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Vencidas</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{resumen.vencidas}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monto total */}
      {resumen && (resumen.montoTotalUSD > 0 || resumen.montoTotalPEN > 0) && (
        <div className="text-sm text-muted-foreground">
          Monto comprometido (vigentes + por vencer):{' '}
          {resumen.montoTotalUSD > 0 && <span className="font-medium text-foreground">{formatCurrency(resumen.montoTotalUSD, 'USD')}</span>}
          {resumen.montoTotalUSD > 0 && resumen.montoTotalPEN > 0 && ' + '}
          {resumen.montoTotalPEN > 0 && <span className="font-medium text-foreground">{formatCurrency(resumen.montoTotalPEN, 'PEN')}</span>}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los estados</SelectItem>
            {Object.entries(ESTADO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Cargando cartas de fianza...
        </div>
      ) : cartas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No se encontraron cartas de fianza.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Proyecto</th>
                <th className="px-3 py-2 font-medium">Entidad</th>
                <th className="px-3 py-2 font-medium text-right">Monto</th>
                <th className="px-3 py-2 font-medium">Vencimiento</th>
                <th className="px-3 py-2 font-medium">Días</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cartas.map(carta => {
                const dias = diasRestantes(carta.fechaVencimiento)
                return (
                  <tr key={carta.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${ESTADO_COLORS[carta.estado] || 'bg-gray-100 text-gray-700'}`}>
                        {ESTADO_LABELS[carta.estado] || carta.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{TIPO_LABELS[carta.tipo] || carta.tipo}</span>
                      {carta.numeroCarta && (
                        <span className="text-xs text-muted-foreground ml-1 font-mono">#{carta.numeroCarta}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/proyectos/${carta.proyectoId}`}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {carta.proyecto.codigo}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {carta.proyecto.cliente.nombre}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{carta.entidadFinanciera}</td>
                    <td className="px-3 py-2 text-right font-medium font-mono">
                      {formatCurrency(carta.monto, carta.moneda)}
                    </td>
                    <td className="px-3 py-2">{formatDate(carta.fechaVencimiento)}</td>
                    <td className="px-3 py-2">
                      {['vigente', 'por_vencer'].includes(carta.estado) ? (
                        <span className={`font-medium ${dias <= 30 ? 'text-amber-600' : dias <= 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {dias > 0 ? `${dias}d` : dias === 0 ? 'hoy' : `${Math.abs(dias)}d atrás`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
