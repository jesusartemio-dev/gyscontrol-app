'use client'

import { memo, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProyectoEquipoCotizado } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Eye,
  User,
  CheckCircle2,
  Clock
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

const EquiposTableView = memo(function EquiposTableView({
  equipos,
  proyectoId
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string>('nombre')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const filteredEquipos = useMemo(() => {
    return equipos.filter(equipo => {
      const term = searchTerm.toLowerCase()
      return searchTerm === '' ||
        equipo.nombre.toLowerCase().includes(term) ||
        equipo.responsable?.name?.toLowerCase().includes(term) ||
        equipo.descripcion?.toLowerCase().includes(term)
    })
  }, [equipos, searchTerm])

  const sortedEquipos = useMemo(() => {
    return [...filteredEquipos].sort((a, b) => {
      let aValue: number | string = ''
      let bValue: number | string = ''

      if (sortField === 'nombre') {
        aValue = a.nombre
        bValue = b.nombre
      } else if (sortField === 'totalItems') {
        aValue = a.items?.length || 0
        bValue = b.items?.length || 0
      } else if (sortField === 'totalCost') {
        aValue = a.items?.reduce((sum, item) => sum + (item.precioCliente * item.cantidad), 0) || 0
        bValue = b.items?.reduce((sum, item) => sum + (item.precioCliente * item.cantidad), 0) || 0
      } else if (sortField === 'responsableName') {
        aValue = a.responsable?.name || ''
        bValue = b.responsable?.name || ''
      } else if (sortField === 'progress') {
        const aItems = a.items?.length || 0
        const aCompleted = a.items?.filter(i => i.estado === 'en_lista' || i.estado === 'reemplazado' || i.listaId).length || 0
        const bItems = b.items?.length || 0
        const bCompleted = b.items?.filter(i => i.estado === 'en_lista' || i.estado === 'reemplazado' || i.listaId).length || 0
        aValue = aItems > 0 ? aCompleted / aItems : 0
        bValue = bItems > 0 ? bCompleted / bItems : 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredEquipos, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-2.5 w-2.5 ml-0.5 opacity-40" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-2.5 w-2.5 ml-0.5" />
      : <ArrowDown className="h-2.5 w-2.5 ml-0.5" />
  }

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
    <div className="space-y-2">
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
            {sortedEquipos.length} de {equipos.length}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b">
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                  <button onClick={() => handleSort('nombre')} className="flex items-center">
                    Nombre<SortIcon field="nombre" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-32">
                  <button onClick={() => handleSort('responsableName')} className="flex items-center">
                    Responsable<SortIcon field="responsableName" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16">
                  <button onClick={() => handleSort('totalItems')} className="flex items-center justify-center w-full">
                    Items<SortIcon field="totalItems" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-28">
                  <button onClick={() => handleSort('totalCost')} className="flex items-center justify-end w-full">
                    Total<SortIcon field="totalCost" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-28">
                  <button onClick={() => handleSort('progress')} className="flex items-center justify-center w-full">
                    Progreso<SortIcon field="progress" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedEquipos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No se encontraron equipos' : 'Sin equipos'}
                  </td>
                </tr>
              ) : (
                sortedEquipos.map((equipo, idx) => {
                  const stats = getEquipoStats(equipo)
                  return (
                    <tr
                      key={equipo.id}
                      className={cn(
                        'hover:bg-orange-50/50 transition-colors group',
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      )}
                    >
                      <td className="px-2 py-1.5">
                        <Link
                          href={`/proyectos/${proyectoId}/equipos/detalle/${equipo.id}`}
                          className="block"
                        >
                          <span className="font-medium text-orange-600 hover:text-orange-700 hover:underline">
                            {equipo.nombre}
                          </span>
                          {equipo.descripcion && (
                            <span className="block text-[10px] text-gray-500 line-clamp-1">
                              {equipo.descripcion}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1 text-gray-600">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="truncate">{equipo.responsable?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center font-medium">{stats.totalItems}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-green-600 font-medium">
                        {formatCurrency(stats.totalCost)}
                      </td>
                      <td className="px-2 py-1.5">
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
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <Link href={`/proyectos/${proyectoId}/equipos/detalle/${equipo.id}`}>
                            <Eye className="h-3 w-3 text-gray-500" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
})

export default EquiposTableView
