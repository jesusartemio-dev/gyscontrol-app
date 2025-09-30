// ===================================================
// 📁 Archivo: EquipoItemsTableView.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Vista de tabla para los ítems de un equipo específico
//
// 🧠 Uso: Se utiliza en la página de detalle de equipo para mostrar ítems en tabla
// ✍️ Autor: Kilo Code
// 📅 Última actualización: 2025-09-27
// ===================================================

'use client'

import React, { memo, useMemo, useState } from 'react'
import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@prisma/client'

// Extended type that includes items relation
type ProyectoEquipoCotizadoWithItems = ProyectoEquipoCotizado & {
  items: ProyectoEquipoCotizadoItem[]
}
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, Edit } from 'lucide-react'

interface Props {
  equipo: ProyectoEquipoCotizadoWithItems
  onItemChange: (items: ProyectoEquipoCotizadoItem[]) => void
}

// ✅ Función para manejar ordenamiento
const EquipoItemsTableView = memo(function EquipoItemsTableView({
  equipo,
  onItemChange
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string>('codigo')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterEstado, setFilterEstado] = useState<string>('todos')

  // ✅ Filtrar ítems
  const filteredItems = useMemo(() => {
    return equipo.items?.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEstado = filterEstado === 'todos' || item.estado === filterEstado

      return matchesSearch && matchesEstado
    }) || []
  }, [equipo.items, searchTerm, filterEstado])

  // ✅ Ordenar ítems
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let aValue: any = a[sortField as keyof ProyectoEquipoCotizadoItem]
      let bValue: any = b[sortField as keyof ProyectoEquipoCotizadoItem]

      // No special sorting fields needed for technical view

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredItems, sortField, sortDirection])

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

  // ✅ Función para obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'en_lista': return 'bg-green-100 text-green-800'
      case 'reemplazado': return 'bg-blue-100 text-blue-800'
      case 'descartado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // ✅ Función para determinar disponibilidad para listas
  const getDisponibilidadStatus = (item: any) => {
    // Si el item tiene listaId, significa que ya está asignado a una lista
    if (item.listaId) {
      return {
        label: 'En Lista',
        color: 'bg-green-100 text-green-800',
        description: 'Ya incluido en lista de compras'
      }
    }

    // Si está descartado, no está disponible
    if (item.estado === 'descartado') {
      return {
        label: 'Descartado',
        color: 'bg-red-100 text-red-800',
        description: 'No disponible para listas'
      }
    }

    // Si no tiene listaId y no está descartado, está disponible
    return {
      label: 'Disponible',
      color: 'bg-blue-100 text-blue-800',
      description: 'Disponible para crear listas'
    }
  }

  // ✅ Calcular totales
  const totales = useMemo(() => {
    return sortedItems.reduce((acc, item) => ({
      cantidad: acc.cantidad + item.cantidad
    }), { cantidad: 0 })
  }, [sortedItems])

  return (
    <div className="space-y-4">
      {/* 🔍 Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_lista">En Lista</SelectItem>
              <SelectItem value="reemplazado">Reemplazado</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-600">
          {sortedItems.length} de {equipo.items?.length || 0} ítems
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
                    onClick={() => handleSort('codigo')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Código {getSortIcon('codigo')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('descripcion')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Descripción {getSortIcon('descripcion')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">Unidad</TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('cantidad')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Cantidad {getSortIcon('cantidad')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('cantidad')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Cantidad {getSortIcon('cantidad')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Disponibilidad</TableHead>
                <TableHead className="font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron ítems que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={item.descripcion}>
                        {item.descripcion}
                      </div>
                    </TableCell>
                    <TableCell>{item.unidad}</TableCell>
                    <TableCell className="text-right font-mono">{item.cantidad}</TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(item.estado)}>
                        {item.estado.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const disponibilidad = getDisponibilidadStatus(item)
                        return (
                          <div className="flex flex-col gap-1">
                            <Badge className={disponibilidad.color} title={disponibilidad.description}>
                              {disponibilidad.label}
                            </Badge>
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 📈 Totales */}
      {sortedItems.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="text-sm">
              <span className="font-medium">Total Ítems:</span> {totales.cantidad}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default EquipoItemsTableView