'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package,
  Wrench,
  Receipt,
  Calendar,
  Settings,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle,
  History
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { useCotizacionContext } from './cotizacion-context'

// Utility function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export default function CotizacionHubPage() {
  const router = useRouter()
  const { cotizacion } = useCotizacionContext()
  const [versionesCount, setVersionesCount] = useState(0)

  useEffect(() => {
    if (!cotizacion?.id) return
    fetch(`/api/cotizaciones/${cotizacion.id}/versions`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setVersionesCount(data.length) })
      .catch(() => {})
  }, [cotizacion?.id])

  if (!cotizacion) return null

  // Calculate statistics
  const totalEquipos = cotizacion.equipos?.length || 0
  const totalEquiposItems = cotizacion.equipos?.reduce((acc, e) => acc + (e.items?.length || 0), 0) || 0
  const totalServicios = cotizacion.servicios?.length || 0
  const totalServiciosItems = cotizacion.servicios?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0
  const totalGastos = cotizacion.gastos?.length || 0
  const totalGastosItems = cotizacion.gastos?.reduce((acc, g) => acc + (g.items?.length || 0), 0) || 0
  const totalCondiciones = cotizacion.condiciones?.length || 0
  const totalExclusiones = cotizacion.exclusiones?.length || 0

  const baseUrl = `/comercial/cotizaciones/${cotizacion.id}`

  const navigationCards = [
    {
      id: 'equipos',
      title: 'Equipos',
      description: 'Gestionar equipos cotizados',
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      hoverBg: 'hover:bg-blue-50',
      borderColor: 'border-blue-200',
      href: `${baseUrl}/equipos`,
      stats: [
        { label: 'Grupos', value: totalEquipos },
        { label: 'Items', value: totalEquiposItems },
      ],
      total: cotizacion.totalEquiposCliente || 0
    },
    {
      id: 'servicios',
      title: 'Servicios',
      description: 'Gestionar servicios cotizados',
      icon: Wrench,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      hoverBg: 'hover:bg-green-50',
      borderColor: 'border-green-200',
      href: `${baseUrl}/servicios`,
      stats: [
        { label: 'Grupos', value: totalServicios },
        { label: 'Items', value: totalServiciosItems },
      ],
      total: cotizacion.totalServiciosCliente || 0
    },
    {
      id: 'gastos',
      title: 'Gastos',
      description: 'Gestionar gastos adicionales',
      icon: Receipt,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      hoverBg: 'hover:bg-orange-50',
      borderColor: 'border-orange-200',
      href: `${baseUrl}/gastos`,
      stats: [
        { label: 'Grupos', value: totalGastos },
        { label: 'Items', value: totalGastosItems },
      ],
      total: cotizacion.totalGastosCliente || 0
    },
    {
      id: 'cronograma',
      title: 'Cronograma',
      description: 'EDT, Gantt y dependencias',
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      hoverBg: 'hover:bg-purple-50',
      borderColor: 'border-purple-200',
      href: `${baseUrl}/cronograma`,
      stats: [],
      badge: 'Planificación'
    },
    {
      id: 'configuracion',
      title: 'Configuración',
      description: 'Cabecera, condiciones y exclusiones',
      icon: Settings,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      hoverBg: 'hover:bg-gray-50',
      borderColor: 'border-gray-200',
      href: `${baseUrl}/configuracion`,
      stats: [
        { label: 'Condiciones', value: totalCondiciones },
        { label: 'Exclusiones', value: totalExclusiones },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navigationCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="h-full"
          >
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${card.hoverBg} group border-l-4 ${card.borderColor} h-full flex flex-col`}
              onClick={() => router.push(card.href)}
            >
              <CardHeader className="pb-2 flex-1">
                <div className="flex items-center justify-between min-h-[40px]">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  {card.badge && (
                    <Badge variant="outline" className="text-xs">
                      {card.badge}
                    </Badge>
                  )}
                  {card.total !== undefined && card.total > 0 && (
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency(card.total)}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg group-hover:text-primary flex items-center justify-between mt-2">
                  {card.title}
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm min-h-[24px]">
                  {card.stats && card.stats.length > 0 ? (
                    card.stats.map((stat, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900">{stat.value}</span>
                        <span className="text-muted-foreground">{stat.label}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs">Ver detalles</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cabecera Quick Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`${baseUrl}/configuracion`)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 rounded-lg">
                  <FileText className="h-5 w-5 text-cyan-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Cabecera</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {cotizacion.formaPago || 'Sin forma de pago'} • {cotizacion.moneda || 'USD'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Condiciones Quick Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`${baseUrl}/configuracion`)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Condiciones</p>
                  <p className="text-xs text-muted-foreground">
                    {totalCondiciones} {totalCondiciones === 1 ? 'condición' : 'condiciones'} definidas
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Exclusiones Quick Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`${baseUrl}/configuracion`)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Exclusiones</p>
                  <p className="text-xs text-muted-foreground">
                    {totalExclusiones} {totalExclusiones === 1 ? 'exclusión' : 'exclusiones'} definidas
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Versiones Quick Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`${baseUrl}/configuracion`)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <History className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Versiones</p>
                  <p className="text-xs text-muted-foreground">
                    {versionesCount} {versionesCount === 1 ? 'versión' : 'versiones'} guardadas
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
