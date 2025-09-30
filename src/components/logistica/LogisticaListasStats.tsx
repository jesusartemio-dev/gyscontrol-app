// ===================================================
// 📁 Archivo: LogisticaListasStats.tsx
// 📌 Descripción: Componente de estadísticas para listas de logística
// 🧠 Uso: Muestra métricas y KPIs importantes
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useMemo } from 'react'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  Building2,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ListaEquipo, Proyecto, EstadoListaEquipo } from '@/types'

interface LogisticaListasStatsProps {
  listas: ListaEquipo[]
  proyectos: Proyecto[]
  className?: string
}

interface StatsData {
  total: number
  porEstado: Record<EstadoListaEquipo, number>
  totalItems: number
  promedioItemsPorLista: number
  proyectosConListas: number
  listasRecientes: number
  completionRate: number
}

const ESTADOS_CONFIG: Record<EstadoListaEquipo, { 
  label: string
  color: string
  bgColor: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  borrador: { 
    label: 'Borrador', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-100',
    icon: FileText
  },
  por_revisar: { 
    label: 'Por Revisar', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-100',
    icon: Clock
  },
  por_cotizar: { 
    label: 'Por Cotizar', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    icon: Package
  },
  por_validar: { 
    label: 'Por Validar', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-100',
    icon: AlertCircle
  },
  por_aprobar: { 
    label: 'Por Aprobar', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-100',
    icon: Clock
  },
  aprobado: { 
    label: 'Aprobado', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    icon: CheckCircle
  },
  rechazado: { 
    label: 'Rechazado', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    icon: XCircle
  },
}

export default function LogisticaListasStats({ listas, proyectos, className }: LogisticaListasStatsProps) {
  const stats = useMemo((): StatsData => {
    // Validate listas array
    if (!listas || !Array.isArray(listas)) {
      return {
        total: 0,
        porEstado: {
          borrador: 0,
          por_revisar: 0,
          por_cotizar: 0,
          por_validar: 0,
          por_aprobar: 0,
          aprobado: 0,
          rechazado: 0
        },
        totalItems: 0,
        promedioItemsPorLista: 0,
        proyectosConListas: 0,
        listasRecientes: 0,
        completionRate: 0
      }
    }
    
    const total = listas.length
    
    // Count by status
    const porEstado = listas.reduce((acc, lista) => {
      acc[lista.estado] = (acc[lista.estado] || 0) + 1
      return acc
    }, {} as Record<EstadoListaEquipo, number>)

    // Ensure all states are represented
    Object.keys(ESTADOS_CONFIG).forEach(estado => {
      if (!porEstado[estado as EstadoListaEquipo]) {
        porEstado[estado as EstadoListaEquipo] = 0
      }
    })

    // Total items across all lists
    const totalItems = listas.reduce((sum, lista) => sum + (lista.items?.length || 0), 0)
    
    // Average items per list
    const promedioItemsPorLista = total > 0 ? Math.round(totalItems / total * 10) / 10 : 0
    
    // Projects with lists
    const proyectosConListasSet = new Set(listas.map(lista => lista.proyectoId))
    const proyectosConListas = proyectosConListasSet.size
    
    // Recent lists (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const listasRecientes = listas.filter(lista => 
      new Date(lista.createdAt) >= sevenDaysAgo
    ).length
    
    // Completion rate (approved / total)
    const completionRate = total > 0 ? Math.round((porEstado.aprobado / total) * 100) : 0
    
    return {
      total,
      porEstado,
      totalItems,
      promedioItemsPorLista,
      proyectosConListas,
      listasRecientes,
      completionRate
    }
  }, [listas])

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color = 'text-blue-600',
    bgColor = 'bg-blue-100'
  }: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ComponentType<{ className?: string }>
    color?: string
    bgColor?: string
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Listas"
          value={stats.total}
          subtitle="En el sistema"
          icon={FileText}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        
        <StatCard
          title="Total Ítems"
          value={stats.totalItems}
          subtitle={`${stats.promedioItemsPorLista} promedio por lista`}
          icon={Package}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        
        <StatCard
          title="Proyectos Activos"
          value={stats.proyectosConListas}
          subtitle={`de ${proyectos.length} proyectos`}
          icon={Building2}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        
        <StatCard
          title="Listas Recientes"
          value={stats.listasRecientes}
          subtitle="Últimos 7 días"
          icon={TrendingUp}
          color="text-orange-600"
          bgColor="bg-orange-100"
        />
      </div>

      {/* Compact Status Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Estado de Listas
            </h3>
            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-white">
              {stats.completionRate}% Completado
            </Badge>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-700">Aprobadas: {stats.porEstado.aprobado}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-gray-700">En Proceso: {stats.porEstado.por_revisar + stats.porEstado.por_cotizar + stats.porEstado.por_validar + stats.porEstado.por_aprobar}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-700">Por Cotizar: {stats.porEstado.por_cotizar}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-700">Rechazadas: {stats.porEstado.rechazado}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <Progress value={stats.completionRate} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
