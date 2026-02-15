'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Clock, Banknote, FileCheck, CheckCircle, Loader2, ChevronRight, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { getHojasDeGastos } from '@/lib/services/hojaDeGastos'
import type { HojaDeGastos } from '@/types'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

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

export default function AdministracionDashboard() {
  const router = useRouter()
  const [hojas, setHojas] = useState<HojaDeGastos[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getHojasDeGastos()
      setHojas(data)
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
    const totalPendiente = porAprobar + porDepositar + porValidar + porCerrar
    return { porAprobar, porDepositar, porValidar, porCerrar, totalPendiente }
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

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-rose-600" />
          Administración
        </h1>
        <p className="text-sm text-muted-foreground">
          {counts.totalPendiente > 0
            ? `${counts.totalPendiente} requerimientos pendientes de acción`
            : 'Todo al día'}
        </p>
      </div>

      {/* Summary cards */}
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

      {/* Actividad reciente */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Actividad Reciente</h2>
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
                    onClick={() => router.push(`/finanzas/requerimientos/${hoja.id}`)}
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
