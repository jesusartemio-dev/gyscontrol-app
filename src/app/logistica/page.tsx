'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Package,
  Building2,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buildApiUrl } from '@/lib/utils'
import { getAllPedidoEquipos } from '@/lib/services/pedidoEquipo'
import { getCotizacionesProveedor } from '@/lib/services/cotizacionProveedor'
import { getProveedores } from '@/lib/services/proveedor'

interface DashboardStats {
  listas: { total: number; porCotizar: number; porValidar: number; porAprobar: number }
  cotizaciones: { total: number; pendientes: number; cotizados: number; seleccionados: number }
  pedidos: { total: number; enProgreso: number; entregados: number; retrasados: number }
  proveedores: { total: number }
}

export default function LogisticaPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [listasRes, cotData, pedData, provData] = await Promise.all([
          fetch(buildApiUrl('/api/lista-equipo')),
          getCotizacionesProveedor(),
          getAllPedidoEquipos(),
          getProveedores(),
        ])

        const listas = await listasRes.json()
        const listasArr = Array.isArray(listas) ? listas : []
        const cotizaciones = cotData || []
        const pedidos = pedData || []
        const proveedores = provData || []

        setStats({
          listas: {
            total: listasArr.length,
            porCotizar: listasArr.filter((l: any) => l.estado === 'por_cotizar').length,
            porValidar: listasArr.filter((l: any) => l.estado === 'por_validar').length,
            porAprobar: listasArr.filter((l: any) => l.estado === 'por_aprobar').length,
          },
          cotizaciones: {
            total: cotizaciones.length,
            pendientes: cotizaciones.filter(c => c.estado === 'pendiente').length,
            cotizados: cotizaciones.filter(c => c.estado === 'cotizado').length,
            seleccionados: cotizaciones.filter(c => c.estado === 'seleccionado').length,
          },
          pedidos: {
            total: pedidos.length,
            enProgreso: pedidos.filter((p: any) => ['enviado', 'atendido', 'parcial'].includes(p.estado || '')).length,
            entregados: pedidos.filter((p: any) => p.estado === 'entregado').length,
            retrasados: pedidos.filter((p: any) => {
              if (!p.fechaNecesaria) return false
              return new Date(p.fechaNecesaria) < new Date() && p.estado !== 'entregado' && p.estado !== 'cancelado'
            }).length,
          },
          proveedores: { total: proveedores.length },
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sections = [
    {
      title: 'Listas Técnicas',
      description: 'Gestión de equipos por proyecto',
      href: '/logistica/listas',
      icon: FileText,
      color: 'bg-blue-100 text-blue-600',
      borderColor: 'border-l-blue-400',
      badges: stats ? [
        stats.listas.porCotizar > 0 && { label: `${stats.listas.porCotizar} por cotizar`, color: 'bg-amber-100 text-amber-700' },
        stats.listas.porValidar > 0 && { label: `${stats.listas.porValidar} por validar`, color: 'bg-blue-100 text-blue-700' },
        stats.listas.porAprobar > 0 && { label: `${stats.listas.porAprobar} por aprobar`, color: 'bg-purple-100 text-purple-700' },
      ].filter(Boolean) : [],
      stat: stats?.listas.total || 0,
    },
    {
      title: 'Cotizaciones Proveedores',
      description: 'Solicitudes y respuestas de proveedores',
      href: '/logistica/cotizaciones',
      icon: Package,
      color: 'bg-purple-100 text-purple-600',
      borderColor: 'border-l-purple-400',
      badges: stats ? [
        stats.cotizaciones.pendientes > 0 && { label: `${stats.cotizaciones.pendientes} pendientes`, color: 'bg-amber-100 text-amber-700' },
        stats.cotizaciones.cotizados > 0 && { label: `${stats.cotizaciones.cotizados} cotizados`, color: 'bg-blue-100 text-blue-700' },
      ].filter(Boolean) : [],
      stat: stats?.cotizaciones.total || 0,
    },
    {
      title: 'Pedidos de Equipos',
      description: 'Control logístico y entregas',
      href: '/logistica/pedidos',
      icon: Truck,
      color: 'bg-green-100 text-green-600',
      borderColor: 'border-l-green-400',
      badges: stats ? [
        stats.pedidos.enProgreso > 0 && { label: `${stats.pedidos.enProgreso} en progreso`, color: 'bg-blue-100 text-blue-700' },
        stats.pedidos.retrasados > 0 && { label: `${stats.pedidos.retrasados} retrasados`, color: 'bg-red-100 text-red-700' },
      ].filter(Boolean) : [],
      stat: stats?.pedidos.total || 0,
    },
    {
      title: 'Proveedores',
      description: 'Directorio de proveedores',
      href: '/logistica/proveedores',
      icon: Building2,
      color: 'bg-slate-100 text-slate-600',
      borderColor: 'border-l-slate-400',
      badges: [],
      stat: stats?.proveedores.total || 0,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Truck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Panel de Logística</h1>
              <p className="text-[10px] text-muted-foreground">Resumen general del módulo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* KPIs principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-amber-400">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <div>
                  <div className="text-lg font-bold text-amber-600">{stats?.listas.porCotizar || 0}</div>
                  <div className="text-[11px] text-muted-foreground">Listas por cotizar</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-lg font-bold text-blue-600">{stats?.cotizaciones.pendientes || 0}</div>
                  <div className="text-[11px] text-muted-foreground">Cotizaciones pendientes</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-lg font-bold text-green-600">{stats?.pedidos.entregados || 0}</div>
                  <div className="text-[11px] text-muted-foreground">Pedidos entregados</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-400">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-lg font-bold text-red-600">{stats?.pedidos.retrasados || 0}</div>
                  <div className="text-[11px] text-muted-foreground">Pedidos retrasados</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Link key={section.href} href={section.href}>
                <Card className={`border-l-4 ${section.borderColor} hover:shadow-md transition-shadow cursor-pointer`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-lg ${section.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{section.title}</h3>
                          <p className="text-[11px] text-muted-foreground">{section.description}</p>
                          {section.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {section.badges.map((badge: any, i: number) => (
                                <Badge key={i} className={`text-[9px] h-4 px-1.5 border-0 ${badge.color}`}>
                                  {badge.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-muted-foreground">{section.stat}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
