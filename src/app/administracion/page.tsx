'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Clock, Banknote, FileCheck, CheckCircle, Loader2, ChevronRight, ArrowRight, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { getHojasDeGastos } from '@/lib/services/hojaDeGastos'
import type { HojaDeGastos } from '@/types'

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const estadoColor: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  depositado: 'bg-purple-100 text-purple-700',
  rendido: 'bg-orange-100 text-orange-700',
  validado: 'bg-teal-100 text-teal-700',
  cerrado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-700',
}

interface DashboardFinanciero {
  cuentasPorCobrar: {
    pendientePEN: number
    pendienteUSD: number
    totalPendiente: number
    countPendiente: number
    vencidas: Array<{
      id: string
      monto: number
      moneda: string
      fechaVencimiento: string
      cliente: { id: string; nombre: string }
      proyecto: { id: string; codigo: string; nombre: string }
      numeroDocumento: string | null
    }>
  }
  cuentasPorPagar: {
    pendientePEN: number
    pendienteUSD: number
    totalPendiente: number
    countPendiente: number
    vencidoPEN: number
    vencidoUSD: number
    totalVencido: number
    countVencido: number
    proximasVencer: Array<{
      id: string
      monto: number
      moneda: string
      fechaVencimiento: string
      proveedor: { id: string; nombre: string }
      proyecto: { id: string; codigo: string; nombre: string } | null
      numeroFactura: string | null
      condicionPago: string
    }>
  }
  cuentasBancarias: Array<{
    id: string
    nombreBanco: string
    numeroCuenta: string
    moneda: string
    tipo: string
  }>
}

const renderMonedaTotals = (pen: number, usd: number) => {
  const parts: string[] = []
  if (pen > 0) parts.push(`PEN: ${formatCurrency(pen, 'PEN')}`)
  if (usd > 0) parts.push(`USD: ${formatCurrency(usd, 'USD')}`)
  if (parts.length === 0) return formatCurrency(0, 'PEN')
  return parts.join(' | ')
}

export default function AdministracionDashboard() {
  const router = useRouter()
  const [hojas, setHojas] = useState<HojaDeGastos[]>([])
  const [financiero, setFinanciero] = useState<DashboardFinanciero | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [hojasData, finRes] = await Promise.all([
        getHojasDeGastos(),
        fetch('/api/administracion/dashboard'),
      ])
      setHojas(hojasData)
      if (finRes.ok) setFinanciero(await finRes.json())
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const counts = useMemo(() => {
    const porAprobar = hojas.filter(h => h.estado === 'enviado').length
    const porDepositar = hojas.filter(h => h.estado === 'aprobado' && h.requiereAnticipo).length
    const porValidar = hojas.filter(h => h.estado === 'rendido').length
    const porCerrar = hojas.filter(h => h.estado === 'validado').length
    return { porAprobar, porDepositar, porValidar, porCerrar }
  }, [hojas])

  const recientes = useMemo(() => {
    return [...hojas]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
  }, [hojas])

  const summaryCards = [
    {
      label: 'Por Aprobar',
      count: counts.porAprobar,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      estado: 'enviado',
    },
    {
      label: 'Por Depositar',
      count: counts.porDepositar,
      icon: Banknote,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      estado: 'aprobado',
    },
    {
      label: 'Por Validar',
      count: counts.porValidar,
      icon: FileCheck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      estado: 'rendido',
    },
    {
      label: 'Por Cerrar',
      count: counts.porCerrar,
      icon: CheckCircle,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      estado: 'validado',
    },
  ]

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      </div>
    )
  }

  const cxc = financiero?.cuentasPorCobrar
  const cxp = financiero?.cuentasPorPagar

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-rose-600" />
          Administración
        </h1>
        <p className="text-sm text-muted-foreground">
          Panel de control financiero y administrativo
        </p>
      </div>

      {/* CxC / CxP / Balance cards */}
      {financiero && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            className="border-green-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/administracion/cuentas-cobrar')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-50">
                  <ArrowDownCircle className="h-4 w-4 text-green-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-lg font-bold text-green-600">
                {renderMonedaTotals(cxc?.pendientePEN || 0, cxc?.pendienteUSD || 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                Por cobrar ({cxc?.countPendiente || 0})
                {(cxc?.vencidas?.length || 0) > 0 && (
                  <span className="text-red-600 ml-1">· {cxc!.vencidas.length} vencidas</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-red-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/administracion/cuentas-pagar')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-red-50">
                  <ArrowUpCircle className="h-4 w-4 text-red-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-lg font-bold text-red-600">
                {renderMonedaTotals(cxp?.pendientePEN || 0, cxp?.pendienteUSD || 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                Por pagar ({cxp?.countPendiente || 0})
                {(cxp?.countVencido || 0) > 0 && (
                  <span className="text-red-600 ml-1">· {cxp!.countVencido} vencidas</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <Landmark className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div className="space-y-1">
                {((cxc?.pendientePEN || 0) > 0 || (cxp?.pendientePEN || 0) > 0) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">PEN:</span>
                    <span className={`font-mono font-bold ${(cxc?.pendientePEN || 0) - (cxp?.pendientePEN || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {formatCurrency((cxc?.pendientePEN || 0) - (cxp?.pendientePEN || 0), 'PEN')}
                    </span>
                  </div>
                )}
                {((cxc?.pendienteUSD || 0) > 0 || (cxp?.pendienteUSD || 0) > 0) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">USD:</span>
                    <span className={`font-mono font-bold ${(cxc?.pendienteUSD || 0) - (cxp?.pendienteUSD || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {formatCurrency((cxc?.pendienteUSD || 0) - (cxp?.pendienteUSD || 0), 'USD')}
                    </span>
                  </div>
                )}
                {(cxc?.pendientePEN || 0) === 0 && (cxp?.pendientePEN || 0) === 0 && (cxc?.pendienteUSD || 0) === 0 && (cxp?.pendienteUSD || 0) === 0 && (
                  <div className="text-lg font-bold text-emerald-600">{formatCurrency(0, 'PEN')}</div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">Balance (CxC − CxP)</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CxC vencidas + CxP próximas a vencer */}
      {financiero && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* CxC vencidas */}
          {(cxc?.vencidas?.length || 0) > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  CxC Vencidas
                </h2>
                <button
                  onClick={() => router.push('/administracion/cuentas-cobrar?estado=pendiente')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver todas
                </button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {cxc!.vencidas.map(v => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{v.cliente.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {v.proyecto.codigo} · {v.numeroDocumento || 'Sin doc.'}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-sm font-semibold text-red-600">
                            {formatCurrency(v.monto, v.moneda)}
                          </div>
                          <div className="text-[10px] text-red-500">
                            Venció {formatDate(v.fechaVencimiento)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CxP próximas a vencer */}
          {(cxp?.proximasVencer?.length || 0) > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-orange-700 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  CxP Próximas a Vencer (7 días)
                </h2>
                <button
                  onClick={() => router.push('/administracion/cuentas-pagar')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver todas
                </button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {cxp!.proximasVencer.map(v => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{v.proveedor.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {v.proyecto?.codigo || '—'} · {v.numeroFactura || 'Sin factura'}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-sm font-semibold">
                            {formatCurrency(v.monto, v.moneda)}
                          </div>
                          <div className="text-[10px] text-orange-600">
                            Vence {formatDate(v.fechaVencimiento)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Cuentas bancarias activas */}
      {financiero && financiero.cuentasBancarias.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <Landmark className="h-3.5 w-3.5" />
              Cuentas Bancarias Activas
            </h2>
            <button
              onClick={() => router.push('/administracion/cuentas-bancarias')}
              className="text-xs text-blue-600 hover:underline"
            >
              Gestionar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {financiero.cuentasBancarias.map(cb => (
              <Card key={cb.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{cb.nombreBanco}</div>
                      <div className="text-xs text-muted-foreground font-mono">{cb.numeroCuenta}</div>
                    </div>
                    <Badge variant={cb.moneda === 'USD' ? 'default' : 'secondary'}>{cb.moneda}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Gastos - Summary cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Gestión de Gastos</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryCards.map(card => {
            const Icon = card.icon
            return (
              <Card
                key={card.estado}
                className={`${card.border} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => router.push(`/administracion/gastos?estado=${card.estado}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${card.bg}`}>
                      <Icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    {card.count > 0 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-2xl font-bold">{card.count}</div>
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Actividad reciente */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Actividad Reciente (Gastos)</h2>
          <button
            onClick={() => router.push('/administracion/gastos')}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            Ver todos <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <Card>
          <CardContent className="p-0">
            {recientes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No hay requerimientos registrados
              </div>
            ) : (
              <div className="divide-y">
                {recientes.map(hoja => (
                  <div
                    key={hoja.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/gastos/mis-requerimientos/${hoja.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-sm font-medium">{hoja.numero}</span>
                        <Badge className={`text-[10px] ${estadoColor[hoja.estado] || ''}`}>
                          {hoja.estado}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {hoja.empleado?.name || hoja.empleado?.email} — {hoja.motivo}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="font-mono text-sm">
                        {hoja.montoGastado > 0 ? formatCurrency(hoja.montoGastado) : hoja.requiereAnticipo ? formatCurrency(hoja.montoAnticipo) : '-'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDate(hoja.updatedAt)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
