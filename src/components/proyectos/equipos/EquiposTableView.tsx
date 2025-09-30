// ===================================================
// 📁 Archivo: EquiposTableView.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Vista de tabla para la lista de equipos (grupos)
//
// 🧠 Uso: Se utiliza en la página de lista de equipos para mostrar equipos en tabla
// ✍️ Autor: Kilo Code
// 📅 Última actualización: 2025-09-27
// ===================================================

'use client'

import React, { memo, useMemo, useState } from 'react'
import type { ProyectoEquipoCotizado } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Eye, Edit, Trash2, User, List } from 'lucide-react'
import Link from 'next/link'

interface Props {
  equipos: ProyectoEquipoCotizado[]
  proyectoId: string
  onEquipoChange?: (equipoId: string, changes: Partial<ProyectoEquipoCotizado>) => void
  onEquipoDelete?: (equipoId: string) => void
  onCreateList?: (equipo: ProyectoEquipoCotizado) => void
}

const EquiposTableView = memo(function EquiposTableView({
  equipos,
  proyectoId,
  onEquipoChange,
  onEquipoDelete,
  onCreateList
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string>('nombre')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // ✅ Filtrar equipos
  const filteredEquipos = useMemo(() => {
    return equipos.filter(equipo => {
      const matchesSearch = searchTerm === '' ||
        equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipo.responsable?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (equipo.descripcion && equipo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))

      return matchesSearch
    })
  }, [equipos, searchTerm])

  // ✅ Ordenar equipos
  const sortedEquipos = useMemo(() => {
    return [...filteredEquipos].sort((a, b) => {
      let aValue: any = a[sortField as keyof ProyectoEquipoCotizado]
      let bValue: any = b[sortField as keyof ProyectoEquipoCotizado]

      // Manejar campos especiales
      if (sortField === 'totalItems') {
        aValue = a.items?.length || 0
        bValue = b.items?.length || 0
      } else if (sortField === 'totalCost') {
        aValue = a.items?.reduce((sum, item) =>
          sum + (item.precioCliente * item.cantidad), 0
        ) || 0
        bValue = b.items?.reduce((sum, item) =>
          sum + (item.precioCliente * item.cantidad), 0
        ) || 0
      } else if (sortField === 'responsableName') {
        aValue = a.responsable?.name || ''
        bValue = b.responsable?.name || ''
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredEquipos, sortField, sortDirection])

  // ✅ Función para manejar ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // ✅ Función para obtener ícono de ordenamiento
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  // ✅ Calcular estadísticas de un equipo
  const getEquipoStats = (equipo: ProyectoEquipoCotizado) => {
    const totalItems = equipo.items?.length || 0
    const totalCost = equipo.items?.reduce((sum, item) =>
      sum + (item.precioCliente * item.cantidad), 0
    ) || 0
    const completedItems = equipo.items?.filter(item =>
      item.estado === 'en_lista' || item.estado === 'reemplazado' || item.listaId
    ).length || 0
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    const hasListsCreated = completedItems > 0

    return { totalItems, totalCost, completedItems, progress, hasListsCreated }
  }

  return (
    <div className="space-y-4">
      {/* 🔍 Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, responsable o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {sortedEquipos.length} de {equipos.length} equipos
        </div>
      </div>

      {/* 📊 Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('nombre')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Nombre {getSortIcon('nombre')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('responsableName')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Responsable {getSortIcon('responsableName')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalItems')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Ítems {getSortIcon('totalItems')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalCost')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Costo Total {getSortIcon('totalCost')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-center">Progreso</TableHead>
                <TableHead className="font-semibold text-center">Estado</TableHead>
                <TableHead className="font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEquipos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron equipos que coincidan con la búsqueda
                  </TableCell>
                </TableRow>
              ) : (
                sortedEquipos.map((equipo) => {
                  const stats = getEquipoStats(equipo)
                  return (
                    <TableRow key={equipo.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-semibold text-blue-600">{equipo.nombre}</div>
                          {equipo.descripcion && (
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {equipo.descripcion}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{equipo.responsable?.name || 'Sin asignar'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{stats.totalItems}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${stats.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${stats.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{stats.progress.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {stats.hasListsCreated ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                            <List className="w-3 h-3 mr-1" />
                            Lista Creada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/proyectos/${proyectoId}/equipos/detalle/${equipo.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEquipoChange?.(equipo.id, {})}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEquipoDelete?.(equipo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
})

export default EquiposTableView