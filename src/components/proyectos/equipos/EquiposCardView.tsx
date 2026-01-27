'use client'

import { memo, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProyectoEquipoCotizado } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Search,
  Eye,
  User,
  Package,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

interface Props {
  equipos: ProyectoEquipoCotizado[]
  proyectoId: string
  onEquipoChange?: (equipoId: string, changes: Partial<ProyectoEquipoCotizado>) => void
  onEquipoDelete?: (equipoId: string) => void
  onCreateList?: (equipo: ProyectoEquipoCotizado) => void
}

const EquiposCardView = memo(function EquiposCardView({
  equipos,
  proyectoId
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEquipos = useMemo(() => {
    return equipos.filter(equipo => {
      const term = searchTerm.toLowerCase()
      return searchTerm === '' ||
        equipo.nombre.toLowerCase().includes(term) ||
        equipo.responsable?.name?.toLowerCase().includes(term) ||
        equipo.descripcion?.toLowerCase().includes(term)
    })
  }, [equipos, searchTerm])

  const getEquipoStats = (equipo: ProyectoEquipoCotizado) => {
    const totalItems = equipo.items?.length || 0
    const totalCost = equipo.items?.reduce((sum, item) => sum + (item.precioCliente * item.cantidad), 0) || 0
    const completedItems = equipo.items?.filter(item =>
      item.estado === 'en_lista' || item.estado === 'reemplazado' || item.listaId
    ).length || 0
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

    return { totalItems, totalCost, completedItems, progress }
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      {equipos.length > 3 && (
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {filteredEquipos.length} de {equipos.length}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredEquipos.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
            {searchTerm ? 'No se encontraron equipos' : 'Sin equipos'}
          </div>
        ) : (
          filteredEquipos.map((equipo) => {
            const stats = getEquipoStats(equipo)
            return (
              <Link
                key={equipo.id}
                href={`/proyectos/${proyectoId}/equipos/detalle/${equipo.id}`}
                className={cn(
                  'block border rounded-lg p-3 transition-all group',
                  'hover:border-orange-300 hover:shadow-sm hover:bg-orange-50/30'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {equipo.nombre}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-orange-500 flex-shrink-0" />
                </div>

                {/* Responsable */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <User className="h-3 w-3" />
                  <span className="truncate">{equipo.responsable?.name || 'Sin asignar'}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs mb-3">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                    {stats.totalItems} items
                  </Badge>
                  <span className="text-gray-300">|</span>
                  <span className="font-mono text-green-600 font-medium">
                    {formatCurrency(stats.totalCost)}
                  </span>
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          stats.progress === 100 ? 'bg-green-500' : 'bg-orange-500'
                        )}
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium w-8 text-right">
                      {stats.progress.toFixed(0)}%
                    </span>
                    {stats.progress === 100 ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : stats.completedItems > 0 ? (
                      <Clock className="h-3 w-3 text-orange-500" />
                    ) : (
                      <Clock className="h-3 w-3 text-gray-300" />
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {stats.completedItems} de {stats.totalItems} en lista
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
})

export default EquiposCardView
